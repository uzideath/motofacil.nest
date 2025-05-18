import { Injectable, Logger } from "@nestjs/common"
import { WhatsappGateway } from "../whatsapp.gateway"
import { IQrCodeResult, IWhatsappSessionService, IWhatsappStatus } from "../interfaces"
import { WhatsappClientService } from "./client.service"
import { WhatsappFileService } from "./file.service"

@Injectable()
export class WhatsappSessionService implements IWhatsappSessionService {
    private lastQrCode: string | null = null
    private initializationAttempts = 0
    private readonly maxInitializationAttempts = 5
    private readonly logger = new Logger(WhatsappSessionService.name)

    constructor(
        private readonly clientService: WhatsappClientService,
        private readonly fileService: WhatsappFileService,
        private readonly gateway: WhatsappGateway,
    ) { }

    getLastQrCode(): string | null {
        return this.lastQrCode
    }

    setQrCode(qrCode: string | null): void {
        this.lastQrCode = qrCode
        if (qrCode) {
            this.gateway.sendQrCode(qrCode)
        }
    }

    async getStatus(): Promise<IWhatsappStatus> {
        return {
            isReady: this.clientService.isReady(),
            info: this.clientService.getInfo(),
        }
    }

    getStatusSync(): IWhatsappStatus {
        return {
            isReady: this.clientService.isReady(),
            info: this.clientService.getInfo(),
        }
    }

    async logout(): Promise<void> {
        const client = this.clientService.getClient()
        if (client && this.clientService.isReady()) {
            await client.logout()
            this.clientService.setReady(false)
            this.logger.log("WhatsApp client logged out")
            this.gateway.sendWhatsAppStatus(this.getStatusSync())
        }
    }

    async reconnect(): Promise<void> {
        this.logger.log("Starting manual WhatsApp reconnection...")

        // Destroy current client if it exists
        await this.clientService.destroy()
        this.clientService.setReady(false)

        // Clean up lock files
        const sessionId = this.clientService.regenerateSessionId()
        await this.fileService.cleanupLockFiles(sessionId)

        // Reset initialization attempts
        this.initializationAttempts = 0

        // Initialize new client
        await this.setupClientWithListeners()
        await this.initializeClient()
    }

    async requestQrCode(): Promise<IQrCodeResult> {
        this.logger.log("📨 Explicit QR code request received");

        try {
            const client = this.clientService.getClient();
            if (client) {
                this.logger.log("🔄 Destroying current client before generating new QR");
                await this.clientService.destroy();
                this.clientService.setReady(false);
            } else {
                this.logger.log("⚠️ No client to destroy");
            }

            const sessionId = this.clientService.regenerateSessionId();
            this.logger.log(`🆕 New sessionId generated: ${sessionId}`);

            await this.fileService.cleanupLockFiles(sessionId);

            await this.setupClientWithListeners();
            this.initializationAttempts = 0;

            await this.initializeClient();

            return {
                success: true,
                message: "QR request initiated successfully",
            };
        } catch (error) {
            this.logger.error(`❌ Error restarting client for QR: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }


    async setupClientWithListeners(): Promise<void> {
        const client = this.clientService.createClient()

        client.on("qr", (qr) => {
            this.handleQrCodeSafely(qr)
        })

        client.on("authenticated", () => {
            this.logger.log("WhatsApp client authenticated")
            this.setQrCode(null)
        })

        client.on("ready", () => {
            this.clientService.setReady(true)
            this.initializationAttempts = 0
            this.setQrCode(null)
            this.logger.log("WhatsApp client is ready!")

            this.gateway.sendWhatsAppStatus(this.getStatusSync())

            // ✅ Emitir evento especial al frontend
            this.gateway.emitWhatsappReady()
        })

        client.on("auth_failure", (msg) => {
            this.logger.error(`WhatsApp authentication failed: ${msg}`)
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })
        })

        client.on("disconnected", async (reason) => {
            this.clientService.setReady(false)
            this.logger.warn(`WhatsApp client disconnected: ${reason}`)
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            // Cleanup and restart
            await this.clientService.destroy()
            const sessionId = this.clientService.regenerateSessionId()
            await this.fileService.cleanupLockFiles(sessionId)
            await this.setupClientWithListeners()

            setTimeout(() => {
                this.initializeClient()
            }, 5000)
        })
    }

    handleQrCodeSafely(qr: string): void {
        if (this.clientService.isReady()) {
            this.logger.warn("QR received after being ready. Will not emit.")
            return
        }

        this.logger.log("QR Code received and will be emitted to clients")
        this.setQrCode(qr)
    }

    async initializeClient(): Promise<void> {
        try {
            this.initializationAttempts++
            this.logger.log(`Initializing WhatsApp client (attempt ${this.initializationAttempts})`)

            const sessionId = this.clientService.getCurrentSessionId()
            await this.fileService.cleanupLockFiles(sessionId)

            this.logger.log("Executing client.initialize()...")
            await this.clientService.initialize()
            this.logger.log("client.initialize() completed")
        } catch (error) {
            this.logger.error(`Error initializing client: ${error.message}`)

            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            if (error.message.includes("SingletonLock")) {
                this.logger.log("SingletonLock error detected. Retrying with new client.")
                await this.clientService.destroy()
                const sessionId = this.clientService.regenerateSessionId()
                await this.fileService.cleanupLockFiles(sessionId)
                await this.setupClientWithListeners()
            }

            if (this.initializationAttempts < this.maxInitializationAttempts) {
                const delay = Math.min(1000 * Math.pow(2, this.initializationAttempts), 30000)
                this.logger.log(`Retrying in ${delay / 1000}s...`)
                setTimeout(() => this.initializeClient(), delay)
            } else {
                this.logger.error("Maximum attempts reached. Aborting.")
            }
        }
    }
}