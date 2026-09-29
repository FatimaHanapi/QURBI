import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { BulkListing, BulkListingStatus, UserRole } from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class BulkListingsService extends BaseCrudService<BulkListing> {
  constructor(
    @InjectRepository(BulkListing) repository: Repository<BulkListing>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(repository);
  }

  // A farmer's own DRAFT lots are only visible to them (or an admin) — same
  // "own inventory sees everything, everyone else doesn't see drafts" shape
  // as LivestockService.findAllForViewer.
  findAllForViewer(
    where: FindOptionsWhere<BulkListing> | undefined,
    viewer?: AuthenticatedUser,
  ): Promise<BulkListing[]> {
    const isOwnInventory =
      viewer?.role === UserRole.FARMER && where?.farmerId === viewer.id;
    const isAdmin = viewer?.role === UserRole.ADMIN;
    const finalWhere =
      isAdmin || isOwnInventory
        ? where
        : { ...where, status: BulkListingStatus.OPEN };

    return this.repository.find({
      where: finalWhere,
      relations: { species: true, breed: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createForFarmer(
    farmerId: string,
    data: DeepPartial<BulkListing>,
  ): Promise<BulkListing> {
    if (
      data.status === BulkListingStatus.SOLD ||
      data.status === BulkListingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'a new bulk listing can only start as DRAFT or OPEN',
      );
    }
    return this.create({ ...data, farmerId });
  }

  async findOneForViewer(
    id: string,
    viewer?: AuthenticatedUser,
  ): Promise<BulkListing> {
    const listing = await this.findOne(id);
    const canSeeHidden =
      viewer?.role === UserRole.ADMIN ||
      (viewer?.role === UserRole.FARMER && listing.farmerId === viewer.id);
    if (!canSeeHidden && listing.status !== BulkListingStatus.OPEN) {
      throw new NotFoundException(`BulkListing ${id} not found`);
    }
    return listing;
  }

  async updateOwned(
    id: string,
    viewer: AuthenticatedUser,
    data: DeepPartial<BulkListing>,
  ): Promise<BulkListing> {
    const listing = await this.findOwned(id, viewer);
    if (data.status === BulkListingStatus.SOLD) {
      throw new BadRequestException(
        'status SOLD can only be set by completing a purchase',
      );
    }
    return super.update(listing.id, data);
  }

  async removeOwned(id: string, viewer: AuthenticatedUser): Promise<void> {
    const listing = await this.findOwned(id, viewer);
    await this.repository.remove(listing);
  }

  // Fetches a lot and confirms `viewer` owns it (or is an admin). Anyone else
  // gets the exact same 404 a made-up id would return.
  private async findOwned(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<BulkListing> {
    const listing = await this.findOne(id);
    if (viewer.role !== UserRole.ADMIN && listing.farmerId !== viewer.id) {
      throw new NotFoundException(`BulkListing ${id} not found`);
    }
    return listing;
  }

  // A lot is bought whole by exactly one buyer — this is a binary
  // OPEN -> SOLD flip, not a share decrement. Still needs the row lock: two
  // buyers checking out the same lot at the same instant could otherwise
  // both read "still open" and both succeed. Pass `manager` when this is one
  // step of a larger transaction (e.g. order checkout) so it joins that
  // transaction instead of opening a nested one.
  async markSold(id: string, manager?: EntityManager): Promise<BulkListing> {
    const run = async (entityManager: EntityManager): Promise<BulkListing> => {
      const listing = await entityManager
        .createQueryBuilder(BulkListing, 'bulk_listing')
        .setLock('pessimistic_write')
        .where('bulk_listing.id = :id', { id })
        .getOne();

      if (!listing) {
        throw new NotFoundException(`BulkListing ${id} not found`);
      }
      if (listing.status !== BulkListingStatus.OPEN) {
        throw new ConflictException(
          `BulkListing ${id} is no longer available for purchase`,
        );
      }

      listing.status = BulkListingStatus.SOLD;
      return entityManager.save(listing);
    };

    if (manager) return run(manager);
    return this.dataSource.transaction(run);
  }

  // Inverse of markSold — used when an order containing this lot is
  // cancelled or refunded. Same row-lock discipline as markSold, since two
  // concurrent cancel/refund operations must not both release it. Always
  // sets OPEN specifically (never restores some prior status), and is a
  // no-op if the lot is already open.
  async releaseToOpen(id: string, manager?: EntityManager): Promise<void> {
    const run = async (entityManager: EntityManager): Promise<void> => {
      const listing = await entityManager
        .createQueryBuilder(BulkListing, 'bulk_listing')
        .setLock('pessimistic_write')
        .where('bulk_listing.id = :id', { id })
        .getOne();

      if (!listing) return; // order item pointed at a lot that no longer exists
      if (listing.status === BulkListingStatus.OPEN) return; // idempotent no-op

      listing.status = BulkListingStatus.OPEN;
      await entityManager.save(listing);
    };

    if (manager) return run(manager);
    return this.dataSource.transaction(run);
  }
}
