import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { FarmerProfile, UserRole } from '../entities';
import { BaseCrudService } from '../common/base-crud.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class FarmerProfilesService extends BaseCrudService<FarmerProfile> {
  constructor(
    @InjectRepository(FarmerProfile) repository: Repository<FarmerProfile>,
  ) {
    super(repository);
  }

  findByUserId(userId: string): Promise<FarmerProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  // One profile per user — created the moment a buyer becomes a farmer.
  async create(data: DeepPartial<FarmerProfile>): Promise<FarmerProfile> {
    const existing = await this.findByUserId(data.userId as string);
    if (existing) {
      throw new ConflictException(
        `User ${data.userId} already has a farmer profile`,
      );
    }
    return super.create(data);
  }

  // Fetches a profile and confirms `viewer` owns it (or is an admin). Anyone
  // else gets the exact same 404 a made-up id would return.
  async findOwned(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<FarmerProfile> {
    const profile = await this.findOne(id);
    if (viewer.role !== UserRole.ADMIN && profile.userId !== viewer.id) {
      throw new NotFoundException(`FarmerProfile ${id} not found`);
    }
    return profile;
  }

  async updateOwned(
    id: string,
    viewer: AuthenticatedUser,
    data: DeepPartial<FarmerProfile>,
  ): Promise<FarmerProfile> {
    await this.findOwned(id, viewer);
    return super.update(id, data);
  }

  async removeOwned(id: string, viewer: AuthenticatedUser): Promise<void> {
    const profile = await this.findOwned(id, viewer);
    await this.repository.remove(profile);
  }
}
