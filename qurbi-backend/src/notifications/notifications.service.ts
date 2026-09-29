import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationAudience, UserRole } from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class NotificationsService extends BaseCrudService<Notification> {
  constructor(
    @InjectRepository(Notification) repository: Repository<Notification>,
  ) {
    super(repository);
  }

  // audience keeps a buyer's and farmer's inboxes separate for someone who is
  // both, and isCleared excludes anything the user already "cleared".
  findInbox(
    userId: string,
    audience: NotificationAudience,
  ): Promise<Notification[]> {
    return this.repository.find({
      where: { userId, audience, isCleared: false },
      order: { createdAt: 'DESC' },
    });
  }

  // Fetches a notification and confirms `viewer` owns it (or is an admin).
  // Anyone else gets the exact same 404 a made-up id would return.
  private async findOwned(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Notification> {
    const notification = await this.findOne(id);
    if (viewer.role !== UserRole.ADMIN && notification.userId !== viewer.id) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }

  async markRead(id: string, viewer: AuthenticatedUser): Promise<Notification> {
    await this.findOwned(id, viewer);
    await this.repository.update(id, { isRead: true, readAt: new Date() });
    return this.findOne(id);
  }

  async markAllRead(
    userId: string,
    audience: NotificationAudience,
  ): Promise<void> {
    await this.repository.update(
      { userId, audience, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  // Soft delete — "clear all" must never destroy the underlying record.
  async clear(id: string, viewer: AuthenticatedUser): Promise<Notification> {
    await this.findOwned(id, viewer);
    await this.repository.update(id, { isCleared: true });
    return this.findOne(id);
  }

  async clearAll(
    userId: string,
    audience: NotificationAudience,
  ): Promise<void> {
    await this.repository.update({ userId, audience }, { isCleared: true });
  }
}
