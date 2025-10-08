import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CashFlowRuleService } from '../services/rule.service';
import { CreateRuleDto, UpdateRuleDto, DryRunRuleDto } from '../dto/rule.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';
import { LogAction, ActionType } from '../../lib/decorators/log-action.decorator';

@Controller('cash-flow/rules')
@UseGuards()
export class CashFlowRuleController {
  constructor(private readonly ruleService: CashFlowRuleService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.CREATE, 'CashFlowRule')
  create(@Body() dto: CreateRuleDto, @Req() req: any) {
    return this.ruleService.create(dto, req.user?.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  @LogAction(ActionType.QUERY, 'CashFlowRule')
  findAll() {
    return this.ruleService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  @LogAction(ActionType.QUERY, 'CashFlowRule')
  findOne(@Param('id') id: string) {
    return this.ruleService.findOne(id);
  }

  @Post('dry-run')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.CUSTOM, 'CashFlowRule', 'Dry run rule')
  dryRun(@Body() dto: DryRunRuleDto) {
    return this.ruleService.dryRun(dto);
  }

  @Post('apply/:transactionId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.CUSTOM, 'CashFlowRule', 'Apply rules to transaction')
  applyToTransaction(@Param('transactionId') transactionId: string) {
    return this.ruleService.applyRulesToTransaction(transactionId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @LogAction(ActionType.UPDATE, 'CashFlowRule')
  update(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.ruleService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @LogAction(ActionType.DELETE, 'CashFlowRule')
  remove(@Param('id') id: string) {
    return this.ruleService.remove(id);
  }
}
