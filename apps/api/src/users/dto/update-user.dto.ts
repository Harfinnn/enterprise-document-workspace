import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  @Matches(/\S/, {
    message: 'Nama lengkap tidak boleh kosong.',
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeNo?: string | null;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string | null;
}
