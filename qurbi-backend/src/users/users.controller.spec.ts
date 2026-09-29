import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '../entities';

// See users.service.spec.ts — @nestjs/typeorm@12 is ESM-only, so it's mocked
// out here too since UsersController transitively imports UsersService.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
  getRepositoryToken: (entity: unknown) => entity,
}));

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    acceptAgreements: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('records agreements for the authenticated user', async () => {
    const accepted = { id: 'buyer-1', agreementsVersion: '2026-09-20' };
    usersService.acceptAgreements.mockResolvedValueOnce(accepted);

    await expect(
      controller.acceptAgreements(
        { id: 'buyer-1', role: UserRole.BUYER },
        {
          acceptPrivacyPolicy: true,
          acceptUserAgreement: true,
          confirmAdult: true,
          version: '2026-09-20',
        },
      ),
    ).resolves.toBe(accepted);
    expect(usersService.acceptAgreements).toHaveBeenCalledWith(
      'buyer-1',
      '2026-09-20',
    );
  });
});
