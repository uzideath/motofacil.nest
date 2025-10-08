import { Controller, Post, Get, Body, UseInterceptors, UploadedFile } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import type { Express } from "express"
import type { SendMessageDto, SendAttachmentDto, SendRemoteAttachmentDto, SendBase64MediaDto } from "./dto"
import { WhatsappService } from "./whatsapp.service"
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller("whatsapp")
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    @Get("status")
    @LogAction(ActionType.QUERY, 'WhatsApp', 'Get WhatsApp status')
    async getStatus() {
        return this.whatsappService.getStatus()
    }

    @Post("send-message")
    @LogAction(ActionType.CUSTOM, 'WhatsApp', 'Send WhatsApp message')
    async sendMessage(@Body() sendMessageDto: SendMessageDto) {
        return this.whatsappService.sendMessage(sendMessageDto)
    }

    @Post("send-attachment")
    @UseInterceptors(FileInterceptor("file"))
    @LogAction(ActionType.CUSTOM, 'WhatsApp', 'Send WhatsApp attachment')
    async sendAttachment(@UploadedFile() file: Express.Multer.File, @Body() sendAttachmentDto: SendAttachmentDto) {
        return this.whatsappService.sendAttachment(sendAttachmentDto.number, file.path, sendAttachmentDto.caption)
    }

    @Post("send-remote-attachment")
    @LogAction(ActionType.CUSTOM, 'WhatsApp', 'Send remote attachment')
    async sendRemoteAttachment(@Body() dto: SendRemoteAttachmentDto) {
        return this.whatsappService.sendRemoteAttachment(dto.number, dto.url, dto.filename, dto.mimeType, dto.caption)
    }

    @Post("send-media-base64")
    @LogAction(ActionType.CUSTOM, 'WhatsApp', 'Send media base64')
    async sendMediaBase64(@Body() dto: SendBase64MediaDto) {
        return this.whatsappService.sendMediaBase64(dto)
    }
}
