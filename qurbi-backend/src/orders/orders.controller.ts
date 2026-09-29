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
import { OrderStatus, UserRole } from '../entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AdminOrdersQuery, OrdersService } from './orders.service';
import { toPageInt } from '../common/pagination';
import { CheckoutDto } from './dto/checkout.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { SetOrderStatusDto } from './dto/set-order-status.dto';
import { MarkReceivedDto } from './dto/mark-received.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { ReviewRefundDto } from './dto/review-refund.dto';
import { HideFromBuyerHistoryDto } from './dto/hide-from-buyer-history.dto';
import { Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  // The buyer is always the authenticated caller — never a body field.
  @Roles(UserRole.BUYER)
  @UseGuards(RolesGuard)
  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() body: CheckoutDto) {
    return this.ordersService.checkout(user.id, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === UserRole.BUYER)
      return this.ordersService.findAllForBuyer(user.id);
    if (user.role === UserRole.FARMER)
      return this.ordersService.findAllForFarmer(user.id);
    return []; // admins use GET /orders/admin instead
  }

  // Registered before ':id' so the literal path "admin" is matched here, not
  // swallowed by the :id param route below.
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin')
  findAllForAdmin(
    @Query('status') status?: OrderStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: AdminOrdersQuery = {
      status,
      dateFrom,
      dateTo,
      page: toPageInt(page),
      limit: toPageInt(limit),
    };
    return this.ordersService.findAllForAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findOne(id, user);
  }

  // Admin-only generic escape hatch — still bound by the transition table
  // inside OrdersService (see applyStatusChange).
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: SetOrderStatusDto) {
    return this.ordersService.updateStatus(id, body.status, body);
  }

  // Farmer (own order) or admin, moving one step along the fulfilment track.
  @Patch(':id/advance')
  advance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetOrderStatusDto,
  ) {
    const { status, ...opts } = body;
    return this.ordersService.advanceStatus(id, user, status, opts);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CancelOrderDto,
  ) {
    return this.ordersService.cancel(id, user, body.reason);
  }

  @Public()
  @Post(':id/payment-webhook')
  paymentWebhook(
    @Param('id') id: string,
    @Headers('x-qurbi-payment-webhook-secret')
    suppliedSecret: string | undefined,
    @Body() body: { providerReference?: string },
  ) {
    const expectedSecret = this.configService.get<string>(
      'PAYMENT_WEBHOOK_SECRET',
    );
    if (!expectedSecret || suppliedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid payment webhook signature');
    }
    return this.ordersService.completePaymentFromWebhook(
      id,
      body.providerReference,
    );
  }

  @Roles(UserRole.BUYER)
  @UseGuards(RolesGuard)
  @Post(':id/payment-failed')
  paymentFailed(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.markPaymentFailed(id, user);
  }

  @Patch(':id/received')
  markReceived(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: MarkReceivedDto,
  ) {
    return this.ordersService.markReceived(id, user, body.proofImages);
  }

  @Patch(':id/refund-request')
  requestRefund(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RequestRefundDto,
  ) {
    return this.ordersService.requestRefund(id, user, body.reason);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/refund-review')
  reviewRefund(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReviewRefundDto,
  ) {
    return this.ordersService.reviewRefund(id, user, body);
  }

  @Patch(':id/hide-from-buyer-history')
  hideFromBuyerHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: HideFromBuyerHistoryDto,
  ) {
    return this.ordersService.hideFromBuyerHistory(id, user, body.hidden);
  }
}
