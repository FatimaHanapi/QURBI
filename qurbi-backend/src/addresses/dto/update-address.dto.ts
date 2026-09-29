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
export class UpdateAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

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
