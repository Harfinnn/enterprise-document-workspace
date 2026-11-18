
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUUID,
} from "class-validator";

export class CreateRegistrationDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  fullName!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(({ value }) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : typeof value === "string"
        ? value.trim()
        : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeNo?: string;

  @Transform(({ value }) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : value,
  )
  @IsOptional()
  @IsUUID()
  requestedDepartmentId?: string;
}
