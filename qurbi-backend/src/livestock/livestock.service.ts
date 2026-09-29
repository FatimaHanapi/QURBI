import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import {
  Breed,
  FarmerProfile,
  Livestock,
  LivestockStatus,
  RequestStatus,
  Species,
  User,
  UserRole,
  VerificationStatus,
} from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Paginated, PageQuery, resolvePage } from '../common/pagination';
import { ReservationsService } from '../reservations/reservations.service';

export interface DerivedMarketplaceVisibility {
  marketplaceVisible: boolean;
  marketplaceVisibilityReason: string | null;
}

export type LivestockWithVisibility = Livestock & DerivedMarketplaceVisibility;

export const LISTING_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

export interface LivestockQuery extends PageQuery {
  farmerId?: string;
  speciesId?: string;
  categoryId?: string;
  status?: LivestockStatus;
  adminBlocked?: boolean;
}

@Injectable()
export class LivestockService extends BaseCrudService<Livestock> {
  constructor(
    @InjectRepository(Livestock) repository: Repository<Livestock>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly reservationsService: ReservationsService,
  ) {
    super(repository);
  }

  // The public browse query: only listings that pass every marketplace
  // condition, UNLESS the viewer is an admin (sees everything) or a farmer
  // looking at their own inventory (query.farmerId === viewer.id — sees their
  // own listings regardless of visibility, e.g. still-pending ones).
  // adminBlocked/status/etc. are applied on top of that scope, never in
  // place of it — a non-admin can never use them to see past their own scope,
  // at worst they narrow it down to nothing (e.g. adminBlocked=true as a
  // buyer: blocked listings are never in the buyer-visible set anyway).
  async findAllForViewer(query: LivestockQuery, viewer?: AuthenticatedUser): Promise<Paginated<LivestockWithVisibility>> {
    await this.dataSource.transaction((manager) => this.reservationsService.expireDue(manager));
    const { page, limit, skip, take } = resolvePage(query);
    const isOwnInventory = viewer?.role === UserRole.FARMER && query.farmerId === viewer.id;
    const isAdmin = viewer?.role === UserRole.ADMIN;
    const showEverything = isAdmin || isOwnInventory;

    const qb = this.repository
      .createQueryBuilder('livestock')
      .leftJoinAndSelect('livestock.species', 'species')
      .leftJoinAndSelect('livestock.breed', 'breed')
      .leftJoinAndSelect('livestock.category', 'category')
      .innerJoinAndSelect('livestock.farmer', 'farmer')
      .innerJoinAndSelect('farmer.farmerProfile', 'farmerProfile')
      .orderBy('livestock.createdAt', 'DESC');

    if (query.farmerId) qb.andWhere('livestock.farmerId = :farmerId', { farmerId: query.farmerId });
    if (query.speciesId) qb.andWhere('livestock.speciesId = :speciesId', { speciesId: query.speciesId });
    if (query.categoryId) qb.andWhere('livestock.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.status) qb.andWhere('livestock.status = :status', { status: query.status });
    if (query.adminBlocked !== undefined) {
      qb.andWhere('livestock.adminBlocked = :adminBlocked', { adminBlocked: query.adminBlocked });
    }

    if (!showEverything) {
      qb.andWhere('livestock.status = :availableStatus', {
        availableStatus: LivestockStatus.AVAILABLE,
      })
        .andWhere('livestock.adminBlocked = false')
        .andWhere('farmerProfile.verificationStatus = :verified', { verified: VerificationStatus.VERIFIED })
        .andWhere('livestock.speciesApprovalStatus = :approved', { approved: RequestStatus.APPROVED })
        .andWhere('(livestock.breedId IS NULL OR livestock.breedApprovalStatus = :approved)', {
          approved: RequestStatus.APPROVED,
        })
        .andWhere('(livestock.marketplaceEligibleFrom IS NULL OR livestock.marketplaceEligibleFrom <= :now)', {
          now: new Date(),
        })
        .andWhere(
          'COALESCE(livestock.marketplaceExpiresAt, DATE_ADD(livestock.createdAt, INTERVAL 14 DAY)) > :now',
          { now: new Date() },
        );
    }

    const total = await qb.getCount();
    qb.skip(skip).take(take);
    const rows = await qb.getRawAndEntities();
    const data = rows.entities.map((listing, index) => {
      const verificationStatus = rows.raw[index].farmerProfile_verificationStatus as VerificationStatus;
      return this.withPublicFarmer(this.withDerivedVisibility(listing, verificationStatus));
    });
    return { data, total, page, limit };
  }

  async findOneWithVisibility(id: string): Promise<LivestockWithVisibility> {
    const listing = await this.repository.findOne({
      where: { id },
      relations: {
        species: true,
        breed: true,
        category: true,
        farmer: { farmerProfile: true },
      },
    });
    if (!listing) throw new NotFoundException(`Livestock ${id} not found`);
    const verificationStatus = listing.farmer?.farmerProfile?.verificationStatus ?? VerificationStatus.UNVERIFIED;
    return this.withPublicFarmer(this.withDerivedVisibility(listing, verificationStatus));
  }

  private withPublicFarmer(listing: LivestockWithVisibility): LivestockWithVisibility {
    const farmer = listing.farmer;
    const profile = farmer?.farmerProfile;
    if (!farmer || !profile) return listing;

    listing.farmer = {
      id: farmer.id,
      fullName: farmer.fullName,
      avatarUrl: farmer.avatarUrl,
      farmerProfile: {
        id: profile.id,
        userId: profile.userId,
        farmName: profile.farmName,
        farmDescription: profile.farmDescription,
        farmAddressLine: profile.farmAddressLine,
        farmCity: profile.farmCity,
        farmState: profile.farmState,
        farmPostcode: profile.farmPostcode,
        logoUrl: profile.logoUrl,
        deliveryPreference: profile.deliveryPreference,
        verificationStatus: profile.verificationStatus,
        ratingAverage: profile.ratingAverage,
        ratingCount: profile.ratingCount,
        totalSales: profile.totalSales,
      } as FarmerProfile,
    } as User;
    return listing;
  }

  async findOneForViewer(id: string, viewer?: AuthenticatedUser): Promise<LivestockWithVisibility> {
    await this.dataSource.transaction((manager) => this.reservationsService.expireDue(manager, id));
    const listing = await this.findOneWithVisibility(id);
    const canSeeHidden =
      viewer?.role === UserRole.ADMIN ||
      (viewer?.role === UserRole.FARMER && listing.farmerId === viewer.id);
    if (!canSeeHidden && !listing.marketplaceVisible) {
      throw new NotFoundException(`Livestock ${id} not found`);
    }
    if (!canSeeHidden) {
      await this.repository.increment({ id }, 'viewCount', 1);
      listing.viewCount += 1;
    }
    return listing;
  }

  availability(id: string, viewer: AuthenticatedUser) {
    return this.reservationsService.availability(id, viewer.id);
  }

  // Computes the same visible/reason pair the browse query filters on, purely
  // from facts that live elsewhere (farmer verification, species/breed
  // approval, eligibility date) plus the one real stored fact, the admin
  // block — never stored itself, so it can never drift from those sources.
  private withDerivedVisibility(
    listing: Livestock,
    farmerVerificationStatus: VerificationStatus,
  ): LivestockWithVisibility {
    return Object.assign(listing, computeMarketplaceVisibility(listing, farmerVerificationStatus));
  }

  async createForFarmer(farmerId: string, data: DeepPartial<Livestock>): Promise<Livestock> {
    if (!data.speciesId) throw new BadRequestException('Select an active species');
    if (data.status === LivestockStatus.RESERVED || data.status === LivestockStatus.SOLD) {
      throw new BadRequestException('A new listing cannot start as reserved or sold');
    }
    await this.validateReferenceData(data.speciesId, data.breedId);
    return this.create({
      ...data,
      farmerId,
      marketplaceExpiresAt:
        data.status === LivestockStatus.AVAILABLE
          ? new Date(Date.now() + LISTING_LIFETIME_MS)
          : null,
      speciesApprovalStatus: RequestStatus.APPROVED,
      breedApprovalStatus: RequestStatus.APPROVED,
    });
  }

  async updateOwned(
    id: string,
    viewer: AuthenticatedUser,
    data: DeepPartial<Livestock>,
  ): Promise<Livestock> {
    const listing = await this.findOwned(id, viewer);
    if (data.status === LivestockStatus.SOLD) {
      throw new BadRequestException('status SOLD can only be set by completing a purchase');
    }
    if (data.status === LivestockStatus.AVAILABLE) {
      data.marketplaceExpiresAt = new Date(Date.now() + LISTING_LIFETIME_MS);
      data.soldAt = null;
    }
    if (data.speciesId !== undefined || data.breedId !== undefined) {
      const speciesId = data.speciesId ?? listing.speciesId;
      const breedId = data.breedId === undefined ? listing.breedId : data.breedId;
      await this.validateReferenceData(speciesId, breedId);
      data.speciesApprovalStatus = RequestStatus.APPROVED;
      data.breedApprovalStatus = RequestStatus.APPROVED;
    }
    return super.update(listing.id, data);
  }

  private async validateReferenceData(speciesId: string, breedId?: string | null): Promise<void> {
    const species = await this.dataSource.getRepository(Species).findOne({ where: { id: speciesId, isActive: true } });
    if (!species) throw new BadRequestException('Select an active species');
    if (!breedId) return;
    const breed = await this.dataSource.getRepository(Breed).findOne({ where: { id: breedId, speciesId, isActive: true } });
    if (!breed) throw new BadRequestException('Select an active breed that belongs to this species');
  }

  async removeOwned(id: string, viewer: AuthenticatedUser): Promise<void> {
    const listing = await this.findOwned(id, viewer);
    await this.repository.remove(listing);
  }

  // Fetches a listing and confirms `viewer` owns it (or is an admin). Anyone
  // else gets the exact same 404 a made-up id would return.
  private async findOwned(id: string, viewer: AuthenticatedUser): Promise<Livestock> {
    const listing = await this.findOne(id);
    if (viewer.role !== UserRole.ADMIN && listing.farmerId !== viewer.id) {
      throw new NotFoundException(`Livestock ${id} not found`);
    }
    return listing;
  }

  // Admin override: force a listing off the marketplace (or clear that
  // override) regardless of what the derived rule would otherwise compute.
  async setMarketplaceBlock(id: string, blocked: boolean, reason: string | null): Promise<LivestockWithVisibility> {
    await this.findOne(id);
    await this.repository.update(id, {
      adminBlocked: blocked,
      adminBlockReason: blocked ? reason : null,
    });
    return this.findOneWithVisibility(id);
  }

  // Admin-only, same shape as setMarketplaceBlock: isFeatured is a homepage
  // curation decision, not something a farmer can grant their own listing.
  async setFeatured(id: string, featured: boolean): Promise<LivestockWithVisibility> {
    await this.findOne(id);
    await this.repository.update(id, { isFeatured: featured });
    return this.findOneWithVisibility(id);
  }

  // Used by the order checkout flow inside its own transaction, hence the
  // optional manager — falls back to this service's own repository outside one.
  async markSold(id: string, manager?: EntityManager): Promise<void> {
    const run = async (entityManager: EntityManager): Promise<void> => {
      const listing = await entityManager
        .createQueryBuilder(Livestock, 'livestock')
        .setLock('pessimistic_write')
        .where('livestock.id = :id', { id })
        .getOne();
      if (!listing) throw new NotFoundException(`Livestock ${id} not found`);

      const farmerProfile = await entityManager.findOne(FarmerProfile, {
        where: { userId: listing.farmerId },
      });
      const visibility = computeMarketplaceVisibility(
        listing,
        farmerProfile?.verificationStatus ?? VerificationStatus.UNVERIFIED,
      );
      if (!visibility.marketplaceVisible) {
        throw new ConflictException(`Livestock ${id} is no longer available for purchase`);
      }

      listing.status = LivestockStatus.SOLD;
      listing.soldAt = new Date();
      await entityManager.save(listing);
    };

    if (manager) return run(manager);
    return this.dataSource.transaction(run);
  }

  // Inverse of markSold — used when an order containing this listing is
  // cancelled or refunded. Row-locked like markSold's counterpart on
  // BulkListing, since two concurrent cancel/refund operations on orders
  // that (somehow) share a listing must not both release it. Always sets
  // AVAILABLE specifically (never restores some prior status), and is a
  // no-op if the listing is already available.
  async releaseToAvailable(id: string, manager?: EntityManager): Promise<void> {
    const run = async (entityManager: EntityManager): Promise<void> => {
      const listing = await entityManager
        .createQueryBuilder(Livestock, 'livestock')
        .setLock('pessimistic_write')
        .where('livestock.id = :id', { id })
        .getOne();

      if (!listing) return; // order item pointed at a listing that no longer exists
      if (listing.status === LivestockStatus.AVAILABLE) return; // idempotent no-op

      listing.status = LivestockStatus.AVAILABLE;
      listing.soldAt = null;
      listing.marketplaceExpiresAt = new Date(Date.now() + LISTING_LIFETIME_MS);
      await entityManager.save(listing);
    };

    if (manager) return run(manager);
    return this.dataSource.transaction(run);
  }
}

export function computeMarketplaceVisibility(
  listing: Pick<
    Livestock,
    | 'status'
    | 'adminBlocked'
    | 'adminBlockReason'
    | 'speciesApprovalStatus'
    | 'breedApprovalStatus'
    | 'breedId'
    | 'marketplaceEligibleFrom'
    | 'marketplaceExpiresAt'
    | 'createdAt'
  >,
  farmerVerificationStatus: VerificationStatus,
): DerivedMarketplaceVisibility {
  if (listing.status !== LivestockStatus.AVAILABLE) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: `Listing is ${listing.status}` };
  }
  if (listing.adminBlocked) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: listing.adminBlockReason ?? 'Blocked by admin' };
  }
  if (farmerVerificationStatus !== VerificationStatus.VERIFIED) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: 'Farmer is not verified' };
  }
  if (listing.speciesApprovalStatus !== RequestStatus.APPROVED) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: 'Species is pending approval' };
  }
  if (listing.breedId && listing.breedApprovalStatus !== RequestStatus.APPROVED) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: 'Breed is pending approval' };
  }
  if (listing.marketplaceEligibleFrom && listing.marketplaceEligibleFrom > new Date()) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: 'Not yet eligible for marketplace' };
  }
  const expiresAt =
    listing.marketplaceExpiresAt ??
    new Date(listing.createdAt.getTime() + LISTING_LIFETIME_MS);
  if (expiresAt <= new Date()) {
    return { marketplaceVisible: false, marketplaceVisibilityReason: 'Listing expired after 14 days' };
  }
  return { marketplaceVisible: true, marketplaceVisibilityReason: null };
}
