
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";
import { IsPasswordComplexity } from "../validators/password-complexity.validator.js";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({
    message: "Password saat ini wajib diisi.",
  })
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @IsPasswordComplexity()
  newPassword: string;
}
