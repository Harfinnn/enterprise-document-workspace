import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { AuditLogService } from '../audit/audit-log.service.js';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  private readonly OTP_EXPIRY_SECONDS = 300;
  private readonly OTP_COOLDOWN_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    const secret = this.configService.get<string>(
      'PHONE_VERIFICATION_OTP_SECRET',
    );

    if (!secret) {
      throw new InternalServerErrorException(
        'Konfigurasi OTP verifikasi nomor belum tersedia.',
      );
    }

    return createHmac('sha256', secret).update(otp).digest('hex');
  }

  async sendOtp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        phoneNumberVerifiedAt: true,
        pendingPhoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    const pendingPhoneNumber = user.pendingPhoneNumber;

    if (!pendingPhoneNumber) {
      throw new BadRequestException(
        'Tidak ada nomor WhatsApp yang menunggu verifikasi.',
      );
    }

    const now = new Date();

    const latestChallenge =
      await this.prisma.phoneVerificationChallenge.findFirst({
        where: {
          userId,
          phoneNumber: pendingPhoneNumber,
          consumedAt: null,
          lastSentAt: {
            not: null,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          lastSentAt: true,
        },
      });

    if (latestChallenge?.lastSentAt) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - latestChallenge.lastSentAt.getTime()) / 1000,
      );

      const remainingSeconds = this.OTP_COOLDOWN_SECONDS - elapsedSeconds;

      if (remainingSeconds > 0) {
        throw new HttpException(
          {
            message: 'Mohon tunggu sebelum meminta OTP kembali.',
            resendAvailableInSeconds: remainingSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Invalidate challenge OTP sebelumnya yang masih aktif
      await this.prisma.phoneVerificationChallenge.updateMany({
        where: {
          userId,
          phoneNumber: pendingPhoneNumber,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_SECONDS * 1000);

    const challenge = await this.prisma.phoneVerificationChallenge.create({
      data: {
        userId,
        phoneNumber: pendingPhoneNumber,
        otpHash,
        expiresAt,
        lastSentAt: now,
      },
    });

    const message = [
      'Verifikasi nomor WhatsApp EDW',
      '',
      `Halo ${user.fullName},`,
      '',
      `Kode OTP Anda: ${otp}`,
      '',
      'Kode berlaku selama 5 menit.',
      'Jangan bagikan kode OTP ini kepada siapa pun.',
      '',
      'Jika Anda tidak merasa melakukan permintaan ini, abaikan pesan ini.',
    ].join('\n');

    try {
      await this.whatsappService.sendMessage(pendingPhoneNumber, message);

      this.logger.log(`Phone verification OTP requested for user ${userId}.`);

      return {
        message: 'OTP berhasil dikirim ke nomor WhatsApp baru.',
        expiresInSeconds: this.OTP_EXPIRY_SECONDS,
        resendAvailableInSeconds: this.OTP_COOLDOWN_SECONDS,
      };
    } catch (error) {
      await this.prisma.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: {
          consumedAt: new Date(),
        },
      });

      this.logger.error(
        `Failed to send phone verification OTP for user ${userId}.`,
      );

      throw error;
    }
  }

  async verifyOtp(userId: string, otp: string) {
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        pendingPhoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (!user.pendingPhoneNumber) {
      throw new BadRequestException(
        'Tidak ada nomor WhatsApp yang menunggu verifikasi.',
      );
    }

    const challenge = await this.prisma.phoneVerificationChallenge.findFirst({
      where: {
        userId,
        phoneNumber: user.pendingPhoneNumber,
        consumedAt: null,
        verifiedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!challenge) {
      throw new BadRequestException(
        'OTP tidak ditemukan atau sudah tidak berlaku. Silakan meminta OTP baru.',
      );
    }

    // Cek masa berlaku OTP
    if (challenge.expiresAt <= now) {
      await this.prisma.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: {
          consumedAt: now,
        },
      });

      throw new BadRequestException(
        'OTP telah kedaluwarsa. Silakan meminta OTP baru.',
      );
    }

    // Maksimal 5 kali percobaan
    if (challenge.attempts >= 5) {
      throw new BadRequestException(
        'Batas percobaan OTP telah tercapai. Silakan meminta OTP baru.',
      );
    }

    // Validasi OTP menggunakan hash dan timing-safe comparison
    const submittedHash = Buffer.from(this.hashOtp(otp), 'hex');
    const storedHash = Buffer.from(challenge.otpHash, 'hex');

    const isOtpValid =
      submittedHash.length === storedHash.length &&
      timingSafeEqual(submittedHash, storedHash);

    // OTP salah
    if (!isOtpValid) {
      await this.prisma.phoneVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          attempts: { lt: 5 },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      throw new BadRequestException('OTP yang Anda masukkan salah.');
    }

    // OTP benar: aktivasi nomor baru dalam satu transaksi
    await this.prisma.$transaction(async (tx) => {
      const consumedChallenge = await tx.phoneVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          userId,
          phoneNumber: user.pendingPhoneNumber!,
          consumedAt: null,
          verifiedAt: null,
          attempts: { lt: 5 },
          expiresAt: { gt: now },
        },
        data: {
          verifiedAt: now,
          consumedAt: now,
        },
      });

      if (consumedChallenge.count !== 1) {
        throw new BadRequestException(
          'OTP sudah digunakan atau tidak lagi berlaku. Silakan meminta OTP baru.',
        );
      }

      const updatedUser = await tx.user.updateMany({
        where: {
          id: userId,
          pendingPhoneNumber: challenge.phoneNumber,
        },
        data: {
          phoneNumber: challenge.phoneNumber,
          phoneNumberVerifiedAt: now,
          pendingPhoneNumber: null,
        },
      });

      if (updatedUser.count !== 1) {
        throw new BadRequestException(
          'Nomor WhatsApp pending sudah berubah. Silakan ulangi proses verifikasi.',
        );
      }

      // Invalidasi challenge lain yang masih aktif untuk user ini
      await tx.phoneVerificationChallenge.updateMany({
        where: {
          userId,
          id: { not: challenge.id },
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });
    });

    await this.auditLogService.log({
      actorUserId: userId,
      action: 'PROFILE_PHONE_VERIFIED',
      entityType: 'USER',
      entityId: userId,
      metadata: {
        phoneNumberVerified: true,
      },
    });

    return {
      message: 'Nomor WhatsApp berhasil diverifikasi dan diaktifkan.',
      phoneNumber: challenge.phoneNumber,
      isVerified: true,
    };
  }

  async cancelPendingPhoneNumber(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        pendingPhoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (!user.pendingPhoneNumber) {
      throw new BadRequestException(
        'Tidak ada pengajuan perubahan nomor yang perlu dibatalkan.',
      );
    }

    const pendingPhoneNumber = user.pendingPhoneNumber;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Hapus pending number
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          pendingPhoneNumber,
        },
        data: {
          pendingPhoneNumber: null,
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          'Pengajuan nomor telah berubah. Silakan refresh profil Anda.',
        );
      }

      // Batalkan semua OTP yang masih aktif untuk nomor pending
      await tx.phoneVerificationChallenge.updateMany({
        where: {
          userId,
          phoneNumber: pendingPhoneNumber,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });
    });

    return {
      message: 'Pengajuan perubahan nomor WhatsApp berhasil dibatalkan.',
      phoneNumber: user.phoneNumber,
      pendingPhoneNumber: null,
    };
  }
}
