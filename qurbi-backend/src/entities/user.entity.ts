import { Entity, Column, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole, UserStatus } from './enums';
import { FarmerProfile } from './farmer-profile.entity';
import { Address } from './address.entity';
import { Order } from './order.entity';
import { Livestock } from './livestock.entity';
import { Notification } from './notification.entity';
import { Cart } from './cart.entity';

// One person = one row = one login, replacing the User entity that used to
// exist separately (and drift) in both qurbi-user and qurbi-farmer.
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // select: false so a plain find()/findOne() never leaks the hash; must be opted
  // into explicitly with .addSelect('user.passwordHash') by the auth flow only.
  // Always bcrypt — never store a plaintext or reversibly-encrypted password here.
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  // Nullable + unique: most rows are null (password login), but any non-null
  // value must still be unique per Google account.
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  googleId: string | null;

  // Null = not verified. A timestamp instead of a boolean so "when" is never
  // lost, and there's only one fact to keep in sync (no separate bool that
  // could drift from a verifiedAt date).
  @Column({ type: 'datetime', precision: 6, nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  lastLoginAt: Date | null;

  // Legal consent is stored as auditable timestamps plus the exact policy
  // version accepted. Keeping this on the shared user row lets /auth/me
  // drive onboarding consistently on every device.
  @Column({ type: 'datetime', precision: 6, nullable: true })
  privacyPolicyAcceptedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  userAgreementAcceptedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  adultConfirmedAt: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  agreementsVersion: string | null;

  @OneToOne(() => FarmerProfile, (farmerProfile) => farmerProfile.user)
  farmerProfile: FarmerProfile;

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => Order, (order) => order.buyer)
  orders: Order[];

  @OneToMany(() => Livestock, (livestock) => livestock.farmer)
  livestock: Livestock[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToOne(() => Cart, (cart) => cart.user)
  cart: Cart;
}
