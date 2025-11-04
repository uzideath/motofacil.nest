import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto, UpdateVehicleDto, FindVehicleFiltersDto } from './vehicle.dto';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('vehicles')
export class VehicleController {
  constructor(private readonly service: VehicleService) {}

  @Post()
  @LogAction(ActionType.CREATE, 'Vehicle')
  create(@Body() dto: CreateVehicleDto) {
    // TODO: Get storeId from authenticated user context via @UserStoreId() decorator
    // For now, require it in the DTO
    if (!dto.storeId) {
      throw new Error('storeId is required');
    }
    return this.service.create(dto, dto.storeId);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'Vehicle')
  findAll(@Query() filters: FindVehicleFiltersDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @LogAction(ActionType.QUERY, 'Vehicle')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @LogAction(ActionType.UPDATE, 'Vehicle')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @LogAction(ActionType.DELETE, 'Vehicle')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
