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
  BreedRequestsQuery,
  BreedRequestsService,
} from './breed-requests.service';
import { CreateBreedRequestDto } from './dto/create-breed-request.dto';
import { ReviewBreedRequestDto } from './dto/review-breed-request.dto';
import { toPageInt } from '../common/pagination';

@Controller('breed-requests')
export class BreedRequestsController {
  constructor(private readonly breedRequestsService: BreedRequestsService) {}

  // No requestedByUserId — the requester is always @CurrentUser().
  @Roles(UserRole.FARMER)
  @UseGuards(RolesGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBreedRequestDto,
  ) {
    return this.breedRequestsService.create({
      ...body,
      requestedByUserId: user.id,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('requestedByUserId') requestedByUserId?: string,
    @Query('speciesId') speciesId?: string,
    @Query('status') status?: RequestStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: BreedRequestsQuery = {
      requestedByUserId,
      speciesId,
      status,
      page: toPageInt(page),
      limit: toPageInt(limit),
    };
    return this.breedRequestsService.findAllForViewer(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.breedRequestsService.findOwned(id, user);
  }

  // Admin-only: the reviewer is always @CurrentUser(), never a body field.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReviewBreedRequestDto,
  ) {
    return this.breedRequestsService.review(id, {
      ...body,
      reviewerId: user.id,
    });
  }
}
