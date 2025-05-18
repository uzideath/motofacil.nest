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

interface WhatsAppStatusPayload {
    isReady: boolean
    info?: {
        wid: any
        platform: string | null
    } | null
}

@WebSocketGateway({
    cors: {
        origin: "*", // En producción, restringe esto a tu dominio frontend
        methods: ["GET", "POST"],
        credentials: true,
    },
    namespace: "/",
    transports: ["websocket", "polling"], // Añadir soporte para polling como fallback
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

        // Enviar el estado actual al cliente que se acaba de conectar
        // Esto asegura que los clientes reciban el estado actual inmediatamente
        client.emit("connection_established", { connected: true })
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
        this.logger.log(`Enviando código QR a ${this.server ? this.server.sockets.sockets.size : 0} clientes conectados`)

        // Emitir el evento a todos los clientes
        this.server.emit("qr", payload)

        // También emitir un evento de log para depuración
        this.server.emit("whatsapp_log", {
            type: "info",
            message: "Código QR generado y enviado",
            timestamp: new Date().toISOString(),
        })

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
     * Handle requests for the current QR code
     * @param client The client socket
     */
    @SubscribeMessage("request_qr")
    async handleRequestQr(client: Socket): Promise<void> {
        this.logger.log(`Client ${client.id} requested QR code`)

        // Emitir evento para informar que se ha solicitado un QR
        client.emit("qr_requested", { timestamp: new Date().toISOString() })

        // Notificar a todos los clientes que se está generando un QR
        this.server.emit("whatsapp_log", {
            type: "info",
            message: "Generando nuevo código QR por solicitud del cliente",
            timestamp: new Date().toISOString(),
        })

        // Aquí podríamos llamar directamente al servicio de WhatsApp para solicitar un nuevo QR
        // Pero eso requeriría inyectar el servicio en el gateway
        // Por ahora, el cliente deberá hacer una solicitud HTTP separada
    }
}
