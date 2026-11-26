import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

import { resolve, sep } from 'node:path';

import { PrismaService } from '../prisma/prisma.service.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { UploadRevisionDto } from './dto/upload-revision.dto.js';

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { DocumentWorkspaceType } from '../generated/prisma/client.js';
import { ShareDocumentDto } from './dto/share-document.dto.js';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // VALIDATE UPLOAD FILE
  // =====================================================
  private validateUploadFile(file: Express.Multer.File) {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    // Validasi signature / magic bytes
    const buffer = file.buffer;

    const isPdf = buffer.subarray(0, 5).toString() === '%PDF-';

    const isOle = buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));

    const isZip = buffer
      .subarray(0, 4)
      .equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    const validSignature =
      (file.mimetype === 'application/pdf' && isPdf) ||
      ([
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
      ].includes(file.mimetype) &&
        isOle) ||
      ([
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ].includes(file.mimetype) &&
        isZip);

    if (!validSignature) {
      throw new BadRequestException(
        'Isi file tidak sesuai dengan format dokumen yang diunggah.',
      );
    }

    const maxFileSize = 20 * 1024 * 1024; // 20 MB

    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException(
        'File dokumen wajib diunggah dan tidak boleh kosong.',
      );
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format file tidak didukung. Gunakan PDF, DOC, DOCX, XLS, XLSX, PPT, atau PPTX.',
      );
    }

    if (file.size > maxFileSize) {
      throw new BadRequestException('Ukuran file maksimal 20 MB.');
    }

    return true;
  }

  // =====================================================
  // SAVE FILE TO LOCAL STORAGE
  // =====================================================
  private async saveUploadFile(file: Express.Multer.File) {
    const now = new Date();

    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const relativeDirectory = join('documents', year, month);

    const storageDirectory = join(process.cwd(), 'storage', relativeDirectory);

    await mkdir(storageDirectory, { recursive: true });

    const mimeExtensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
    };

    const extension = mimeExtensions[file.mimetype];

    if (!extension) {
      throw new BadRequestException('Ekstensi file tidak didukung.');
    }

    const safeFileName = `${randomUUID()}${extension}`;

    const absolutePath = join(storageDirectory, safeFileName);

    const storageKey = join(relativeDirectory, safeFileName).replace(
      /\\/g,
      '/',
    );

    await writeFile(absolutePath, file.buffer);

    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    return {
      absolutePath,
      storageKey,
      checksumSha256,
    };
  }

  // =====================================================
  // UPLOAD DOCUMENT
  // =====================================================

  async upload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    userId: string,
  ) {
    this.validateUploadFile(file);

    // Ambil informasi user dan role

    // Ambil informasi user dan role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    const roleCodes = user.userRoles.map((userRole) => userRole.role.code);

    const isSuperAdmin = roleCodes.includes('IT_SUPERADMIN');
    const isDocumentControl = roleCodes.includes('DOCUMENT_CONTROL');
    const isDepartmentHead = roleCodes.includes('DEPARTMENT_HEAD');
    const isUser = roleCodes.includes('USER');

    const canUploadToAnyDepartment = isSuperAdmin || isDocumentControl;

    const workspaceType = dto.workspaceType ?? DocumentWorkspaceType.PERSONAL;

    let targetDepartmentId: string | null = null;

    if (workspaceType === DocumentWorkspaceType.PERSONAL) {
      // Semua role yang memiliki izin upload dapat menggunakan
      // My Repository miliknya sendiri.
      targetDepartmentId = null;
    } else if (workspaceType === DocumentWorkspaceType.DEPARTMENT) {
      // Hanya Super Admin, Document Control, dan Department Head
      // yang boleh menggunakan Departments Workspace.
      if (!canUploadToAnyDepartment && !isDepartmentHead) {
        throw new ForbiddenException(
          'Role Anda tidak memiliki akses upload ke Departments Workspace.',
        );
      }

      if (canUploadToAnyDepartment) {
        // Super Admin dan Document Control dapat memilih department.
        if (!dto.departmentId) {
          throw new BadRequestException('Department tujuan wajib dipilih.');
        }

        targetDepartmentId = dto.departmentId;
      } else {
        // Department Head hanya dapat upload ke department sendiri.
        if (!user.departmentId) {
          throw new BadRequestException('Anda belum memiliki department.');
        }

        if (dto.departmentId && dto.departmentId !== user.departmentId) {
          throw new ForbiddenException(
            'Anda hanya dapat mengunggah dokumen ke department sendiri.',
          );
        }

        targetDepartmentId = user.departmentId;
      }

      // Pastikan department tujuan tersedia dan aktif.
      const department = await this.prisma.department.findFirst({
        where: {
          id: targetDepartmentId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Department tujuan tidak ditemukan atau tidak aktif.',
        );
      }
    } else {
      throw new BadRequestException('Workspace dokumen tidak valid.');
    }

    // Pastikan document type aktif
    const documentType = await this.prisma.documentType.findFirst({
      where: {
        id: dto.documentTypeId,
        isActive: true,
      },
    });

    if (!documentType) {
      throw new BadRequestException(
        'Document Type tidak ditemukan atau sudah tidak aktif.',
      );
    }

    // Simpan file fisik
    const savedFile = await this.saveUploadFile(file);

    try {
      // Generate nomor dokumen
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const documentNumber = `EDW-${year}${month}-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;

      // Simpan Document dan DocumentVersion dalam transaksi
      const document = await this.prisma.$transaction(async (tx) => {
        return tx.document.create({
          data: {
            documentNumber,
            title: dto.title,
            description: dto.description,
            classification: dto.classification,
            workspaceType,
            departmentId: targetDepartmentId,
            ownerId: userId,
            documentTypeId: dto.documentTypeId,
            currentMajorVersion: 1,
            currentMinorVersion: 0,

            versions: {
              create: {
                majorVersion: 1,
                minorVersion: 0,
                originalFileName: file.originalname,
                storageKey: savedFile.storageKey,
                mimeType: file.mimetype,
                fileSize: BigInt(file.size),
                checksumSha256: savedFile.checksumSha256,
                changeNotes: dto.changeNotes,
                uploadedById: userId,
              },
            },
          },
          include: {
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            documentType: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            versions: true,
          },
        });
      });

      const safeDocument = JSON.parse(
        JSON.stringify(document, (_key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );

      return {
        message: 'Dokumen berhasil diunggah.',
        data: safeDocument,
      };
    } catch (error) {
      console.error('DOCUMENT UPLOAD ERROR:', error);

      await unlink(savedFile.absolutePath).catch(() => undefined);

      throw new InternalServerErrorException(
        'Gagal menyimpan data dokumen. File upload dibatalkan.',
      );
    }
  }

  private async assertCanUploadRevision(documentId: string, userId: string) {
    const [user, document] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          departmentId: true,
          userRoles: {
            select: {
              role: { select: { code: true } },
            },
          },
        },
      }),
      this.prisma.document.findFirst({
        where: {
          id: documentId,
          deletedAt: null,
        },
        select: {
          id: true,
          ownerId: true,
          workspaceType: true,
          departmentId: true,
        },
      }),
    ]);

    if (!user || !user.isActive || !document) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    const roleCodes = user.userRoles.map((userRole) => userRole.role.code);

    const isEnterpriseManager = roleCodes.some((code) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(code),
    );

    let canUploadRevision = false;

    if (document.workspaceType === DocumentWorkspaceType.PERSONAL) {
      canUploadRevision = document.ownerId === userId;
    } else {
      canUploadRevision =
        isEnterpriseManager ||
        (!!user.departmentId && document.departmentId === user.departmentId);
    }

    if (!canUploadRevision) {
      throw new ForbiddenException(
        'Anda hanya memiliki akses baca dan tidak dapat mengunggah revisi dokumen ini.',
      );
    }
  }

  // =====================================================
  // UPLOAD DOCUMENT REVISION
  // =====================================================

  async uploadRevision(
    documentId: string,
    file: Express.Multer.File,
    dto: UploadRevisionDto,
    userId: string,
  ) {
    this.validateUploadFile(file);

    await this.assertCanUploadRevision(documentId, userId);

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
      },
      select: {
        id: true,
        currentMajorVersion: true,
        currentMinorVersion: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Dokumen Master tidak ditemukan.');
    }

    const savedFile = await this.saveUploadFile(file);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Kunci record Master agar revisi bersamaan tidak
        // menghasilkan nomor versi yang sama.
        await tx.$queryRaw`
            SELECT id FROM "Document"
            WHERE id = ${documentId}::uuid
            FOR UPDATE
          `;

        const currentDocument = await tx.document.findUnique({
          where: { id: documentId },
          select: {
            currentMajorVersion: true,
            currentMinorVersion: true,
          },
        });

        if (!currentDocument) {
          throw new NotFoundException('Dokumen Master tidak ditemukan.');
        }

        let majorVersion = currentDocument.currentMajorVersion;
        let minorVersion = currentDocument.currentMinorVersion;

        if (dto.revisionType === 'MINOR') {
          minorVersion += 1;
        } else {
          majorVersion += 1;
          minorVersion = 0;
        }

        const version = await tx.documentVersion.create({
          data: {
            documentId,
            majorVersion,
            minorVersion,
            originalFileName: file.originalname,
            storageKey: savedFile.storageKey,
            mimeType: file.mimetype,
            fileSize: BigInt(file.size),
            checksumSha256: savedFile.checksumSha256,
            changeNotes: dto.changeNotes,
            uploadedById: userId,
          },
        });

        const updatedDocument = await tx.document.update({
          where: { id: documentId },
          data: {
            currentMajorVersion: majorVersion,
            currentMinorVersion: minorVersion,
          },
          include: {
            versions: {
              orderBy: [{ majorVersion: 'desc' }, { minorVersion: 'desc' }],
            },
          },
        });

        return {
          version,
          document: updatedDocument,
        };
      });

      return {
        message: `Revisi dokumen berhasil diunggah. Versi ${result.version.majorVersion}.${result.version.minorVersion}.`,
        data: JSON.parse(
          JSON.stringify(result, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        ),
      };
    } catch (error) {
      console.error('DOCUMENT REVISION ERROR:', error);

      await unlink(savedFile.absolutePath).catch(() => undefined);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Gagal menyimpan revisi dokumen.');
    }
  }

  // =====================================================
  // DOWNLOAD DOCUMENT VERSION
  // =====================================================

  async getVersionFile(documentId: string, versionId: string, userId: string) {
    await this.assertCanAccessDocument(documentId, userId);
    const version = await this.prisma.documentVersion.findFirst({
      where: {
        id: versionId,
        documentId,
        document: {
          deletedAt: null,
        },
      },
      select: {
        originalFileName: true,
        storageKey: true,
        mimeType: true,
        fileSize: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Versi dokumen tidak ditemukan.');
    }

    const storageRoot = resolve(process.cwd(), 'storage');
    const filePath = resolve(storageRoot, version.storageKey);

    if (filePath !== storageRoot && !filePath.startsWith(storageRoot + sep)) {
      throw new BadRequestException('Lokasi file tidak valid.');
    }

    return {
      filePath,
      fileName: version.originalFileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize.toString(),
    };
  }

  // =====================================================
  // GET DOCUMENT LIST
  // =====================================================

  async findAll(
    page = 1,
    limit = 10,
    userId: string,
    workspaceType:
      DocumentWorkspaceType | 'ALL' = DocumentWorkspaceType.PERSONAL,
  ) {
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    const roleCodes = user.userRoles.map((userRole) => userRole.role.code);

    const hasEnterpriseAccess = roleCodes.some((code) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(code),
    );

    const isDepartmentHead = roleCodes.includes('DEPARTMENT_HEAD');

    const canAccessDepartmentWorkspace =
      hasEnterpriseAccess || isDepartmentHead;

    // Tolak akses langsung ke Departments Workspace
    // bagi role yang tidak memiliki hak akses.
    if (
      workspaceType === DocumentWorkspaceType.DEPARTMENT &&
      !canAccessDepartmentWorkspace
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke Departments Workspace.',
      );
    }

    const departmentFilter = hasEnterpriseAccess
      ? {}
      : user.departmentId
        ? { departmentId: user.departmentId }
        : {
            id: '00000000-0000-0000-0000-000000000000',
          };

    // Filter berdasarkan workspace
    const where =
      workspaceType === 'ALL'
        ? {
            deletedAt: null,
            OR: [
              // Dokumen personal milik sendiri
              {
                workspaceType: DocumentWorkspaceType.PERSONAL,
                ownerId: userId,
              },

              // Dokumen department hanya untuk role yang berhak
              ...(canAccessDepartmentWorkspace
                ? [
                    {
                      workspaceType: DocumentWorkspaceType.DEPARTMENT,
                      ...departmentFilter,
                    },
                  ]
                : []),

              // Dokumen yang dipublikasikan melalui Share All
              {
                sharedToAllAt: {
                  not: null,
                },
              },

              // Dokumen yang dibagikan langsung kepada pengguna
              {
                shares: {
                  some: {
                    sharedWithUserId: userId,
                    revokedAt: null,
                  },
                },
              },
            ],
          }
        : {
            deletedAt: null,
            workspaceType,
            ...(workspaceType === DocumentWorkspaceType.PERSONAL
              ? { ownerId: userId }
              : departmentFilter),
          };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          documentType: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),

      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================================================
  // GET DOCUMENT TYPES
  // =====================================================
  async findAllTypes() {
    return this.prisma.documentType.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  async findUploadDepartments(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Pengguna tidak ditemukan atau tidak aktif.');
    }

    const roleCodes = user.userRoles.map((userRole) => userRole.role.code);

    const canSelectDepartment = roleCodes.some((code) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(code),
    );

    if (!canSelectDepartment) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk memilih department tujuan.',
      );
    }

    const departments = await this.prisma.department.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return {
      data: departments,
    };
  }

  private async assertCanManageDocumentShares(
    documentId: string,
    userId: string,
  ) {
    const [actor, document] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          userRoles: {
            select: {
              role: { select: { code: true } },
            },
          },
        },
      }),
      this.prisma.document.findFirst({
        where: {
          id: documentId,
          deletedAt: null,
        },
        select: {
          id: true,
          ownerId: true,
        },
      }),
    ]);

    if (!actor || !actor.isActive) {
      throw new NotFoundException('Pengguna tidak ditemukan atau tidak aktif.');
    }

    if (!document) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    const roleCodes = actor.userRoles.map((userRole) => userRole.role.code);

    const isEnterpriseManager = roleCodes.some((code) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(code),
    );

    const isOwnerUser =
      roleCodes.includes('USER') && document.ownerId === userId;

    if (!isEnterpriseManager && !isOwnerUser) {
      throw new ForbiddenException(
        'Anda tidak memiliki hak untuk membagikan dokumen ini.',
      );
    }

    return document;
  }

  async shareWithUsers(
    documentId: string,
    dto: ShareDocumentDto,
    userId: string,
  ) {
    await this.assertCanManageDocumentShares(documentId, userId);

    if (dto.userIds.includes(userId)) {
      throw new BadRequestException(
        'Anda tidak dapat membagikan dokumen kepada diri sendiri.',
      );
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        id: { in: dto.userIds },
        isActive: true,
        userRoles: {
          some: {
            role: {
              code: 'USER',
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (recipients.length !== dto.userIds.length) {
      throw new BadRequestException(
        'Satu atau lebih penerima tidak ditemukan, tidak aktif, atau bukan pengguna dengan role USER.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Mengunci dokumen agar proses share bersamaan tidak
      // menghasilkan penerima aktif yang duplikat.
      await tx.$queryRaw`
      SELECT id
      FROM "Document"
      WHERE id = ${documentId}::uuid
      FOR UPDATE
    `;

      const existingShares = await tx.documentShare.findMany({
        where: {
          documentId,
          sharedWithUserId: { in: dto.userIds },
          revokedAt: null,
        },
        select: {
          sharedWithUserId: true,
        },
      });

      const existingUserIds = new Set(
        existingShares.map((share) => share.sharedWithUserId),
      );

      const newUserIds = dto.userIds.filter((id) => !existingUserIds.has(id));

      if (newUserIds.length > 0) {
        await tx.documentShare.createMany({
          data: newUserIds.map((recipientId) => ({
            documentId,
            sharedWithUserId: recipientId,
            sharedByUserId: userId,
          })),
        });
      }

      const shares = await tx.documentShare.findMany({
        where: {
          documentId,
          revokedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          sharedWith: {
            select: {
              id: true,
              employeeNo: true,
              fullName: true,
              email: true,
            },
          },
          sharedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      return {
        message:
          newUserIds.length > 0
            ? 'Dokumen berhasil dibagikan.'
            : 'Semua penerima sudah memiliki akses.',
        data: shares,
      };
    });
  }

  async searchShareRecipients(
    documentId: string,
    userId: string,
    search: string,
  ) {
    await this.assertCanManageDocumentShares(documentId, userId);

    const keyword = search.trim();

    if (keyword.length < 2) {
      throw new BadRequestException(
        'Masukkan minimal 2 karakter untuk mencari pengguna.',
      );
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        userRoles: {
          some: {
            role: {
              code: 'USER',
            },
          },
        },
        OR: [
          {
            fullName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            employeeNo: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 10,
      orderBy: {
        fullName: 'asc',
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        email: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      data: users,
    };
  }

  async getDocumentShares(documentId: string, userId: string) {
    await this.assertCanManageDocumentShares(documentId, userId);

    const shares = await this.prisma.documentShare.findMany({
      where: {
        documentId,
        revokedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sharedWith: {
          select: {
            id: true,
            employeeNo: true,
            fullName: true,
            email: true,
          },
        },
        sharedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return {
      data: shares,
    };
  }

  async revokeUserShare(
    documentId: string,
    recipientId: string,
    userId: string,
  ) {
    await this.assertCanManageDocumentShares(documentId, userId);

    const result = await this.prisma.documentShare.updateMany({
      where: {
        documentId,
        sharedWithUserId: recipientId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        'Akses berbagi untuk pengguna tersebut tidak ditemukan.',
      );
    }

    return {
      message: 'Akses dokumen berhasil dicabut.',
    };
  }

  private async assertCanAccessDocument(documentId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
        departmentId: true,
        userRoles: {
          select: {
            role: { select: { code: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    const roleCodes = user.userRoles.map((userRole) => userRole.role.code);

    const hasEnterpriseAccess = roleCodes.some((code) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(code),
    );

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        OR: [
          // Dokumen personal milik sendiri
          {
            workspaceType: DocumentWorkspaceType.PERSONAL,
            ownerId: userId,
          },

          // Dokumen departemen sesuai cakupan akses
          {
            workspaceType: DocumentWorkspaceType.DEPARTMENT,
            ...(hasEnterpriseAccess
              ? {}
              : {
                  departmentId:
                    user.departmentId ?? '00000000-0000-0000-0000-000000000000',
                }),
          },

          // Dokumen yang dipublikasikan secara global
          {
            sharedToAllAt: { not: null },
          },

          // Dokumen yang dibagikan langsung kepada pengguna
          {
            shares: {
              some: {
                sharedWithUserId: userId,
                revokedAt: null,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    return document;
  }

  async shareAll(documentId: string, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        userRoles: {
          select: {
            role: { select: { code: true } },
          },
        },
      },
    });

    if (!actor || !actor.isActive) {
      throw new NotFoundException('Pengguna tidak ditemukan atau tidak aktif.');
    }

    const canShareAll = actor.userRoles.some(({ role }) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(role.code),
    );

    if (!canShareAll) {
      throw new ForbiddenException(
        'Hanya IT Super Admin dan Document Control yang dapat melakukan Share All.',
      );
    }

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
      },
      select: {
        id: true,
        sharedToAllAt: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    if (document.sharedToAllAt) {
      throw new BadRequestException(
        'Dokumen sudah dipublikasikan ke All Documents.',
      );
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        sharedToAllAt: new Date(),
        sharedToAllById: userId,
      },
      select: {
        id: true,
        title: true,
        sharedToAllAt: true,
        sharedToAllById: true,
      },
    });

    return {
      message: 'Dokumen berhasil dipublikasikan ke All Documents.',
      data: updatedDocument,
    };
  }

  async unshareAll(documentId: string, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        userRoles: {
          select: {
            role: { select: { code: true } },
          },
        },
      },
    });

    if (!actor || !actor.isActive) {
      throw new NotFoundException('Pengguna tidak ditemukan atau tidak aktif.');
    }

    const canUnshareAll = actor.userRoles.some(({ role }) =>
      ['IT_SUPERADMIN', 'DOCUMENT_CONTROL'].includes(role.code),
    );

    if (!canUnshareAll) {
      throw new ForbiddenException(
        'Hanya IT Super Admin dan Document Control yang dapat mencabut Share All.',
      );
    }

    const result = await this.prisma.document.updateMany({
      where: {
        id: documentId,
        deletedAt: null,
        sharedToAllAt: { not: null },
      },
      data: {
        sharedToAllAt: null,
        sharedToAllById: null,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        'Dokumen tidak ditemukan atau belum dipublikasikan.',
      );
    }

    return {
      message: 'Publikasi dokumen dari All Documents berhasil dicabut.',
    };
  }

  // =====================================================
  // GET DOCUMENT DETAIL
  // =====================================================
  async findOne(id: string, userId: string) {
    await this.assertCanAccessDocument(id, userId);
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        documentType: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        versions: {
          orderBy: [{ majorVersion: 'desc' }, { minorVersion: 'desc' }],
          select: {
            id: true,
            majorVersion: true,
            minorVersion: true,
            originalFileName: true,
            mimeType: true,
            fileSize: true,
            checksumSha256: true,
            changeNotes: true,
            storageKey: true,
            createdAt: true,
            uploadedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    return JSON.parse(
      JSON.stringify(document, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}
