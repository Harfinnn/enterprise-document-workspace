
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getOverview() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalDepartments,
      pendingRegistrations,
      recentActivities,
    ] = await Promise.all([
      // Seluruh pengguna yang terdaftar.
      this.prisma.user.count(),

      // Pengguna aktif.
      this.prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      // Pengguna nonaktif.
      this.prisma.user.count({
        where: {
          isActive: false,
        },
      }),

      // Departemen aktif.
      this.prisma.department.count({
        where: {
          isActive: true,
        },
      }),

      // Registrasi yang menunggu persetujuan IT.
      this.prisma.registrationRequest.count({
        where: {
          status: 'PENDING',
        },
      }),

      // Delapan aktivitas terakhir.
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      statistics: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalDepartments,
        pendingRegistrations,
      },

      recentActivities,

      generatedAt: new Date(),
    };
  }
}
