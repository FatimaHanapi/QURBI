import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { jwtConstants } from '../jwt.constants';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import type { UserRole } from '../../entities';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

interface AuthRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

// Global guard (bound via APP_GUARD) — default-deny. Every route requires a
// valid access token unless explicitly marked @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (isPublic) {
      // Public routes still see who is asking when a valid token is sent
      // (e.g. a farmer viewing their own draft listing); a missing or bad
      // token just means the request is treated as a guest.
      if (token) {
        request.user = (await this.verify(token)) ?? undefined;
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const user = await this.verify(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    request.user = user;
    return true;
  }

  private async verify(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret: jwtConstants.secret },
      );
      return { id: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }
}

function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  return type === 'Bearer' && token ? token : null;
}
