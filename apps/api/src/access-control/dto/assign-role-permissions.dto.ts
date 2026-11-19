import {
  IsArray,
  IsUUID,
  ArrayUnique,
  ArrayMaxSize,
} from 'class-validator';

export class AssignRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(84)
  permissionIds: string[];
}