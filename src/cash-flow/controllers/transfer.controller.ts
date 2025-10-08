import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CashFlowTransferService } from '../services/transfer.service';
import { CreateTransferDto } from '../dto/transfer.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@Controller('cash-flow/transfers')
@UseGuards()
export class CashFlowTransferController {
  constructor(private readonly transferService: CashFlowTransferService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MODERATOR)
  create(@Body() dto: CreateTransferDto, @Req() req: any) {
    return this.transferService.create(dto, req.user?.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.transferService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  findOne(@Param('id') id: string) {
    return this.transferService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.transferService.remove(id);
  }
}
