import {
    ConnectedSocket,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    type OnGatewayConnection,
    type OnGatewayDisconnect,
    type OnGatewayInit,
} from "@nestjs/websockets"
import { forwardRef, Inject, Logger } from "@nestjs/common"
import type { Server, Socket } from "socket.io"
import { WhatsappService } from "./whatsapp.service"

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
        origin: '*',
        credentials: true,
    },
    transports: ['websocket'],
})
export class WhatsappGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @Inject(forwardRef(() => WhatsappService))
        private readonly whatsappService: WhatsappService,
    ) { }

    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(WhatsappGateway.name)

    afterInit(server: Server): void {
        this.logger.log("WebSocket Gateway initialized")
    }

    handleConnection(client: Socket): void {
        const status = this.whatsappService.getStatusSync()

        if (status.isReady) {
            client.emit("whatsapp_connected", status)
        } else {
            client.emit("whatsapp_disconnected", status)

            const lastQr = this.whatsappService.getLastQrCode?.()
            if (lastQr) {
                client.emit("qr", { qr: lastQr })
                this.logger.log(`🧾 Reemitiendo QR al cliente ${client.id}`)
            } else {
                client.emit("qr_expired") // nuevo evento
                this.logger.warn(`⚠️ Cliente ${client.id} conectado pero el QR expiró`)
            }
        }
    }



    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`)
    }

    /**
     * Send QR code to all connected clients
     * @param qr The QR code string to be displayed and scanned
     */
    sendQrCode(qr: string): void {
        this.logger.log("📡 Enviando código QR a clientes vía WebSocket" + qr)
        this.server.emit("qr", { qr })
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

    emitWhatsappReady(): void {
        this.logger.log("📲 Emitiendo evento whatsapp_ready a clientes")
        this.server.emit("whatsapp_ready", { timestamp: new Date().toISOString() })
    }

    /**
     * Handle requests for the current QR code
     * @param client The client socket
     */
    @SubscribeMessage("request_qr")
    async handleRequestQr(@ConnectedSocket() client: Socket) {
        this.logger.log(`📩 Cliente ${client.id} solicitó QR`)
        this.logger.log(`Client ${client.id} requested QR code`)
        client.emit("qr_requested", { timestamp: new Date().toISOString() })

        this.server.emit("whatsapp_log", {
            type: "info",
            message: "Generando nuevo código QR por solicitud del cliente",
            timestamp: new Date().toISOString(),
        })

        try {
            const result = await this.whatsappService.requestQrCode()

            if ('success' in result && result.success) {
                this.logger.log("✅ QR generado correctamente desde request_qr")

                // ✅ reenviar el último QR directamente al cliente
                const qr = this.whatsappService.getLastQrCode?.()
                if (qr) {
                    client.emit("qr", { qr })
                }
            } else {
                this.logger.error(`❌ Error al generar QR desde gateway: ${result}`)
                client.emit("whatsapp_log", {
                    type: "error",
                    message: `Error al generar nuevo QR: ${result}`,
                    timestamp: new Date().toISOString(),
                })
            }
        } catch (error) {
            this.logger.error(`❌ Excepción al manejar request_qr: ${error.message}`)
            client.emit("whatsapp_log", {
                type: "error",
                message: `Excepción al reiniciar cliente: ${error.message}`,
                timestamp: new Date().toISOString(),
            })
        }
    }
}
