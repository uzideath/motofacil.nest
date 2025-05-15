import { Controller, Get } from '@nestjs/common';
import { OwnersService } from './owners.service';

@Controller('owners')
export class OwnersController {
  constructor(private readonly ownerService: OwnersService) {}

  @Get()
  list() {
    return this.ownerService.list();
  }
}
