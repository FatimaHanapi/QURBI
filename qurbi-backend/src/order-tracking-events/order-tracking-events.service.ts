import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderTrackingEvent } from '../entities';

// Append-only: rows are written exclusively through OrdersService.updateStatus,
// so every event is tied to a real status transition. No update/remove here —
// the timeline must never be edited after the fact.
@Injectable()
export class OrderTrackingEventsService {
  constructor(
    @InjectRepository(OrderTrackingEvent)
    private readonly repository: Repository<OrderTrackingEvent>,
  ) {}

  findAllForOrder(orderId: string): Promise<OrderTrackingEvent[]> {
    return this.repository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<OrderTrackingEvent> {
    const event = await this.repository.findOne({ where: { id } });
    if (!event)
      throw new NotFoundException(`OrderTrackingEvent ${id} not found`);
    return event;
  }
}
