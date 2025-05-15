import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InstallmentService } from './installment.service';
import { CreateInstallmentDto, UpdateInstallmentDto } from './installment.dto';

@Controller('installments')
export class InstallmentController {
  constructor(private readonly service: InstallmentService) {}

  @Post()
  create(@Body() dto: CreateInstallmentDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
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
}
