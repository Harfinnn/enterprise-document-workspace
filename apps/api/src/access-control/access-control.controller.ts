import {
  Controller,
  Get,
  Param,
  Put,
  Post,
  Body,
  UseGuards,
  Delete,
  Patch
} from '@nestjs/common';

import { AccessControlService } from './access-control.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { RequireRoles } from '../auth/decorators/roles.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Controller('access-control')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Post('roles')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('role.create')
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Role berhasil dibuat.',
      data: await this.accessControlService.createRole(dto, user.id),
    };
  }

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

  @Delete('roles/:roleId')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('role.delete')
  async deleteRole(
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Role berhasil dihapus.',
      data: await this.accessControlService.deleteRole(roleId, user.id),
    };
  }

  @Patch('roles/:roleId')
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('role.update')
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Role berhasil diperbarui.',
      data: await this.accessControlService.updateRole(roleId, dto, user.id),
    };
  }
}
