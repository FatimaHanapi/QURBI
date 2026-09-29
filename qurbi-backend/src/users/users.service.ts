import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Paginated, PageQuery, resolvePage } from '../common/pagination';

// Password lifecycle (register/login/change-password) is owned entirely by
// AuthModule (argon2id) — this service is profile CRUD only and must never
// accept or set passwordHash directly, or a /users write could plant a hash
// in a format AuthService.login()'s argon2.verify() can't parse.
type UserWriteInput = Omit<DeepPartial<User>, 'passwordHash'>;

export interface AdminUsersQuery extends PageQuery {
  role?: UserRole;
  status?: UserStatus;
}

@Injectable()
export class UsersService extends BaseCrudService<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository);
  }

  create(data: UserWriteInput): Promise<User> {
    return super.create(data);
  }

  // Admin-only listing (enforced by @Roles on the controller route) — the
  // one place a filter is applied instead of an ownership scope, since
  // there's no owner to scope to here, only an admin allowed to see everyone.
  async findAllForAdmin(query: AdminUsersQuery): Promise<Paginated<User>> {
    const { page, limit, skip, take } = resolvePage(query);
    const where: FindOptionsWhere<User> = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, total, page, limit };
  }

  async acceptAgreements(id: string, version: string): Promise<User> {
    await this.findOne(id);
    const acceptedAt = new Date();
    await this.repository.update(id, {
      privacyPolicyAcceptedAt: acceptedAt,
      userAgreementAcceptedAt: acceptedAt,
      adultConfirmedAt: acceptedAt,
      agreementsVersion: version,
    });
    return this.findOne(id);
  }

  // Fetches a user and confirms `viewer` is that user (or an admin). Anyone
  // else gets the exact same 404 a made-up id would return.
  async findOwned(id: string, viewer: AuthenticatedUser): Promise<User> {
    const user = await this.findOne(id);
    if (viewer.role !== UserRole.ADMIN && user.id !== viewer.id) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  // role/status are privilege-bearing fields — a non-admin actor (editing
  // their own row, the only row findOwned lets them reach) can never touch
  // them, self-elevation included.
  async updateOwned(
    id: string,
    viewer: AuthenticatedUser,
    data: UserWriteInput,
  ): Promise<User> {
    await this.findOwned(id, viewer);
    if (
      viewer.role !== UserRole.ADMIN &&
      (data.role !== undefined || data.status !== undefined)
    ) {
      throw new ForbiddenException('Only an admin can change role or status');
    }
    return super.update(id, data);
  }

  async removeOwned(id: string, viewer: AuthenticatedUser): Promise<void> {
    const user = await this.findOwned(id, viewer);
    await this.repository.remove(user);
  }
}
