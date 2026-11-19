
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  PERMISSIONS_KEY,
} from "../decorators/permissions.decorator.js";
import type {
  AuthenticatedUser,
} from "../decorators/current-user.decorator.js";
import { PermissionService } from "../../authorization/services/permission.service.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        "Informasi pengguna tidak tersedia.",
      );
    }

    const hasAllPermissions =
      await this.permissionService.hasAllPermissions(
        user.id,
        requiredPermissions,
      );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        "Anda tidak memiliki permission untuk melakukan tindakan ini.",
      );
    }

    return true;
  }
}
