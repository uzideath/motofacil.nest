import { Controller, Post, Get, UseInterceptors } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import type { Express } from "express"
import type { WhatsappService } from "./whatsapp.service"
import type { SendMessageDto, SendAttachmentDto, SendRemoteAttachmentDto } from "./dto"

@Controller("whatsapp")
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    @Get("status")
    async getStatus() {
        return this.whatsappService.getStatus()
    }

    @Post("reconnect")
    async reconnect() {
        // This will trigger a re-initialization of the WhatsApp client
        await this.whatsappService.onModuleInit()
        return { success: true }
    }

    @Post("send-message")
    async sendMessage(sendMessageDto: SendMessageDto) {
        return this.whatsappService.sendMessage(sendMessageDto)
    }

    @Post("send-attachment")
    @UseInterceptors(FileInterceptor("file"))
    async sendAttachment(file: Express.Multer.File, sendAttachmentDto: SendAttachmentDto) {
        return this.whatsappService.sendAttachment(sendAttachmentDto.phoneNumber, file.path, sendAttachmentDto.caption)
    }

    @Post("send-remote-attachment")
    async sendRemoteAttachment(dto: SendRemoteAttachmentDto) {
        return this.whatsappService.sendRemoteAttachment(dto.phoneNumber, dto.url, dto.filename, dto.mimeType, dto.caption)
    }

    @Post("logout")
    async logout() {
        await this.whatsappService.logout()
        return { success: true, message: "Logged out successfully" }
    }
}
