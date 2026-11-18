
import { IsUUID } from "class-validator";

export class ApproveRegistrationDto {
  @IsUUID()
  departmentId!: string;

  @IsUUID()
  roleId!: string;
}
