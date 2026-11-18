import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../../email/email.service.js';
import { EmailTemplateService } from '../../email/email-template.service.js';
import { AuditLogService } from '../../audit/audit-log.service.js';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

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

  async sendVerification(
    userId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Akun tidak dapat diverifikasi.');
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'Email akun ini sudah terverifikasi.',
      };
    }

    const expiresInMinutes = Number(
      this.configService.get('EMAIL_VERIFICATION_EXPIRES_MINUTES', '30'),
    );

    if (
      !Number.isInteger(expiresInMinutes) ||
      expiresInMinutes < 1 ||
      expiresInMinutes > 1440
    ) {
      throw new Error('Konfigurasi masa berlaku verifikasi email tidak valid.');
    }

    const webUrl = this.configService
      .getOrThrow<string>('EDW_WEB_URL')
      .replace(/\/+$/, '');

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const verificationUrl = `${webUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

    // Buat challenge baru dan batalkan challenge lama.
    const challenge = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationChallenge.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return tx.emailVerificationChallenge.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash,
          expiresAt,
          requestedIp: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
      });
    });

    // Catat permintaan setelah challenge berhasil dibuat.
    await this.auditLogService.log({
      actorUserId: user.id,
      action: 'EMAIL_VERIFICATION_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        channel: 'EMAIL',
        expiresInMinutes,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    try {
      const template = this.emailTemplateService.emailVerification({
        fullName: user.fullName,
        verificationUrl,
        expiresInMinutes,
      });

      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      this.logger.log(
        `Verification email submitted for user ID ${user.id}. Message ID: ${result.messageId}`,
      );

      return {
        message: 'Instruksi verifikasi email berhasil dikirim.',
      };
    } catch (error) {
      // Nonaktifkan challenge jika email gagal dikirim.
      await this.prisma.emailVerificationChallenge.updateMany({
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

  async verifyEmail(
    rawToken: string,
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
      throw new UnauthorizedException(
        'Tautan verifikasi tidak valid atau sudah kedaluwarsa.',
      );
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    // Proses verifikasi dilakukan secara atomik.
    const userId = await this.prisma.$transaction(async (tx) => {
      const challenge = await tx.emailVerificationChallenge.findUnique({
        where: { tokenHash },
      });

      if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
        throw new UnauthorizedException(
          'Tautan verifikasi tidak valid atau sudah kedaluwarsa.',
        );
      }

      // Klaim token agar hanya bisa digunakan satu kali.
      const claimed = await tx.emailVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          consumedAt: now,
        },
      });

      if (claimed.count !== 1) {
        throw new UnauthorizedException(
          'Tautan verifikasi tidak valid atau sudah digunakan.',
        );
      }

      // Pastikan email belum berubah sejak token diterbitkan.
      const updatedUser = await tx.user.updateMany({
        where: {
          id: challenge.userId,
          email: challenge.email,
          isActive: true,
          emailVerifiedAt: null,
        },
        data: {
          emailVerifiedAt: now,
        },
      });

      if (updatedUser.count !== 1) {
        throw new UnauthorizedException(
          'Email sudah berubah atau akun tidak dapat diverifikasi.',
        );
      }

      // Batalkan challenge lain milik user.
      await tx.emailVerificationChallenge.updateMany({
        where: {
          userId: challenge.userId,
          id: { not: challenge.id },
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      return challenge.userId;
    });

    // Audit hanya dilakukan setelah transaksi berhasil.
    await this.auditLogService.log({
      actorUserId: userId,
      action: 'EMAIL_VERIFICATION_SUCCESS',
      entityType: 'USER',
      entityId: userId,
      metadata: {
        verificationMethod: 'EMAIL',
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    this.logger.log(`Email verification completed for user ID ${userId}.`);

    return {
      message: 'Email berhasil diverifikasi.',
    };
  }
}
