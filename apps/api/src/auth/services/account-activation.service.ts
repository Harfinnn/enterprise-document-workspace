
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { createHash } from 'node:crypto';
import { hash } from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from '../../audit/audit-log.service.js';

interface ActivationMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AccountActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async activate(
    rawToken: string,
    newPassword: string,
    metadata: ActivationMetadata,
  ) {
    if (
      !rawToken ||
      rawToken.length < 20 ||
      rawToken.length > 256
    ) {
      throw new BadRequestException(
        'Token aktivasi tidak valid.',
      );
    }

    if (
      !newPassword ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      throw new BadRequestException(
        'Password harus terdiri dari 12 sampai 128 karakter.',
      );
    }

    const tokenHash = createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const passwordHash = await hash(newPassword, 12);
    const now = new Date();

    const activatedUser = await this.prisma.$transaction(
      async (tx) => {
        const challenge =
          await tx.accountActivationChallenge.findUnique({
            where: { tokenHash },
            select: {
              id: true,
              userId: true,
              expiresAt: true,
              consumedAt: true,
            },
          });

        if (
          !challenge ||
          challenge.consumedAt ||
          challenge.expiresAt <= now
        ) {
          throw new BadRequestException(
            'Token aktivasi tidak valid atau sudah kedaluwarsa.',
          );
        }

        // Klaim token secara atomik agar tidak bisa digunakan dua kali.
        const claimed =
          await tx.accountActivationChallenge.updateMany({
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
          throw new BadRequestException(
            'Token aktivasi sudah digunakan atau kedaluwarsa.',
          );
        }

        // Aktifkan akun dan tetapkan password baru.
        const updatedUser = await tx.user.updateMany({
          where: {
            id: challenge.userId,
            isActive: false,
            emailVerifiedAt: null,
          },
          data: {
            passwordHash,
            isActive: true,
            emailVerifiedAt: now,
          },
        });

        if (updatedUser.count !== 1) {
          throw new BadRequestException(
            'Akun tidak dapat diaktifkan. Silakan hubungi administrator IT.',
          );
        }

        // Nonaktifkan seluruh token aktivasi lain milik pengguna.
        await tx.accountActivationChallenge.updateMany({
          where: {
            userId: challenge.userId,
            consumedAt: null,
          },
          data: {
            consumedAt: now,
          },
        });

        return tx.user.findUniqueOrThrow({
          where: { id: challenge.userId },
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            emailVerifiedAt: true,
          },
        });
      },
    );

    await this.auditLog.log({
      actorUserId: activatedUser.id,
      action: 'ACCOUNT_ACTIVATED',
      entityType: 'USER',
      entityId: activatedUser.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        activationMethod: 'EMAIL_TOKEN',
      },
    });

    return {
      message:
        'Akun berhasil diaktifkan. Silakan login menggunakan email dan password baru.',
      data: activatedUser,
    };
  }
}
