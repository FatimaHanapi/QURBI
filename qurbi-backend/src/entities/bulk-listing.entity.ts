import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BulkListingStatus } from './enums';
import { User } from './user.entity';
import { Species } from './species.entity';
import { Breed } from './breed.entity';

// One breed group within a lot's breed/count breakdown — not its own table
// since it has no identity or lifecycle of its own, just a tally.
export interface BulkListingBreedGroup {
  breedId: string;
  count: number;
  maleCount?: number;
  femaleCount?: number;
}

// A farmer selling a group of animals as one lot to one buyer — e.g. 7 cows,
// 1 male + 6 female, possibly across a couple of breeds, for one all-in
// price. This is NOT fractional/co-ownership of a single animal (that model
// was removed — see BulkListingsService.markSold): the lot is bought whole,
// by exactly one buyer, in one order.
//
// It deliberately has no FK to Livestock: a lot describes a group by counts
// and breed breakdown, not by pointing at individual animal rows. Buying a
// lot therefore does NOT mark any Livestock row sold, unlike buying a single
// listing — there's nothing here to mark.
@Entity('bulk_listings')
export class BulkListing extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  // The lot's primary species.
  @Column({ type: 'varchar', length: 36 })
  speciesId: string;

  @ManyToOne(() => Species, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'speciesId' })
  species: Species;

  // Nullable: a mixed-breed lot has no single breed — see breedBreakdown for
  // the actual per-breed counts. Set only when every animal in the lot is
  // the same breed.
  @Column({ type: 'varchar', length: 36, nullable: true })
  breedId: string | null;

  @ManyToOne(() => Breed, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'breedId' })
  breed: Breed | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  maleCount: number;

  @Column({ type: 'int', default: 0 })
  femaleCount: number;

  // Per-breed headcount within the lot, e.g. [{ breedId, count }, ...].
  // Independent of male/femaleCount (that's a sex split, this is a breed
  // split) — null/empty for a lot not worth breaking down further.
  @Column({ type: 'json', nullable: true })
  breedBreakdown: BulkListingBreedGroup[] | null;

  // Total price for the whole lot, not a per-head or per-share price.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'varchar', length: 3, default: 'MYR' })
  currency: string;

  @Column({ type: 'json' })
  images: string[];

  @Column({ type: 'json', nullable: true })
  videos: string[] | null;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedWeightKg: string | null;

  @Column({ type: 'date', nullable: true })
  scheduledDate: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  closesAt: Date | null;

  @Column({
    type: 'enum',
    enum: BulkListingStatus,
    default: BulkListingStatus.DRAFT,
  })
  status: BulkListingStatus;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;
}
