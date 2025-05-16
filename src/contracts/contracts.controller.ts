// src/contract/contract.controller.ts
import {
    Controller,
    Post,
    Body,
    Res,
    HttpCode,
    Header,
} from '@nestjs/common'
import { Response } from 'express'
import { ContractService } from './contracts.service'
import { CreateContractDto } from './dto'
import { Public } from 'src/auth/decorators/public.decorator'


@Controller('contract')
export class ContractController {
    constructor(private readonly contractService: ContractService) { }

    @Post()
    @Public()
    @HttpCode(200)
    @Header('Content-Type', 'application/pdf')
    @Header('Content-Disposition', 'inline; filename=contract.pdf')
    async generateContract(@Body() dto: CreateContractDto, @Res() res: Response) {
        const pdf = await this.contractService.generateContract(dto)
        res.end(pdf)
    }
}
