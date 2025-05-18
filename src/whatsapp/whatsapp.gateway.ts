import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    type OnGatewayConnection,
    type OnGatewayDisconnect,
    type OnGatewayInit,
} from "@nestjs/websockets"
import { Logger } from "@nestjs/common"
import type { Server, Socket } from "socket.io"

interface QrCodePayload {
    qr: string
}

// Updated to accept any type for wid since it's a ContactId in whatsapp-web.js
interface WhatsAppStatusPayload {
    isReady: boolean
    info?: {
        wid: any // Changed from string | null to any to accommodate ContactId type
        platform: string | null
    } | null
}

@WebSocketGateway({
    cors: {
        origin: "*", // In production, you should restrict this to your frontend domain
        methods: ["GET", "POST"],
        credentials: true,
    },
    namespace: "/",
})
export class WhatsappGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(WhatsappGateway.name)

    afterInit(server: Server): void {
        this.logger.log("WebSocket Gateway initialized")
    }

    handleConnection(client: Socket): void {
        this.logger.log(`Client connected: ${client.id}`)
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`)
    }

    /**
     * Send QR code to all connected clients
     * @param qr The QR code string to be displayed and scanned
     */
    sendQrCode(qr: string): void {
        const payload: QrCodePayload = { qr }
        this.server.emit("qr", payload)
        this.logger.log("QR code sent to clients")
    }

    /**
     * Send WhatsApp connection status to all connected clients
     * @param status The current WhatsApp connection status
     */
    sendWhatsAppStatus(status: WhatsAppStatusPayload): void {
        if (status.isReady) {
            this.server.emit("whatsapp_connected", status)
            this.logger.log("WhatsApp connected status sent to clients")
        } else {
            this.server.emit("whatsapp_disconnected", status)
            this.logger.log("WhatsApp disconnected status sent to clients")
        }
    }

    /**
     * Handle ping messages from clients
     * @param client The client socket
     * @param data Any data sent with the ping
     * @returns A pong message
     */
    @SubscribeMessage("ping")
    handlePing(client: Socket, data: any): { event: string; data: string } {
        this.logger.debug(`Ping received from client ${client.id}`)
        return { event: "pong", data: "pong" }
    }

    /**
     * Send a message to a specific client
     * @param clientId The socket ID of the client
     * @param event The event name
     * @param data The data to send
     */
    sendToClient(clientId: string, event: string, data: any): void {
        this.server.to(clientId).emit(event, data)
        this.logger.debug(`Sent ${event} to client ${clientId}`)
    }

    /**
     * Broadcast a message to all connected clients except the sender
     * @param sender The socket that should not receive the broadcast
     * @param event The event name
     * @param data The data to broadcast
     */
    broadcastExcept(sender: Socket, event: string, data: any): void {
        sender.broadcast.emit(event, data)
        this.logger.debug(`Broadcast ${event} to all except ${sender.id}`)
    }
}
