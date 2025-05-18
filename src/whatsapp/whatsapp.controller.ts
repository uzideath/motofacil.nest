import { Controller, Post, Get, Body, UseInterceptors, UploadedFile } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import type { Express } from "express"
import { SendMessageDto, SendRemoteAttachmentDto } from "./dto"
import { WhatsappService } from "./whatsapp.service"

@Controller("whatsapp")
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    @Get("status")
    async getStatus() {
        return this.whatsappService.getStatus()
    }

    @Post("reconnect")
    async reconnect() {
        await this.whatsappService.reconnect()
        return { success: true, message: "Reconexión iniciada" }
    }

    @Post("send-message")
    async sendMessage(@Body() sendMessageDto: SendMessageDto) {
        return this.whatsappService.sendMessage(sendMessageDto)
    }

    @Post("send-attachment")
    @UseInterceptors(FileInterceptor("file"))
    async sendAttachment(@UploadedFile() file: Express.Multer.File, @Body() sendAttachmentDto: any) {
        return this.whatsappService.sendAttachment(sendAttachmentDto.phoneNumber, file.path, sendAttachmentDto.caption)
    }

    @Post("send-remote-attachment")
    async sendRemoteAttachment(@Body() dto: SendRemoteAttachmentDto) {
        return this.whatsappService.sendRemoteAttachment(dto.phoneNumber, dto.url, dto.filename, dto.mimeType, dto.caption)
    }

    @Post("logout")
    async logout() {
        await this.whatsappService.logout()
        return { success: true, message: "Logged out successfully" }
    }
}
