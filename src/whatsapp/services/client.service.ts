import { Injectable, Logger } from "@nestjs/common"
import { Client, LocalAuth } from "whatsapp-web.js"
import { IWhatsappClientService } from "../interfaces"

@Injectable()
export class WhatsappClientService implements IWhatsappClientService {
    private client: Client | null = null
    private isClientReady = false
    private readonly logger = new Logger(WhatsappClientService.name)
    private sessionId = `nest-whatsapp-service-${Date.now()}`

    constructor() { }

    getClient(): Client | null {
        return this.client
    }

    isReady(): boolean {
        return this.isClientReady
    }

    setReady(ready: boolean): void {
        this.isClientReady = ready
    }

    getCurrentSessionId(): string {
        return this.sessionId
    }

    createClient(): Client {
        this.logger.log(`Creating new WhatsApp client with session ID: ${this.sessionId}`)

        return new Client({
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
    }

    async initialize(): Promise<void> {
        if (!this.client) {
            this.client = this.createClient()
        }

        try {
            this.logger.log("Initializing WhatsApp client...")
            await this.client.initialize()
            this.logger.log("WhatsApp client initialized successfully")
        } catch (error) {
            this.logger.error(`Failed to initialize WhatsApp client: ${error.message}`)
            throw error
        }
    }

    async destroy(): Promise<void> {
        if (!this.client) return;

        try {
            await this.client.destroy();
        } catch (error) {
            this.logger.warn(`⚠️ Failed to destroy WhatsApp client: ${error.message}`);
        } finally {
            this.client = null;
            this.isClientReady = false;
            this.logger.log("✅ WhatsApp client cleaned up");
        }
    }


    async getState(): Promise<string> {
        if (!this.client) {
            throw new Error("WhatsApp client is not initialized")
        }
        return this.client.getState()
    }

    getInfo(): any {
        if (!this.client || !this.isClientReady) {
            return null
        }

        return {
            wid: this.client.info?.wid ?? null,
            platform: this.client.info?.platform ?? null,
        }
    }

    regenerateSessionId(): string {
        this.sessionId = `nest-whatsapp-service-${Date.now()}`
        return this.sessionId
    }
}