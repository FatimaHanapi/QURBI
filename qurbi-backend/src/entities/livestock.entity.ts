import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { LivestockStatus, LivestockSex, RequestStatus } from './enums';
import { User } from './user.entity';
import { Species } from './species.entity';
import { Breed } from './breed.entity';
import { LivestockCategory } from './livestock-category.entity';

// A single animal for sale. The farmer app creates rows here, the buyer app
// only reads them — same table, no more sync functions between two databases.
@Entity('livestock')
export class Livestock extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  farmerId: string;

  // Deleting a farmer's account takes their listings with it.
  @ManyToOne(() => User, (user) => user.livestock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column({ type: 'varchar', length: 36 })
  speciesId: string;

  // RESTRICT: species is reference data — block deleting a species while any
  // listing still points at it rather than silently orphaning the listing.
  @ManyToOne(() => Species, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'speciesId' })
  species: Species;

  @Column({ type: 'varchar', length: 36, nullable: true })
  breedId: string | null;

  @ManyToOne(() => Breed, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'breedId' })
  breed: Breed | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  categoryId: string | null;

  @ManyToOne(() => LivestockCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: LivestockCategory | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tagNumber: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: LivestockSex, nullable: true })
  sex: LivestockSex | null;

  @Column({ type: 'int', nullable: true })
  ageMonths: number | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  // Always kilograms — the frontend's single `weight` field is converted to
  // this unit by the adapter before it ever reaches the API.
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weightKg: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'varchar', length: 3, default: 'MYR' })
  currency: string;

  @Column({ type: 'json' })
  images: string[];

  // Multiple videos, not one — matches the frontend's uploader, which lets a
  // farmer attach several clips per listing.
  @Column({ type: 'json', nullable: true })
  videos: string[] | null;

  @Column({
    type: 'enum',
    enum: LivestockStatus,
    default: LivestockStatus.DRAFT,
  })
  status: LivestockStatus;

  // marketplaceVisible/marketplaceVisibilityReason are NOT columns — they're
  // derived at read time (see LivestockService.computeMarketplaceVisibility)
  // from the facts below, which live here because the server has to be able
  // to filter/enforce on them, not just display them. Everything else the
  // frontend carries per-listing (color, height, bodyLength, chestGirth,
  // rfid, feedDetails, specialNotes, healthRecord, vaccinationRecord, the
  // per-listing e-signature/policy fields) is purely descriptive and stays in
  // `attributes` below instead of getting its own column.
  @Column({ type: 'datetime', precision: 6, nullable: true })
  marketplaceEligibleFrom: Date | null;

  // AVAILABLE listings are advertised for 14 days. Publishing again renews
  // this server-owned window; buyers never set it directly.
  @Column({ type: 'datetime', precision: 6, nullable: true })
  marketplaceExpiresAt: Date | null;

  // Admin override: a block is a real, independent decision (not derivable
  // from anything else), so unlike marketplaceVisible it IS a stored column.
  // When set, it wins over every other visibility condition.
  @Column({ type: 'boolean', default: false })
  adminBlocked: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  adminBlockReason: string | null;

  // A listing's species/breed can each be pending admin approval
  // independently (e.g. a newly-requested breed) — both gate
  // marketplaceVisible, so both need to be queryable, not buried in JSON.
  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  speciesApprovalStatus: RequestStatus;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  breedApprovalStatus: RequestStatus;

  // Health records, feed type, vaccination history — free-form, farmer-defined.
  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  soldAt: Date | null;
}
