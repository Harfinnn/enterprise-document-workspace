import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token: string;

  @IsString()
  @MinLength(12, {
    message: "Password baru minimal 12 karakter.",
  })
  @MaxLength(128, {
    message: "Password baru maksimal 128 karakter.",
  })
  newPassword: string;
}