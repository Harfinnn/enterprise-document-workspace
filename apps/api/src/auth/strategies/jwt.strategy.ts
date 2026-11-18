
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      issuer: "edw-api",
      audience: "edw-client",
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException("Payload token tidak valid.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        "Akun tidak ditemukan atau sudah dinonaktifkan.",
      );
    }

    const roles = user.userRoles.map(
      (item) => item.role.code,
    );

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((item) =>
          item.role.rolePermissions.map(
            (rp) => rp.permission.code,
          ),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      roles,
      permissions,
    };
  }
}
