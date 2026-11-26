import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAllRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      permissionCount: role._count.rolePermissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async findAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        description: true,
      },
    });

    return permissions;
  }

  async findRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan.');
    }

    const permissions = role.rolePermissions
      .map((rp) => rp.permission)
      .sort((a, b) => {
        const moduleCompare = a.module.localeCompare(b.module);
        return moduleCompare !== 0
          ? moduleCompare
          : a.code.localeCompare(b.code);
      });

    return {
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      permissions,
      permissionCount: permissions.length,
    };
  }

  async assignRolePermissions(
    roleId: string,
    permissionIds: string[],
    actorUserId: string,
  ) {
    // 1. Validate role existence
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        code: true,
        name: true,
        isSystem: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan.');
    }

    // 3. Validate permission IDs
    const uniquePermissionIds = [...new Set(permissionIds)];

    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: uniquePermissionIds,
        },
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (permissions.length !== uniquePermissionIds.length) {
      throw new BadRequestException(
        'Terdapat permission ID yang tidak valid atau tidak ditemukan.',
      );
    }

    // 4. Replace role permissions atomically
    await this.prisma.$transaction(async (tx) => {
      // Revalidate role inside transaction
      const currentRole = await tx.role.findUnique({
        where: {
          id: roleId,
        },
        select: {
          id: true,
          code: true,
          isSystem: true,
        },
      });

      if (!currentRole) {
        throw new NotFoundException('Role tidak ditemukan.');
      }

      // Replace role permissions atomically
      await tx.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });

      if (uniquePermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: uniquePermissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }
    });

    // 5. Record audit log
    await this.auditLogService.log({
      actorUserId,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entityType: 'ROLE',
      entityId: roleId,
      metadata: {
        roleCode: role.code,
        roleName: role.name,
        permissionCount: uniquePermissionIds.length,
        permissionCodes: permissions.map((permission) => permission.code),
      },
    });

    // 6. Return updated state
    return this.findRolePermissions(roleId);
  }

  async createRole(dto: CreateRoleDto, actorUserId: string) {
    const existingRole = await this.prisma.role.findUnique({
      where: {
        code: dto.code,
      },
      select: {
        id: true,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role dengan code ${dto.code} sudah tersedia.`,
      );
    }

    let role;

    try {
      role = await this.prisma.role.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          isSystem: false,
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Role dengan code ${dto.code} sudah tersedia.`,
        );
      }

      throw error;
    }

    await this.auditLogService.log({
      actorUserId,
      action: 'ROLE_CREATED',
      entityType: 'ROLE',
      entityId: role.id,
      metadata: {
        code: role.code,
        name: role.name,
        isSystem: role.isSystem,
      },
    });

    return role;
  }

  async deleteRole(roleId: string, actorUserId: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        isSystem: true,
        _count: {
          select: {
            userRoles: true,
            workflowSteps: true,
            approvalSteps: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan.');
    }

    if (role.isSystem) {
      throw new ForbiddenException('System role tidak dapat dihapus.');
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        'Role tidak dapat dihapus karena masih digunakan oleh user.',
      );
    }

    if (role._count.workflowSteps > 0 || role._count.approvalSteps > 0) {
      throw new BadRequestException(
        'Role tidak dapat dihapus karena masih digunakan dalam konfigurasi workflow atau approval.',
      );
    }

    // Revalidate dependencies inside transaction
    await this.prisma.$transaction(
      async (tx) => {
        const currentRole = await tx.role.findUnique({
          where: {
            id: roleId,
          },
          select: {
            id: true,
            code: true,
            name: true,
            isSystem: true,
            _count: {
              select: {
                userRoles: true,
                workflowSteps: true,
                approvalSteps: true,
              },
            },
          },
        });

        if (!currentRole) {
          throw new NotFoundException('Role tidak ditemukan.');
        }

        if (currentRole.isSystem) {
          throw new ForbiddenException('System role tidak dapat dihapus.');
        }

        if (currentRole._count.userRoles > 0) {
          throw new BadRequestException(
            'Role tidak dapat dihapus karena masih digunakan oleh user.',
          );
        }

        if (
          currentRole._count.workflowSteps > 0 ||
          currentRole._count.approvalSteps > 0
        ) {
          throw new BadRequestException(
            'Role tidak dapat dihapus karena masih digunakan dalam konfigurasi workflow atau approval.',
          );
        }

        // Delete role permission mapping
        await tx.rolePermission.deleteMany({
          where: {
            roleId: currentRole.id,
          },
        });

        // Delete role
        await tx.role.delete({
          where: {
            id: currentRole.id,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    // Record audit log
    await this.auditLogService.log({
      actorUserId,
      action: 'ROLE_DELETED',
      entityType: 'ROLE',
      entityId: role.id,
      metadata: {
        code: role.code,
        name: role.name,
        isSystem: role.isSystem,
      },
    });

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      deleted: true,
    };
  }

  async updateRole(roleId: string, dto: UpdateRoleDto, actorUserId: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan.');
    }

    if (role.isSystem) {
      throw new ForbiddenException(
        'System role tidak dapat diubah melalui Custom Role Management.',
      );
    }

    const updatedRole = await this.prisma.role.update({
      where: {
        id: roleId,
      },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogService.log({
      actorUserId,
      action: 'ROLE_UPDATED',
      entityType: 'ROLE',
      entityId: role.id,
      metadata: {
        code: role.code,
        oldName: role.name,
        newName: updatedRole.name,
        oldDescription: role.description,
        newDescription: updatedRole.description,
      },
    });

    return updatedRole;
  }
}
