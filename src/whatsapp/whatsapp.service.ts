import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"
import * as fs from "fs"
import * as path from "path"
import type { SendMessageDto } from "./dto"
import type { AxiosResponse } from "axios"

type SendResult = { success: boolean; messageId?: string; error?: string; raw?: any }

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name)
    private readonly baseUrl: string
    private readonly instanceId: string
    private readonly apiKey: string

    constructor(private readonly http: HttpService, private readonly config: ConfigService) {
        const envBase = process.env.EVOLUTION_API_URL || this.config.get<string>("EVOLUTION_API_URL")
        if (!envBase) {
            this.logger.warn("EVOLUTION_API_URL is not set. Set it in your .env, e.g. https://your-host")
        }
        this.baseUrl = (envBase || "http://localhost:8080").replace(/\/$/, "")
        this.instanceId = this.config.getOrThrow<string>("EVOLUTION_API_INSTANCE")
        this.apiKey = this.config.getOrThrow<string>("EVOLUTION_API_KEY")
    }

    async getStatus() {
        // We don't maintain a WebSocket session anymore; assume API is reachable
        return {
            isReady: true,
            info: {
                provider: "evolution-api",
                instance: this.instanceId,
                baseUrl: this.baseUrl,
            },
        }
    }

    // Messaging
    async sendMessage(dto: SendMessageDto): Promise<SendResult> {
        try {
            const url = `${this.baseUrl}/message/sendText/${this.instanceId}`
            const payload = {
                number: this.normalizeNumber(dto.phoneNumber),
                text: dto.message,
                options: { delay: 100, presence: "composing" },
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )

            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Unknown error"
            this.logger.error(`Failed to send text: ${msg}`)
            return { success: false, error: msg }
        }
    }

    async sendAttachment(phoneNumber: string, filePath: string, caption?: string): Promise<SendResult> {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`)
            }

            const fileName = path.basename(filePath)
            const media = fs.readFileSync(filePath, { encoding: "base64" })
            const mediaType = this.guessMediaTypeFromExt(fileName)

            const url = `${this.baseUrl}/message/sendMedia/${this.instanceId}`
            const payload = {
                number: this.normalizeNumber(phoneNumber),
                options: { delay: 100, presence: "composing" },
                mediaMessage: {
                    mediaType,
                    fileName,
                    caption: caption ?? undefined,
                    media,
                },
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )
            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Unknown error"
            this.logger.error(`Failed to send media: ${msg}`)
            return { success: false, error: msg }
        }
    }

    async sendRemoteAttachment(
        phoneNumber: string,
        urlOrFile: string,
        filename: string,
        mimeType: string,
        caption?: string,
    ): Promise<SendResult> {
        try {
            // Download the file and convert to base64
            const fileResp = await firstValueFrom<AxiosResponse<ArrayBuffer>>(
                this.http.get<ArrayBuffer>(urlOrFile, { responseType: "arraybuffer" as any })
            )
            const base64 = Buffer.from(fileResp.data).toString("base64")
            const mediaType = this.mediaTypeFromMime(mimeType)

            const url = `${this.baseUrl}/message/sendMedia/${this.instanceId}`
            const payload = {
                number: this.normalizeNumber(phoneNumber),
                options: { delay: 100, presence: "composing" },
                mediaMessage: {
                    mediaType,
                    fileName: filename,
                    caption: caption ?? undefined,
                    media: base64,
                },
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )
            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Unknown error"
            this.logger.error(`Failed to send remote media: ${msg}`)
            return { success: false, error: msg }
        }
    }

    // Helpers
    private headers() {
        return { apikey: this.apiKey, "Content-Type": "application/json" }
    }

    private normalizeNumber(phone: string): string {
        // Evolution API expects the international number without '+' or '@c.us'
        return phone.replace(/\D/g, "")
    }

    private extractMessageId(data: any): string | undefined {
        return (
            data?.id ||
            data?.messageId ||
            data?.message?.id ||
            data?.data?.id ||
            undefined
        )
    }

    private mediaTypeFromMime(mime: string): "image" | "video" | "audio" | "document" {
        if (!mime) return "document"
        if (mime.startsWith("image/")) return "image"
        if (mime.startsWith("video/")) return "video"
        if (mime.startsWith("audio/")) return "audio"
        return "document"
    }

    private guessMediaTypeFromExt(fileName: string): "image" | "video" | "audio" | "document" {
        const ext = path.extname(fileName).toLowerCase()
        if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) return "image"
        if ([".mp4", ".mov", ".mkv", ".webm"].includes(ext)) return "video"
        if ([".mp3", ".ogg", ".wav", ".m4a"].includes(ext)) return "audio"
        return "document"
    }
}
