import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

@Module({
  imports: [AuthorizationModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, JwtAuthGuard, PermissionsGuard],
})
export class DocumentsModule {}