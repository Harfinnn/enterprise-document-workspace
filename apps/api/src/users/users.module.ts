import { Module } from '@nestjs/common';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

import { EmailModule } from '../email/email.module.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Module({
  imports: [EmailModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class UsersModule {}