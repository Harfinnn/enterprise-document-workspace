import {
  Body,
  Controller,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
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

import { UpdatePhoneNumberDto } from './dto/update-phone-number.dto.js';

import { ResetPasswordDto } from './dto/reset-password.dto.js';

import { ActivateAccountDto } from './dto/activate-account.dto.js';
import { AccountActivationService } from './services/account-activation.service.js';

import { SendPasswordResetOtpDto } from './dto/send-password-reset-otp.dto.js';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto.js';

import { PhoneVerificationService } from './phone-verification.service.js';

import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto.js';

import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

import { UpdateProfileDto } from './dto/update-profile.dto.js';

import { ChangePasswordDto } from './dto/change-password.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly accountActivationService: AccountActivationService,
    private readonly whatsappService: WhatsAppService,
    private readonly phoneVerificationService: PhoneVerificationService,
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
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getProfile(user.id);

    return {
      message: 'Profil berhasil diambil.',
      user: profile,
    };
  }

  // ==========================================
  // UPDATE USER WHATSAPP NUMBER
  // ==========================================

  @Patch('profile/phone')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updatePhoneNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePhoneNumberDto,
  ) {
    return this.authService.updatePhoneNumber(user.id, dto.phoneNumber);
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
  // TEST WHATSAPP
  // SUPERADMIN ONLY
  // ==========================================

  @Throttle({
    default: {
      limit: 3,
      ttl: 900_000,
    },
  })
  @Post('test-whatsapp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('IT_SUPERADMIN')
  async testWhatsApp(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.testWhatsApp(user.id);
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
  // SEND PASSWORD RESET WHATSAPP OTP
  // 3 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 3,
      ttl: 900_000,
    },
  })
  @Post('password-reset/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendPasswordResetOtp(@Body() dto: SendPasswordResetOtpDto) {
    return this.passwordResetService.sendWhatsappOtp(dto.token);
  }

  // ==========================================
  // VERIFY PASSWORD RESET WHATSAPP OTP
  // 5 requests / 15 minutes
  // ==========================================

  @Throttle({
    default: {
      limit: 5,
      ttl: 900_000,
    },
  })
  @Post('password-reset/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordResetOtp(@Body() dto: VerifyPasswordResetOtpDto) {
    return this.passwordResetService.verifyWhatsAppOtp(dto.token, dto.otp);
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

  @Throttle({
    default: {
      limit: 3,
      ttl: 900_000,
    },
  })
  @Post('profile/phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async sendPhoneVerificationOtp(@CurrentUser() user: AuthenticatedUser) {
    return this.phoneVerificationService.sendOtp(user.id);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 900_000,
    },
  })
  @Post('profile/phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async verifyPhoneOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.phoneVerificationService.verifyOtp(user.id, dto.otp);
  }

  @Delete('profile/phone/pending')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async cancelPendingPhoneNumber(@CurrentUser() user: AuthenticatedUser) {
    return this.phoneVerificationService.cancelPendingPhoneNumber(user.id);
  }

  // ==========================================
  // UPDATE USER PROFILE
  // ==========================================

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  @Throttle({
    default: {
      limit: 5,
      ttl: 900_000,
    },
  })
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
