import { IsNotEmpty, IsOptional, IsString, IsUrl, Matches } from "class-validator"

export class SendAttachmentDto {
    @IsNotEmpty()
    @IsString()
    @Matches(/^\+?[0-9]{10,15}$/, {
        message: "Phone number must be between 10 and 15 digits, optionally starting with +",
    })
    phoneNumber: string

    @IsOptional()
    @IsString()
    caption?: string
}

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    @Matches(/^\+?[0-9]{10,15}$/, {
        message: "Phone number must be between 10 and 15 digits, optionally starting with +",
    })
    phoneNumber: string

    @IsNotEmpty()
    @IsString()
    message: string
}

export class SendRemoteAttachmentDto {
    @IsNotEmpty()
    @IsString()
    @Matches(/^\+?[0-9]{10,15}$/, {
        message: "Phone number must be between 10 and 15 digits, optionally starting with +",
    })
    phoneNumber: string

    @IsNotEmpty()
    @IsUrl()
    url: string

    @IsNotEmpty()
    @IsString()
    filename: string

    @IsNotEmpty()
    @IsString()
    mimeType: string

    @IsOptional()
    @IsString()
    caption?: string
}
