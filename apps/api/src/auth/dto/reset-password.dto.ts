
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";
import { IsPasswordComplexity } from "../validators/password-complexity.validator.js";

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token: string;

  @IsString()
  @IsPasswordComplexity()
  newPassword: string;
}
