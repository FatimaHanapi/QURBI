import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BulkListingStatus } from '../../entities';
import type { BulkListingBreedGroup } from '../../entities';

// No farmerId — the owner is always the authenticated caller (see
// BulkListingsController), never a value the client declares.
export class CreateBulkListingDto {
  @IsUUID()
  speciesId: string;

  @IsOptional()
  @IsUUID()
  breedId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maleCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  femaleCount?: number;

  // [{ breedId, count }, ...] — kept as a plain array like deliveryAddress on
  // CheckoutDto; shape is enforced application-side, not per-element here.
  @IsOptional()
  @IsArray()
  breedBreakdown?: BulkListingBreedGroup[];

  @IsNumberString()
  price: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsString()
  state: string;

  @IsOptional()
  @IsNumberString()
  estimatedWeightKg?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @IsOptional()
  @IsEnum(BulkListingStatus)
  status?: BulkListingStatus;
}
