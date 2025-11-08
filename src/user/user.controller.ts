import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @LogAction(ActionType.CREATE, 'User')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'User')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @LogAction(ActionType.QUERY, 'User')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @LogAction(ActionType.UPDATE, 'User')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @LogAction(ActionType.DELETE, 'User')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
