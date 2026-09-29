import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from '../orders/orders.service';
import { OrderTrackingEventsService } from './order-tracking-events.service';
import { CreateOrderTrackingEventDto } from './dto/create-order-tracking-event.dto';

@Controller('order-tracking-events')
export class OrderTrackingEventsController {
  constructor(
    private readonly orderTrackingEventsService: OrderTrackingEventsService,
    private readonly ordersService: OrdersService,
  ) {}

  // OrdersService.findOne enforces buyer/farmer/admin party membership (404
  // for anyone else) before we ever touch this order's tracking timeline.
  @Get()
  async findAllForOrder(
    @Query('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.ordersService.findOne(orderId, user);
    return this.orderTrackingEventsService.findAllForOrder(orderId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const event = await this.orderTrackingEventsService.findOne(id);
    await this.ordersService.findOne(event.orderId, user);
    return event;
  }

  // Delegates to OrdersService.updateStatus, which is now the admin-only
  // generic status writer — so this route is admin-only too, for the same
  // reason. Farmer/buyer fulfilment actions go through their own dedicated
  // orders/* endpoints instead.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrderTrackingEventDto,
  ) {
    const { orderId, status, ...opts } = body;
    return this.ordersService.updateStatus(orderId, status, {
      ...opts,
      userId: user.id,
    });
  }
}
