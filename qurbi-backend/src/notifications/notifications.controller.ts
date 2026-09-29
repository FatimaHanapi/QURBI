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
import { UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationAudienceDto } from './dto/notification-audience.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Admin-only: pushing a notification to an arbitrary user is a
  // privileged/system action, not something a user does to their own resource.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() body: CreateNotificationDto) {
    return this.notificationsService.create(body);
  }

  @Get()
  findInbox(
    @CurrentUser() user: AuthenticatedUser,
    @Query('audience') audience: NotificationAudienceDto['audience'],
  ) {
    return this.notificationsService.findInbox(user.id, audience);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: NotificationAudienceDto,
  ) {
    return this.notificationsService.markAllRead(user.id, body.audience);
  }

  @Patch(':id/clear')
  clear(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.clear(id, user);
  }

  @Patch('clear-all')
  clearAll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: NotificationAudienceDto,
  ) {
    return this.notificationsService.clearAll(user.id, body.audience);
  }
}
