
import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class RegistrationQueryDto {
  @IsOptional()
  @IsIn(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"])
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
