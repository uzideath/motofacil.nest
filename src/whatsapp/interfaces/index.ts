import type { Client } from "whatsapp-web.js"

export interface IWhatsappClientService {
    getClient(): Client | null
    isReady(): boolean
    setReady(ready: boolean): void
    createClient(): Client
    initialize(): Promise<void>
    destroy(): Promise<void>
    getState(): Promise<string>
    getInfo(): any
    regenerateSessionId(): string
    getCurrentSessionId(): string
}

export interface IWhatsappFileService {
    cleanupLockFiles(sessionId: string): Promise<void>
    fileExists(filePath: string): boolean
}

export interface IWhatsappHealthService {
    keepAlive(): Promise<void>
    handleKeepAlive(): Promise<void>
    runHealthCheck(): Promise<boolean>
}

export interface ISendMessageResult {
    success: boolean
    messageId?: string
    error?: string
}

export interface ISendAttachmentOptions {
    caption?: string
}

export interface ISendRemoteAttachmentOptions extends ISendAttachmentOptions {
    filename: string
    mimeType: string
}

export interface IWhatsappMessageService {
    sendMessage(phoneNumber: string, message: string): Promise<ISendMessageResult>
    sendAttachment(phoneNumber: string, filePath: string, options?: ISendAttachmentOptions): Promise<ISendMessageResult>
    sendRemoteAttachment(
        phoneNumber: string,
        url: string,
        options: ISendRemoteAttachmentOptions,
    ): Promise<ISendMessageResult>
    formatPhoneNumber(phoneNumber: string): string
    isSessionError(error: any): boolean
}

export interface IWhatsappStatus {
    isReady: boolean
    info: any | null
}

export interface IQrCodeResult {
    success: boolean
    message?: string
    error?: string
}

export interface IWhatsappSessionService {
    getStatus(): Promise<IWhatsappStatus>
    getStatusSync(): IWhatsappStatus
    getLastQrCode(): string | null
    setQrCode(qrCode: string | null): void
    requestQrCode(): Promise<IQrCodeResult>
    logout(): Promise<void>
    reconnect(): Promise<void>
    setupClientWithListeners(): Promise<void>
    handleQrCodeSafely(qr: string): void
    initializeClient(): Promise<void>
}
