import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { VerificationStatus } from './enums';
import { FarmerProfile } from './farmer-profile.entity';
import { User } from './user.entity';

// One row per submission attempt (not one row per farmer) so a rejected
// farmer can resubmit and admins keep a full audit trail. The single
// "current" state is denormalised onto farmerProfile.verificationStatus.
@Entity('farm_verifications')
export class FarmVerification extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  farmerProfileId: string;

  @ManyToOne(
    () => FarmerProfile,
    (farmerProfile) => farmerProfile.verifications,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'farmerProfileId' })
  farmerProfile: FarmerProfile;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  // SSM cert, land title, ID copy, etc. — shape varies, hence JSON not columns.
  @Column({ type: 'json' })
  documents: Record<string, any>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureUrl: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reviewedByUserId: string | null;

  // SET NULL: losing the reviewer's account shouldn't delete the review record.
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewedByUserId' })
  reviewedByUser: User | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;
}
