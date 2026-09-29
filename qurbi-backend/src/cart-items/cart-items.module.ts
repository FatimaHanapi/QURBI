import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from '../entities';
import { CartsModule } from '../carts/carts.module';
import { CartItemsController } from './cart-items.controller';
import { CartItemsService } from './cart-items.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem]), CartsModule, ReservationsModule],
  controllers: [CartItemsController],
  providers: [CartItemsService],
  exports: [CartItemsService],
})
export class CartItemsModule {}
