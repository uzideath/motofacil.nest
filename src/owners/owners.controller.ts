import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';


@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) { }

  @Get()
  list() {
    return this.ownersService.list();
  }

  @Post()
  create(@Body() dto: CreateOwnerDto) {
    return this.ownersService.create(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ownersService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOwnerDto) {
    return this.ownersService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.ownersService.delete(id);
  }
}
