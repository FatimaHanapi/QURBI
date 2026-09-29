export * from './base.entity';
export * from './enums';

export * from './user.entity';
export * from './refresh-token.entity';
export * from './farmer-profile.entity';
export * from './farm-verification.entity';
export * from './species.entity';
export * from './breed.entity';
export * from './livestock-category.entity';
export * from './livestock.entity';
export * from './bulk-listing.entity';
export * from './order.entity';
export * from './order-item.entity';
export * from './order-tracking-event.entity';
export * from './payment.entity';
export * from './reservation.entity';
export * from './notification.entity';
export * from './species-request.entity';
export * from './breed-request.entity';
export * from './cart.entity';
export * from './cart-item.entity';
export * from './address.entity';
export * from './uploaded-file.entity';

import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { FarmerProfile } from './farmer-profile.entity';
import { FarmVerification } from './farm-verification.entity';
import { Species } from './species.entity';
import { Breed } from './breed.entity';
import { LivestockCategory } from './livestock-category.entity';
import { Livestock } from './livestock.entity';
import { BulkListing } from './bulk-listing.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderTrackingEvent } from './order-tracking-event.entity';
import { Payment } from './payment.entity';
import { Reservation } from './reservation.entity';
import { Notification } from './notification.entity';
import { SpeciesRequest } from './species-request.entity';
import { BreedRequest } from './breed-request.entity';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Address } from './address.entity';
import { UploadedFile } from './uploaded-file.entity';

// Passed straight to TypeOrmModule.forRoot({ entities: ALL_ENTITIES }).
export const ALL_ENTITIES = [
  User,
  RefreshToken,
  FarmerProfile,
  FarmVerification,
  Species,
  Breed,
  LivestockCategory,
  Livestock,
  BulkListing,
  Order,
  OrderItem,
  OrderTrackingEvent,
  Payment,
  Reservation,
  Notification,
  SpeciesRequest,
  BreedRequest,
  Cart,
  CartItem,
  Address,
  UploadedFile,
];
