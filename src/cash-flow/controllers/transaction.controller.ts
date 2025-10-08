import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CashFlowTransactionService } from '../services/transaction.service';
import {
  CreateTransactionDto,
  CreateBatchTransactionsDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from '../dto/transaction.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';
import { LogAction, ActionType } from '../../lib/decorators/log-action.decorator';

@Controller('cash-flow/transactions')
@UseGuards()
export class CashFlowTransactionController {
  constructor(private readonly transactionService: CashFlowTransactionService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.CREATE, 'CashFlowTransaction')
  create(@Body() dto: CreateTransactionDto, @Req() req: any) {
    return this.transactionService.create(dto, req.user?.userId);
  }

  @Post('batch')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.CREATE, 'CashFlowTransaction', 'Create batch transactions')
  createBatch(@Body() dto: CreateBatchTransactionsDto, @Req() req: any) {
    return this.transactionService.createBatch(dto, req.user?.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  @LogAction(ActionType.QUERY, 'CashFlowTransaction')
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactionService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  @LogAction(ActionType.QUERY, 'CashFlowTransaction')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.UPDATE, 'CashFlowTransaction')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @LogAction(ActionType.DELETE, 'CashFlowTransaction')
  remove(@Param('id') id: string) {
    return this.transactionService.remove(id);
  }
}
