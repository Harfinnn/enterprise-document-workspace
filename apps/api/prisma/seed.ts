
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum dikonfigurasi.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const roles = [
  {
    code: "IT_SUPERADMIN",
    name: "IT / Superadmin",
    description:
      "Mengelola pengguna, hak akses, konfigurasi workflow, tanda tangan digital, dan administrasi sistem.",
    permissions: [
      "user.manage",
      "role.manage",
      "permission.manage",
      "workflow.manage",
      "signature.config.manage",
      "document.delete",
      "audit.read",
    ],
  },
  {
    code: "DOCUMENT_CONTROL",
    name: "Document Control",
    description:
      "Mengelola administrasi, metadata, nomor dokumen, pemeriksaan, dan kontrol versi tanpa mengubah isi file.",
    permissions: [
      "document.read.all",
      "document.metadata.manage",
      "document.number.manage",
      "document.version.manage",
      "approval.execute",
      "signature.execute",
    ],
  },
  {
    code: "MANAGEMENT",
    name: "Management",
    description:
      "Melakukan approval dan tanda tangan digital pada tahapan Perwakilan Manajemen atau Manajemen.",
    permissions: [
      "document.read.assigned",
      "approval.execute",
      "signature.execute",
    ],
  },
  {
    code: "DEPARTMENT_HEAD",
    name: "Kepala Bagian",
    description:
      "Mengunggah dokumen, mengajukan versi baru, dan melakukan approval sesuai kewenangan departemennya.",
    permissions: [
      "document.read.department",
      "document.upload",
      "document.version.upload",
      "approval.execute",
      "signature.execute",
    ],
  },
];

const permissions = [
  {
    code: "user.manage",
    name: "Mengelola pengguna",
    module: "USER",
  },
  {
    code: "role.manage",
    name: "Mengelola role",
    module: "ACCESS_CONTROL",
  },
  {
    code: "permission.manage",
    name: "Mengelola permission",
    module: "ACCESS_CONTROL",
  },
  {
    code: "workflow.manage",
    name: "Mengelola konfigurasi approval",
    module: "WORKFLOW",
  },
  {
    code: "signature.config.manage",
    name: "Mengelola konfigurasi tanda tangan digital",
    module: "SIGNATURE",
  },
  {
    code: "document.read.all",
    name: "Melihat seluruh dokumen sesuai cakupan tugas",
    module: "DOCUMENT",
  },
  {
    code: "document.read.assigned",
    name: "Melihat dokumen yang ditugaskan",
    module: "DOCUMENT",
  },
  {
    code: "document.read.department",
    name: "Melihat dokumen departemen sendiri",
    module: "DOCUMENT",
  },
  {
    code: "document.metadata.manage",
    name: "Mengelola metadata dokumen",
    module: "DOCUMENT",
  },
  {
    code: "document.number.manage",
    name: "Mengelola nomor dokumen",
    module: "DOCUMENT",
  },
  {
    code: "document.version.manage",
    name: "Mengelola administrasi dan kontrol versi",
    module: "DOCUMENT",
  },
  {
    code: "document.upload",
    name: "Mengunggah dokumen",
    module: "DOCUMENT",
  },
  {
    code: "document.version.upload",
    name: "Mengunggah versi baru dokumen",
    module: "DOCUMENT",
  },
  {
    code: "document.delete",
    name: "Menghapus data dokumen",
    module: "DOCUMENT",
  },
  {
    code: "approval.execute",
    name: "Melakukan approval sesuai penugasan",
    module: "APPROVAL",
  },
  {
    code: "signature.execute",
    name: "Melakukan tanda tangan digital sesuai penugasan",
    module: "SIGNATURE",
  },
  {
    code: "audit.read",
    name: "Melihat audit log",
    module: "AUDIT",
  },
];

async function main() {
  console.log("Memulai EDW role and permission seeder...");

  // 1. Buat atau perbarui permission
  const permissionMap = new Map<string, string>();

  for (const permission of permissions) {
    const result = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        module: permission.module,
      },
      create: permission,
    });

    permissionMap.set(permission.code, result.id);
  }

  console.log(`Permission tersedia: ${permissionMap.size}`);

  // 2. Buat atau perbarui role dan hubungkan permission
  for (const roleData of roles) {
    const { permissions: rolePermissionCodes, ...roleFields } = roleData;

    const role = await prisma.role.upsert({
      where: { code: roleFields.code },
      update: {
        name: roleFields.name,
        description: roleFields.description,
        isSystem: true,
      },
      create: {
        ...roleFields,
        isSystem: true,
      },
    });

    for (const permissionCode of rolePermissionCodes) {
      const permissionId = permissionMap.get(permissionCode);

      if (!permissionId) {
        throw new Error(
          `Permission tidak ditemukan: ${permissionCode}`,
        );
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }

    console.log(`Role berhasil disiapkan: ${role.name}`);
  }

  console.log("EDW seeder selesai.");
}

main()
  .catch((error) => {
    console.error("EDW seeder gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
