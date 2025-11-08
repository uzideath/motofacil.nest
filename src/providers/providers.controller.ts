import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @LogAction(ActionType.CREATE, 'Provider')
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(createProviderDto);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'Provider')
  findAll() {
    return this.providersService.findAll();
  }

  @Get('stats')
  @LogAction(ActionType.QUERY, 'Provider', 'Get provider statistics')
  getProvidersStats() {
    return this.providersService.getProvidersStats();
  }

  @Get(':id')
  @LogAction(ActionType.QUERY, 'Provider')
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Get(':id/details')
  @LogAction(ActionType.QUERY, 'Provider', 'Get provider details')
  getProviderDetails(@Param('id') id: string) {
    return this.providersService.getProviderDetails(id);
  }

  @Patch(':id')
  @LogAction(ActionType.UPDATE, 'Provider')
  update(@Param('id') id: string, @Body() updateProviderDto: UpdateProviderDto) {
    return this.providersService.update(id, updateProviderDto);
  }

  @Delete(':id')
  @LogAction(ActionType.DELETE, 'Provider')
  remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }
}
