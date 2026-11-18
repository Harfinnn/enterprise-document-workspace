import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';

import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';

import { RequireRoles } from './decorators/roles.decorator.js';
import { RequirePermissions } from './decorators/permissions.decorator.js';

import { EmailService } from '../email/email.service.js';
import { TestEmailDto } from './dto/test-email.dto.js';

import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { PasswordResetService } from './services/password-reset.service.js';

import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailVerificationService } from './services/email-verification.service.js';

import { ResetPasswordDto } from './dto/reset-password.dto.js';

import { ActivateAccountDto } from './dto/activate-account.dto.js';
import { AccountActivationService } from './services/account-activation.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly accountActivationService: AccountActivationService,
  ) {}

  // ==========================================
  // LOGIN
  // 5 requests / 1 minute
  // ==========================================

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  // ==========================================
  // REFRESH TOKEN
  // ==========================================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  // ==========================================
  // USER PROFILE
  // ==========================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Profil berhasil diambil.',
      user,
    };
  }

  // ==========================================
  // ADMIN CHECK
  // ==========================================

  @Get('admin-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('IT_SUPERADMIN')
  adminCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Akses Superadmin berhasil.',
      user: user.email,
      role: user.roles,
    };
  }

  // ==========================================
  // AUDIT PERMISSION CHECK
  // ==========================================

  @Get('audit-check')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('audit.read')
  auditCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Akses audit berhasil.',
      user: user.email,
    };
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.logout(dto.refreshToken, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  // ==========================================
  // TEST EMAIL
  // SUPERADMIN ONLY
  // ==========================================

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('IT_SUPERADMIN')
  async testEmail(@Body() dto: TestEmailDto) {
    await this.emailService.verifyConnection();

    const result = await this.emailService.sendEmail({
      to: dto.to,
      subject: 'EDW - SMTP Connection Test',
      text: 'Email ini merupakan pesan pengujian SMTP dari Enterprise Document Workspace.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h2 style="color: #071B2B;">EDW Email Test</h2>
          <p>Koneksi SMTP EDW berhasil digunakan untuk mengirim email.</p>
          <p>Ini adalah pesan pengujian integrasi email.</p>
          <hr />
          <small>Enterprise Document Workspace</small>
        </div>
      `,
    });

    return {
      message: 'Email berhasil diserahkan ke server SMTP.',
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }

  // ==========================================
  // FORGOT PASSWORD
  // 3 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 3,
      ttl: 900_000,
    },
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: Request,
  ) {
    return this.passwordResetService.requestEmailReset(dto.email, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  // ==========================================
  // SEND EMAIL VERIFICATION
  // 3 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 3,
      ttl: 900_000,
    },
  })
  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async sendVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.emailVerificationService.sendVerification(user.id, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  // ==========================================
  // VERIFY EMAIL
  // 5 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 5,
      ttl: 900_000,
    },
  })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    return this.emailVerificationService.verifyEmail(dto.token, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  // ==========================================
  // RESET PASSWORD
  // 5 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 5,
      ttl: 900_000,
    },
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    return this.passwordResetService.resetPassword(dto.token, dto.newPassword, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  // ==========================================
  // ACTIVATE ACCOUNT
  // 5 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 5,
      ttl: 900_000,
    },
  })
  @Post('activate-account')
  @HttpCode(HttpStatus.OK)
  async activateAccount(
    @Body() dto: ActivateAccountDto,
    @Req() request: Request,
  ) {
    return this.accountActivationService.activate(dto.token, dto.newPassword, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
