import { Controller, Post, Body, Get, UseInterceptors, UploadedFile } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import type { Express } from "express"
import { WhatsappService } from "./whatsapp.service"
import { SendMessageDto, SendAttachmentDto, SendRemoteAttachmentDto } from "./dto"


@Controller("whatsapp")
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    @Get("status")
    async getStatus() {
        return this.whatsappService.getStatus()
    }

    @Post('send-message')
    async sendMessage(@Body() sendMessageDto: SendMessageDto) {
        return this.whatsappService.sendMessage(sendMessageDto);
    }

    @Post("send-attachment")
    @UseInterceptors(FileInterceptor("file"))
    async sendAttachment(@UploadedFile() file: Express.Multer.File, @Body() sendAttachmentDto: SendAttachmentDto) {
        return this.whatsappService.sendAttachment(sendAttachmentDto.phoneNumber, file.path, sendAttachmentDto.caption)
    }

    @Post('send-remote-attachment')
    async sendRemoteAttachment(@Body() dto: SendRemoteAttachmentDto) {
        return this.whatsappService.sendRemoteAttachment(
            dto.phoneNumber,
            dto.url,
            dto.filename,
            dto.mimeType,
            dto.caption,
        );
    }

    @Post("logout")
    async logout() {
        await this.whatsappService.logout()
        return { success: true, message: "Logged out successfully" }
    }
}
