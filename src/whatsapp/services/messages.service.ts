import { Injectable, Logger } from "@nestjs/common"
import { MessageMedia } from "whatsapp-web.js"
import { IWhatsappMessageService, ISendMessageResult, ISendAttachmentOptions, ISendRemoteAttachmentOptions } from "../interfaces"
import { WhatsappClientService } from "./client.service"
import { WhatsappFileService } from "./file.service"
import { WhatsappSessionService } from "./session.service"

@Injectable()
export class WhatsappMessageService implements IWhatsappMessageService {
    private readonly logger = new Logger(WhatsappMessageService.name)

    constructor(
        private readonly clientService: WhatsappClientService,
        private readonly sessionService: WhatsappSessionService,
        private readonly fileService: WhatsappFileService,
    ) { }

    async sendMessage(phoneNumber: string, message: string): Promise<ISendMessageResult> {
        try {
            const client = this.clientService.getClient()

            if (!client || !this.clientService.isReady()) {
                throw new Error("WhatsApp client is not ready")
            }

            const chatId = this.formatPhoneNumber(phoneNumber)
            const isRegistered = await client.isRegisteredUser(chatId)

            if (!isRegistered) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`)
            }

            const sentMessage = await client.sendMessage(chatId, message)

            return {
                success: true,
                messageId: sentMessage.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send message: ${error.message}`)

            if (this.isSessionError(error)) {
                this.logger.warn("Session closed detected in sendMessage. Initiating reconnection...")
                await this.sessionService.reconnect()
                return {
                    success: false,
                    error: "Session closed, reconnecting. Please try again.",
                }
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
        options?: ISendAttachmentOptions,
    ): Promise<ISendMessageResult> {
        try {
            const client = this.clientService.getClient()

            if (!client || !this.clientService.isReady()) {
                throw new Error("WhatsApp client is not ready")
            }

            const chatId = this.formatPhoneNumber(phoneNumber)
            const isRegistered = await client.isRegisteredUser(chatId)

            if (!isRegistered) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`)
            }

            if (!this.fileService.fileExists(filePath)) {
                throw new Error(`File not found: ${filePath}`)
            }

            const media = MessageMedia.fromFilePath(filePath)
            const message = await client.sendMessage(chatId, media, { caption: options?.caption })

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send attachment: ${error.message}`)

            if (this.isSessionError(error)) {
                this.logger.warn("Session closed detected in sendAttachment. Initiating reconnection...")
                await this.sessionService.reconnect()
                return {
                    success: false,
                    error: "Session closed, reconnecting. Please try again.",
                }
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
        options: ISendRemoteAttachmentOptions,
    ): Promise<ISendMessageResult> {
        try {
            const client = this.clientService.getClient()

            if (!client || !this.clientService.isReady()) {
                throw new Error("WhatsApp client is not ready")
            }

            const chatId = this.formatPhoneNumber(phoneNumber)
            const isRegistered = await client.isRegisteredUser(chatId)

            if (!isRegistered) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`)
            }

            const media = await MessageMedia.fromUrl(url, {
                filename: options.filename,
                unsafeMime: true,
            })

            media.mimetype = options.mimeType

            const message = await client.sendMessage(chatId, media, { caption: options.caption })

            return {
                success: true,
                messageId: message.id._serialized,
            }
        } catch (error) {
            this.logger.error(`Failed to send remote attachment: ${error.message}`)

            if (this.isSessionError(error)) {
                this.logger.warn("Session closed detected in sendRemoteAttachment. Initiating reconnection...")
                await this.sessionService.reconnect()
                return {
                    success: false,
                    error: "Session closed, reconnecting. Please try again.",
                }
            }

            return {
                success: false,
                error: error.message,
            }
        }
    }

    formatPhoneNumber(phoneNumber: string): string {
        // Remove any non-numeric characters
        const cleaned = phoneNumber.replace(/\D/g, "")

        // Ensure the number has the correct format for WhatsApp API
        if (!cleaned.startsWith("1") && !cleaned.startsWith("91") && !cleaned.startsWith("44")) {
            this.logger.warn("Phone number may be missing country code, assuming default")
        }

        // WhatsApp expects the format: countrycode+number@c.us
        return `${cleaned}@c.us`
    }

    isSessionError(error: any): boolean {
        return (
            error.message.includes("Session closed") ||
            error.message.includes("Target closed") ||
            error.message.includes("Protocol error")
        )
    }
}
