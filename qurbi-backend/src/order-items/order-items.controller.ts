import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { OrderItemsService } from './order-items.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Controller('order-items')
export class OrderItemsController {
  constructor(
    private readonly orderItemsService: OrderItemsService,
    private readonly ordersService: OrdersService,
  ) {}

  // OrdersService.findOne enforces buyer/farmer/admin party membership (404
  // for anyone else) before we ever touch this order's items.
  @Get()
  async findAllForOrder(
    @Query('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.ordersService.findOne(orderId, user);
    return this.orderItemsService.findAllForOrder(orderId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.orderItemsService.findOne(id);
    await this.ordersService.findOne(item.orderId, user);
    return item;
  }
}
