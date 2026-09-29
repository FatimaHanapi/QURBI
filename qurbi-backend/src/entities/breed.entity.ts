import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Species } from './species.entity';

// Merges what used to be a separate Farmer Breed and User Breed table that had
// drifted apart. Name/slug are unique per species, not globally (e.g. two
// different species could each have a breed named "Local").
@Entity('breeds')
@Index(['speciesId', 'slug'], { unique: true })
export class Breed extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  speciesId: string;

  @ManyToOne(() => Species, (species) => species.breeds, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'speciesId' })
  species: Species;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  typicalWeightMinKg: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  typicalWeightMaxKg: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;
}
