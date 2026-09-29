import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {
  Breed,
  BreedRequest,
  Livestock,
  RequestStatus,
  UserRole,
} from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import { slugify } from '../common/slugify';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Paginated, PageQuery, resolvePage } from '../common/pagination';

export interface BreedRequestsQuery extends PageQuery {
  requestedByUserId?: string;
  speciesId?: string;
  status?: RequestStatus;
}

@Injectable()
export class BreedRequestsService extends BaseCrudService<BreedRequest> {
  constructor(
    @InjectRepository(BreedRequest) repository: Repository<BreedRequest>,
    @InjectRepository(Breed)
    private readonly breedRepository: Repository<Breed>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(repository);
  }

  // A non-admin is always scoped to their own requests, regardless of what
  // (if anything) they pass as requestedByUserId — only an admin can look up
  // another user's, or everyone's. speciesId stays a public filter either way
  // (reference data); status/pagination apply on top of the ownership scope,
  // never in place of it.
  async findAllForViewer(
    viewer: AuthenticatedUser,
    query: BreedRequestsQuery,
  ): Promise<Paginated<BreedRequest>> {
    const { page, limit, skip, take } = resolvePage(query);
    const where: FindOptionsWhere<BreedRequest> = {};
    if (query.status) where.status = query.status;
    if (query.speciesId) where.speciesId = query.speciesId;

    if (viewer.role === UserRole.ADMIN) {
      if (query.requestedByUserId)
        where.requestedByUserId = query.requestedByUserId;
    } else {
      where.requestedByUserId = viewer.id;
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, total, page, limit };
  }

  // Fetches a request and confirms `viewer` is the requester (or an admin).
  // Anyone else gets the exact same 404 a made-up id would return.
  async findOwned(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<BreedRequest> {
    const request = await this.findOne(id);
    if (
      viewer.role !== UserRole.ADMIN &&
      request.requestedByUserId !== viewer.id
    ) {
      throw new NotFoundException(`BreedRequest ${id} not found`);
    }
    return request;
  }

  // Same pattern as SpeciesRequests: approval creates the Breed row (under
  // the species the request was made against), links back to it, and
  // propagates the approval onto every listing already waiting on this breed.
  async review(
    id: string,
    input: { approve: boolean; reviewerId: string; reviewNote?: string },
  ): Promise<BreedRequest> {
    const request = await this.findOne(id);
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request ${id} has already been reviewed`);
    }

    return this.dataSource.transaction(async (manager) => {
      request.reviewedByUserId = input.reviewerId;
      request.reviewedAt = new Date();
      request.reviewNote = input.reviewNote ?? null;

      if (input.approve) {
        const breed = await manager.save(
          manager.create(Breed, {
            speciesId: request.speciesId,
            name: request.proposedName,
            slug: slugify(request.proposedName),
          }),
        );
        request.status = RequestStatus.APPROVED;
        request.createdBreedId = breed.id;
        await manager.update(
          Livestock,
          { breedId: breed.id },
          { breedApprovalStatus: RequestStatus.APPROVED },
        );
      } else {
        request.status = RequestStatus.REJECTED;
      }

      return manager.save(request);
    });
  }
}
