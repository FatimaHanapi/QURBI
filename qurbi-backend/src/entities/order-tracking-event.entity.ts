import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderStatus } from './enums';
import { Order } from './order.entity';
import { User } from './user.entity';

// The delivery timeline both apps render. Append-only — never update or
// delete a row here — so that when a buyer and farmer disagree about what
// happened, there's a tamper-evident history to check.
@Entity('order_tracking_events')
export class OrderTrackingEvent extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.trackingEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdByUserId: string | null;

  // Null for automated/system-generated events (e.g. a payment webhook).
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;
}
