import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { VerificationStatus } from './enums';
import { User } from './user.entity';
import { FarmVerification } from './farm-verification.entity';

// Split out from User (rather than columns on User) so a buyer row never
// carries a wall of null farm columns. Only created the moment a user
// becomes a farmer.
@Entity('farmer_profiles')
export class FarmerProfile extends BaseEntity {
  @Column({ type: 'varchar', length: 36, unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.farmerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 150 })
  farmName: string;

  @Column({ type: 'text', nullable: true })
  farmDescription: string | null;

  // SSM registration number.
  @Column({ type: 'varchar', length: 50, nullable: true })
  businessRegNo: string | null;

  @Column({ type: 'varchar', length: 255 })
  farmAddressLine: string;

  @Column({ type: 'varchar', length: 100 })
  farmCity: string;

  @Column({ type: 'varchar', length: 100 })
  farmState: string;

  @Column({ type: 'varchar', length: 20 })
  farmPostcode: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  farmLatitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  farmLongitude: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deliveryPreference: string | null;

  // Current state; the audit trail of each attempt lives in FarmVerification.
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verificationStatus: VerificationStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAverage: string;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  totalSales: number;

  @OneToMany(
    () => FarmVerification,
    (verification) => verification.farmerProfile,
  )
  verifications: FarmVerification[];
}
