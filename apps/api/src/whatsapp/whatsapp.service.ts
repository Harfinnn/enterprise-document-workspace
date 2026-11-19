
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface WhatsAppMessage {
  to: string;
  text: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  private normalizePhoneNumber(phoneNumber: string): string {
    let normalized = phoneNumber.replace(/\D/g, '');

    if (normalized.startsWith('0')) {
      normalized = `62${normalized.slice(1)}`;
    }

    if (!normalized.startsWith('62')) {
      throw new InternalServerErrorException(
        'Format nomor WhatsApp tidak valid.',
      );
    }

    return normalized;
  }

  async sendMessage(to: string, message: string) {
    const apiUrl = this.configService.get<string>('WA_API_URL');
    const apiKey = this.configService.get<string>('WA_API_KEY');

    if (!apiUrl || !apiKey) {
      this.logger.error('Konfigurasi WhatsApp API belum lengkap.');

      throw new InternalServerErrorException(
        'Konfigurasi layanan WhatsApp belum tersedia.',
      );
    }

    const phoneNumber = this.normalizePhoneNumber(to);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              to: phoneNumber,
              text: message,
            },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      const responseText = await response.text();

      let providerResponse: unknown = responseText;

      try {
        providerResponse = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        // Provider mungkin mengembalikan response berupa teks biasa.
      }

      if (!response.ok) {
        this.logger.error(
          `WhatsApp API gagal. HTTP status: ${response.status}`,
        );

        throw new InternalServerErrorException(
          'Gagal mengirim pesan WhatsApp.',
        );
      }

      this.logger.log(
        `WhatsApp API menerima permintaan pengiriman ke ${phoneNumber}.`,
      );

      return {
        success: true,
        statusCode: response.status,
        providerResponse,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        'Terjadi kesalahan saat menghubungi WhatsApp API.',
      );

      throw new InternalServerErrorException(
        'Layanan WhatsApp sedang tidak dapat dihubungi.',
      );
    }
  }

  async sendBatch(messages: WhatsAppMessage[]) {
    const apiUrl = this.configService.get<string>('WA_API_URL');
    const apiKey = this.configService.get<string>('WA_API_KEY');

    if (!apiUrl || !apiKey) {
      throw new InternalServerErrorException(
        'Konfigurasi layanan WhatsApp belum tersedia.',
      );
    }

    if (!messages.length) {
      throw new InternalServerErrorException(
        'Daftar pesan WhatsApp tidak boleh kosong.',
      );
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: messages.map((item) => ({
            to: this.normalizePhoneNumber(item.to),
            text: item.text,
          })),
        }),
        signal: AbortSignal.timeout(15000),
      });

      const responseText = await response.text();

      let providerResponse: unknown = responseText;

      try {
        providerResponse = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        // Response berupa teks biasa.
      }

      if (!response.ok) {
        this.logger.error(
          `WhatsApp batch gagal. HTTP status: ${response.status}`,
        );

        throw new InternalServerErrorException(
          'Gagal mengirim pesan WhatsApp.',
        );
      }

      return {
        success: true,
        statusCode: response.status,
        providerResponse,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error('Gagal menghubungi WhatsApp API.');

      throw new InternalServerErrorException(
        'Layanan WhatsApp sedang tidak dapat dihubungi.',
      );
    }
  }
}
