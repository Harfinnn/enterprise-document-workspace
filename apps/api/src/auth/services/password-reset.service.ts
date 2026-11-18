import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { hash } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../../email/email.service.js';
import { EmailTemplateService } from '../../email/email-template.service.js';
import { AuditLogService } from '../../audit/audit-log.service.js';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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
