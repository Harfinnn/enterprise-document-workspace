import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}