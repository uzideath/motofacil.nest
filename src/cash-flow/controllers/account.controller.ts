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
import { CashFlowAccountService } from '../services/account.service';
import { CreateAccountDto, UpdateAccountDto, AccountQueryDto } from '../dto/account.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@Controller('cash-flow/accounts')
@UseGuards()
export class CashFlowAccountController {
  constructor(private readonly accountService: CashFlowAccountService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MODERATOR)
  create(@Body() dto: CreateAccountDto, @Req() req: any) {
    return this.accountService.create(dto, req.user?.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  findAll(@Query() query: AccountQueryDto) {
    return this.accountService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(id);
  }

  @Get(':id/balance')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  getBalance(@Param('id') id: string, @Query('asOfDate') asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.accountService.getBalance(id, date);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.accountService.remove(id);
  }
}
