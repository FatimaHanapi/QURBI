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
import { UserRole, VerificationStatus } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  FarmVerificationsQuery,
  FarmVerificationsService,
} from './farm-verifications.service';
import { SubmitFarmVerificationDto } from './dto/submit-farm-verification.dto';
import { ReviewFarmVerificationDto } from './dto/review-farm-verification.dto';
import { toPageInt } from '../common/pagination';

@Controller('farm-verifications')
export class FarmVerificationsController {
  constructor(
    private readonly farmVerificationsService: FarmVerificationsService,
  ) {}

  // No farmerProfileId — always resolved from the authenticated caller's own profile.
  @Roles(UserRole.FARMER)
  @UseGuards(RolesGuard)
  @Post()
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SubmitFarmVerificationDto,
  ) {
    return this.farmVerificationsService.submitForViewer(user, body);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('farmerProfileId') farmerProfileId?: string,
    @Query('status') status?: VerificationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: FarmVerificationsQuery = {
      farmerProfileId,
      status,
      page: toPageInt(page),
      limit: toPageInt(limit),
    };
    return this.farmVerificationsService.findAllForViewer(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.farmVerificationsService.findOwned(id, user);
  }

  // Admin-only: the reviewer is always @CurrentUser(), never a body field.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReviewFarmVerificationDto,
  ) {
    return this.farmVerificationsService.review(id, {
      ...body,
      reviewerId: user.id,
    });
  }

  // Admin-only: this is the audit trail of every submission attempt, not a
  // farmer's own record to discard.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmVerificationsService.remove(id);
  }
}
