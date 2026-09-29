import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequestStatus, UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  SpeciesRequestsQuery,
  SpeciesRequestsService,
} from './species-requests.service';
import { CreateSpeciesRequestDto } from './dto/create-species-request.dto';
import { ReviewSpeciesRequestDto } from './dto/review-species-request.dto';
import { toPageInt } from '../common/pagination';

@Controller('species-requests')
export class SpeciesRequestsController {
  constructor(
    private readonly speciesRequestsService: SpeciesRequestsService,
  ) {}

  // No requestedByUserId — the requester is always @CurrentUser().
  @Roles(UserRole.FARMER)
  @UseGuards(RolesGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSpeciesRequestDto,
  ) {
    return this.speciesRequestsService.create({
      ...body,
      requestedByUserId: user.id,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('requestedByUserId') requestedByUserId?: string,
    @Query('status') status?: RequestStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: SpeciesRequestsQuery = {
      requestedByUserId,
      status,
      page: toPageInt(page),
      limit: toPageInt(limit),
    };
    return this.speciesRequestsService.findAllForViewer(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.speciesRequestsService.findOwned(id, user);
  }

  // Admin-only: the reviewer is always @CurrentUser(), never a body field.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReviewSpeciesRequestDto,
  ) {
    return this.speciesRequestsService.review(id, {
      ...body,
      reviewerId: user.id,
    });
  }
}
