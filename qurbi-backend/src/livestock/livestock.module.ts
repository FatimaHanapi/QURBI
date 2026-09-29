import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Livestock } from '../entities';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Livestock]), ReservationsModule],
  controllers: [LivestockController],
  providers: [LivestockService],
  exports: [LivestockService],
})
export class LivestockModule {}
