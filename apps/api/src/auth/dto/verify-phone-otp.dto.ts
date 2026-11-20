import { IsString, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP harus terdiri dari 6 digit angka.',
  })
  otp!: string;
}