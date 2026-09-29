import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LivestockCategory } from '../entities';
import { BaseCrudService } from '../common/base-crud.service';

@Injectable()
export class LivestockCategoriesService extends BaseCrudService<LivestockCategory> {
  constructor(
    @InjectRepository(LivestockCategory)
    repository: Repository<LivestockCategory>,
  ) {
    super(repository);
  }
}
