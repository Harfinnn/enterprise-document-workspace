import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EmailModule } from './email/email.module.js';
import { WhatsAppModule } from './whatsapp/whatsapp.module.js';
import { AuditModule } from './audit/audit.module.js';

import { createObserveModule } from '@nestjs/observe';
import { RegistrationModule } from './registration/registration.module.js';

import { AuthorizationModule } from './authorization/authorization.module.js';

import { AccessControlModule } from './access-control/access-control.module.js';

import { UsersModule } from './users/users.module.js';

import { DashboardModule } from './dashboard/dashboard.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),

    PrismaModule,
    EmailModule,
    WhatsAppModule,
    AuditModule,
    AuthModule,
    RegistrationModule,
    UsersModule,
    DashboardModule,
    AuthorizationModule,
    AccessControlModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}