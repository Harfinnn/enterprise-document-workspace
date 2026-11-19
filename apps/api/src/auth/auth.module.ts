
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";

import { AccountActivationService } from './services/account-activation.service.js';

import { EmailModule } from "../email/email.module.js";

import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';

import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./strategies/jwt.strategy.js";

import { RolesGuard } from "./guards/roles.guard.js";
import { PermissionsGuard } from "./guards/permissions.guard.js";

import { PasswordResetService } from "./services/password-reset.service.js";

import { EmailVerificationService } from "./services/email-verification.service.js";

@Module({
  imports: [
    EmailModule,
    WhatsAppModule,

    PassportModule.register({
        defaultStrategy: "jwt",
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: "15m",
          issuer: "edw-api",
          audience: "edw-client",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, PermissionsGuard, PasswordResetService, EmailVerificationService, AccountActivationService],
  exports: [AuthService],
})
export class AuthModule {}
