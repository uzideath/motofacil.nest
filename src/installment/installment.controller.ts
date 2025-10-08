import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { InstallmentService } from './installment.service';
import { CreateInstallmentDto, FindInstallmentFiltersDto, UpdateInstallmentDto } from './installment.dto';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('installments')
export class InstallmentController {
  constructor(private readonly service: InstallmentService) { }

  @Post()
  @LogAction(ActionType.CREATE, 'Installment')
  create(@Body() dto: CreateInstallmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'Installment')
  findAll(@Query() filters: FindInstallmentFiltersDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @LogAction(ActionType.QUERY, 'Installment')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @LogAction(ActionType.UPDATE, 'Installment')
  update(@Param('id') id: string, @Body() dto: UpdateInstallmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @LogAction(ActionType.DELETE, 'Installment')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
