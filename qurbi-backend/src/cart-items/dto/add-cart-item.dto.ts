import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { OrderItemType } from '../../entities';

// No userId — the owning cart is always the authenticated caller's (see
// CartItemsController), never a value the client declares.
export class AddCartItemDto {
  @IsEnum(OrderItemType)
  itemType: OrderItemType;

  @IsOptional()
  @IsUUID()
  livestockId?: string;

  @IsOptional()
  @IsUUID()
  bulkListingId?: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
