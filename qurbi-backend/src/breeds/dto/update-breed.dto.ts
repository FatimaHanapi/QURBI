import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateBreedDto {
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumberString()
  typicalWeightMinKg?: string;

  @IsOptional()
  @IsNumberString()
  typicalWeightMaxKg?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
