import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// The owner is always the authenticated caller — never a query/body field.
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAddressDto,
  ) {
    return this.addressesService.create({ ...body, userId: user.id });
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findOwned(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAddressDto,
  ) {
    return this.addressesService.updateOwned(id, user, body);
  }

  @Patch(':id/set-default')
  setDefault(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.setDefault(user, id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.removeOwned(id, user);
  }
}
