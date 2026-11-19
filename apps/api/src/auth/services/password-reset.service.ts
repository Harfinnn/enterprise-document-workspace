import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { hash } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../../email/email.service.js';
import { EmailTemplateService } from '../../email/email-template.service.js';
import { AuditLogService } from '../../audit/audit-log.service.js';
import { WhatsAppService } from '../../whatsapp/whatsapp.service.js';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashOtp(otp: string): string {
    const secret = this.configService.getOrThrow<string>(
      'PASSWORD_RESET_OTP_SECRET',
    );

    return createHmac('sha256', secret).update(otp).digest('hex');
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private isValidOtpHash(submittedOtp: string, storedHash: string): boolean {
    const submittedHash = Buffer.from(this.hashOtp(submittedOtp), 'hex');
    const expectedHash = Buffer.from(storedHash, 'hex');

    return (
      submittedHash.length === expectedHash.length &&
      timingSafeEqual(submittedHash, expectedHash)
    );
  }

  async sendWhatsappOtp(rawToken: string) {
    if (
      typeof rawToken !== 'string' ||
      rawToken.length < 20 ||
      rawToken.length > 256
    ) {
      throw new BadRequestException(
        'Token reset password tidak valid atau sudah kedaluwarsa.',
      );
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    const challenge = await this.prisma.passwordResetChallenge.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        channel: true,
        expiresAt: true,
        consumedAt: true,
        otpLastSentAt: true,
        user: {
          select: {
            phoneNumber: true,
            phoneNumberVerifiedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !challenge ||
      challenge.channel !== 'EMAIL' ||
      challenge.consumedAt !== null ||
      challenge.expiresAt <= now
    ) {
      throw new BadRequestException(
        'Token reset password tidak valid atau sudah kedaluwarsa.',
      );
    }

    if (
      !challenge.user.isActive ||
      !challenge.user.phoneNumber ||
      !challenge.user.phoneNumberVerifiedAt
    ) {
      throw new BadRequestException(
        'Nomor WhatsApp belum terverifikasi. Silakan hubungi IT Support.',
      );
    }

    // Jeda pengiriman ulang OTP: 60 detik.
    if (
      challenge.otpLastSentAt &&
      now.getTime() - challenge.otpLastSentAt.getTime() < 60_000
    ) {
      throw new BadRequestException(
        'Silakan tunggu 60 detik sebelum meminta OTP kembali.',
      );
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const otpExpiresAt = new Date(now.getTime() + 5 * 60_000);

    // Simpan OTP sebelum mengirim pesan.
    const updated = await this.prisma.passwordResetChallenge.updateMany({
      where: {
        id: challenge.id,
        channel: 'EMAIL',
        consumedAt: null,
        expiresAt: { gt: now },
        OR: [
          { otpLastSentAt: null },
          {
            otpLastSentAt: {
              lte: new Date(now.getTime() - 60_000),
            },
          },
        ],
      },
      data: {
        otpHash,
        otpExpiresAt,
        otpVerifiedAt: null,
        otpLastSentAt: now,
        attempts: 0,
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException(
        'Permintaan OTP tidak dapat diproses. Silakan coba kembali.',
      );
    }

    try {
      await this.whatsappService.sendMessage(
        challenge.user.phoneNumber,
        [
          'EDW - Password Reset',
          '',
          `Kode OTP Anda: ${otp}`,
          '',
          'Kode berlaku selama 5 menit.',
          'Jangan berikan kode ini kepada siapa pun.',
          'Jika Anda tidak meminta reset password, abaikan pesan ini.',
        ].join('\n'),
      );
    } catch (error) {
      await this.prisma.passwordResetChallenge.updateMany({
        where: {
          id: challenge.id,
          otpHash,
          consumedAt: null,
        },
        data: {
          otpHash: null,
          otpExpiresAt: null,
          otpLastSentAt: null,
        },
      });

      throw error;
    }

    this.logger.log(
      `Password reset OTP submitted to WhatsApp for user ID ${challenge.userId}.`,
    );

    return {
      message:
        'Jika permintaan valid, kode OTP telah dikirim ke WhatsApp terdaftar.',
      expiresInSeconds: 300,
      resendAvailableInSeconds: 60,
    };
  }

  async verifyWhatsAppOtp(rawToken: string, submittedOtp: string) {
    if (
      typeof rawToken !== 'string' ||
      rawToken.length < 20 ||
      rawToken.length > 256
    ) {
      throw new BadRequestException('Token reset password tidak valid.');
    }

    if (typeof submittedOtp !== 'string' || !/^\d{6}$/.test(submittedOtp)) {
      throw new BadRequestException('OTP harus terdiri dari 6 digit.');
    }

    const now = new Date();
    const tokenHash = this.hashToken(rawToken);

    const challenge = await this.prisma.passwordResetChallenge.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        channel: true,
        expiresAt: true,
        consumedAt: true,
        otpHash: true,
        otpExpiresAt: true,
        otpVerifiedAt: true,
        attempts: true,
      },
    });

    if (
      !challenge ||
      challenge.channel !== 'EMAIL' ||
      challenge.consumedAt !== null ||
      challenge.expiresAt <= now
    ) {
      throw new BadRequestException(
        'Token reset password tidak valid atau sudah kedaluwarsa.',
      );
    }

    if (
      !challenge.otpHash ||
      !challenge.otpExpiresAt ||
      challenge.otpExpiresAt <= now
    ) {
      throw new BadRequestException(
        'OTP tidak valid atau sudah kedaluwarsa. Silakan minta OTP baru.',
      );
    }

    if (challenge.otpVerifiedAt) {
      return {
        message: 'OTP sudah berhasil diverifikasi.',
        verified: true,
      };
    }

    if (challenge.attempts >= 5) {
      throw new BadRequestException(
        'Batas percobaan OTP telah tercapai. Silakan minta OTP baru.',
      );
    }

    const isValid = this.isValidOtpHash(submittedOtp, challenge.otpHash);

    if (!isValid) {
      const attempt = await this.prisma.passwordResetChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          otpHash: challenge.otpHash,
          otpExpiresAt: { gt: now },
          attempts: { lt: 5 },
          otpVerifiedAt: null,
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      if (attempt.count !== 1) {
        throw new BadRequestException(
          'OTP tidak valid atau batas percobaan telah tercapai.',
        );
      }

      throw new BadRequestException(
        `OTP salah. Sisa percobaan: ${4 - challenge.attempts}.`,
      );
    }

    const verified = await this.prisma.passwordResetChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        otpHash: challenge.otpHash,
        otpExpiresAt: { gt: now },
        attempts: { lt: 5 },
        otpVerifiedAt: null,
      },
      data: {
        otpVerifiedAt: now,
      },
    });

    if (verified.count !== 1) {
      throw new BadRequestException(
        'OTP tidak dapat diverifikasi. Silakan coba kembali.',
      );
    }

    this.logger.log(
      `Password reset WhatsApp OTP verified for challenge ID ${challenge.id}.`,
    );

    return {
      message: 'OTP berhasil diverifikasi. Silakan buat password baru.',
      verified: true,
    };
  }

  async requestEmailReset(
    email: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    const genericResponse = {
      message:
        'Jika akun memenuhi persyaratan, instruksi pemulihan password akan dikirim ke email terdaftar.',
    };

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    const accountEligible = Boolean(
      user && user.isActive && user.emailVerifiedAt,
    );

    // Catat permintaan tanpa membocorkan keberadaan akun.
    await this.auditLogService.log({
      actorUserId: user?.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: user ? 'USER' : 'AUTH',
      entityId: user?.id,
      metadata: {
        channel: 'EMAIL',
        accountEligible,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    // Respons tetap sama untuk semua kondisi akun.
    if (!user || !user.isActive || !user.emailVerifiedAt) {
      return genericResponse;
    }

    const expiresInMinutes = Number(
      this.configService.get('PASSWORD_RESET_EXPIRES_MINUTES', '15'),
    );

    if (
      !Number.isInteger(expiresInMinutes) ||
      expiresInMinutes < 1 ||
      expiresInMinutes > 60
    ) {
      throw new Error('Konfigurasi masa berlaku password reset tidak valid.');
    }

    const webUrl = this.configService
      .getOrThrow<string>('EDW_WEB_URL')
      .replace(/\/+$/, '');

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const resetUrl = `${webUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // Buat challenge baru dan batalkan challenge aktif sebelumnya.
    const challenge = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetChallenge.updateMany({
        where: {
          userId: user.id,
          channel: 'EMAIL',
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return tx.passwordResetChallenge.create({
        data: {
          userId: user.id,
          channel: 'EMAIL',
          tokenHash,
          expiresAt,
          requestedIp: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
      });
    });

    try {
      const template = this.emailTemplateService.passwordReset({
        fullName: user.fullName,
        resetUrl,
        expiresInMinutes,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      this.logger.log(`Password reset email submitted for user ID ${user.id}.`);

      return genericResponse;
    } catch (error) {
      // Nonaktifkan challenge jika email gagal dikirim.
      await this.prisma.passwordResetChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    if (
      typeof rawToken !== 'string' ||
      rawToken.length < 20 ||
      rawToken.length > 256
    ) {
      throw new BadRequestException(
        'Token reset password tidak valid atau sudah kedaluwarsa.',
      );
    }

    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      throw new BadRequestException(
        'Password baru harus terdiri dari 12–128 karakter.',
      );
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    const passwordHash = await hash(newPassword, 12);

    // Semua perubahan database dilakukan secara atomik.
    const userId = await this.prisma.$transaction(async (tx) => {
      const challenge = await tx.passwordResetChallenge.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          userId: true,
          channel: true,
          expiresAt: true,
          consumedAt: true,
          otpVerifiedAt: true,
          otpExpiresAt: true,
        },
      });

      if (
        !challenge ||
        challenge.channel !== 'EMAIL' ||
        challenge.consumedAt !== null ||
        challenge.expiresAt <= now
      ) {
        throw new BadRequestException(
          'Token reset password tidak valid atau sudah kedaluwarsa.',
        );
      }

      // Klaim token secara atomik agar hanya bisa digunakan sekali.
      const claimed = await tx.passwordResetChallenge.updateMany({
        where: {
          id: challenge.id,
          tokenHash,
          channel: 'EMAIL',
          consumedAt: null,
          expiresAt: {
            gt: now,
          },
          otpVerifiedAt: {
            not: null,
          },
          otpExpiresAt: {
            gt: now,
          },
        },
        data: {
          consumedAt: now,
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException(
          'Token reset password tidak valid atau sudah kedaluwarsa.',
        );
      }

      const updatedUser = await tx.user.updateMany({
        where: {
          id: challenge.userId,
          isActive: true,
        },
        data: {
          passwordHash,
          updatedAt: now,
        },
      });

      if (updatedUser.count !== 1) {
        throw new BadRequestException(
          'Akun tidak dapat melakukan reset password.',
        );
      }

      // Cabut seluruh sesi aktif user.
      await tx.refreshToken.updateMany({
        where: {
          userId: challenge.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      // Batalkan challenge reset lainnya.
      await tx.passwordResetChallenge.updateMany({
        where: {
          userId: challenge.userId,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      return challenge.userId;
    });

    // Audit dilakukan setelah transaksi berhasil.
    await this.auditLogService.log({
      actorUserId: userId,
      action: 'PASSWORD_RESET_SUCCESS',
      entityType: 'USER',
      entityId: userId,
      metadata: {
        channel: 'EMAIL',
        activeSessionsRevoked: true,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    this.logger.log(
      `Password reset completed for user ID ${userId}. Active sessions revoked.`,
    );

    return {
      message: 'Password berhasil diperbarui. Silakan login kembali.',
    };
  }
}
