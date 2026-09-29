import type { DecodedIdToken } from 'firebase-admin/auth';
import type { JwtService } from '@nestjs/jwt';
import type { DeepPartial, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import type { FirebaseAdminService } from './firebase-admin.service';
import { FirebasePortal } from './dto/firebase-login.dto';
import {
  FarmerProfile,
  RefreshToken,
  User,
  UserRole,
  UserStatus,
} from '../entities';

// @nestjs/typeorm@12 is ESM-only while this repository's Jest runtime is
// CommonJS. AuthService only needs the decorator shape during this unit test.
jest.mock('@nestjs/typeorm', () => {
  return {
    InjectRepository: () => () => undefined,
  };
});

jest.mock('./jwt.constants', () => ({
  jwtConstants: { refreshTtlMs: 7 * 24 * 60 * 60 * 1000 },
}));

jest.mock('./firebase-admin.service', () => ({
  FirebaseAdminService: class FirebaseAdminService {},
}));

describe('AuthService Firebase portal roles', () => {
  const identity = {
    uid: 'firebase-user-1',
    email: 'person@example.com',
    email_verified: true,
    name: 'QURBI Person',
    picture: 'https://example.com/avatar.jpg',
  } as unknown as DecodedIdToken;

  function setup(existingUser: User | null = null) {
    const findOne = jest
      .fn<Promise<User | null>, []>()
      .mockResolvedValueOnce(existingUser?.googleId ? existingUser : null)
      .mockResolvedValueOnce(existingUser);
    const create = jest.fn((value: DeepPartial<User>) => value as User);
    const save = jest.fn((value: DeepPartial<User>) =>
      Promise.resolve({ id: 'user-1', ...value } as User),
    );
    const userRepository = {
      findOne,
      create,
      save,
    } as unknown as Repository<User>;
    const createRefreshToken = jest.fn(
      (value: DeepPartial<RefreshToken>) => value as RefreshToken,
    );
    const saveRefreshToken = jest.fn((value: DeepPartial<RefreshToken>) =>
      Promise.resolve({ id: 'refresh-1', ...value } as RefreshToken),
    );
    const refreshTokenRepository = {
      create: createRefreshToken,
      save: saveRefreshToken,
    } as unknown as Repository<RefreshToken>;
    const farmerProfileRepository = {} as Repository<FarmerProfile>;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    } as unknown as JwtService;
    const firebaseAdminService = {
      verifyIdToken: jest.fn().mockResolvedValue(identity),
    } as unknown as FirebaseAdminService;

    const service = new AuthService(
      userRepository,
      refreshTokenRepository,
      farmerProfileRepository,
      jwtService,
      firebaseAdminService,
    );
    return { service, create, save };
  }

  it.each([
    [FirebasePortal.BUYER, UserRole.BUYER],
    [FirebasePortal.FARMER, UserRole.FARMER],
  ])(
    'creates a new %s portal account with the %s role',
    async (portal, expectedRole) => {
      const { service, create } = setup();

      const result = await service.loginWithFirebase(
        { idToken: 'firebase-token', portal },
        {},
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: identity.email,
          role: expectedRole,
          passwordHash: null,
        }),
      );
      expect(result.user.role).toBe(expectedRole);
    },
  );

  it.each([
    [UserRole.FARMER, FirebasePortal.BUYER],
    [UserRole.BUYER, FirebasePortal.FARMER],
  ])(
    'preserves an existing %s role when login comes from the %s portal',
    async (role, portal) => {
      const existingUser = {
        id: 'existing-user',
        email: identity.email,
        fullName: 'Existing Person',
        passwordHash: null,
        role,
        status: UserStatus.ACTIVE,
        googleId: identity.uid,
        avatarUrl: null,
        emailVerifiedAt: null,
        lastLoginAt: null,
      } as User;
      const { service, create, save } = setup(existingUser);

      const result = await service.loginWithFirebase(
        { idToken: 'firebase-token', portal },
        {},
      );

      expect(create).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ role }));
      expect(result.user.role).toBe(role);
    },
  );
});
