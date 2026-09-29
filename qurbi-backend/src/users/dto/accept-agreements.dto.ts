import {
  Equals,
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AcceptAgreementsDto {
  @IsBoolean()
  @Equals(true)
  acceptPrivacyPolicy: true;

  @IsBoolean()
  @Equals(true)
  acceptUserAgreement: true;

  @IsBoolean()
  @Equals(true)
  confirmAdult: true;

  @IsString()
  @MaxLength(40)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  version: string;
}
