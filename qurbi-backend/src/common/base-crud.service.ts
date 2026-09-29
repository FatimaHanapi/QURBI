import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

// Shared create/findAll/findOne/update/remove so entities with no special
// workflow (species, breeds, categories, ...) don't each re-implement the
// same five methods. Entities with real invariants (orders, bulk listings,
// notifications, ...) skip this and write their own service from scratch.
export abstract class BaseCrudService<T extends { id: string }> {
  protected constructor(protected readonly repository: Repository<T>) {}

  create(data: DeepPartial<T>): Promise<T> {
    return this.repository.save(this.repository.create(data));
  }

  findAll(where?: FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.find({ where });
  }

  async findOne(id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(
        `${this.repository.metadata.name} ${id} not found`,
      );
    }
    return entity;
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    await this.findOne(id);
    await this.repository.update(id, data as QueryDeepPartialEntity<T>);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
  }
}
