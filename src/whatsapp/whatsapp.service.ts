import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js"
import * as fs from "fs"
import * as path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import type { SendMessageDto } from "./dto"
import type { WhatsappGateway } from "./whatsapp.gateway"
import { Cron, CronExpression } from "@nestjs/schedule"
import { Mutex } from "async-mutex"

const execAsync = promisify(exec)

@Injectable()
export class WhatsappService implements OnModuleInit {
    private client: Client | null = null
    private isReady = false
    private readonly logger = new Logger(WhatsappService.name)
    private initializationAttempts = 0
    private readonly maxInitializationAttempts = 5
    private lastQrCode: string | null = null
    private readonly initializeMutex = new Mutex()
    private readonly QR_TTL = 1 * 60 * 1000
    private qrTimeout: NodeJS.Timeout | null = null
    private sessionId = `nest-whatsapp-service-${Date.now()}`
    private lastQrTimestamp: number | null = null
    private readonly QR_INACTIVITY_LIMIT = 3 * 60 * 1000
    private browserHealthCheckInterval: NodeJS.Timeout | null = null
    private lastKeepAliveSuccess: number = Date.now()
    private readonly MAX_INACTIVE_TIME = 3 * 60 * 1000 // 3 minutes

    constructor(private readonly gateway: WhatsappGateway) {
        this.setupClient()
    }

    getLastQrCode(): string | null {
        return this.lastQrCode
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
                timeout: 120000, // Increased timeout for initialization
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

                    // Additional stability improvements
                    "--disable-features=site-per-process",
                    "--js-flags=--max-old-space-size=500", // Limit memory usage
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",

                    // Memory management
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-features=TranslateUI,BlinkGenPropertyTrees",
                    "--disable-ipc-flooding-protection",
                    "--disable-renderer-backgrounding",

                    // User data directory
                    `--user-data-dir=/app/.wwebjs_auth/session-${this.sessionId}`,
                ],
            },
            // Increase timeouts for better stability
            webVersionCache: {
                type: "remote",
                remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/4.0.0.html",
            },
            webVersion: "2.2346.52",
            restartOnAuthFail: true,
        })

        this.setupEventListeners()
        this.startBrowserHealthCheck()
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

    getStatusSync(): { isReady: boolean; info: any | null } {
        return {
            isReady: this.isReady,
            info:
                this.isReady && this.client
                    ? {
                        wid: this.client.info?.wid ?? null,
                        platform: this.client.info?.platform ?? null,
                    }
                    : null,
        }
    }

    private setupEventListeners() {
        if (!this.client) return

        this.client.on("qr", (qr) => {
            this.handleQrCodeSafely(qr)
        })

        this.client.on("authenticated", () => {
            this.logger.log("WhatsApp client authenticated")
            this.lastKeepAliveSuccess = Date.now()

            // Limpiar QR antiguo después de autenticación
            this.lastQrCode = null
        })

        this.client.on("ready", () => {
            this.isReady = true
            this.initializationAttempts = 0
            this.lastQrCode = null
            this.lastKeepAliveSuccess = Date.now()

            this.logger.log("WhatsApp client is ready!")

            // Enviar estado a clientes
            this.gateway.sendWhatsAppStatus({
                isReady: true,
                info: {
                    wid: this.client?.info.wid,
                    platform: this.client?.info.platform || null,
                },
            })
        })

        this.client.on("auth_failure", (msg) => {
            this.logger.error(`WhatsApp authentication failed: ${msg}`)
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })
        })

        this.client.on("disconnected", async (reason) => {
            this.isReady = false
            this.logger.warn(`WhatsApp client disconnected: ${reason}`)
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            // Limpieza y reinicio
            try {
                await this.client?.destroy()
            } catch (e) {
                this.logger.error(`Error destroying client after disconnect: ${e.message}`)
            }

            this.client = null
            await this.cleanupLockFiles()

            // Wait a bit before reconnecting
            this.logger.log("🔄 Scheduling reconnection after disconnect...")
            setTimeout(() => {
                this.setupClient()
                this.initializeClient()
            }, 5000)
        })
    }

    private startBrowserHealthCheck() {
        // Clear any existing interval
        if (this.browserHealthCheckInterval) {
            clearInterval(this.browserHealthCheckInterval)
        }

        // Set up a new health check interval
        this.browserHealthCheckInterval = setInterval(async () => {
            if (this.client && this.isReady) {
                try {
                    // Check if browser is still responsive
                    await this.client.pupPage?.evaluate(() => true)

                    // Check if we've been inactive for too long
                    const timeSinceLastSuccess = Date.now() - this.lastKeepAliveSuccess
                    if (timeSinceLastSuccess > this.MAX_INACTIVE_TIME) {
                        this.logger.warn(`Browser inactive for ${timeSinceLastSuccess}ms, forcing reconnect`)
                        await this.reconnect()
                    }
                } catch (err) {
                    this.logger.error(`Browser health check failed: ${err.message}`)
                    this.reconnect().catch((e) => this.logger.error(`Failed to reconnect after health check: ${e.message}`))
                }
            }
        }, 60000) // Check every minute
    }

    private async initializeClient(): Promise<void> {
        await this.initializeMutex.runExclusive(async () => {
            this.initializationAttempts++
            this.logger.log(`🚀 Inicializando WhatsApp client (intento ${this.initializationAttempts})`)

            try {
                if (!this.client) {
                    this.logger.warn("⚠️ No hay cliente. Ejecutando setupClient()...")
                    this.setupClient()
                }

                await this.cleanupLockFiles()
                await new Promise((r) => setTimeout(r, 500))

                this.logger.log("🕐 Ejecutando client.initialize()...")
                await this.client?.initialize()
                this.logger.log("✅ client.initialize() completado")
                this.lastKeepAliveSuccess = Date.now()
            } catch (error) {
                this.logger.error(`❌ Error al inicializar cliente: ${error.message}`)

                this.gateway.sendWhatsAppStatus({ isReady: false, info: null })

                try {
                    await this.client?.destroy()
                } catch (e) {
                    this.logger.error(`Error al destruir cliente después de fallo: ${e.message}`)
                }

                this.client = null
                await this.cleanupLockFiles()
                this.setupClient()

                if (this.initializationAttempts < this.maxInitializationAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, this.initializationAttempts), 15000)
                    this.logger.log(`🕒 Reintentando en ${delay / 1000}s...`)
                    setTimeout(() => this.initializeClient(), delay)
                } else {
                    this.logger.error("❌ Máximo de intentos alcanzado. Abortando inicialización.")
                }
            }
        })
    }

    private handleQrCodeSafely(qr: string): void {
        if (this.isReady) {
            this.logger.warn("📛 QR recibido después de estar listo. No se emitirá.")
            return
        }

        this.logger.log("QR Code recibido y será emitido a los clientes")
        this.lastQrCode = qr
        this.lastQrTimestamp = Date.now()
        this.gateway.sendQrCode(qr)

        // Cancelar cualquier timeout previo
        if (this.qrTimeout) {
            clearTimeout(this.qrTimeout)
        }

        // Programar la expiración automática del QR
        this.qrTimeout = setTimeout(() => {
            if (this.lastQrCode === qr) {
                this.logger.warn("⌛ QR expirado automáticamente. Limpiando...")
                this.lastQrCode = null
                this.qrTimeout = null
            }
        }, this.QR_TTL)
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

    hasActiveQr(): boolean {
        return this.lastQrCode !== null
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

            // Update keep-alive timestamp on successful operation
            this.lastKeepAliveSuccess = Date.now()

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send message: ${error.message}`)

            // Check if this is a session error and try to recover
            if (
                error.message.includes("Session closed") ||
                error.message.includes("Protocol error") ||
                error.message.includes("Target closed")
            ) {
                this.logger.warn("🔄 Session error detected during send, scheduling reconnect...")
                setTimeout(() => this.reconnect(), 1000)
            }

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

            // Update keep-alive timestamp on successful operation
            this.lastKeepAliveSuccess = Date.now()

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send attachment: ${error.message}`)

            // Check if this is a session error and try to recover
            if (
                error.message.includes("Session closed") ||
                error.message.includes("Protocol error") ||
                error.message.includes("Target closed")
            ) {
                this.logger.warn("🔄 Session error detected during attachment send, scheduling reconnect...")
                setTimeout(() => this.reconnect(), 1000)
            }

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

            // Update keep-alive timestamp on successful operation
            this.lastKeepAliveSuccess = Date.now()

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send remote attachment: ${error.message}`)

            // Check if this is a session error and try to recover
            if (
                error.message.includes("Session closed") ||
                error.message.includes("Protocol error") ||
                error.message.includes("Target closed")
            ) {
                this.logger.warn("🔄 Session error detected during remote attachment send, scheduling reconnect...")
                setTimeout(() => this.reconnect(), 1000)
            }

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
        this.logger.log("🔌 Logout iniciado...")

        // Clear health check interval
        if (this.browserHealthCheckInterval) {
            clearInterval(this.browserHealthCheckInterval)
            this.browserHealthCheckInterval = null
        }

        if (this.client) {
            try {
                await this.client.destroy()
                this.logger.log("✅ Cliente destruido correctamente")
            } catch (e) {
                this.logger.error(`Error al destruir cliente: ${e.message}`)
            }
        }

        this.client = null
        this.isReady = false

        await this.cleanupLockFiles()

        this.logger.log("📴 WhatsApp client logged out")
    }

    async reconnect(): Promise<{ success: boolean; message: string }> {
        return this.initializeMutex.runExclusive(async () => {
            this.logger.log("🔄 Iniciando reconexión manual de WhatsApp...")

            // Clear health check interval
            if (this.browserHealthCheckInterval) {
                clearInterval(this.browserHealthCheckInterval)
                this.browserHealthCheckInterval = null
            }

            if (this.client) {
                try {
                    await this.client.destroy()
                    this.logger.log("✅ Cliente destruido correctamente")
                } catch (e) {
                    this.logger.error(`Error al destruir cliente: ${e.message}`)
                }
            }

            this.client = null
            this.isReady = false

            this.sessionId = `nest-whatsapp-service-${Date.now()}`
            this.logger.log(`🆕 Nuevo sessionId generado: ${this.sessionId}`)

            await this.cleanupLockFiles()
            this.setupClient()
            this.initializationAttempts = 0

            await this.initializeClient()

            return {
                success: true,
                message: "Reconexión iniciada",
            }
        })
    }

    async requestQrCode(): Promise<{ success: boolean; message: string }> {
        this.logger.log("📨 Solicitud explícita de código QR recibida")

        this.initializeMutex.runExclusive(async () => {
            try {
                if (this.client) {
                    this.logger.log("🔄 Destruyendo cliente anterior...")
                    try {
                        await this.client.destroy()
                    } catch (e) {
                        this.logger.warn(`⚠️ Error al destruir cliente: ${e.message}`)
                    }
                }

                this.client = null
                this.isReady = false
                this.sessionId = `nest-whatsapp-service-${Date.now()}`

                await this.cleanupLockFiles()
                this.setupClient()
                this.initializationAttempts = 0

                // Inicializar cliente en background
                this.initializeClient().catch((e) => {
                    this.logger.error(`⚠️ Error de inicialización diferida: ${e.message}`)
                })
            } catch (error) {
                this.logger.error(`❌ Error en preparación del cliente: ${error.message}`)
            }
        })

        // Responder rápido al frontend
        return {
            success: true,
            message: "Cliente WhatsApp en proceso de reinicio. QR será emitido vía WebSocket.",
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS) // More frequent checks
    async handleKeepAliveCron() {
        if (this.client && this.isReady) {
            try {
                // More robust check - actually perform a lightweight operation
                const state = await this.client.getState()
                this.logger.verbose(`🕒 Cron KeepAlive: cliente activo (state: ${state})`)

                // Perform a lightweight operation to keep the browser active
                if (this.client.pupPage) {
                    await this.client.pupPage.evaluate(() => console.log("keepalive"))
                }

                // Update last successful keep-alive timestamp
                this.lastKeepAliveSuccess = Date.now()
            } catch (err) {
                this.logger.warn(`⚠️ Cron KeepAlive falló: ${err.message}`)

                // Auto-recovery on failure
                if (
                    err.message.includes("Session closed") ||
                    err.message.includes("Protocol error") ||
                    err.message.includes("Target closed")
                ) {
                    this.logger.warn("🔄 Detectada sesión cerrada, iniciando reconexión automática...")
                    this.reconnect().catch((e) => this.logger.error(`❌ Error en reconexión automática: ${e.message}`))
                }
            }
        } else {
            this.logger.verbose("🕒 Cron KeepAlive: cliente no listo")
        }
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleMemoryCleanup() {
        await this.performMemoryCleanup()
    }

    private async performMemoryCleanup() {
        if (!this.client || !this.client.pupBrowser) return

        try {
            // Get all pages
            const pages = await this.client.pupBrowser.pages()

            // Close any extra pages (keep only the main one)
            if (pages.length > 1) {
                for (let i = 1; i < pages.length; i++) {
                    await pages[i].close()
                    this.logger.log(`Closed extra browser page ${i}`)
                }
            }

            // Run garbage collection if possible
            if (this.client.pupPage) {
                await this.client.pupPage.evaluate(() => {
                    if (window.gc) window.gc()
                })
            }

            // Check memory usage (Node.js process)
            const memUsage = process.memoryUsage()
            if (memUsage.heapUsed > 500 * 1024 * 1024) {
                // 500MB threshold
                this.logger.warn(`High memory usage detected: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)

                // Consider restarting if memory is too high
                if (memUsage.heapUsed > 800 * 1024 * 1024) {
                    // 800MB threshold
                    this.logger.warn("Memory usage critical, scheduling restart")
                    setTimeout(() => this.reconnect(), 5000)
                }
            }
        } catch (err) {
            this.logger.error(`Error in memory cleanup: ${err.message}`)
        }
    }
}
