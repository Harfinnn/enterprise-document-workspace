
import {
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";
import { IsPasswordComplexity } from "../validators/password-complexity.validator.js";

export class ActivateAccountDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  token!: string;

  @IsString()
  @IsPasswordComplexity()
  newPassword!: string;
}
