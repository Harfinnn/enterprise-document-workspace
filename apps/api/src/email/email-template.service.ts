import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplateService {
  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[char];
    });
  }

  passwordReset(params: {
    fullName: string;
    resetUrl: string;
    expiresInMinutes: number;
  }) {
    const name = this.escapeHtml(params.fullName);
    const resetUrl = this.escapeHtml(params.resetUrl);
    const expires = params.expiresInMinutes;

    const subject = 'Pemulihan Password Akun EDW';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pemulihan Password EDW</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  background-color: #EEEEEE;
  font-family: Arial, Helvetica, sans-serif;
  color: #071B2B;
">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background-color: #EEEEEE; padding: 35px 12px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="
            max-width: 580px;
            background-color: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
          ">

          <tr>
            <td style="
              background-color: #071B2B;
              padding: 28px 32px;
              color: #FFFFFF;
            ">
              <h1 style="margin: 0; font-size: 24px;">
                EDW
              </h1>
              <p style="
                margin: 7px 0 0;
                color: #B9E4E8;
                font-size: 12px;
                letter-spacing: 1px;
              ">
                ENTERPRISE DOCUMENT WORKSPACE
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">

              <div style="
                width: 46px;
                height: 4px;
                background-color: #167D8D;
                margin-bottom: 22px;
              "></div>

              <h2 style="
                margin: 0 0 18px;
                font-size: 25px;
                color: #071B2B;
              ">
                Pemulihan Password
              </h2>

              <p style="font-size: 15px; line-height: 1.7;">
                Halo <strong>${name}</strong>,
              </p>

              <p style="
                font-size: 14px;
                line-height: 1.8;
                color: #475569;
              ">
                Kami menerima permintaan untuk mengatur ulang
                password akun Enterprise Document Workspace Anda.
              </p>

              <p style="
                font-size: 14px;
                line-height: 1.8;
                color: #475569;
              ">
                Klik tombol berikut untuk membuat password baru:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" bgcolor="#167D8D"
                    style="border-radius: 6px;">
                    <a href="${resetUrl}"
                      style="
                        display: inline-block;
                        padding: 15px 30px;
                        color: #FFFFFF;
                        font-size: 14px;
                        font-weight: bold;
                        text-decoration: none;
                      ">
                      RESET PASSWORD
                    </a>
                  </td>
                </tr>
              </table>

              <p style="
                font-size: 13px;
                line-height: 1.7;
                color: #64748B;
              ">
                Tautan ini hanya berlaku selama
                <strong>${expires} menit</strong>
                dan hanya dapat digunakan satu kali.
              </p>

              <p style="
                font-size: 13px;
                line-height: 1.7;
                color: #64748B;
              ">
                Jika tombol tidak dapat digunakan, salin tautan
                berikut ke browser Anda:
                <br>
                <a href="${resetUrl}"
                  style="color: #167D8D; word-break: break-all;">
                  ${resetUrl}
                </a>
              </p>

              <div style="
                background-color: #F0F9FA;
                border-left: 4px solid #167D8D;
                padding: 14px 16px;
                margin-top: 26px;
              ">
                <p style="
                  margin: 0;
                  font-size: 12px;
                  line-height: 1.7;
                  color: #475569;
                ">
                  Jika Anda tidak meminta pemulihan password,
                  abaikan email ini. Password Anda tidak akan
                  berubah tanpa tindakan lebih lanjut.
                </p>
              </div>

            </td>
          </tr>

          <tr>
            <td style="
              background-color: #071B2B;
              padding: 22px 32px;
              text-align: center;
            ">
              <p style="
                margin: 0;
                color: #B9E4E8;
                font-size: 12px;
              ">
                Enterprise Document Workspace
              </p>
              <p style="
                margin: 8px 0 0;
                color: #94A3B8;
                font-size: 11px;
              ">
                Manage. Convert. Create. Collaborate. Secure.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
EDW - ENTERPRISE DOCUMENT WORKSPACE

Pemulihan Password

Halo ${params.fullName},

Kami menerima permintaan untuk mengatur ulang password akun EDW Anda.

Gunakan tautan berikut untuk membuat password baru:

${params.resetUrl}

Tautan berlaku selama ${expires} menit dan hanya dapat digunakan satu kali.

Jika Anda tidak meminta pemulihan password, abaikan email ini.

Enterprise Document Workspace
Manage. Convert. Create. Collaborate. Secure.
`;

    return {
      subject,
      html,
      text,
    };
  }

  emailVerification(params: {
    fullName: string;
    verificationUrl: string;
    expiresInMinutes: number;
  }) {
    const name = this.escapeHtml(params.fullName);
    const verificationUrl = this.escapeHtml(params.verificationUrl);
    const expires = params.expiresInMinutes;

    const subject = 'Verifikasi Email Akun EDW';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email EDW</title>
</head>
<body style="margin:0;padding:0;background:#EEEEEE;font-family:Arial,sans-serif;color:#071B2B;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="padding:35px 12px;background:#EEEEEE;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:580px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#071B2B;padding:28px 32px;color:#FFFFFF;">
              <h1 style="margin:0;font-size:24px;">EDW</h1>
              <p style="margin:7px 0 0;color:#B9E4E8;font-size:12px;letter-spacing:1px;">
                ENTERPRISE DOCUMENT WORKSPACE
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <div style="width:46px;height:4px;background:#167D8D;margin-bottom:22px;"></div>
              <h2 style="margin:0 0 18px;font-size:25px;color:#071B2B;">
                Verifikasi Email
              </h2>
              <p style="font-size:15px;line-height:1.7;">
                Halo <strong>${name}</strong>,
              </p>
              <p style="font-size:14px;line-height:1.8;color:#475569;">
                Kami menerima permintaan untuk memverifikasi alamat email
                pada akun Enterprise Document Workspace Anda.
              </p>
              <p style="font-size:14px;line-height:1.8;color:#475569;">
                Klik tombol berikut untuk menyelesaikan verifikasi:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" bgcolor="#167D8D" style="border-radius:6px;">
                    <a href="${verificationUrl}"
                      style="display:inline-block;padding:15px 30px;color:#FFFFFF;
                      font-size:14px;font-weight:bold;text-decoration:none;">
                      VERIFIKASI EMAIL
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;line-height:1.7;color:#64748B;">
                Tautan berlaku selama <strong>${expires} menit</strong>
                dan hanya dapat digunakan satu kali.
              </p>
              <p style="font-size:13px;line-height:1.7;color:#64748B;">
                Jika tombol tidak dapat digunakan, salin tautan berikut ke browser:
                <br>
                <a href="${verificationUrl}"
                  style="color:#167D8D;word-break:break-all;">
                  ${verificationUrl}
                </a>
              </p>
              <div style="background:#F0F9FA;border-left:4px solid #167D8D;
                padding:14px 16px;margin-top:26px;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#475569;">
                  Jika Anda tidak meminta verifikasi ini, abaikan email ini.
                  Jangan bagikan tautan verifikasi kepada siapa pun.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#071B2B;padding:22px 32px;text-align:center;">
              <p style="margin:0;color:#B9E4E8;font-size:12px;">
                Enterprise Document Workspace
              </p>
              <p style="margin:8px 0 0;color:#94A3B8;font-size:11px;">
                Manage. Convert. Create. Collaborate. Secure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
EDW - ENTERPRISE DOCUMENT WORKSPACE

Verifikasi Email

Halo ${params.fullName},

Kami menerima permintaan untuk memverifikasi alamat email akun EDW Anda.

Buka tautan berikut untuk menyelesaikan verifikasi:

${params.verificationUrl}

Tautan berlaku selama ${expires} menit dan hanya dapat digunakan satu kali.

Jika Anda tidak meminta verifikasi ini, abaikan email ini.

Enterprise Document Workspace
Manage. Convert. Create. Collaborate. Secure.
`;

    return { subject, html, text };
  }

  accountActivation(params: {
    fullName: string;
    activationUrl: string;
    expiresInMinutes: number;
  }) {
    const name = this.escapeHtml(params.fullName);
    const activationUrl = this.escapeHtml(params.activationUrl);
    const expires = params.expiresInMinutes;

    const subject = 'Aktivasi Akun EDW';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aktivasi Akun EDW</title>
</head>
<body style="margin:0;padding:0;background:#EEEEEE;font-family:Arial,sans-serif;color:#071B2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:35px 12px;background:#EEEEEE;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:580px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#071B2B;padding:28px 32px;color:#FFFFFF;">
              <h1 style="margin:0;font-size:24px;">EDW</h1>
              <p style="margin:7px 0 0;color:#B9E4E8;font-size:12px;letter-spacing:1px;">
                ENTERPRISE DOCUMENT WORKSPACE
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <div style="width:46px;height:4px;background:#167D8D;margin-bottom:22px;"></div>
              <h2 style="margin:0 0 18px;font-size:25px;color:#071B2B;">
                Akun Anda Disetujui!
              </h2>
              <p style="font-size:15px;line-height:1.7;">
                Halo <strong>${name}</strong>,
              </p>
              <p style="font-size:14px;line-height:1.8;color:#475569;">
                Permohonan registrasi EDW Anda telah disetujui oleh tim IT.
                Silakan aktifkan akun dan buat password untuk mulai menggunakan EDW.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" bgcolor="#167D8D" style="border-radius:6px;">
                    <a href="${activationUrl}"
                      style="display:inline-block;padding:15px 30px;color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;">
                      AKTIFKAN AKUN
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;line-height:1.7;color:#64748B;">
                Tautan berlaku selama <strong>${expires} menit</strong>
                dan hanya dapat digunakan satu kali.
              </p>
              <p style="font-size:13px;line-height:1.7;color:#64748B;">
                Jika tombol tidak berfungsi, salin tautan berikut ke browser:
                <br>
                <a href="${activationUrl}" style="color:#167D8D;word-break:break-all;">
                  ${activationUrl}
                </a>
              </p>
              <div style="background:#F0F9FA;border-left:4px solid #167D8D;padding:14px 16px;margin-top:26px;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#475569;">
                  Jika Anda tidak mengajukan registrasi ini, abaikan email ini
                  dan hubungi administrator IT.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#071B2B;padding:22px 32px;text-align:center;">
              <p style="margin:0;color:#B9E4E8;font-size:12px;">
                Enterprise Document Workspace
              </p>
              <p style="margin:8px 0 0;color:#94A3B8;font-size:11px;">
                Manage. Convert. Create. Collaborate. Secure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
EDW - ENTERPRISE DOCUMENT WORKSPACE

Aktivasi Akun

Halo ${params.fullName},

Permohonan registrasi EDW Anda telah disetujui oleh tim IT.

Silakan buka tautan berikut untuk mengaktifkan akun dan membuat password:

${params.activationUrl}

Tautan berlaku selama ${expires} menit dan hanya dapat digunakan satu kali.

Enterprise Document Workspace
Manage. Convert. Create. Collaborate. Secure.
`;

    return { subject, html, text };
  }
}
