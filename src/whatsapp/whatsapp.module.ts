import { Module } from "@nestjs/common"
import { WhatsappService } from "./whatsapp.service"
import { WhatsappController } from "./whatsapp.controller"
import { WhatsappGateway } from "./whatsapp.gateway"
import { MulterModule } from "@nestjs/platform-express"
import { diskStorage } from "multer"
import { extname } from "path"
import { WhatsappClientService } from "./services/client.service"
import { WhatsappFileService } from "./services/file.service"
import { WhatsappHealthService } from "./services/health.service"
import { WhatsappMessageService } from "./services/messages.service"
import { WhatsappSessionService } from "./services/session.service"

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
          const ext = extname(file.originalname)
          const filename = `${uniqueSuffix}${ext}`
          callback(null, filename)
        },
      }),
    }),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappClientService, WhatsappFileService, WhatsappHealthService, WhatsappMessageService, WhatsappSessionService, WhatsappService, WhatsappGateway],
  exports: [WhatsappService, WhatsappGateway],
})
export class WhatsappModule { }
