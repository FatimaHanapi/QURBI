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

export class UpdateBulkListingDto {
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @IsOptional()
  @IsUUID()
  breedId?: string;

  @IsOptional()
  @IsString()
  title?: string;

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

  @IsOptional()
  @IsArray()
  breedBreakdown?: BulkListingBreedGroup[];

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumberString()
  estimatedWeightKg?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  // DRAFT/OPEN/CANCELLED — publish/withdraw flow. SOLD is set exclusively by
  // BulkListingsService.markSold as part of checkout.
  @IsOptional()
  @IsEnum(BulkListingStatus)
  status?: BulkListingStatus;
}
