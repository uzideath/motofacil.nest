import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MotorcycleService } from './motorcycle.service';
import { CreateMotorcycleDto, UpdateMotorcycleDto } from './motorcycle.dto';

@Controller('motorcycles')
export class MotorcycleController {
    constructor(private readonly service: MotorcycleService) { }

    @Post()
    create(@Body() dto: CreateMotorcycleDto) {
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
    update(@Param('id') id: string, @Body() dto: UpdateMotorcycleDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
