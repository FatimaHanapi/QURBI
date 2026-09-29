import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, RequestMeta } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { FirebaseLoginDto } from './dto/firebase-login.dto';

// Roughly 5 attempts/minute on the credential-guessing endpoints, tighter
// than the app-wide throttler default.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, extractMeta(req));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('firebase')
  firebaseLogin(@Body() dto: FirebaseLoginDto, @Req() req: Request) {
    return this.authService.loginWithFirebase(dto, extractMeta(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto, extractMeta(req));
  }

  // Public like /refresh: the refresh token itself is the credential here,
  // not the (possibly already-expired) access token — a client shouldn't
  // need a live access token just to kill its own refresh session.
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}

function extractMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  };
}
