import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit/audit-log.service.js';

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get all roles with user and permission counts.
   */
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

  /**
   * Replace all permissions assigned to a role.
   */
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

    // 2. Protect system roles
    if (role.isSystem) {
      throw new ForbiddenException(
        'Permission pada system role tidak dapat diubah melalui API ini.',
      );
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
}
