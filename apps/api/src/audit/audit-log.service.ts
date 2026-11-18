import {
  Injectable,
  Logger,
} from "@nestjs/common";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          metadata: input.metadata,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // Audit failure harus terlihat di log aplikasi.
      // Jangan mengubah hasil autentikasi yang sudah berhasil.
      this.logger.error(
        `Failed to record audit event: ${input.action}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}