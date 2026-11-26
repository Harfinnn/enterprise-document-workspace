
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import {
  DocumentClassification,
  DocumentWorkspaceType,
} from '../../generated/prisma/client.js';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsUUID()
  documentTypeId!: string;

  @IsEnum(DocumentClassification)
  classification!: DocumentClassification;

  @IsOptional()
  @IsEnum(DocumentWorkspaceType)
  workspaceType?: DocumentWorkspaceType;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeNotes?: string;
}
