import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  Res,
  Delete,
} from '@nestjs/common';

import { resolve } from 'node:path';

import { DocumentsService } from './documents.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import { UploadDocumentDto } from './dto/upload-document.dto.js';

import { UploadRevisionDto } from './dto/upload-revision.dto.js';

import { DocumentWorkspaceType } from '../generated/prisma/client.js';

import { ShareDocumentDto } from './dto/share-document.dto.js';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // =====================================================
  // UPLOAD DOCUMENT
  // POST /documents/upload
  // =====================================================
  @Post('upload')
  @RequirePermissions('document.create', 'document.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // Maksimal 20 MB
        files: 1,
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException('Format file tidak didukung.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    if (!file) {
      throw new BadRequestException('File dokumen wajib diunggah.');
    }

    return this.documentsService.upload(file, dto, req.user.id);
  }

  // =====================================================
  // UPLOAD DOCUMENT REVISION
  // POST /documents/:id/revisions
  // =====================================================
  @Post(':id/revisions')
  @RequirePermissions('document.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1,
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException('Format file tidak didukung.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadRevision(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadRevisionDto,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    if (!file) {
      throw new BadRequestException('File revisi wajib diunggah.');
    }

    return this.documentsService.uploadRevision(id, file, dto, req.user.id);
  }

  // =====================================================
  // GET DOCUMENT LIST
  // GET /documents
  // =====================================================

  @Get()
  @RequirePermissions('document.read')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
    @Query('workspaceType') workspaceType?: DocumentWorkspaceType | 'ALL',
  ) {
    return this.documentsService.findAll(
      page,
      limit,
      req.user.id,
      workspaceType,
    );
  }

  // =====================================================
  // GET DOCUMENT TYPES
  // GET /documents/types
  // =====================================================
  @Get('types')
  @RequirePermissions('document.read')
  findAllTypes() {
    return this.documentsService.findAllTypes();
  }

  // =====================================================
  // GET DEPARTMENTS FOR DOCUMENT UPLOAD
  // GET /documents/departments
  // =====================================================

  @Get('departments')
  @RequirePermissions('document.read')
  findUploadDepartments(
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.findUploadDepartments(req.user.id);
  }

  // =====================================================
  // SHARE DOCUMENT TO USERS
  // =====================================================

  // POST /documents/:id/shares
  @Post(':id/shares')
  @RequirePermissions('document.read')
  shareWithUsers(
    @Param('id') id: string,
    @Body() dto: ShareDocumentDto,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.shareWithUsers(id, dto, req.user.id);
  }

  // =====================================================
  // SEARCH SHARE RECIPIENTS
  // GET /documents/:id/share-recipients?search=keyword
  // =====================================================

  @Get(':id/share-recipients')
  @RequirePermissions('document.read')
  searchShareRecipients(
    @Param('id') id: string,
    @Query('search') search: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.searchShareRecipients(
      id,
      req.user.id,
      search ?? '',
    );
  }

  // GET /documents/:id/shares
  @Get(':id/shares')
  @RequirePermissions('document.read')
  getDocumentShares(
    @Param('id') id: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.getDocumentShares(id, req.user.id);
  }

  // DELETE /documents/:id/shares/:userId
  @Delete(':id/shares/:userId')
  @RequirePermissions('document.read')
  revokeUserShare(
    @Param('id') id: string,
    @Param('userId') recipientId: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.revokeUserShare(id, recipientId, req.user.id);
  }

  // =====================================================
  // SHARE ALL DOCUMENT
  // =====================================================

  // POST /documents/:id/share-all
  @Post(':id/share-all')
  @RequirePermissions('document.read')
  shareAll(
    @Param('id') id: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.shareAll(id, req.user.id);
  }

  // =====================================================
  // UNSHARE ALL DOCUMENT
  // =====================================================

  // DELETE /documents/:id/share-all
  @Delete(':id/share-all')
  @RequirePermissions('document.read')
  unshareAll(
    @Param('id') id: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.unshareAll(id, req.user.id);
  }

  // =====================================================
  // DOWNLOAD DOCUMENT VERSION
  // GET /documents/:id/versions/:versionId/download
  // =====================================================
  @Get(':id/versions/:versionId/download')
  @RequirePermissions('document.read')
  async downloadVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
    @Res() res: Response,
  ) {
    const file = await this.documentsService.getVersionFile(
      id,
      versionId,
      req.user.id,
    );

    return res.download(file.filePath, file.fileName);
  }

  // =====================================================
  // PREVIEW DOCUMENT VERSION
  // GET /documents/:id/versions/:versionId/preview
  // =====================================================
  @Get(':id/versions/:versionId/preview')
  @RequirePermissions('document.read')
  async previewVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Res() res: Response,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    const file = await this.documentsService.getVersionFile(
      id,
      versionId,
      req.user.id,
    );

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(file.filePath);
  }

  // =====================================================
  // GET DOCUMENT DETAIL
  // GET /documents/:id
  // =====================================================
  @Get(':id')
  @RequirePermissions('document.read')
  findOne(
    @Param('id') id: string,
    @Req()
    req: Request & {
      user: {
        id: string;
      };
    },
  ) {
    return this.documentsService.findOne(id, req.user.id);
  }
}
