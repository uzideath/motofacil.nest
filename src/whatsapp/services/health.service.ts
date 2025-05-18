import { Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { IWhatsappHealthService } from "../interfaces"
import { WhatsappClientService } from "./client.service"
import { WhatsappSessionService } from "./session.service"


@Injectable()
export class WhatsappHealthService implements IWhatsappHealthService {
    private readonly logger = new Logger(WhatsappHealthService.name)

    constructor(
        private readonly clientService: WhatsappClientService,
        private readonly sessionService: WhatsappSessionService,
    ) { }

    @Cron("*/2 * * * *")
    async handleKeepAlive() {
        if (this.clientService.isReady() && this.clientService.getClient()) {
            try {
                await this.keepAlive()
                this.logger.debug("✅ Keep-alive executed successfully")
            } catch (error) {
                this.logger.warn(`⚠️ Keep-alive failed: ${error.message}`)

                if (
                    error.message.includes("Session closed") ||
                    error.message.includes("Target closed") ||
                    error.message.includes("Protocol error")
                ) {
                    this.logger.warn("🛠 Dropped session detected during keep-alive. Starting automatic reconnection...")
                    await this.sessionService.reconnect()
                }
            }
        } else {
            this.logger.debug("⏸ WhatsApp is not ready. Skipping keep-alive.")
        }
    }

    async keepAlive(): Promise<void> {
        if (this.clientService.isReady() && this.clientService.getClient()) {
            try {
                await this.clientService.getState()
                this.logger.debug("✅ WhatsApp keep-alive executed successfully")
            } catch (error) {
                this.logger.warn(`⚠️ WhatsApp keep-alive failed: ${error.message}`)
                throw error
            }
        }
    }

    async runHealthCheck(): Promise<boolean> {
        try {
            if (!this.clientService.isReady() || !this.clientService.getClient()) {
                return false
            }

            const state = await this.clientService.getState()
            return state === "CONNECTED"
        } catch (error) {
            this.logger.error(`Health check failed: ${error.message}`)
            return false
        }
    }
}