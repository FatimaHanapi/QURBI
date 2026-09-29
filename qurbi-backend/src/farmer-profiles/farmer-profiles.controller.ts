import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FarmerProfilesService } from './farmer-profiles.service';
import { UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateFarmerProfileDto } from './dto/create-farmer-profile.dto';
import { UpdateFarmerProfileDto } from './dto/update-farmer-profile.dto';

@Controller('farmer-profiles')
export class FarmerProfilesController {
  constructor(private readonly farmerProfilesService: FarmerProfilesService) {}

  // No userId — the owner is always the authenticated caller.
  @Roles(UserRole.FARMER)
  @UseGuards(RolesGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateFarmerProfileDto,
  ) {
    return this.farmerProfilesService.create({ ...body, userId: user.id });
  }

  // Public directory — a farm's name/address/rating is marketing info a
  // buyer needs to see before ordering, same as species/breeds reference data.
  @Get()
  findAll() {
    return this.farmerProfilesService.findAll();
  }

  @Get('by-user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.farmerProfilesService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmerProfilesService.findOne(id);
  }

  @Roles(UserRole.FARMER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateFarmerProfileDto,
  ) {
    return this.farmerProfilesService.updateOwned(id, user, body);
  }

  @Roles(UserRole.FARMER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.farmerProfilesService.removeOwned(id, user);
  }
}
