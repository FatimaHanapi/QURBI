import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';
import { AddressLabel } from '../../entities';

// No userId — the owner is always the authenticated caller (see
// AddressesController), never a value the client declares.
export class CreateAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsString()
  recipientName: string;

  @IsString()
  recipientPhone: string;

  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postcode: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
