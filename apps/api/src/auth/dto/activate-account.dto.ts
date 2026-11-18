
import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
