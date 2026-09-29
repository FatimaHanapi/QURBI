import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities';
import { UsersService } from './users.service';

// @nestjs/typeorm@12 ships ESM-only, which this project's CommonJS Jest
// config can't load directly — mock it so the test never touches the real
// package, only the decorator/token shapes UsersService actually needs.
jest.mock('@nestjs/typeorm', () => {
  const { Inject } =
    jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    InjectRepository: (entity: Parameters<typeof Inject>[0]) => Inject(entity),
    getRepositoryToken: (entity: unknown) => entity,
  };
});

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
