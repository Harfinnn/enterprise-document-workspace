import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Headers,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { RegistrationService } from './registration.service.js';

import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { RegistrationQueryDto } from './dto/registration-query.dto.js';
import { ApproveRegistrationDto } from './dto/approve-registration.dto.js';
import { RejectRegistrationDto } from './dto/reject-registration.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import { RequireRoles } from '../auth/decorators/roles.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  // ==========================================
  // PUBLIC REGISTRATION
  // ==========================================

  @Post()
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRegistrationDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.registrationService.create(dto, {
      ipAddress,
      userAgent,
    });
  }

  // ==========================================
  // ADMIN - REGISTRATION LIST
  // ==========================================

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('user.read')
  async findAll(@Query() query: RegistrationQueryDto) {
    return this.registrationService.findAll(query);
  }

  // ==========================================
  // ADMIN - REGISTRATION DETAIL
  // ==========================================

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('user.read')
  async findOne(@Param('id') id: string) {
    return this.registrationService.findOne(id);
  }

  // ==========================================
  // ADMIN - APPROVE REGISTRATION
  // ==========================================

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('user.create')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.registrationService.approve(
      id,
      dto,
      { id: user.id },
      {
        ipAddress,
        userAgent,
      },
    );
  }

  // ==========================================
  // ADMIN - REJECT REGISTRATION
  // ==========================================

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequireRoles('IT_SUPERADMIN')
  @RequirePermissions('user.update')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.registrationService.reject(
      id,
      dto,
      { id: user.id },
      {
        ipAddress,
        userAgent,
      },
    );
  }
}
