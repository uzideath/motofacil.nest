// cloudinary.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { randomUUID } from 'crypto'
import { Readable } from 'stream'

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
            api_key: process.env.CLOUDINARY_API_KEY!,
            api_secret: process.env.CLOUDINARY_API_SECRET!,
        })
    }

    async uploadImageBuffer(buffer: Buffer, folder = 'expenses'): Promise<string> {
        const publicId = randomUUID()

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: publicId,
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error || !result) {
                        console.error('[Cloudinary Upload Error]', error)
                        return reject(new InternalServerErrorException('Error uploading image'))
                    }
                    resolve(result.secure_url)
                }
            )

            Readable.from(buffer).pipe(uploadStream)
        })
    }

    async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId)
        } catch (error) {
            console.error('[Cloudinary Deletion Error]', error)
            throw new InternalServerErrorException('Error deleting image')
        }
    }
}
