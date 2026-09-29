import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../entities';

// admin is deliberately excluded here — it must never be self-assignable
// through registration. Only an existing admin can promote someone to admin.
export const SELF_ASSIGNABLE_ROLES = [UserRole.BUYER, UserRole.FARMER] as const;
export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsIn(SELF_ASSIGNABLE_ROLES)
  role: SelfAssignableRole;
}
