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

@Controller('installments')
export class InstallmentController {
  constructor(private readonly service: InstallmentService) { }

  @Post()
  create(@Body() dto: CreateInstallmentDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() filters: FindInstallmentFiltersDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInstallmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post("migrate-payment-dates")
  async migrateDates() {
    return this.service.migrateInstallmentDates()
  }
}
