
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PermissionService } from './services/permission.service.js';

@Module({
  imports: [PrismaModule],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class AuthorizationModule {}
