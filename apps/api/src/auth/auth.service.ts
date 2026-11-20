import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createSession(
    user: {
      id: string;
      email: string;
      fullName: string;
      userRoles: {
        role: {
          code: string;
          rolePermissions: {
            permission: {
              code: string;
            };
          }[];
        };
      }[];
    },
    userAgent?: string,
    ipAddress?: string,
  ) {
    const refreshToken = randomBytes(64).toString('base64url');
    const tokenHash = this.hashToken(refreshToken);

    const family = randomUUID();

    const expiresInDays = Number(
      this.configService.get('REFRESH_TOKEN_EXPIRES_DAYS', '7'),
    );

    if (!Number.isInteger(expiresInDays) || expiresInDays < 1) {
      throw new InternalServerErrorException(
        'Konfigurasi masa berlaku refresh token tidak valid.',
      );
    }

    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    const roles = user.userRoles.map((item) => item.role.code);

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((item) =>
          item.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        tokenFamily: family,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  async login(
    dto: LoginDto,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
    },
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const maxFailedAttempts = Number(
      this.configService.get('AUTH_MAX_FAILED_ATTEMPTS', '5'),
    );

    const lockoutMinutes = Number(
      this.configService.get('AUTH_LOCKOUT_MINUTES', '15'),
    );

    if (
      !Number.isInteger(maxFailedAttempts) ||
      maxFailedAttempts < 1 ||
      maxFailedAttempts > 20 ||
      !Number.isInteger(lockoutMinutes) ||
      lockoutMinutes < 1 ||
      lockoutMinutes > 1440
    ) {
      throw new InternalServerErrorException(
        'Konfigurasi account lockout tidak valid.',
      );
    }

    // Cari ID terlebih dahulu agar kita dapat mengunci baris akun.
    const candidate = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    });

    if (!candidate) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        metadata: {
          reason: 'INVALID_CREDENTIALS',
          accountFound: false,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      throw new UnauthorizedException('Email atau password tidak valid.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Mengunci baris User selama proses validasi login.
      // Request bersamaan untuk akun yang sama akan menunggu.
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${candidate.id}::uuid
      FOR UPDATE
    `;

      if (lockedRows.length === 0) {
        return { status: 'invalid' as const };
      }

      const user = await tx.user.findUnique({
        where: {
          id: candidate.id,
        },
        include: {
          department: true,
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return { status: 'invalid' as const };
      }

      if (!user.isActive) {
        return {
          status: 'invalid' as const,
          userId: user.id,
        };
      }

      // Akun masih dalam periode penguncian.
      if (user.lockedUntil && user.lockedUntil > now) {
        return {
          status: 'already_locked' as const,
          userId: user.id,
          lockedUntil: user.lockedUntil,
        };
      }

      // Jika masa lockout sudah selesai, mulai penghitung dari nol.
      const attempts =
        user.lockedUntil !== null && user.lockedUntil <= now
          ? 0
          : user.failedLoginAttempts;

      if (attempts !== user.failedLoginAttempts || user.lockedUntil !== null) {
        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: null,
          },
        });
      }

      const passwordValid = await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );

      if (!passwordValid) {
        const nextAttempts = attempts + 1;

        const shouldLock = nextAttempts >= maxFailedAttempts;

        const lockedUntil = shouldLock
          ? new Date(now.getTime() + lockoutMinutes * 60 * 1000)
          : null;

        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            failedLoginAttempts: nextAttempts,
            lockedUntil,
          },
        });

        if (shouldLock && lockedUntil) {
          return {
            status: 'locked' as const,
            userId: user.id,
            failedAttempts: nextAttempts,
            lockedUntil,
          };
        }

        return {
          status: 'failed' as const,
          userId: user.id,
          failedAttempts: nextAttempts,
          lockedUntil: null,
        };
      }

      // Login berhasil: reset penghitung kegagalan.
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      return {
        status: 'success' as const,
        user,
      };
    });

    if (result.status === 'locked') {
      await this.auditLogService.log({
        actorUserId: result.userId,
        action: 'ACCOUNT_LOCKED',
        entityType: 'USER',
        entityId: result.userId,
        metadata: {
          reason: 'MAX_FAILED_ATTEMPTS',
          maxFailedAttempts,
          lockoutMinutes,
          lockedUntil: result.lockedUntil?.toISOString() ?? null,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      throw new UnauthorizedException('Email atau password tidak valid.');
    }

    if (result.status === 'already_locked') {
      await this.auditLogService.log({
        actorUserId: result.userId,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: result.userId,
        metadata: {
          reason: 'ACCOUNT_ALREADY_LOCKED',
          lockedUntil: result.lockedUntil.toISOString(),
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      throw new UnauthorizedException('Email atau password tidak valid.');
    }

    if (result.status === 'failed') {
      await this.auditLogService.log({
        actorUserId: result.userId,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: result.userId,
        metadata: {
          reason: 'INVALID_CREDENTIALS',
          failedAttempts: result.failedAttempts,
          maxFailedAttempts,
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      throw new UnauthorizedException('Email atau password tidak valid.');
    }

    // Pastikan hasil transaksi benar-benar sukses
    // dan user tersedia sebelum membuat session.
    if (result.status !== 'success' || !result.user) {
      throw new UnauthorizedException('Email atau password tidak valid.');
    }

    // Pembuatan session dilakukan setelah transaksi selesai.
    const tokens = await this.createSession(
      result.user,
      metadata?.userAgent,
      metadata?.ipAddress,
    );

    // Catat login berhasil.
    await this.auditLogService.log({
      actorUserId: result.user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: result.user.id,
      metadata: {
        authenticationMethod: 'PASSWORD',
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      message: 'Login berhasil.',
      user: {
        id: result.user.id,
        employeeNo: result.user.employeeNo,
        fullName: result.user.fullName,
        email: result.user.email,
        departmentId: result.user.departmentId,
        department: result.user.department?.name ?? null,
        roles: result.user.userRoles.map((item) => ({
          code: item.role.code,
          name: item.role.name,
        })),
      },
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        email: true,
        departmentId: true,
        phoneNumber: true,
        phoneNumberVerifiedAt: true,
        pendingPhoneNumber: true,
        isActive: true,
        department: {
          select: {
            name: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    return {
      id: user.id,
      employeeNo: user.employeeNo,
      fullName: user.fullName,
      email: user.email,
      departmentId: user.departmentId,
      department: user.department?.name ?? null,

      // WhatsApp profile state
      phoneNumber: user.phoneNumber,
      phoneNumberVerifiedAt: user.phoneNumberVerifiedAt,
      pendingPhoneNumber: user.pendingPhoneNumber,

      isActive: user.isActive,

      roles: user.userRoles.map((item) => ({
        code: item.role.code,
        name: item.role.name,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedName = dto.fullName.trim();

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    // Cek apakah email digunakan user lain
    const existingEmail = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: {
          not: userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingEmail) {
      throw new BadRequestException(
        'Email sudah digunakan oleh pengguna lain.',
      );
    }

    // Update data user
    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        fullName: normalizedName,
        email: normalizedEmail,
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        email: true,
        departmentId: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogService.log({
      actorUserId: userId,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      metadata: {
        changedFields: [
          ...(currentUser.fullName !== normalizedName ? ['fullName'] : []),
          ...(currentUser.email !== normalizedEmail ? ['email'] : []),
        ],
      },
    });

    return {
      message: 'Profil berhasil diperbarui.',
      user: {
        ...updatedUser,
        department: updatedUser.department?.name ?? null,
      },
    };
  }

  async refresh(
    refreshToken: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ) {
    const now = new Date();
    const oldTokenHash = this.hashToken(refreshToken);

    const newRefreshToken = randomBytes(64).toString('base64url');
    const newTokenHash = this.hashToken(newRefreshToken);

    const expiresInDays = Number(
      this.configService.get('REFRESH_TOKEN_EXPIRES_DAYS', '7'),
    );

    if (!Number.isInteger(expiresInDays) || expiresInDays < 1) {
      throw new InternalServerErrorException(
        'Konfigurasi masa berlaku refresh token tidak valid.',
      );
    }

    const newExpiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const currentToken = await tx.refreshToken.findUnique({
        where: { tokenHash: oldTokenHash },
      });

      if (!currentToken) {
        return { status: 'invalid' as const };
      }

      if (currentToken.revokedAt) {
        return {
          status: 'reuse' as const,
          tokenFamily: currentToken.tokenFamily,
          userId: currentToken.userId,
        };
      }

      if (currentToken.expiresAt <= now) {
        await tx.refreshToken.updateMany({
          where: {
            id: currentToken.id,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });

        return { status: 'expired' as const };
      }

      const claimed = await tx.refreshToken.updateMany({
        where: {
          id: currentToken.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (claimed.count !== 1) {
        return {
          status: 'reuse' as const,
          tokenFamily: currentToken.tokenFamily,
          userId: currentToken.userId,
        };
      }

      const user = await tx.user.findUnique({
        where: { id: currentToken.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        await tx.refreshToken.updateMany({
          where: {
            tokenFamily: currentToken.tokenFamily,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });

        return { status: 'inactive' as const };
      }

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          tokenFamily: currentToken.tokenFamily,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          expiresAt: newExpiresAt,
        },
      });

      return {
        status: 'rotated' as const,
        user,
      };
    });

    if (result.status === 'reuse') {
      // Cabut seluruh token dalam keluarga yang sama.
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenFamily: result.tokenFamily,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await this.auditLogService.log({
        actorUserId: result.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityType: 'USER',
        entityId: result.userId,
        metadata: {
          reason: 'REVOKED_REFRESH_TOKEN_REUSED',
          tokenFamily: result.tokenFamily,
          actionTaken: 'TOKEN_FAMILY_REVOKED',
        },
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      throw new UnauthorizedException(
        'Refresh token terdeteksi digunakan kembali. Silakan login ulang.',
      );
    }

    if (result.status !== 'rotated') {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau sudah kedaluwarsa. Silakan login ulang.',
      );
    }

    const roles = result.user.userRoles.map((item) => item.role.code);

    const permissions = [
      ...new Set(
        result.user.userRoles.flatMap((item) =>
          item.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    const accessToken = await this.jwtService.signAsync({
      sub: result.user.id,
      email: result.user.email,
      roles,
      permissions,
    });

    await this.auditLogService.log({
      actorUserId: result.user.id,
      action: 'TOKEN_REFRESHED',
      entityType: 'USER',
      entityId: result.user.id,
      metadata: {
        authenticationMethod: 'REFRESH_TOKEN',
        tokenRotation: true,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      message: 'Token berhasil diperbarui.',
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshTokenExpiresAt: newExpiresAt,
    };
  }

  async logout(
    refreshToken: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ) {
    const tokenHash = this.hashToken(refreshToken);

    const currentToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        userId: true,
        tokenFamily: true,
      },
    });

    if (currentToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenFamily: currentToken.tokenFamily,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    await this.auditLogService.log({
      actorUserId: currentToken?.userId,
      action: 'LOGOUT',
      entityType: currentToken ? 'USER' : 'AUTH',
      entityId: currentToken?.userId,
      metadata: {
        tokenFound: Boolean(currentToken),
        sessionRevoked: Boolean(currentToken),
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      message: 'Logout berhasil.',
    };
  }

  async updatePhoneNumber(userId: string, phoneNumber: string) {
    // Normalisasi nomor ke format 628xxxxxxxxxx
    let normalizedPhone = phoneNumber.replace(/\D/g, '');

    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = `62${normalizedPhone.slice(1)}`;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        phoneNumberVerifiedAt: true,
        pendingPhoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    // Jika nomor sama dengan nomor aktif, tidak perlu perubahan.
    if (user.phoneNumber === normalizedPhone) {
      return {
        message: 'Nomor WhatsApp merupakan nomor aktif saat ini.',
        phoneNumber: user.phoneNumber,
        isVerified: Boolean(user.phoneNumberVerifiedAt),
      };
    }

    // Jika nomor sama dengan pending number, tidak perlu membuat pengajuan ulang.
    if (user.pendingPhoneNumber === normalizedPhone) {
      return {
        message: 'Nomor tersebut sedang menunggu verifikasi OTP.',
        pendingPhoneNumber: user.pendingPhoneNumber,
        isVerified: false,
      };
    }

    // Cek apakah nomor sudah digunakan oleh user lain,
    // baik sebagai nomor aktif maupun nomor pending.
    const existingPhone = await this.prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [
          { phoneNumber: normalizedPhone },
          { pendingPhoneNumber: normalizedPhone },
        ],
      },
      select: {
        id: true,
      },
    });

    if (existingPhone) {
      throw new BadRequestException(
        'Nomor WhatsApp sudah digunakan atau sedang diajukan oleh pengguna lain.',
      );
    }

    // Simpan sebagai pending, jangan langsung mengganti nomor aktif.
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingPhoneNumber: normalizedPhone,
      },
      select: {
        id: true,
        phoneNumber: true,
        phoneNumberVerifiedAt: true,
        pendingPhoneNumber: true,
      },
    });

    // Audit log
    await this.auditLogService.log({
      actorUserId: userId,
      action: 'PROFILE_PHONE_UPDATE_REQUESTED',
      entityType: 'USER',
      entityId: userId,
      metadata: {
        phoneNumberChangeRequested: true,
        previousPhoneNumberExists: Boolean(user.phoneNumber),
        previousPhoneNumberVerified: Boolean(user.phoneNumberVerifiedAt),
      },
    });

    return {
      message:
        'Nomor WhatsApp baru berhasil diajukan. Silakan lakukan verifikasi OTP.',
      user: updatedUser,
    };
  }

  async testWhatsApp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        phoneNumberVerifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (!user.phoneNumber) {
      throw new NotFoundException('Nomor WhatsApp belum terdaftar di profil.');
    }

    const result = await this.whatsappService.sendMessage(
      user.phoneNumber,
      [
        'Halo!',
        '',
        'Ini adalah pesan pengujian dari Enterprise Document Workspace (EDW).',
        '',
        'Integrasi WhatsApp berhasil terhubung.',
        '',
        'Pesan ini merupakan pesan otomatis untuk pengujian sistem.',
      ].join('\n'),
    );

    await this.auditLogService.log({
      actorUserId: userId,
      action: 'WHATSAPP_TEST_SENT',
      entityType: 'USER',
      entityId: userId,
      metadata: {
        destination: user.phoneNumber,
        providerAccepted: result.success,
      },
    });

    return {
      message: 'Permintaan pengiriman WhatsApp berhasil diproses.',
      phoneNumber: user.phoneNumber,
      result,
    };
  }
}
