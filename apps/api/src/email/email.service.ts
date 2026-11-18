
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = configService.getOrThrow<string>("EMAIL_SMTP_HOST");
    const port = Number(
      configService.getOrThrow<string>("EMAIL_SMTP_PORT"),
    );
    const secure =
      configService.getOrThrow<string>("EMAIL_SMTP_SECURE") === "true";

    const user = configService.getOrThrow<string>("EMAIL_USER");
    const pass = configService.getOrThrow<string>("EMAIL_PASS");

    const fromName = configService.get<string>(
      "EMAIL_FROM_NAME",
      "EDW - Enterprise Document Workspace",
    );

    const fromEmail = configService.get<string>(
      "EMAIL_FROM_EMAIL",
      user,
    );

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error("Konfigurasi EMAIL_SMTP_PORT tidak valid.");
    }

    this.from = `"${fromName}" <${fromEmail}>`;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log("SMTP connection verified successfully.");
      return true;
    } catch (error) {
      this.logger.error("SMTP connection verification failed.");
      this.logger.error(
        error instanceof Error ? error.message : "Unknown SMTP error",
      );
      throw new InternalServerErrorException(
        "Koneksi email belum dapat diverifikasi.",
      );
    }
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    try {
      const result = await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      this.logger.log(
        `Email accepted by SMTP server. Message ID: ${result.messageId}`,
      );

      return {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      };
    } catch (error) {
      this.logger.error("Email delivery failed.");
      this.logger.error(
        error instanceof Error ? error.message : "Unknown SMTP error",
      );

      throw new InternalServerErrorException(
        "Email gagal dikirim. Silakan coba kembali.",
      );
    }
  }
}
