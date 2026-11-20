import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'Role code hanya boleh menggunakan huruf kapital, angka, dan underscore, serta harus diawali huruf.',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}