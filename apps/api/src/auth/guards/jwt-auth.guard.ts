import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    mustChangePassword?: boolean;
  };
}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.mustChangePassword) {
      return true;
    }

    const currentPath = request.originalUrl.split("?")[0];

    const isChangePasswordEndpoint =
      request.method === "PATCH" &&
      currentPath.endsWith("/auth/change-password");

    if (isChangePasswordEndpoint) {
      return true;
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: "Anda wajib mengganti password sebelum melanjutkan.",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
  }
}