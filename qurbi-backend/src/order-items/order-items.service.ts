import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../entities';

// Read-only: rows are only ever created as part of Order.checkout(), which
// snapshots price/title/image at purchase time. There is deliberately no
// create/update/remove exposed here.
@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly repository: Repository<OrderItem>,
  ) {}

  findAllForOrder(orderId: string): Promise<OrderItem[]> {
    return this.repository.find({ where: { orderId } });
  }

  async findOne(id: string): Promise<OrderItem> {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`OrderItem ${id} not found`);
    return item;
  }
}
