import { Injectable, type OnModuleInit } from "@nestjs/common"
import { SendMessageDto } from "./dto"
import { ISendMessageResult, IWhatsappStatus, IQrCodeResult } from "./interfaces"
import { WhatsappClientService } from "./services/client.service"
import { WhatsappHealthService } from "./services/health.service"
import { WhatsappMessageService } from "./services/messages.service"
import { WhatsappSessionService } from "./services/session.service"
import { WhatsappFileService } from "./services/file.service"

@Injectable()
export class WhatsappService implements OnModuleInit {
    constructor(
        private readonly clientService: WhatsappClientService,
        private readonly messageService: WhatsappMessageService,
        private readonly sessionService: WhatsappSessionService,
        private readonly healthService: WhatsappHealthService,
        private readonly fileService: WhatsappFileService,
    ) { }

    async onModuleInit() {
        await this.fileService.cleanupLockFiles(this.clientService.getCurrentSessionId())
        await this.sessionService.setupClientWithListeners()
        await this.sessionService.initializeClient()
    }

    async sendMessage(dto: SendMessageDto): Promise<ISendMessageResult> {
        return this.messageService.sendMessage(dto.phoneNumber, dto.message)
    }

    async sendAttachment(phoneNumber: string, filePath: string, caption?: string): Promise<ISendMessageResult> {
        return this.messageService.sendAttachment(phoneNumber, filePath, { caption })
    }

    async sendRemoteAttachment(
        phoneNumber: string,
        url: string,
        filename: string,
        mimeType: string,
        caption?: string,
    ): Promise<ISendMessageResult> {
        return this.messageService.sendRemoteAttachment(phoneNumber, url, {
            filename,
            mimeType,
            caption,
        })
    }

    async getStatus(): Promise<IWhatsappStatus> {
        return this.sessionService.getStatus()
    }

    getStatusSync(): IWhatsappStatus {
        return this.sessionService.getStatusSync()
    }

    getLastQrCode(): string | null {
        return this.sessionService.getLastQrCode()
    }

    async requestQrCode(): Promise<IQrCodeResult> {
        return this.sessionService.requestQrCode()
    }

    async logout(): Promise<void> {
        return this.sessionService.logout()
    }

    async reconnect(): Promise<void> {
        return this.sessionService.reconnect()
    }

    async keepAlive(): Promise<void> {
        return this.healthService.keepAlive()
    }

    async runHealthCheck(): Promise<boolean> {
        return this.healthService.runHealthCheck()
    }
}
