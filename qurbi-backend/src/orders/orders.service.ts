import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, DeepPartial, EntityManager, FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  BulkListing,
  CartItem,
  DeliveryAddressSnapshot,
  DeliveryMethod,
  Livestock,
  Order,
  OrderItem,
  OrderItemType,
  OrderStatus,
  OrderTrackingEvent,
  PaymentStatus,
  Payment,
  RefundStatus,
  UserRole,
} from '../entities';
import { createHash } from 'crypto';
import { CartsService } from '../carts/carts.service';
import { LivestockService } from '../livestock/livestock.service';
import { BulkListingsService } from '../bulk-listings/bulk-listings.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Paginated, PageQuery, resolvePage } from '../common/pagination';
import { ReservationsService } from '../reservations/reservations.service';

export interface CheckoutInput {
  deliveryMethod: DeliveryMethod;
  deliveryAddress: DeliveryAddressSnapshot;
  scheduledDate?: string;
  buyerNotes?: string;
}

export interface AdminOrdersQuery extends PageQuery {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

export type PaginatedOrders = Paginated<Order>;

type Actor = AuthenticatedUser;
type Party = 'buyer' | 'farmer';

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

// The fulfilment track only. Refunds run in parallel on `refundStatus` and
// never appear here — REFUNDED is reached exclusively through
// reviewRefund(), not through this table (see applyStatusChange). Every
// entry not listed (RECEIVED, CANCELLED, REFUNDED) is terminal: an empty
// array, so nothing can leave it through this table, admins included.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RECEIVED],
  [OrderStatus.RECEIVED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

const FULFILMENT_ADVANCE_TARGETS = [OrderStatus.PREPARING, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly repository: Repository<Order>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cartsService: CartsService,
    private readonly livestockService: LivestockService,
    private readonly bulkListingsService: BulkListingsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  async findAllForBuyer(buyerId: string): Promise<Order[]> {
    await this.dataSource.transaction((manager) => this.reservationsService.expireDue(manager));
    return this.repository.find({
      where: { buyerId, hiddenFromBuyerHistory: false },
      relations: { items: true, reservations: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAllForFarmer(farmerId: string): Promise<Order[]> {
    return this.repository.find({
      where: { farmerId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Admin-only, unfiltered by buyer/farmer — the two scoped finders above are
  // untouched; this is a separate query, not a loosening of theirs.
  async findAllForAdmin(query: AdminOrdersQuery): Promise<PaginatedOrders> {
    const { page, limit, skip, take } = resolvePage(query);

    const where: FindOptionsWhere<Order> = {};
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = Between(
        query.dateFrom ? new Date(query.dateFrom) : new Date(0),
        query.dateTo ? new Date(query.dateTo) : new Date(),
      );
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      relations: { items: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, actor: Actor): Promise<Order> {
    await this.dataSource.transaction((manager) => this.reservationsService.expireDue(manager));
    const order = await this.repository.findOne({
      where: { id },
      relations: { items: true, trackingEvents: true, reservations: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    this.assertParty(order, actor, ['buyer', 'farmer']);
    return order;
  }

  // Buyer's cart -> one or more orders, split per farmer (an order always
  // belongs to exactly one farmer). Each farmer's order is created in its own
  // transaction: prices are snapshotted onto order_items, the source
  // livestock or bulk listing is marked sold under a row lock, and the
  // consumed cart items are removed — all atomically, so a failure for one
  // farmer's group never touches another's.
  async checkout(buyerId: string, input: CheckoutInput): Promise<Order[]> {
    const cart = await this.cartsService.getCartWithItemsForUser(buyerId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const groups = new Map<string, CartItem[]>();
    for (const item of cart.items) {
      const farmerId =
        item.itemType === OrderItemType.LIVESTOCK
          ? item.livestock?.farmerId
          : item.bulkListing?.farmerId;
      if (!farmerId) {
        throw new BadRequestException(
          `Cart item ${item.id} points at a listing that no longer exists`,
        );
      }
      const group = groups.get(farmerId) ?? [];
      group.push(item);
      groups.set(farmerId, group);
    }

    const orders: Order[] = [];
    for (const [farmerId, items] of groups) {
      orders.push(await this.createOrderForFarmer(buyerId, farmerId, items, input));
    }
    return orders;
  }

  private async createOrderForFarmer(
    buyerId: string,
    farmerId: string,
    items: CartItem[],
    input: CheckoutInput,
  ): Promise<Order> {
    const checkoutKey = createHash('sha256')
      .update(
        `${buyerId}:${farmerId}:${items
          .map((item) => `${item.itemType}:${item.livestockId ?? item.bulkListingId}`)
          .sort()
          .join('|')}`,
      )
      .digest('hex');
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          await this.reservationsService.expireDue(manager);
          const existingOrder = await manager.findOne(Order, {
            where: { checkoutKey, buyerId, status: OrderStatus.PENDING_PAYMENT },
            relations: { items: true },
          });
          if (existingOrder) {
            const existingPayment = await manager.findOne(Payment, {
              where: { orderId: existingOrder.id },
            });
            if (existingPayment?.status === PaymentStatus.FAILED) {
              existingPayment.status = PaymentStatus.UNPAID;
              await manager.save(existingPayment);
              existingOrder.paymentStatus = PaymentStatus.UNPAID;
              await manager.save(existingOrder);
            }
            await manager.delete(CartItem, items.map((item) => item.id));
            return existingOrder;
          }

          let subtotal = 0;
          const itemsToInsert: DeepPartial<OrderItem>[] = [];

          for (const item of items) {
            const isLivestock = item.itemType === OrderItemType.LIVESTOCK;
            const unitPrice = isLivestock
              ? (item.livestock as Livestock).price
              : (item.bulkListing as BulkListing).price;
            const title = isLivestock
              ? (item.livestock as Livestock).title
              : (item.bulkListing as BulkListing).title;
            const images = isLivestock
              ? (item.livestock as Livestock).images
              : (item.bulkListing as BulkListing).images;
            const lineTotal = Number(unitPrice) * item.quantity;
            subtotal += lineTotal;

            itemsToInsert.push({
              itemType: item.itemType,
              livestockId: item.livestockId,
              bulkListingId: item.bulkListingId,
              titleSnapshot: title,
              imageSnapshot: images?.[0] ?? null,
              unitPrice,
              quantity: item.quantity,
              lineTotal: lineTotal.toFixed(2),
              metadata: item.metadata,
            });

            if (!isLivestock) {
              // A lot is bought whole (quantity is enforced to 1 by
              // CartItemsService), so this is a flip to SOLD, not a
              // decrement — see BulkListingsService.markSold.
              await this.bulkListingsService.markSold(item.bulkListingId as string, manager);
            }
          }

          const order = await manager.save(
            manager.create(Order, {
              orderNumber: await this.generateOrderNumber(manager),
              checkoutKey,
              buyerId,
              farmerId,
              status: OrderStatus.PENDING_PAYMENT,
              subtotal: subtotal.toFixed(2),
              deliveryFee: '0.00',
              discount: '0.00',
              total: subtotal.toFixed(2),
              currency: 'MYR',
              paymentStatus: PaymentStatus.UNPAID,
              deliveryMethod: input.deliveryMethod,
              deliveryAddress: input.deliveryAddress,
              scheduledDate: input.scheduledDate ?? null,
              buyerNotes: input.buyerNotes ?? null,
            }),
          );

          const payment = await manager.save(
            manager.create(Payment, {
              orderId: order.id,
              status: PaymentStatus.UNPAID,
            }),
          );

          for (const item of items) {
            if (item.itemType === OrderItemType.LIVESTOCK && item.livestockId) {
              await this.reservationsService.reserve(
                manager,
                item.livestockId,
                buyerId,
                order.id,
                payment.id,
              );
            }
          }

          for (const data of itemsToInsert) {
            await manager.save(manager.create(OrderItem, { ...data, orderId: order.id }));
          }

          await manager.save(
            manager.create(OrderTrackingEvent, {
              orderId: order.id,
              status: OrderStatus.PENDING_PAYMENT,
              note: 'Order created',
            }),
          );

          await manager.delete(
            CartItem,
            items.map((item) => item.id),
          );

          return manager.findOneOrFail(Order, {
            where: { id: order.id },
            relations: { items: true },
          });
        });
      } catch (err) {
        if (isDuplicateOrderNumberError(err)) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  // Approximate sequential numbering: good enough for a human-readable
  // reference, with the unique index + retry loop in createOrderForFarmer
  // as the real correctness guarantee under concurrent checkouts.
  private async generateOrderNumber(manager: EntityManager): Promise<string> {
    const prefix = `QRB-${new Date().getFullYear()}-`;
    const count = await manager.count(Order, { where: { orderNumber: Like(`${prefix}%`) } });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  // The one place order.status is ever written. Enforces ALLOWED_TRANSITIONS
  // unconditionally — no caller, admin included, can move an order out of a
  // terminal state or skip a step, because every entry point (cancel,
  // advanceStatus, markReceived, the generic admin PATCH) funnels through
  // here. Every transition appends a tracking event in the same transaction
  // (order_tracking_events is append-only), and CANCELLED releases every
  // item on the order back to the market.
  private async applyStatusChange(
    manager: EntityManager,
    order: Order,
    toStatus: OrderStatus,
    opts: {
      note?: string;
      images?: string[];
      location?: string;
      userId?: string;
      extra?: DeepPartial<Order>;
    } = {},
  ): Promise<Order> {
    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new ConflictException(
        `Order ${order.id} cannot move from ${order.status} to ${toStatus}`,
      );
    }

    Object.assign(order, opts.extra ?? {}, { status: toStatus });
    if (toStatus === OrderStatus.DELIVERED) order.deliveredAt = new Date();
    if (toStatus === OrderStatus.RECEIVED) order.receivedAt = new Date();
    if (toStatus === OrderStatus.CANCELLED) order.cancelledAt = new Date();
    await manager.save(order);

    await manager.save(
      manager.create(OrderTrackingEvent, {
        orderId: order.id,
        status: toStatus,
        note: opts.note ?? null,
        images: opts.images ?? null,
        location: opts.location ?? null,
        createdByUserId: opts.userId ?? null,
      }),
    );

    if (toStatus === OrderStatus.CANCELLED) {
      await this.reservationsService.cancelOrder(manager, order.id);
      await this.releaseOrderItems(manager, order.id, false);
    }

    return order;
  }

  // Puts every item on this order back on the market: livestock -> AVAILABLE
  // (soldAt cleared), bulk listings -> OPEN. Always called from inside the
  // same transaction as the cancel/refund that triggered it, and each
  // release is itself row-locked and idempotent (see
  // LivestockService.releaseToAvailable / BulkListingsService.releaseToOpen)
  // — safe to call even if some items are already available.
  private async releaseOrderItems(
    manager: EntityManager,
    orderId: string,
    releaseLivestock = true,
  ): Promise<void> {
    const items = await manager.find(OrderItem, { where: { orderId } });
    for (const item of items) {
      if (releaseLivestock && item.itemType === OrderItemType.LIVESTOCK && item.livestockId) {
        await this.livestockService.releaseToAvailable(item.livestockId, manager);
      } else if (item.itemType === OrderItemType.BULK_LISTING && item.bulkListingId) {
        await this.bulkListingsService.releaseToOpen(item.bulkListingId, manager);
      }
    }
  }

  // Fetches an order and confirms `actor` is entitled to see/act on it as one
  // of `allowedParties`. Admins bypass this entirely. Anyone else who isn't
  // the order's buyer/farmer gets the exact same 404 a made-up id would
  // return — existence of someone else's order is never confirmed.
  private assertParty(order: Order, actor: Actor, allowedParties: Party[]): void {
    if (actor.role === UserRole.ADMIN) return;
    const isAllowedBuyer =
      allowedParties.includes('buyer') && actor.role === UserRole.BUYER && order.buyerId === actor.id;
    const isAllowedFarmer =
      allowedParties.includes('farmer') && actor.role === UserRole.FARMER && order.farmerId === actor.id;
    if (!isAllowedBuyer && !isAllowedFarmer) {
      throw new NotFoundException(`Order ${order.id} not found`);
    }
  }

  private async loadOwnedOrder(
    manager: EntityManager,
    orderId: string,
    actor: Actor,
    allowedParties: Party[],
  ): Promise<Order> {
    const order = await manager.findOne(Order, { where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    this.assertParty(order, actor, allowedParties);
    return order;
  }

  // Buyer: only while still unpaid. Farmer/admin: also while paid but not
  // yet dispatched. Both windows are subsets of what ALLOWED_TRANSITIONS
  // permits for CANCELLED — applyStatusChange re-checks that regardless.
  async cancel(id: string, actor: Actor, reason: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.loadOwnedOrder(manager, id, actor, ['buyer', 'farmer']);

      const allowedFromStatuses =
        actor.role === UserRole.BUYER
          ? [OrderStatus.PENDING_PAYMENT]
          : [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID]; // farmer or admin
      if (!allowedFromStatuses.includes(order.status)) {
        throw new ConflictException(
          `Order ${id} cannot be cancelled by a ${actor.role} while in status ${order.status}`,
        );
      }

      return this.applyStatusChange(manager, order, OrderStatus.CANCELLED, {
        note: reason,
        userId: actor.id,
        extra: { cancellationReason: reason },
      });
    });
  }

  // Farmer (own order) or admin moves the order one step along the
  // fulfilment track. Buyers never call this.
  async advanceStatus(
    id: string,
    actor: Actor,
    toStatus: OrderStatus,
    opts: { note?: string; images?: string[]; location?: string } = {},
  ): Promise<Order> {
    if (actor.role === UserRole.BUYER) {
      throw new ForbiddenException('Buyers cannot advance order fulfilment status');
    }
    if (!FULFILMENT_ADVANCE_TARGETS.includes(toStatus)) {
      throw new BadRequestException(`${toStatus} is not a valid fulfilment step`);
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await this.loadOwnedOrder(manager, id, actor, ['farmer']);
      return this.applyStatusChange(manager, order, toStatus, { ...opts, userId: actor.id });
    });
  }

  // Buyer (own order) or admin confirms delivery. Farmers never call this.
  async markReceived(id: string, actor: Actor, proofImages: string[]): Promise<Order> {
    if (actor.role === UserRole.FARMER) {
      throw new ForbiddenException('Farmers cannot mark an order received');
    }
    return this.dataSource.transaction(async (manager) => {
      const order = await this.loadOwnedOrder(manager, id, actor, ['buyer']);
      return this.applyStatusChange(manager, order, OrderStatus.RECEIVED, {
        images: proofImages,
        userId: actor.id,
        extra: { receivedProofImages: proofImages },
      });
    });
  }

  // Buyer (own order) or admin on the buyer's behalf. Farmers never call
  // this. Runs entirely on refundStatus — order.status (the fulfilment
  // track) is untouched, so there's nothing for ALLOWED_TRANSITIONS to check
  // here.
  async requestRefund(id: string, actor: Actor, reason: string): Promise<Order> {
    if (actor.role === UserRole.FARMER) {
      throw new ForbiddenException('Farmers cannot request a refund');
    }
    return this.dataSource.transaction(async (manager) => {
      const order = await this.loadOwnedOrder(manager, id, actor, ['buyer']);

      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
        throw new ConflictException(`Order ${id} is already ${order.status} and cannot be refunded`);
      }
      // NONE -> first request. REJECTED -> the buyer can ask again (a
      // rejection isn't a permanent lock, e.g. with new evidence). REQUESTED
      // (already pending) and APPROVED (already resolved into REFUNDED) are
      // the only refundStatus values that actually block a new request.
      if (order.refundStatus === RefundStatus.REQUESTED || order.refundStatus === RefundStatus.APPROVED) {
        throw new ConflictException(
          `Order ${id} already has a refund request (refundStatus: ${order.refundStatus})`,
        );
      }

      order.refundStatus = RefundStatus.REQUESTED;
      order.refundReason = reason;
      order.refundRequestedAt = new Date();
      // Clear the previous review — it was a decision on the earlier
      // request, not this new one.
      order.refundReviewedByUserId = null;
      order.refundReviewedAt = null;
      await manager.save(order);
      return order;
    });
  }

  // Admin only (enforced by @Roles on the controller route). A rejected
  // refund only ever sets refundStatus = rejected — order.status is left
  // exactly where it was, with no stored "previous status" to restore,
  // because it was never touched in the first place. An approved refund is
  // the one and only place order.status reaches REFUNDED, and it does so
  // without going through ALLOWED_TRANSITIONS/applyStatusChange (REFUNDED
  // has no entry pointing to it there) — it still appends its own tracking
  // event and releases every item, matching what applyStatusChange would do.
  async reviewRefund(
    id: string,
    actor: Actor,
    input: { approve: boolean; note?: string },
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id } });
      if (!order) throw new NotFoundException(`Order ${id} not found`);

      if (order.refundStatus !== RefundStatus.REQUESTED) {
        throw new ConflictException(
          `Order ${id} has no pending refund request to review (refundStatus: ${order.refundStatus})`,
        );
      }

      order.refundReviewedByUserId = actor.id;
      order.refundReviewedAt = new Date();
      if (input.note) order.refundReason = input.note;

      if (input.approve) {
        order.refundStatus = RefundStatus.APPROVED;
        order.status = OrderStatus.REFUNDED;
        await manager.save(order);

        await manager.save(
          manager.create(OrderTrackingEvent, {
            orderId: id,
            status: OrderStatus.REFUNDED,
            note: input.note ?? null,
            createdByUserId: actor.id,
          }),
        );

        await this.releaseOrderItems(manager, id);
      } else {
        order.refundStatus = RefundStatus.REJECTED;
        await manager.save(order);
      }

      return order;
    });
  }

  // Buyer (own order) or admin. Farmers and admin-on-farmer's-behalf never
  // apply — this only ever hides an order from the buyer's own history view.
  async hideFromBuyerHistory(id: string, actor: Actor, hidden: boolean): Promise<Order> {
    if (actor.role === UserRole.FARMER) {
      throw new ForbiddenException('Farmers cannot hide orders from buyer history');
    }
    await this.loadOwnedOrder(this.repository.manager, id, actor, ['buyer']);
    await this.repository.update(id, { hiddenFromBuyerHistory: hidden });
    return this.findOne(id, actor);
  }

  // Admin-only generic escape hatch (enforced by @Roles on the controller
  // route) — still fully bound by ALLOWED_TRANSITIONS, so it can move an
  // order forward along the table but can never revive a terminal one or
  // skip a step. No ownership check: admin acts on any order.
  async updateStatus(
    id: string,
    status: OrderStatus,
    opts: { note?: string; images?: string[]; location?: string; userId?: string } = {},
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id } });
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      return this.applyStatusChange(manager, order, status, opts);
    });
  }

  async completePaymentFromWebhook(id: string, providerReference?: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id })
        .getOne();
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      if (order.status === OrderStatus.PAID && order.paymentStatus === PaymentStatus.PAID) {
        return order;
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(`Order ${id} is not awaiting payment`);
      }

      await this.reservationsService.completeOrder(manager, order.id, order.buyerId);
      const payment = await manager.findOne(Payment, { where: { orderId: order.id } });
      if (!payment) throw new ConflictException(`Order ${id} has no payment record`);
      const paidAt = new Date();
      payment.status = PaymentStatus.PAID;
      payment.paidAt = paidAt;
      if (providerReference) payment.providerReference = providerReference;
      await manager.save(payment);

      order.status = OrderStatus.PAID;
      order.paymentStatus = PaymentStatus.PAID;
      order.paymentReference = providerReference ?? payment.id;
      order.paidAt = paidAt;
      await manager.save(order);
      await manager.save(manager.create(OrderTrackingEvent, {
        orderId: order.id,
        status: OrderStatus.PAID,
        note: 'Payment completed',
        createdByUserId: null,
      }));
      return order;
    });
  }

  async markPaymentFailed(id: string, actor: Actor): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      await this.reservationsService.expireDue(manager);
      const order = await this.loadOwnedOrder(manager, id, actor, ['buyer']);
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(`Order ${id} is not awaiting payment`);
      }
      const payment = await manager.findOne(Payment, { where: { orderId: order.id } });
      if (!payment) throw new ConflictException(`Order ${id} has no payment record`);
      payment.status = PaymentStatus.FAILED;
      await manager.save(payment);
      order.paymentStatus = PaymentStatus.FAILED;
      await manager.save(order);
      return order;
    });
  }
}

function isDuplicateOrderNumberError(err: unknown): boolean {
  return (err as { code?: string })?.code === 'ER_DUP_ENTRY';
}
