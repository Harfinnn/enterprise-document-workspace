import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail()
  @MaxLength(255)
  email: string;
}