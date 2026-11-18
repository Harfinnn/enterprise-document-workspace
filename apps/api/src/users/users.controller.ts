
import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service.js';

import { UsersQueryDto } from './dto/users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { RequireRoles } from '../auth/decorators/roles.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequireRoles('IT_SUPERADMIN')
@RequirePermissions('user.manage')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // ==========================================
  // USER LIST
  // ==========================================

  @Get()
  async findAll(
    @Query() query: UsersQueryDto,
  ) {
    return this.usersService.findAll(query);
  }

  // ==========================================
  // ROLE LIST
  // ==========================================

  @Get('roles')
  async findRoles() {
    return this.usersService.findRoles();
  }

  // ==========================================
  // DEPARTMENT LIST
  // ==========================================

  @Get('departments')
  async findDepartments() {
    return this.usersService.findDepartments();
  }

  // ==========================================
  // USER DETAIL
  // ==========================================

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(id);
  }

  // ==========================================
  // UPDATE USER PROFILE
  // ==========================================

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.usersService.update(
      id,
      dto,
      {
        actorUserId: user.id,
        ipAddress,
        userAgent,
      },
    );
  }

  // ==========================================
  // UPDATE USER ROLES
  // ==========================================

  @Patch(':id/roles')
  async updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.usersService.updateRoles(
      id,
      dto,
      {
        actorUserId: user.id,
        ipAddress,
        userAgent,
      },
    );
  }

  // ==========================================
  // UPDATE ACCOUNT STATUS
  // ==========================================

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.usersService.updateStatus(
      id,
      dto,
      {
        actorUserId: user.id,
        ipAddress,
        userAgent,
      },
    );
  }

  // ==========================================
  // RESEND ACTIVATION EMAIL
  // ==========================================

  @Post(':id/resend-activation')
  async resendActivation(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.usersService.resendActivation(
      id,
      {
        actorUserId: user.id,
        ipAddress,
        userAgent,
      },
    );
  }
}