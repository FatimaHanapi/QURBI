import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BulkListing, UserRole } from '../entities';
import { stripUndefined } from '../common/strip-undefined';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { BulkListingsService } from './bulk-listings.service';
import { CreateBulkListingDto } from './dto/create-bulk-listing.dto';
import { UpdateBulkListingDto } from './dto/update-bulk-listing.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('bulk-listings')
export class BulkListingsController {
  constructor(private readonly bulkListingsService: BulkListingsService) {}

  // Farmer-only: the owner is always the authenticated caller, never a body field.
  @Roles(UserRole.FARMER)
  @UseGuards(RolesGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBulkListingDto,
  ) {
    return this.bulkListingsService.createForFarmer(user.id, body);
  }

  @Public()
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('farmerId') farmerId?: string,
    @Query('status') status?: BulkListing['status'],
  ) {
    return this.bulkListingsService.findAllForViewer(
      stripUndefined({ farmerId, status }),
      user,
    );
  }

  @Public()
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.bulkListingsService.findOneForViewer(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateBulkListingDto,
  ) {
    return this.bulkListingsService.updateOwned(id, user, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bulkListingsService.removeOwned(id, user);
  }
}
