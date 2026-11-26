import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { EmailService } from '../email/email.service.js';
import { EmailTemplateService } from '../email/email-template.service.js';

import { UsersQueryDto } from './dto/users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';

interface UserManagementMetadata {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
    private readonly emailTemplate: EmailTemplateService,
  ) {}

  // ==========================================
  // USER LIST
  // ==========================================

  async findAll(query: UsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                employeeNo: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),

      ...(query.departmentId ? { departmentId: query.departmentId } : {}),

      ...(query.roleId
        ? {
            userRoles: {
              some: {
                roleId: query.roleId,
              },
            },
          }
        : {}),
    };

    if (query.status === 'ACTIVE') {
      where.isActive = true;
      where.emailVerifiedAt = { not: null };
    }

    if (query.status === 'PENDING_ACTIVATION') {
      where.isActive = false;
      where.emailVerifiedAt = null;
    }

    if (query.status === 'INACTIVE') {
      where.isActive = false;
      where.emailVerifiedAt = { not: null };
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          employeeNo: true,
          fullName: true,
          email: true,
          isActive: true,
          emailVerifiedAt: true,
          phoneNumber: true,
          phoneNumberVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // USER DETAIL
  // ==========================================

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        email: true,
        isActive: true,
        emailVerifiedAt: true,
        phoneNumber: true,
        phoneNumberVerifiedAt: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,

        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        userRoles: {
          select: {
            assignedAt: true,
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                isSystem: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    return { data: user };
  }

  // ==========================================
  // ROLE LIST
  // ==========================================

  async findRoles() {
    const roles = await this.prisma.role.findMany({
      where: {
        code: {
          not: 'IT_SUPERADMIN',
        },
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
      },
    });

    return { data: roles };
  }

  // ==========================================
  // DEPARTMENT LIST
  // ==========================================

  async findDepartments() {
    const departments = await this.prisma.department.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return { data: departments };
  }

  // ==========================================
  // UPDATE USER PROFILE
  // ==========================================

  async update(
    id: string,
    dto: UpdateUserDto,
    metadata: UserManagementMetadata,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        employeeNo: true,
        departmentId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          isActive: true,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Departemen tidak ditemukan atau sudah nonaktif.',
        );
      }
    }

    if (dto.employeeNo?.trim()) {
      const employeeNo = dto.employeeNo.trim();

      const duplicate = await this.prisma.user.findFirst({
        where: {
          employeeNo,
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          'Nomor pegawai sudah digunakan pengguna lain.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined
          ? { fullName: dto.fullName.trim() }
          : {}),

        ...(dto.employeeNo !== undefined
          ? { employeeNo: dto.employeeNo?.trim() || null }
          : {}),

        ...(dto.departmentId !== undefined
          ? { departmentId: dto.departmentId }
          : {}),
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        email: true,
        departmentId: true,
      },
    });

    await this.auditLog.log({
      actorUserId: metadata.actorUserId,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        before: {
          fullName: existing.fullName,
          employeeNo: existing.employeeNo,
          departmentId: existing.departmentId,
        },
        after: {
          fullName: updated.fullName,
          employeeNo: updated.employeeNo,
          departmentId: updated.departmentId,
        },
      },
    });

    return {
      message: 'Data pengguna berhasil diperbarui.',
      data: updated,
    };
  }

  // ==========================================
  // UPDATE USER ROLES
  // ==========================================

  async updateRoles(
    id: string,
    dto: UpdateUserRolesDto,
    metadata: UserManagementMetadata,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (existing.userRoles.some((item) => item.role.code === 'IT_SUPERADMIN')) {
      throw new ForbiddenException(
        'Role IT_SUPERADMIN tidak dapat diubah melalui pengelolaan pengguna.',
      );
    }

    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: dto.roleIds },
        code: { not: 'IT_SUPERADMIN' },
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (roles.length !== dto.roleIds.length) {
      throw new BadRequestException(
        'Terdapat role yang tidak valid atau tidak dapat diberikan.',
      );
    }

    const previousRoles = existing.userRoles.map((item) => item.role.code);

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      await tx.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          userId: id,
          roleId,
        })),
      });
    });

    await this.auditLog.log({
      actorUserId: metadata.actorUserId,
      action: 'USER_ROLES_UPDATED',
      entityType: 'USER',
      entityId: id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        previousRoles,
        newRoles: roles.map((role) => role.code),
      },
    });

    return {
      message: 'Role pengguna berhasil diperbarui.',
      data: {
        userId: id,
        roles,
      },
    };
  }

  // ==========================================
  // UPDATE ACCOUNT STATUS
  // ==========================================

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    metadata: UserManagementMetadata,
  ) {
    if (id === metadata.actorUserId && !dto.isActive) {
      throw new ForbiddenException(
        'Anda tidak dapat menonaktifkan akun sendiri.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        emailVerifiedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (existing.userRoles.some((item) => item.role.code === 'IT_SUPERADMIN')) {
      throw new ForbiddenException(
        'Status akun IT_SUPERADMIN tidak dapat diubah melalui fitur ini.',
      );
    }

    if (dto.isActive && !existing.emailVerifiedAt) {
      throw new BadRequestException(
        'Pengguna harus menyelesaikan aktivasi email terlebih dahulu.',
      );
    }

    if (existing.isActive === dto.isActive) {
      return {
        message: 'Status akun tidak mengalami perubahan.',
      };
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          isActive: dto.isActive,
        },
      });

      if (!dto.isActive) {
        await tx.refreshToken.updateMany({
          where: {
            userId: id,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });
      }
    });

    await this.auditLog.log({
      actorUserId: metadata.actorUserId,
      action: dto.isActive
        ? 'USER_ACTIVATED_BY_ADMIN'
        : 'USER_DEACTIVATED_BY_ADMIN',
      entityType: 'USER',
      entityId: id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        previousStatus: existing.isActive,
        newStatus: dto.isActive,
        refreshTokensRevoked: !dto.isActive,
      },
    });

    return {
      message: dto.isActive
        ? 'Akun pengguna berhasil diaktifkan.'
        : 'Akun pengguna berhasil dinonaktifkan.',
      data: {
        userId: id,
        isActive: dto.isActive,
      },
    };
  }

  // ==========================================
  // CREATE USER
  // ==========================================

  async createUser(dto: CreateUserDto, metadata: UserManagementMetadata) {
    const fullName = dto.fullName.trim();
    const email = dto.email.trim().toLowerCase();
    const employeeNo = dto.employeeNo?.trim() || null;

    // Validate duplicate email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      throw new ConflictException('Email sudah digunakan.');
    }

    // Validate duplicate employee number
    if (employeeNo) {
      const existingEmployeeNo = await this.prisma.user.findUnique({
        where: { employeeNo },
        select: { id: true },
      });

      if (existingEmployeeNo) {
        throw new ConflictException('Nomor pegawai sudah digunakan.');
      }
    }

    // Validate active department
    const department = await this.prisma.department.findFirst({
      where: {
        id: dto.departmentId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!department) {
      throw new BadRequestException(
        'Departemen tidak ditemukan atau sudah nonaktif.',
      );
    }

    // Validate role
    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        code: {
          not: 'IT_SUPERADMIN',
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!role) {
      throw new BadRequestException(
        'Role tidak valid atau tidak dapat diberikan.',
      );
    }

    // Generate unique temporary password
    const temporaryPassword = randomBytes(18).toString('base64url');

    // Hash password
    const passwordHash = await hash(temporaryPassword, 12);

    // Create user and assign role
    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        employeeNo,
        department: {
          connect: {
            id: department.id,
          },
        },
        passwordHash,
        isActive: true,
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
        userRoles: {
          create: {
            roleId: role.id,
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeNo: true,
        departmentId: true,
        isActive: true,
        emailVerifiedAt: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    // Audit log
    await this.auditLog.log({
      actorUserId: metadata.actorUserId,
      action: 'USER_CREATED_BY_ADMIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        email,
        employeeNo,
        departmentId: department.id,
        roleCode: role.code,
      },
    });

    return {
      message: 'Pengguna berhasil dibuat.',
      data: {
        user,
        role,
        temporaryPassword,
      },
    };
  }

  // ==========================================
  // RESEND ACCOUNT ACTIVATION EMAIL
  // ==========================================

  async resendActivation(id: string, metadata: UserManagementMetadata) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (user.isActive || user.emailVerifiedAt) {
      throw new BadRequestException(
        'Email aktivasi hanya dapat dikirim kepada akun yang belum diaktifkan.',
      );
    }

    const rawToken = randomBytes(32).toString('base64url');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expiresInMinutes = 30;

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const webUrl = process.env.EDW_WEB_URL;

    if (!webUrl) {
      throw new BadRequestException('Konfigurasi EDW_WEB_URL belum tersedia.');
    }

    const activationUrl =
      `${webUrl.replace(/\/$/, '')}/activate-account` +
      `?token=${encodeURIComponent(rawToken)}`;

    const challenge = await this.prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id },
        select: {
          isActive: true,
          emailVerifiedAt: true,
        },
      });

      if (!currentUser || currentUser.isActive || currentUser.emailVerifiedAt) {
        throw new BadRequestException(
          'Status akun sudah berubah. Email aktivasi tidak dapat dikirim.',
        );
      }

      await tx.accountActivationChallenge.updateMany({
        where: {
          userId: id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      return tx.accountActivationChallenge.create({
        data: {
          userId: id,
          tokenHash,
          expiresAt,
        },
      });
    });

    try {
      const template = this.emailTemplate.accountActivation({
        fullName: user.fullName,
        activationUrl,
        expiresInMinutes,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      await this.prisma.accountActivationChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await this.auditLog.log({
        actorUserId: metadata.actorUserId,
        action: 'ACCOUNT_ACTIVATION_EMAIL_FAILED',
        entityType: 'USER',
        entityId: id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: {
          reason: 'RESEND_ACTIVATION_EMAIL_FAILED',
        },
      });

      throw error;
    }

    await this.auditLog.log({
      actorUserId: metadata.actorUserId,
      action: 'ACCOUNT_ACTIVATION_EMAIL_RESENT',
      entityType: 'USER',
      entityId: id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        expiresInMinutes,
      },
    });

    return {
      message: 'Email aktivasi berhasil dikirim ulang.',
      data: {
        userId: id,
        email: user.email,
        expiresInMinutes,
      },
    };
  }
}
