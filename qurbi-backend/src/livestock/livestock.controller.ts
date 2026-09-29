import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Livestock, UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LivestockQuery, LivestockService } from './livestock.service';
import { CreateLivestockDto } from './dto/create-livestock.dto';
import { UpdateLivestockDto } from './dto/update-livestock.dto';
import { SetMarketplaceBlockDto } from './dto/set-marketplace-visibility.dto';
import { SetFeaturedDto } from './dto/set-featured.dto';
import { toPageInt } from '../common/pagination';
import { Public } from '../auth/decorators/public.decorator';

function toBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

@Controller('livestock')
export class LivestockController {
  constructor(private readonly livestockService: LivestockService) {}

  // Farmer-only: the owner is always the authenticated caller, never a body field.
  @Roles(UserRole.FARMER)
  @UseGuards(RolesGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateLivestockDto) {
    return this.livestockService.createForFarmer(user.id, body);
  }

  // Public browse for buyers, own-inventory for farmers, everything for
  // admins — see LivestockService.findAllForViewer. Paginated the same way
  // as the other admin lists, since admins use this same route with
  // farmerId/status/adminBlocked filters rather than a separate endpoint.
  @Public()
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('farmerId') farmerId?: string,
    @Query('speciesId') speciesId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: Livestock['status'],
    @Query('adminBlocked') adminBlocked?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: LivestockQuery = {
      farmerId,
      speciesId,
      categoryId,
      status,
      adminBlocked: toBoolean(adminBlocked),
      page: toPageInt(page),
      limit: toPageInt(limit),
    };
    return this.livestockService.findAllForViewer(query, user);
  }

  @Get(':id/availability')
  availability(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livestockService.availability(id, user);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.livestockService.findOneForViewer(id, user);
  }


  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: UpdateLivestockDto) {
    return this.livestockService.updateOwned(id, user, body);
  }

  // Admin override, independent of however visibility normally gets derived —
  // records why, so a forced-hidden listing isn't a silent mystery later.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/marketplace-visibility')
  setMarketplaceBlock(@Param('id') id: string, @Body() body: SetMarketplaceBlockDto) {
    return this.livestockService.setMarketplaceBlock(id, body.blocked, body.reason ?? null);
  }

  // Admin-only: homepage curation, same pattern as the block endpoint above.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/featured')
  setFeatured(@Param('id') id: string, @Body() body: SetFeaturedDto) {
    return this.livestockService.setFeatured(id, body.featured);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livestockService.removeOwned(id, user);
  }
}
