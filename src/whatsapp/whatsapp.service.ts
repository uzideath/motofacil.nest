import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"
import * as fs from "fs"
import * as path from "path"
import type { SendMessageDto, SendBase64MediaDto } from "./dto"
import type { AxiosResponse } from "axios"

type SendResult = { success: boolean; messageId?: string; error?: string; raw?: any }

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name)
    private readonly baseUrl: string
    private readonly instanceId: string
    private readonly apiKey: string

    constructor(private readonly http: HttpService, private readonly config: ConfigService) {
        this.baseUrl = process.env.EVOLUTION_API_URL || this.config.get<string>("EVOLUTION_API_URL")!
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
            // Backward compatibility: accept legacy { phoneNumber, message }
            const numberRaw: string | undefined = (dto as any)?.number ?? (dto as any)?.phoneNumber
            const textRaw: string | undefined = (dto as any)?.text ?? (dto as any)?.message

            if (!numberRaw) {
                throw new Error("Missing 'number' (or legacy 'phoneNumber') in request body")
            }
            if (!textRaw) {
                throw new Error("Missing 'text' (or legacy 'message') in request body")
            }

            const payload = {
                number: this.normalizeNumber(numberRaw),
                options: { delay: 123, presence: "composing" },
                text: textRaw,
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )

            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            if (error?.response?.status === 404) {
                this.logger.error(
                    `404 Not Found calling Evolution API sendText. ` +
                    `URL="${this.baseUrl}/message/sendText/${this.instanceId}" ` +
                    `Check EVOLUTION_API_URL, EVOLUTION_API_BASE_PATH, and EVOLUTION_API_INSTANCE.`
                )
            }
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
            const mediaMessage: any = {
                mediatype: mediaType,
                media,
            }
            if (mediaType === "document") {
                mediaMessage.fileName = fileName
            }
            if (caption && mediaType !== "audio") {
                mediaMessage.caption = caption
            }

            const payload = {
                number: this.normalizeNumber(phoneNumber),
                mediaMessage,
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )
            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            const resp = error?.response?.data
            const msg = (resp && (resp.message || JSON.stringify(resp))) || error?.message || "Unknown error"
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
            const mediaMessage: any = {
                mediatype: mediaType,
                media: base64,
                mimetype: mimeType,
            }
            if (mediaType === "document") {
                mediaMessage.fileName = filename
            }
            if (caption && mediaType !== "audio") {
                mediaMessage.caption = caption
            }

            const payload = {
                number: this.normalizeNumber(phoneNumber),
                mediaMessage,
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )
            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            const resp = error?.response?.data
            const msg = (resp && (resp.message || JSON.stringify(resp))) || error?.message || "Unknown error"
            this.logger.error(`Failed to send remote media: ${msg}`)
            return { success: false, error: msg }
        }
    }

    async sendMediaBase64(dto: SendBase64MediaDto): Promise<SendResult> {
        try {
            const mediaType = this.mediaTypeFromMime(dto.mimetype || "") || (dto.mediatype as any)
            const url = `${this.baseUrl}/message/sendMedia/${this.instanceId}`
            const payload: any = {
                number: this.normalizeNumber(dto.number),
                mediatype: mediaType,
                media: dto.media,
            }
            if (dto.mimetype) payload.mimetype = dto.mimetype
            if (mediaType === "document") {
                if (!dto.fileName) throw new Error("fileName is required for mediatype=document")
                payload.fileName = dto.fileName
            }
            if (dto.caption && mediaType !== "audio") {
                payload.caption = dto.caption
            }

            const { data } = await firstValueFrom<AxiosResponse<any>>(
                this.http.post<any>(url, payload, { headers: this.headers() })
            )
            return { success: true, messageId: this.extractMessageId(data), raw: data }
        } catch (error: any) {
            const resp = error?.response?.data
            const msg = (resp && (resp.message || JSON.stringify(resp))) || error?.message || "Unknown error"
            this.logger.error(`Failed to send base64 media: ${msg}`)
            return { success: false, error: msg }
        }
    }

    // Helpers
    private headers() {
        return { apikey: this.apiKey, "Content-Type": "application/json" }
    }

    private normalizeNumber(phone: string): string {
        // Evolution API expects the international number without '+' or '@c.us'
        if (!phone) {
            throw new Error("Number is required")
        }
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
