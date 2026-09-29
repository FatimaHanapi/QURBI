import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import {
  FarmerProfile,
  RefreshToken,
  User,
  UserRole,
  UserStatus,
} from '../entities';
import { jwtConstants } from './jwt.constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { FirebaseLoginDto, FirebasePortal } from './dto/firebase-login.dto';
import { FirebaseAdminService } from './firebase-admin.service';

export interface RequestMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

type SafeUser = Omit<User, 'passwordHash'>;
// farmerProfile is only ever attached for role === farmer; omitted (not even
// `null`) for buyer/admin so the shape itself signals "not applicable" vs
// "farmer who hasn't onboarded yet". Re-declared (not inherited from
// SafeUser/User, whose own `farmerProfile` relation is non-nullable) so it
// can legally be `null` here.
type MeResponse = Omit<SafeUser, 'farmerProfile'> & {
  farmerProfile?: FarmerProfile | null;
};

// Precomputed once and reused for every login where the email doesn't match
// a real user, so argon2.verify always runs against a real-shaped hash. This
// keeps a failed login's response time roughly the same whether the email
// exists or not, on top of the JSON body already being identical.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash(randomBytes(32).toString('hex'), {
      type: argon2.argon2id,
    });
  }
  return dummyHashPromise;
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function sanitize(user: User): SafeUser {
  const safe: Partial<User> = { ...user };
  delete safe.passwordHash;
  return safe as SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(FarmerProfile)
    private readonly farmerProfileRepository: Repository<FarmerProfile>,
    private readonly jwtService: JwtService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const email = dto.email.toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.userRepository.save(
      this.userRepository.create({
        email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone?.trim() || null,
        role: dto.role,
      }),
    );
    return sanitize(user);
  }

  async login(
    dto: LoginDto,
    meta: RequestMeta,
  ): Promise<TokenPair & { user: SafeUser }> {
    const email = dto.email.toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    const hashToCheck = user?.passwordHash ?? (await getDummyHash());
    const passwordMatches = await argon2
      .verify(hashToCheck, dto.password)
      .catch(() => false);

    // Same exception, same message, whichever of these failed — never reveal
    // which one it was.
    if (
      !user ||
      !user.passwordHash ||
      !passwordMatches ||
      user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokenPair(user, meta);
    return { ...tokens, user: sanitize(user) };
  }

  async loginWithFirebase(
    dto: FirebaseLoginDto,
    meta: RequestMeta,
  ): Promise<TokenPair & { user: SafeUser }> {
    const identity = await this.firebaseAdminService.verifyIdToken(dto.idToken);
    if (!identity.email || !identity.email_verified) {
      throw new UnauthorizedException('A verified email address is required');
    }

    const email = identity.email.toLowerCase();
    let user = await this.userRepository.findOne({
      where: { googleId: identity.uid },
    });
    user ??= await this.userRepository.findOne({ where: { email } });

    if (user?.googleId && user.googleId !== identity.uid) {
      throw new UnauthorizedException(
        'This email is linked to another Google account',
      );
    }

    if (!user) {
      user = this.userRepository.create({
        email,
        passwordHash: null,
        fullName: (typeof identity.name === 'string' && identity.name
          ? identity.name
          : email.split('@')[0]
        ).slice(0, 150),
        role:
          dto.portal === FirebasePortal.BUYER
            ? UserRole.BUYER
            : UserRole.FARMER,
        status: UserStatus.ACTIVE,
        avatarUrl: identity.picture || null,
        googleId: identity.uid,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      });
    } else {
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }
      user.googleId ??= identity.uid;
      user.avatarUrl ??= identity.picture || null;
      user.emailVerifiedAt ??= new Date();
      user.lastLoginAt = new Date();
    }

    user = await this.userRepository.save(user);
    const tokens = await this.issueTokenPair(user, meta);
    return { ...tokens, user: sanitize(user) };
  }

  async refresh(dto: RefreshDto, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = hashToken(dto.refreshToken);
    const existing = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      // A revoked (already-rotated) token being presented again means it was
      // copied somewhere it shouldn't have been — treat it as theft and kill
      // every active session for this user, not just this one token.
      await this.refreshTokenRepository.update(
        { userId: existing.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException(
        'Refresh token reuse detected; all sessions revoked',
      );
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepository.findOne({
      where: { id: existing.userId },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return this.issueTokenPair(user, meta, existing);
  }

  async logout(dto: RefreshDto): Promise<void> {
    const tokenHash = hashToken(dto.refreshToken);
    const existing = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });
    // Idempotent — logging out an already-revoked or unknown token is not an error.
    if (existing && !existing.revokedAt) {
      existing.revokedAt = new Date();
      await this.refreshTokenRepository.save(existing);
    }
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const safe = sanitize(user);

    // verificationStatus lives on FarmerProfile, not User (one source of
    // truth) — the frontend needs it off the user object, so attach the
    // profile itself rather than duplicating the column. Only queried for
    // farmers; buyers/admins never have a profile row to begin with.
    if (user.role === UserRole.FARMER) {
      const farmerProfile = await this.farmerProfileRepository.findOne({
        where: { userId },
      });
      return { ...safe, farmerProfile: farmerProfile ?? null };
    }

    return safe;
  }

  private async issueTokenPair(
    user: User,
    meta: RequestMeta,
    rotatedFrom?: RefreshToken,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    const rawRefreshToken = randomBytes(64).toString('hex');
    const refreshTokenEntity = await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + jwtConstants.refreshTtlMs),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      }),
    );

    if (rotatedFrom) {
      rotatedFrom.revokedAt = new Date();
      rotatedFrom.replacedByTokenId = refreshTokenEntity.id;
      await this.refreshTokenRepository.save(rotatedFrom);
    }

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
