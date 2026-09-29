import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  FarmerProfile,
  Livestock,
  LivestockStatus,
  Order,
  OrderStatus,
  RequestStatus,
  Reservation,
  ReservationStatus,
  VerificationStatus,
} from '../entities';

export const RESERVATION_LIFETIME_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReservationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async expireDue(manager: EntityManager = this.dataSource.manager, livestockId?: string): Promise<number> {
    const now = new Date();
    const qb = manager
      .createQueryBuilder(Reservation, 'reservation')
      .where('reservation.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('reservation.expiresAt <= :now', { now });
    if (livestockId) qb.andWhere('reservation.livestockId = :livestockId', { livestockId });
    const expired = await qb.getMany();

    for (const staleReservation of expired) {
      const reservation = await manager.findOne(Reservation, { where: { id: staleReservation.id } });
      if (!reservation || reservation.status !== ReservationStatus.ACTIVE) continue;
      reservation.status = ReservationStatus.EXPIRED;
      reservation.expiredAt = now;
      await manager.save(reservation);
      const order = await manager.findOne(Order, { where: { id: reservation.orderId } });
      if (order?.status === OrderStatus.PENDING_PAYMENT) {
        order.status = OrderStatus.CANCELLED;
        order.cancelledAt = now;
        order.cancellationReason = 'Payment reservation expired';
        await manager.save(order);
        const remaining = await manager.find(Reservation, {
          where: { orderId: order.id, status: ReservationStatus.ACTIVE },
        });
        for (const sibling of remaining) {
          sibling.status = ReservationStatus.CANCELLED;
          await manager.save(sibling);
          await this.releaseLivestockAfterReservation(manager, sibling.livestockId, now);
        }
      }
      await this.releaseLivestockAfterReservation(manager, reservation.livestockId, now);
    }
    return expired.length;
  }

  async reserve(manager: EntityManager, livestockId: string, userId: string, orderId: string, paymentId: string | null): Promise<Reservation> {
    await this.expireDue(manager, livestockId);
    const livestock = await manager
      .createQueryBuilder(Livestock, 'livestock')
      .setLock('pessimistic_write')
      .where('livestock.id = :livestockId', { livestockId })
      .getOne();
    if (!livestock) throw new NotFoundException(`Livestock ${livestockId} not found`);

    const existing = await manager.findOne(Reservation, { where: { livestockId, status: ReservationStatus.ACTIVE } });
    if (existing) {
      if (existing.userId === userId && existing.orderId === orderId) return existing;
      throw new ConflictException('This livestock is currently reserved by another buyer.');
    }

    const farmerProfile = await manager.findOne(FarmerProfile, { where: { userId: livestock.farmerId } });
    const now = new Date();
    const listingExpiresAt =
      livestock.marketplaceExpiresAt ??
      new Date(livestock.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const reservable =
      livestock.status === LivestockStatus.AVAILABLE &&
      !livestock.adminBlocked &&
      farmerProfile?.verificationStatus === VerificationStatus.VERIFIED &&
      livestock.speciesApprovalStatus === RequestStatus.APPROVED &&
      (!livestock.breedId || livestock.breedApprovalStatus === RequestStatus.APPROVED) &&
      (!livestock.marketplaceEligibleFrom || livestock.marketplaceEligibleFrom <= now) &&
      listingExpiresAt > now;
    if (!reservable) {
      throw new ConflictException(`Livestock ${livestockId} is no longer available for purchase`);
    }

    const reservedAt = now;
    const reservation = await manager.save(manager.create(Reservation, {
      livestockId,
      userId,
      orderId,
      paymentId,
      status: ReservationStatus.ACTIVE,
      reservedAt,
      expiresAt: new Date(reservedAt.getTime() + RESERVATION_LIFETIME_MS),
    }));
    livestock.status = LivestockStatus.RESERVED;
    await manager.save(livestock);
    return reservation;
  }

  async availability(livestockId: string, userId?: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.expireDue(manager, livestockId);
      const livestock = await manager.findOne(Livestock, { where: { id: livestockId } });
      if (!livestock) return { available: false, state: 'not_found' };
      const reservation = await manager.findOne(Reservation, { where: { livestockId, status: ReservationStatus.ACTIVE } });
      if (reservation) {
        return {
          available: reservation.userId === userId,
          state: reservation.userId === userId ? 'reserved_by_you' : 'reserved',
          orderId: reservation.userId === userId ? reservation.orderId : undefined,
          expiresAt: reservation.expiresAt,
        };
      }
      return { available: livestock.status === LivestockStatus.AVAILABLE, state: livestock.status };
    });
  }

  async completeOrder(manager: EntityManager, orderId: string, userId: string): Promise<void> {
    const now = new Date();
    await this.expireDue(manager);
    const all = await manager.find(Reservation, { where: { orderId } });
    if (!all.length) return;
    const active = all.filter((reservation) => reservation.status === ReservationStatus.ACTIVE && reservation.userId === userId);
    if (!active.length || active.length !== all.length) {
      throw new ConflictException('Payment reservation is missing or has expired.');
    }
    for (const reservation of active) {
      if (reservation.expiresAt <= now) throw new ConflictException('Payment reservation has expired.');
      const livestock = await manager
        .createQueryBuilder(Livestock, 'livestock')
        .setLock('pessimistic_write')
        .where('livestock.id = :id', { id: reservation.livestockId })
        .getOneOrFail();
      reservation.status = ReservationStatus.COMPLETED;
      reservation.completedAt = now;
      livestock.status = LivestockStatus.SOLD;
      livestock.soldAt = now;
      await manager.save(reservation);
      await manager.save(livestock);
    }
  }

  async cancelOrder(manager: EntityManager, orderId: string): Promise<void> {
    const active = await manager.find(Reservation, { where: { orderId, status: ReservationStatus.ACTIVE } });
    const now = new Date();
    for (const reservation of active) {
      reservation.status = ReservationStatus.CANCELLED;
      await manager.save(reservation);
      await this.releaseLivestockAfterReservation(manager, reservation.livestockId, now);
    }
  }

  private async releaseLivestockAfterReservation(manager: EntityManager, livestockId: string, now: Date): Promise<void> {
    const livestock = await manager
      .createQueryBuilder(Livestock, 'livestock')
      .setLock('pessimistic_write')
      .where('livestock.id = :livestockId', { livestockId })
      .getOne();
    if (!livestock || livestock.status !== LivestockStatus.RESERVED) return;
    const listingExpiresAt = livestock.marketplaceExpiresAt ?? new Date(livestock.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    livestock.status = listingExpiresAt > now ? LivestockStatus.AVAILABLE : LivestockStatus.UNAVAILABLE;
    await manager.save(livestock);
  }
}
