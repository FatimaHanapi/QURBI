import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PaymentStatus } from './enums';
import { Order } from './order.entity';

@Entity('payments')
@Index('uq_payments_order', ['orderId'], { unique: true })
export class Payment extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Index()
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerReference: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  paidAt: Date | null;
}
