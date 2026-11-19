import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class VerifyPasswordResetOtpDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  token: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP harus terdiri dari 6 digit.',
  })
  otp: string;
}