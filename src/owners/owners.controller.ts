
import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { CreateOwnerDto } from './dto';

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

  @Patch(':id/last-access')
  updateLastAccess(@Param('id') id: string) {
    return this.ownersService.updateLastAccess(id);
  }
}
