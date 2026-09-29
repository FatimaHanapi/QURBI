import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkListing, CartItem, Livestock, Order, OrderItem, OrderTrackingEvent, Payment, Reservation } from '../entities';
import { CartsModule } from '../carts/carts.module';
import { LivestockModule } from '../livestock/livestock.module';
import { BulkListingsModule } from '../bulk-listings/bulk-listings.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderTrackingEvent, CartItem, Livestock, BulkListing, Payment, Reservation]),
    CartsModule,
    LivestockModule,
    BulkListingsModule,
    ReservationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
