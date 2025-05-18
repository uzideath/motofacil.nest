import { Injectable, Logger } from "@nestjs/common"
import * as fs from "fs"
import * as path from "path"
import { promisify } from "util"
import { exec } from "child_process"
import { IWhatsappFileService } from "../interfaces"
const execAsync = promisify(exec)

@Injectable()
export class WhatsappFileService implements IWhatsappFileService {
    private readonly logger = new Logger(WhatsappFileService.name)

    async cleanupLockFiles(sessionId: string): Promise<void> {
        try {
            this.logger.log("Cleaning up lock files...")

            const sessionDir = `/app/.wwebjs_auth/session-${sessionId}`

            // Create directory if it doesn't exist
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true })
            }

            // Check and remove lock files
            const lockFiles = ["SingletonLock", "SingletonCookie", "SingletonSocket"]
            for (const file of lockFiles) {
                const lockFilePath = path.join(sessionDir, file)
                if (fs.existsSync(lockFilePath)) {
                    fs.unlinkSync(lockFilePath)
                    this.logger.log(`Lock file removed: ${lockFilePath}`)
                }
            }

            // Set permissions
            await execAsync(`chmod -R 777 ${sessionDir}`)

            this.logger.log("Lock file cleanup completed")
        } catch (error) {
            this.logger.error(`Error cleaning up lock files: ${error.message}`)
            throw error
        }
    }

    fileExists(filePath: string): boolean {
        return fs.existsSync(filePath)
    }
}
