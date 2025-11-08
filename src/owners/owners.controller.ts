import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';


@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) { }

  @Get()
  @LogAction(ActionType.QUERY, 'Owner')
  list() {
    return this.ownersService.list();
  }

  @Post()
  @LogAction(ActionType.CREATE, 'Owner')
  create(@Body() dto: CreateOwnerDto) {
    return this.ownersService.create(dto);
  }

  @Get(':id')
  @LogAction(ActionType.QUERY, 'Owner')
  findById(@Param('id') id: string) {
    return this.ownersService.findById(id);
  }

  @Put(':id')
  @LogAction(ActionType.UPDATE, 'Owner')
  update(@Param('id') id: string, @Body() dto: UpdateOwnerDto) {
    return this.ownersService.update(id, dto);
  }

  @Delete(':id')
  @LogAction(ActionType.DELETE, 'Owner')
  delete(@Param('id') id: string) {
    return this.ownersService.delete(id);
  }
}
