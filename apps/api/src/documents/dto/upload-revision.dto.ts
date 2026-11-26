
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum RevisionType {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
}

export class UploadRevisionDto {
  @IsEnum(RevisionType)
  revisionType!: RevisionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  changeNotes?: string;
}
