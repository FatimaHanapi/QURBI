import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FarmerProfilesModule } from './farmer-profiles/farmer-profiles.module';
import { FarmVerificationsModule } from './farm-verifications/farm-verifications.module';
import { SpeciesModule } from './species/species.module';
import { BreedsModule } from './breeds/breeds.module';
import { LivestockCategoriesModule } from './livestock-categories/livestock-categories.module';
import { LivestockModule } from './livestock/livestock.module';
import { BulkListingsModule } from './bulk-listings/bulk-listings.module';
import { CartsModule } from './carts/carts.module';
import { CartItemsModule } from './cart-items/cart-items.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrderTrackingEventsModule } from './order-tracking-events/order-tracking-events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SpeciesRequestsModule } from './species-requests/species-requests.module';
import { BreedRequestsModule } from './breed-requests/breed-requests.module';
import { AddressesModule } from './addresses/addresses.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReservationsModule } from './reservations/reservations.module';

export const APP_MODULES = [
  AuthModule,
  UploadsModule,
  UsersModule,
  FarmerProfilesModule,
  FarmVerificationsModule,
  SpeciesModule,
  BreedsModule,
  LivestockCategoriesModule,
  LivestockModule,
  BulkListingsModule,
  CartsModule,
  CartItemsModule,
  OrdersModule,
  OrderItemsModule,
  OrderTrackingEventsModule,
  NotificationsModule,
  SpeciesRequestsModule,
  BreedRequestsModule,
  AddressesModule,
  ReservationsModule,
];
