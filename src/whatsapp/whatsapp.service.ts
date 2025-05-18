import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js"
import * as fs from "fs"
import * as path from "path"
import * as qrcode from "qrcode-terminal"
import { exec } from "child_process"
import { promisify } from "util"
import { SendMessageDto } from "./dto"
import { WhatsappGateway } from "./whatsapp.gateway"

const execAsync = promisify(exec)

@Injectable()
export class WhatsappService implements OnModuleInit {
    private client: Client | null = null
    private isReady = false
    private readonly logger = new Logger(WhatsappService.name)
    private initializationAttempts = 0
    private readonly maxInitializationAttempts = 5
    // Cambiado de readonly a private para permitir reasignación
    private sessionId = `nest-whatsapp-service-${Date.now()}` // ID único para cada instancia

    constructor(private readonly gateway: WhatsappGateway) {
        this.setupClient()
    }

    private setupClient() {
        // Configuración mejorada para entornos containerizados
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: this.sessionId,
                dataPath: "/app/.wwebjs_auth",
            }),
            puppeteer: {
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process",
                    "--disable-gpu",
                    "--disable-extensions",
                    "--disable-software-rasterizer",
                    "--disable-features=site-per-process",
                    "--user-data-dir=/app/.wwebjs_auth/session-" + this.sessionId,
                ],
            },
        })

        this.setupEventListeners()
    }

    async onModuleInit() {
        await this.cleanupLockFiles()
        await this.initializeClient()
    }

    private async cleanupLockFiles() {
        try {
            this.logger.log("Limpiando archivos de bloqueo...")

            // Limpiar archivos de bloqueo específicos
            const sessionDir = `/app/.wwebjs_auth/session-${this.sessionId}`

            // Crear directorio si no existe
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true })
            }

            // Verificar y eliminar archivos de bloqueo
            const lockFiles = ["SingletonLock", "SingletonCookie", "SingletonSocket"]
            for (const file of lockFiles) {
                const lockFilePath = path.join(sessionDir, file)
                if (fs.existsSync(lockFilePath)) {
                    fs.unlinkSync(lockFilePath)
                    this.logger.log(`Archivo de bloqueo eliminado: ${lockFilePath}`)
                }
            }

            // Establecer permisos
            await execAsync(`chmod -R 777 ${sessionDir}`)

            this.logger.log("Limpieza de archivos de bloqueo completada")
        } catch (error) {
            this.logger.error(`Error al limpiar archivos de bloqueo: ${error.message}`)
        }
    }

    private setupEventListeners() {
        if (!this.client) return

        this.client.on("qr", (qr) => {
            this.logger.log("QR Code received, scan to authenticate:")
            qrcode.generate(qr, { small: true })

            // Send QR code to frontend via WebSocket
            this.gateway.sendQrCode(qr)
        })

        this.client.on("ready", () => {
            this.isReady = true
            this.initializationAttempts = 0 // Resetear contador de intentos
            this.logger.log("WhatsApp client is ready!")

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: true,
                info: {
                    wid: this.client?.info.wid,
                    // Corregido: Convertir undefined a null explícitamente
                    platform: this.client?.info.platform || null,
                },
            })
        })

        this.client.on("authenticated", () => {
            this.logger.log("WhatsApp client authenticated")
        })

        this.client.on("auth_failure", (msg) => {
            this.logger.error(`WhatsApp authentication failed: ${msg}`)

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })
        })

        this.client.on("disconnected", async (reason) => {
            this.isReady = false
            this.logger.warn(`WhatsApp client disconnected: ${reason}`)

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            // Limpiar cliente actual
            this.client = null

            // Limpiar archivos de bloqueo antes de reiniciar
            await this.cleanupLockFiles()

            // Crear nuevo cliente y reiniciar
            this.setupClient()

            // Esperar un poco antes de reiniciar para evitar ciclos de reinicio rápidos
            setTimeout(() => {
                this.initializeClient()
            }, 5000)
        })
    }

    private async initializeClient() {
        if (!this.client) {
            this.setupClient()
        }

        try {
            this.initializationAttempts++
            this.logger.log(
                `Initializing WhatsApp client (intento ${this.initializationAttempts}/${this.maxInitializationAttempts})...`,
            )

            // Limpiar archivos de bloqueo antes de inicializar
            await this.cleanupLockFiles()

            await this.client?.initialize()
        } catch (error) {
            this.logger.error(`Failed to initialize WhatsApp client: ${error.message}`)

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            // Si el error es específicamente sobre SingletonLock, intentar limpiar y reiniciar
            if (error.message.includes("SingletonLock")) {
                this.logger.log("Detectado error de SingletonLock, limpiando y reintentando...")

                // Destruir cliente actual
                try {
                    await this.client?.destroy()
                } catch (e) {
                    this.logger.error(`Error al destruir cliente: ${e.message}`)
                }

                this.client = null

                // Limpiar archivos de bloqueo
                await this.cleanupLockFiles()

                // Crear nuevo cliente
                this.setupClient()
            }

            // Implementar backoff exponencial para reintentos
            if (this.initializationAttempts < this.maxInitializationAttempts) {
                const delay = Math.min(1000 * Math.pow(2, this.initializationAttempts), 30000)
                this.logger.log(`Reintentando inicialización en ${delay / 1000} segundos...`)

                setTimeout(() => {
                    this.initializeClient()
                }, delay)
            } else {
                this.logger.error(
                    `Se alcanzó el número máximo de intentos (${this.maxInitializationAttempts}). Deteniendo reintentos.`,
                )
            }
        }
    }

    async getStatus() {
        return {
            isReady: this.isReady,
            info:
                this.isReady && this.client
                    ? {
                        wid: this.client.info ? this.client.info.wid : null,
                        // Corregido: Convertir undefined a null explícitamente
                        platform: this.client.info ? this.client.info.platform || null : null,
                    }
                    : null,
        }
    }

    async sendMessage(dto: SendMessageDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.isReady || !this.client) {
                throw new Error("WhatsApp client is not ready")
            }

            // Format the phone number
            const chatId = this.formatPhoneNumber(dto.phoneNumber)

            // Check if the number exists on WhatsApp
            const isRegistered = await this.client.isRegisteredUser(chatId)
            if (!isRegistered) {
                throw new Error(`Phone number ${dto.phoneNumber} is not registered on WhatsApp`)
            }

            // Send the message
            const message = await this.client.sendMessage(chatId, dto.message)

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send message: ${error.message}`)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    async sendAttachment(
        phoneNumber: string,
        filePath: string,
        caption?: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.isReady || !this.client) {
                throw new Error("WhatsApp client is not ready")
            }

            // Format the phone number
            const chatId = this.formatPhoneNumber(phoneNumber)

            // Check if the number exists on WhatsApp
            const isRegistered = await this.client.isRegisteredUser(chatId)
            if (!isRegistered) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`)
            }

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`)
            }

            // Create media from file
            const media = MessageMedia.fromFilePath(filePath)

            // Send the attachment
            const message = await this.client.sendMessage(chatId, media, { caption })

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send attachment: ${error.message}`)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    async sendRemoteAttachment(
        phoneNumber: string,
        url: string,
        filename: string,
        mimeType: string,
        caption?: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.isReady || !this.client) {
                throw new Error("WhatsApp client is not ready")
            }

            // Format the phone number
            const chatId = this.formatPhoneNumber(phoneNumber)

            // Check if the number exists on WhatsApp
            const isRegistered = await this.client.isRegisteredUser(chatId)
            if (!isRegistered) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`)
            }

            // Create media from URL
            const media = await MessageMedia.fromUrl(url, {
                filename,
                unsafeMime: true,
            })

            // Manually set the mimetype after creation
            media.mimetype = mimeType

            // Send the attachment
            const message = await this.client.sendMessage(chatId, media, { caption })

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send remote attachment: ${error.message}`)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    private formatPhoneNumber(phoneNumber: string): string {
        // Remove any non-numeric characters
        const cleaned = phoneNumber.replace(/\D/g, "")

        // Ensure the number has the correct format for WhatsApp API (country code + number)
        // If it doesn't have a country code, we assume it's missing
        if (!cleaned.startsWith("1") && !cleaned.startsWith("91") && !cleaned.startsWith("44")) {
            // This is a simplified example - in a real app, you'd want to handle country codes properly
            this.logger.warn("Phone number may be missing country code, assuming default")
        }

        // WhatsApp expects the format: countrycode+number@c.us
        return `${cleaned}@c.us`
    }

    async logout() {
        if (this.isReady && this.client) {
            await this.client.logout()
            this.isReady = false
            this.logger.log("WhatsApp client logged out")
        }
    }

    async reconnect() {
        this.logger.log("Iniciando reconexión manual de WhatsApp...")

        // Destruir cliente actual si existe
        if (this.client) {
            try {
                await this.client.destroy()
            } catch (e) {
                this.logger.error(`Error al destruir cliente: ${e.message}`)
            }
        }

        this.client = null
        this.isReady = false

        // Limpiar archivos de bloqueo
        await this.cleanupLockFiles()

        // Crear nuevo cliente con ID de sesión único
        // Corregido: Asignar nuevo valor al sessionId
        this.sessionId = `nest-whatsapp-service-${Date.now()}`
        this.setupClient()

        // Resetear contador de intentos
        this.initializationAttempts = 0

        // Inicializar nuevo cliente
        return this.initializeClient()
    }

    // Añadir un nuevo método para solicitar explícitamente un código QR
    async requestQrCode() {
        this.logger.log("Solicitud explícita de código QR recibida")

        // Si el cliente ya está listo, no necesitamos un nuevo QR
        if (this.isReady && this.client) {
            this.logger.log("El cliente ya está conectado, no se necesita un nuevo QR")
            return {
                success: false,
                message: "El cliente ya está conectado, no se necesita un nuevo QR",
            }
        }

        // Si hay un cliente existente, intentar destruirlo primero
        if (this.client) {
            try {
                this.logger.log("Destruyendo cliente existente para generar nuevo QR")
                await this.client.destroy()
            } catch (e) {
                this.logger.error(`Error al destruir cliente: ${e.message}`)
            }
        }

        this.client = null
        this.isReady = false

        // Limpiar archivos de bloqueo
        await this.cleanupLockFiles()

        // Crear nuevo cliente con ID de sesión único
        this.sessionId = `nest-whatsapp-service-${Date.now()}`
        this.setupClient()

        // Resetear contador de intentos
        this.initializationAttempts = 0

        // Inicializar nuevo cliente
        try {
            this.logger.log("Inicializando nuevo cliente para generar QR")
            await this.initializeClient()
            return {
                success: true,
                message: "Solicitud de QR iniciada correctamente",
            }
        } catch (error) {
            this.logger.error(`Error al inicializar cliente para QR: ${error.message}`)
            return {
                success: false,
                error: error.message,
            }
        }
    }
}
