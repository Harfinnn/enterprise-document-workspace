import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';

import { AccessControlService } from './access-control.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { RequireRoles } from '../auth/decorators/roles.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto.js';

@Controller('access-control')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  /**
   * GET /access-control/roles
   * Get all roles with user and permission counts.
   */
  @Get('roles')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('role.read')
  async findAllRoles() {
    return {
      success: true,
      data: await this.accessControlService.findAllRoles(),
    };
  }

  @Get('permissions')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('permission.read')
  async findAllPermissions() {
    return {
      success: true,
      data: await this.accessControlService.findAllPermissions(),
    };
  }

  @Get('roles/:roleId/permissions')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('role.read')
  async findRolePermissions(@Param('roleId') roleId: string) {
    return {
      success: true,
      data: await this.accessControlService.findRolePermissions(roleId),
    };
  }

  @Put('roles/:roleId/permissions')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('role.permission.assign')
  async assignRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: AssignRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      data: await this.accessControlService.assignRolePermissions(
        roleId,
        dto.permissionIds,
        user.id,
      ),
    };
  }
}
