import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../entities';

// Set by JwtAuthGuard from the verified access token payload — never trust
// any other source for this.
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
