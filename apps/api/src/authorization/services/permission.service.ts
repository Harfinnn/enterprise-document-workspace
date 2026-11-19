
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve all permissions belonging to a user.
   * Permissions are obtained through UserRole -> Role -> RolePermission.
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions = userRoles.flatMap((userRole) =>
      userRole.role.rolePermissions.map(
        (rolePermission) => rolePermission.permission.code,
      ),
    );

    return [...new Set(permissions)].sort();
  }

  /**
   * Check whether a user owns a specific permission.
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    return permissions.includes(permissionCode);
  }

  /**
   * Check whether a user owns all requested permissions.
   */
  async hasAllPermissions(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    if (permissionCodes.length === 0) {
      return true;
    }

    const permissions = await this.getUserPermissions(userId);

    return permissionCodes.every((permission) =>
      permissions.includes(permission),
    );
  }

  /**
   * Check whether a user owns at least one requested permission.
   */
  async hasAnyPermission(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    if (permissionCodes.length === 0) {
      return false;
    }

    const permissions = await this.getUserPermissions(userId);

    return permissionCodes.some((permission) =>
      permissions.includes(permission),
    );
  }
}
