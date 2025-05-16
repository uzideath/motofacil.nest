// src/contract/contract.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import * as JsReport from 'jsreport-core'
import { CreateContractDto } from './dto'
import { contractTemplate } from './contract'


@Injectable()
export class ContractService implements OnModuleDestroy {
    private readonly jr = JsReport()
    private readonly init = this.jr
        .use(require('jsreport-handlebars')())
        .use(require('jsreport-chrome-pdf')())
        .init()

    async generateContract(dto: CreateContractDto): Promise<Buffer> {
        await this.init

        const html = contractTemplate
        const { content } = await this.jr.render({
            template: {
                content: html,
                engine: 'handlebars',
                recipe: 'chrome-pdf',
                chrome: {
                    format: 'A4',
                    marginTop: '10mm',
                    marginBottom: '10mm',
                    marginLeft: '10mm',
                    marginRight: '10mm',
                    printBackground: true,
                },
            },
            data: {
                ...dto,
                date: this.formatDate(dto.date),
            },
        } as any)

        return content
    }

    private formatDate(dateString: string): string {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(date)
    }

    async onModuleDestroy() {
        await this.jr.close()
    }
}
