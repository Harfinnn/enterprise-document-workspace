import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';

import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';

import { EmailService } from '../email/email.service.js';
import { EmailTemplateService } from '../email/email-template.service.js';

import { ApproveRegistrationDto } from './dto/approve-registration.dto.js';
import { RejectRegistrationDto } from './dto/reject-registration.dto.js';

interface RegistrationMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
    private readonly emailTemplate: EmailTemplateService,
  ) {}

  async create(dto: CreateRegistrationDto, metadata: RegistrationMetadata) {
    const email = dto.email.trim().toLowerCase();
    const employeeNo = dto.employeeNo?.trim() || null;

    // 1. Periksa apakah email atau nomor pegawai sudah digunakan.
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(employeeNo ? [{ employeeNo }] : [])],
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email atau nomor pegawai sudah terdaftar.');
    }

    // 2. Periksa permohonan yang masih menunggu.
    const existingRequest = await this.prisma.registrationRequest.findFirst({
      where: {
        status: 'PENDING',
        OR: [{ email }, ...(employeeNo ? [{ employeeNo }] : [])],
      },
      select: {
        id: true,
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'Permohonan registrasi dengan data tersebut sedang diproses.',
      );
    }

    // 3. Pastikan departemen yang dipilih aktif.
    if (dto.requestedDepartmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.requestedDepartmentId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Departemen tidak ditemukan atau tidak aktif.',
        );
      }
    }

    // 4. Simpan permohonan registrasi.
    const registration = await this.prisma.registrationRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        employeeNo,
        requestedDepartmentId: dto.requestedDepartmentId ?? null,
        status: 'PENDING',
        requestIp: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    // 5. Catat aktivitas audit.
    await this.auditLog.log({
      action: 'REGISTRATION_SUBMITTED',
      entityType: 'REGISTRATION_REQUEST',
      entityId: registration.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        email,
        hasEmployeeNo: Boolean(employeeNo),
        hasDepartment: Boolean(dto.requestedDepartmentId),
      },
    });

    return {
      message:
        'Permohonan registrasi berhasil dikirim dan menunggu persetujuan IT.',
      data: registration,
    };
  }

  async findAll(query: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
    page: number;
    limit: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.registrationRequest.findMany({
        where,
        include: {
          requestedDepartment: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.registrationRequest.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const registration = await this.prisma.registrationRequest.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeNo: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,

        requestedDepartment: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },

        createdUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('Permohonan registrasi tidak ditemukan.');
    }

    return {
      data: registration,
    };
  }

  async approve(
    id: string,
    dto: ApproveRegistrationDto,
    actor: { id: string },
    metadata: RegistrationMetadata,
  ) {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const temporarySecret = randomBytes(32).toString('base64url');
    const passwordHash = await hash(temporarySecret, 12);

    const expiresInMinutes = 30;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const webUrl = process.env.EDW_WEB_URL;

    if (!webUrl) {
      throw new BadRequestException('EDW_WEB_URL belum dikonfigurasi.');
    }

    const activationUrl = `${webUrl.replace(/\/$/, '')}/activate-account?token=${rawToken}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Mengunci baris agar dua admin tidak menyetujui permohonan yang sama.
      await tx.$queryRaw`
      SELECT "id"
      FROM "RegistrationRequest"
      WHERE "id" = ${id}::uuid
      FOR UPDATE
    `;

      const registration = await tx.registrationRequest.findUnique({
        where: { id },
      });

      if (!registration) {
        throw new NotFoundException('Permohonan registrasi tidak ditemukan.');
      }

      if (registration.status !== 'PENDING') {
        throw new ConflictException(
          'Permohonan ini sudah diproses sebelumnya.',
        );
      }

      // Pastikan department aktif.
      const department = await tx.department.findFirst({
        where: {
          id: dto.departmentId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!department) {
        throw new BadRequestException(
          'Department tidak ditemukan atau tidak aktif.',
        );
      }

      // Hanya role operasional yang boleh diberikan melalui approval.
      // IT_SUPERADMIN tidak boleh diberikan melalui registrasi publik.
      const allowedRoleCodes = [
        'DOCUMENT_CONTROL',
        'MANAGEMENT',
        'DEPARTMENT_HEAD',
      ];

      const role = await tx.role.findFirst({
        where: {
          id: dto.roleId,
          code: { in: allowedRoleCodes },
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!role) {
        throw new BadRequestException(
          'Role tidak valid atau tidak boleh diberikan melalui registrasi.',
        );
      }

      // Pastikan email dan employee number belum digunakan.
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: registration.email },
            ...(registration.employeeNo
              ? [{ employeeNo: registration.employeeNo }]
              : []),
          ],
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException(
          'Email atau nomor pegawai sudah digunakan oleh akun lain.',
        );
      }

      // Buat akun dalam kondisi nonaktif.
      const user = await tx.user.create({
        data: {
          fullName: registration.fullName,
          email: registration.email,
          employeeNo: registration.employeeNo,
          passwordHash,
          departmentId: department.id,
          isActive: false,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
        },
      });

      // Tetapkan role oleh IT, bukan oleh pengguna.
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      // Buat token aktivasi. Database hanya menyimpan hash token.
      await tx.accountActivationChallenge.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Perbarui status permohonan.
      await tx.registrationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: actor.id,
          reviewedAt: new Date(),
          createdUserId: user.id,
        },
      });

      return {
        user,
        roleCode: role.code,
        departmentId: department.id,
      };
    });

    await this.auditLog.log({
      actorUserId: actor.id,
      action: 'REGISTRATION_APPROVED',
      entityType: 'REGISTRATION_REQUEST',
      entityId: id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        createdUserId: result.user.id,
        roleCode: result.roleCode,
        departmentId: result.departmentId,
      },
    });

    // Kirim email setelah transaksi database berhasil.
    let activationEmailSent = false;

    try {
      const template = this.emailTemplate.accountActivation({
        fullName: result.user.fullName,
        activationUrl,
        expiresInMinutes,
      });

      await this.emailService.sendEmail({
        to: result.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      activationEmailSent = true;
    } catch {
      // Akun tetap nonaktif. Token yang gagal dikirim tidak boleh digunakan.
      await this.prisma.accountActivationChallenge.updateMany({
        where: {
          userId: result.user.id,
          tokenHash,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await this.auditLog.log({
        actorUserId: actor.id,
        action: 'ACCOUNT_ACTIVATION_EMAIL_FAILED',
        entityType: 'USER',
        entityId: result.user.id,
        metadata: {
          registrationId: id,
        },
      });
    }

    return {
      message: activationEmailSent
        ? 'Registrasi berhasil disetujui. Email aktivasi telah dikirim.'
        : 'Registrasi disetujui, tetapi email aktivasi gagal dikirim.',
      data: {
        registrationId: id,
        user: result.user,
        activationEmailSent,
      },
    };
  }

  async reject(
    id: string,
    dto: RejectRegistrationDto,
    actor: { id: string },
    metadata: RegistrationMetadata,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
      SELECT "id"
      FROM "RegistrationRequest"
      WHERE "id" = ${id}::uuid
      FOR UPDATE
    `;

      const registration = await tx.registrationRequest.findUnique({
        where: { id },
      });

      if (!registration) {
        throw new NotFoundException('Permohonan registrasi tidak ditemukan.');
      }

      if (registration.status !== 'PENDING') {
        throw new ConflictException(
          'Permohonan ini sudah diproses sebelumnya.',
        );
      }

      return tx.registrationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.reason.trim(),
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
        },
      });
    });

    await this.auditLog.log({
      actorUserId: actor.id,
      action: 'REGISTRATION_REJECTED',
      entityType: 'REGISTRATION_REQUEST',
      entityId: id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        reason: dto.reason.trim(),
      },
    });

    return {
      message: 'Permohonan registrasi berhasil ditolak.',
      data: result,
    };
  }
}
