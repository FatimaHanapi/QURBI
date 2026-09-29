import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ReservationStatus } from './enums';
import { Livestock } from './livestock.entity';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { User } from './user.entity';

@Entity('reservations')
@Index('uq_reservations_active_livestock', ['activeLivestockId'], {
  unique: true,
})
export class Reservation extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36 })
  livestockId: string;

  @ManyToOne(() => Livestock, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'livestockId' })
  livestock: Livestock;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'varchar', length: 36, nullable: true })
  paymentId: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @Column({ type: 'datetime', precision: 6 })
  reservedAt: Date;

  @Index()
  @Column({ type: 'datetime', precision: 6 })
  expiresAt: Date;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  completedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  expiredAt: Date | null;

  // MySQL permits many NULLs in a unique index. Only active reservations
  // materialise their livestock id, enforcing one active lock per animal.
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    asExpression: "CASE WHEN status = 'active' THEN livestockId ELSE NULL END",
    generatedType: 'STORED',
    select: false,
  })
  activeLivestockId: string | null;
}
