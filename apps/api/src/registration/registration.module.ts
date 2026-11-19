
import { Module } from "@nestjs/common";

import { RegistrationController } from "./registration.controller.js";
import { RegistrationService } from "./registration.service.js";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";

import { EmailModule } from "../email/email.module.js";

import { AuthorizationModule } from '../authorization/authorization.module.js';

@Module({
  imports: [EmailModule, AuthorizationModule],
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class RegistrationModule {}
