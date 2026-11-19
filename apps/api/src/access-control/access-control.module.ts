import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';

import { AccessControlController } from './access-control.controller.js';
import { AccessControlService } from './access-control.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
  ],
  controllers: [
    AccessControlController,
  ],
  providers: [
    AccessControlService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AccessControlModule {}