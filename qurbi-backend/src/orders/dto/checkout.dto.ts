import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { DeliveryMethod } from '../../entities';
import type { DeliveryAddressSnapshot } from '../../entities';

// Deliberately no buyerId here — the buyer is always the authenticated
// caller (see OrdersController.checkout), never a value the client declares.
export class CheckoutDto {
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @IsObject()
  deliveryAddress: DeliveryAddressSnapshot;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  buyerNotes?: string;
}
