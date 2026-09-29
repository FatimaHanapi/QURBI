import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  OrderStatus,
  PaymentStatus,
  DeliveryMethod,
  RefundStatus,
} from './enums';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { OrderTrackingEvent } from './order-tracking-event.entity';
import { Reservation } from './reservation.entity';

// Frozen at checkout on purpose: it is NOT a FK to addresses. If the buyer
// later edits or deletes that address, the order must still show exactly
// where it was actually delivered.
export interface DeliveryAddressSnapshot {
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
  latitude?: string | null;
  longitude?: string | null;
}

// The ONE orders table replacing the separate Order entity each app used to
// have, which needed sync functions to copy rows between two databases.
// Buyer queries `WHERE buyerId = me`, farmer queries `WHERE farmerId = me` —
// same row, two viewpoints.
@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'varchar', length: 30, unique: true })
  orderNumber: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  checkoutKey: string | null;

  @Column({ type: 'varchar', length: 36 })
  buyerId: string;

  // RESTRICT: a user with order history can't be hard-deleted (use UserStatus.DELETED instead).
  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  // Denormalised from items so the farmer app can query orders directly
  // without joining through order_items. Assumes one order = one farmer —
  // the cart/checkout flow must split into multiple orders if a buyer's cart
  // spans several farms.
  @Column({ type: 'varchar', length: 36 })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: string;

  @Column({ type: 'varchar', length: 3, default: 'MYR' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  paidAt: Date | null;

  @Column({ type: 'enum', enum: DeliveryMethod })
  deliveryMethod: DeliveryMethod;

  @Column({ type: 'json' })
  deliveryAddress: DeliveryAddressSnapshot;

  @Column({ type: 'date', nullable: true })
  scheduledDate: string | null;

  @Column({ type: 'text', nullable: true })
  buyerNotes: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'json', nullable: true })
  receivedProofImages: string[] | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.NONE })
  refundStatus: RefundStatus;

  @Column({ type: 'text', nullable: true })
  refundReason: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  refundRequestedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  refundReviewedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  refundReviewedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'refundReviewedByUserId' })
  refundReviewedByUser: User | null;

  // Soft "hide from my history" for the buyer only — farmer and admin must
  // still see the order regardless of this flag.
  @Column({ type: 'boolean', default: false })
  hiddenFromBuyerHistory: boolean;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderTrackingEvent, (event) => event.order)
  trackingEvents: OrderTrackingEvent[];

  @OneToMany(() => Reservation, (reservation) => reservation.order)
  reservations: Reservation[];
}
