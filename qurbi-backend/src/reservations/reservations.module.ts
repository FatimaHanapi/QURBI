import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Livestock, Order, Payment, Reservation } from '../entities';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Payment, Order, Livestock])],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
