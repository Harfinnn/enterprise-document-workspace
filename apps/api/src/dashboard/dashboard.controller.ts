
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { DashboardService } from './dashboard.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

import { RequireRoles } from '../auth/decorators/roles.decorator.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('IT_SUPERADMIN')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('overview')
  async getOverview() {
    return {
      message: 'Dashboard overview berhasil diambil.',
      data: await this.dashboardService.getOverview(),
    };
  }
}
