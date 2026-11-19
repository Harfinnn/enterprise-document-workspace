import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendPasswordResetOtpDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  token: string;
}