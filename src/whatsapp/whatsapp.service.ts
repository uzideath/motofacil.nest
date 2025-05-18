import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js"
import * as fs from "fs"
import * as qrcode from "qrcode-terminal"
import { WhatsappGateway } from "./whatsapp.gateway"
import { SendMessageDto } from "./dto"

@Injectable()
export class WhatsappService implements OnModuleInit {
    private client: Client
    private isReady = false
    private readonly logger = new Logger(WhatsappService.name)

    constructor(private readonly gateway: WhatsappGateway) {
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: "nest-whatsapp-service" }),
            puppeteer: {
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            },
        })

        this.setupEventListeners()
    }

    async onModuleInit() {
        await this.initializeClient()
    }

    private setupEventListeners() {
        this.client.on("qr", (qr) => {
            this.logger.log("QR Code received, scan to authenticate:")
            qrcode.generate(qr, { small: true })

            // Send QR code to frontend via WebSocket
            this.gateway.sendQrCode(qr)
        })

        this.client.on("ready", () => {
            this.isReady = true
            this.logger.log("WhatsApp client is ready!")

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: true,
                info: {
                    wid: this.client.info.wid, // Now accepts ContactId type
                    platform: this.client.info.platform,
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

        this.client.on("disconnected", (reason) => {
            this.isReady = false
            this.logger.warn(`WhatsApp client disconnected: ${reason}`)

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            this.initializeClient()
        })
    }

    private async initializeClient() {
        try {
            this.logger.log("Initializing WhatsApp client...")
            await this.client.initialize()
        } catch (error) {
            this.logger.error(`Failed to initialize WhatsApp client: ${error.message}`)

            // Send status update to frontend
            this.gateway.sendWhatsAppStatus({
                isReady: false,
                info: null,
            })

            throw error
        }
    }

    async getStatus() {
        return {
            isReady: this.isReady,
            info: this.isReady
                ? {
                    wid: this.client.info ? this.client.info.wid : null, // Now accepts ContactId type
                    platform: this.client.info ? this.client.info.platform : null,
                }
                : null,
        }
    }

    async sendMessage(dto: SendMessageDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.isReady) {
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
            if (!this.isReady) {
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
            if (!this.isReady) {
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
            // Note: We're using fromUrl without the mimetype option, as it's not in the type definition
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
        if (this.isReady) {
            await this.client.logout()
            this.isReady = false
            this.logger.log("WhatsApp client logged out")
        }
    }
}
