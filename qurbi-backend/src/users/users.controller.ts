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
import { UserRole, UserStatus } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AdminUsersQuery, UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AcceptAgreementsDto } from './dto/accept-agreements.dto';
import { toPageInt } from '../common/pagination';

// Profile CRUD only — registration/login/password changes go through
// /auth/* (AuthModule), never here.
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin-only: an escape hatch for creating a user directly. Everyone else
  // signs up through POST /auth/register.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  // Admin-only: the full user directory is PII (email, phone, ...), not a
  // public listing.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: AdminUsersQuery = {
      role,
      status,
      page: toPageInt(page),
      limit: toPageInt(limit),
    };
    return this.usersService.findAllForAdmin(query);
  }

  @Roles(UserRole.BUYER)
  @UseGuards(RolesGuard)
  @Post('me/agreements')
  acceptAgreements(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AcceptAgreementsDto,
  ) {
    return this.usersService.acceptAgreements(user.id, body.version);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOwned(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateOwned(id, user, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.removeOwned(id, user);
  }
}
