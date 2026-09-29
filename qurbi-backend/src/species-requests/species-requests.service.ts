import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {
  Livestock,
  RequestStatus,
  Species,
  SpeciesRequest,
  UserRole,
} from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import { slugify } from '../common/slugify';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Paginated, PageQuery, resolvePage } from '../common/pagination';

export interface SpeciesRequestsQuery extends PageQuery {
  requestedByUserId?: string;
  status?: RequestStatus;
}

@Injectable()
export class SpeciesRequestsService extends BaseCrudService<SpeciesRequest> {
  constructor(
    @InjectRepository(SpeciesRequest) repository: Repository<SpeciesRequest>,
    @InjectRepository(Species)
    private readonly speciesRepository: Repository<Species>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(repository);
  }

  // A non-admin is always scoped to their own requests, regardless of what
  // (if anything) they pass as requestedByUserId — only an admin can look up
  // another user's, or everyone's. status/pagination apply on top of that
  // scope, never in place of it.
  async findAllForViewer(
    viewer: AuthenticatedUser,
    query: SpeciesRequestsQuery,
  ): Promise<Paginated<SpeciesRequest>> {
    const { page, limit, skip, take } = resolvePage(query);
    const where: FindOptionsWhere<SpeciesRequest> = {};
    if (query.status) where.status = query.status;

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
  ): Promise<SpeciesRequest> {
    const request = await this.findOne(id);
    if (
      viewer.role !== UserRole.ADMIN &&
      request.requestedByUserId !== viewer.id
    ) {
      throw new NotFoundException(`SpeciesRequest ${id} not found`);
    }
    return request;
  }

  // Approval is the one place a Species row gets created from a request, and
  // links back to it via createdSpeciesId so the farmer can see what came of
  // it. It also propagates the approval onto every listing already waiting on
  // this species — that's carrying a fact from the request to the listings
  // that reference it, not caching a computed value.
  async review(
    id: string,
    input: { approve: boolean; reviewerId: string; reviewNote?: string },
  ): Promise<SpeciesRequest> {
    const request = await this.findOne(id);
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request ${id} has already been reviewed`);
    }

    return this.dataSource.transaction(async (manager) => {
      request.reviewedByUserId = input.reviewerId;
      request.reviewedAt = new Date();
      request.reviewNote = input.reviewNote ?? null;

      if (input.approve) {
        const species = await manager.save(
          manager.create(Species, {
            name: request.proposedName,
            slug: slugify(request.proposedName),
          }),
        );
        request.status = RequestStatus.APPROVED;
        request.createdSpeciesId = species.id;
        await manager.update(
          Livestock,
          { speciesId: species.id },
          { speciesApprovalStatus: RequestStatus.APPROVED },
        );
      } else {
        request.status = RequestStatus.REJECTED;
      }

      return manager.save(request);
    });
  }
}
