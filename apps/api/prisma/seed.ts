
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum dikonfigurasi.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type PermissionDefinition = {
  code: string;
  name: string;
  module: string;
};

type RoleDefinition = {
  code: string;
  name: string;
  description: string;
  permissions: string[];
};

const permissions: PermissionDefinition[] = [
  // =====================================================
  // DOCUMENT
  // =====================================================
  { code: "document.read", name: "Membaca dokumen sesuai policy", module: "DOCUMENT" },
  { code: "document.read.all", name: "Membaca seluruh dokumen sesuai cakupan", module: "DOCUMENT" },
  { code: "document.read.department", name: "Membaca dokumen departemen", module: "DOCUMENT" },
  { code: "document.read.assigned", name: "Membaca dokumen yang ditugaskan", module: "DOCUMENT" },
  { code: "document.create", name: "Membuat dokumen", module: "DOCUMENT" },
  { code: "document.upload", name: "Mengunggah dokumen", module: "DOCUMENT" },
  { code: "document.update", name: "Memperbarui dokumen", module: "DOCUMENT" },
  { code: "document.metadata.manage", name: "Mengelola metadata dokumen", module: "DOCUMENT" },
  { code: "document.delete", name: "Menghapus dokumen", module: "DOCUMENT" },
  { code: "document.archive", name: "Mengarsipkan dokumen", module: "DOCUMENT" },
  { code: "document.restore", name: "Memulihkan dokumen", module: "DOCUMENT" },
  { code: "document.download", name: "Mengunduh dokumen", module: "DOCUMENT" },
  { code: "document.export", name: "Mengekspor dokumen", module: "DOCUMENT" },
  { code: "document.share", name: "Membagikan dokumen", module: "DOCUMENT" },
  { code: "document.version.read", name: "Melihat riwayat versi dokumen", module: "DOCUMENT" },
  { code: "document.version.upload", name: "Mengunggah versi baru dokumen", module: "DOCUMENT" },
  { code: "document.version.manage", name: "Mengelola versi dokumen", module: "DOCUMENT" },

  // =====================================================
  // REGISTRATION
  // =====================================================
  { code: "registration.read", name: "Melihat registrasi dokumen", module: "REGISTRATION" },
  { code: "registration.create", name: "Melakukan registrasi dokumen", module: "REGISTRATION" },
  { code: "registration.update", name: "Memperbarui registrasi dokumen", module: "REGISTRATION" },
  { code: "registration.cancel", name: "Membatalkan registrasi dokumen", module: "REGISTRATION" },
  { code: "registration.verify", name: "Memverifikasi registrasi dokumen", module: "REGISTRATION" },
  { code: "registration.number.manage", name: "Mengelola nomor dokumen", module: "REGISTRATION" },

  // =====================================================
  // WORKFLOW
  // =====================================================
  { code: "workflow.read", name: "Melihat konfigurasi workflow", module: "WORKFLOW" },
  { code: "workflow.create", name: "Membuat workflow", module: "WORKFLOW" },
  { code: "workflow.update", name: "Memperbarui workflow", module: "WORKFLOW" },
  { code: "workflow.delete", name: "Menghapus workflow", module: "WORKFLOW" },
  { code: "workflow.manage", name: "Mengelola workflow", module: "WORKFLOW" },
  { code: "workflow.assign", name: "Mengelola assignment workflow", module: "WORKFLOW" },
  { code: "workflow.history.read", name: "Melihat histori workflow", module: "WORKFLOW" },

  // =====================================================
  // APPROVAL
  // =====================================================
  { code: "approval.read", name: "Melihat proses approval", module: "APPROVAL" },
  { code: "approval.execute", name: "Melakukan approval", module: "APPROVAL" },
  { code: "approval.reject", name: "Menolak dokumen", module: "APPROVAL" },
  { code: "approval.return", name: "Mengembalikan dokumen untuk revisi", module: "APPROVAL" },
  { code: "approval.delegate", name: "Mendelegasikan approval", module: "APPROVAL" },

  // =====================================================
  // SIGNATURE
  // =====================================================
  { code: "signature.read", name: "Melihat status tanda tangan", module: "SIGNATURE" },
  { code: "signature.execute", name: "Melakukan tanda tangan", module: "SIGNATURE" },
  { code: "signature.verify", name: "Memverifikasi tanda tangan", module: "SIGNATURE" },
  { code: "signature.cancel", name: "Membatalkan proses tanda tangan", module: "SIGNATURE" },
  { code: "signature.history.read", name: "Melihat riwayat tanda tangan", module: "SIGNATURE" },
  { code: "signature.config.manage", name: "Mengelola konfigurasi tanda tangan", module: "SIGNATURE" },
  { code: "signature.provider.manage", name: "Mengelola provider tanda tangan", module: "SIGNATURE" },

  // =====================================================
  // USER
  // =====================================================
  { code: "user.read", name: "Melihat pengguna", module: "USER" },
  { code: "user.create", name: "Membuat pengguna", module: "USER" },
  { code: "user.update", name: "Memperbarui pengguna", module: "USER" },
  { code: "user.delete", name: "Menghapus pengguna", module: "USER" },
  { code: "user.status.manage", name: "Mengelola status pengguna", module: "USER" },
  { code: "user.activation.manage", name: "Mengelola aktivasi pengguna", module: "USER" },
  { code: "user.department.assign", name: "Menetapkan departemen pengguna", module: "USER" },
  { code: "user.role.assign", name: "Menetapkan role pengguna", module: "USER" },
  { code: "user.password.reset", name: "Melakukan reset password pengguna", module: "USER" },

  // =====================================================
  // ACCESS CONTROL
  // =====================================================
  { code: "role.read", name: "Melihat role", module: "ACCESS_CONTROL" },
  { code: "role.create", name: "Membuat role", module: "ACCESS_CONTROL" },
  { code: "role.update", name: "Memperbarui role", module: "ACCESS_CONTROL" },
  { code: "role.delete", name: "Menghapus role", module: "ACCESS_CONTROL" },
  { code: "role.permission.read", name: "Melihat permission role", module: "ACCESS_CONTROL" },
  { code: "role.permission.assign", name: "Menetapkan permission ke role", module: "ACCESS_CONTROL" },
  { code: "permission.read", name: "Melihat katalog permission", module: "ACCESS_CONTROL" },
  { code: "permission.create", name: "Membuat permission", module: "ACCESS_CONTROL" },
  { code: "permission.update", name: "Memperbarui permission", module: "ACCESS_CONTROL" },
  { code: "permission.delete", name: "Menghapus permission", module: "ACCESS_CONTROL" },

  // =====================================================
  // DEPARTMENT
  // =====================================================
  { code: "department.read", name: "Melihat departemen", module: "DEPARTMENT" },
  { code: "department.create", name: "Membuat departemen", module: "DEPARTMENT" },
  { code: "department.update", name: "Memperbarui departemen", module: "DEPARTMENT" },
  { code: "department.delete", name: "Menghapus departemen", module: "DEPARTMENT" },
  { code: "department.member.manage", name: "Mengelola anggota departemen", module: "DEPARTMENT" },
  { code: "department.head.assign", name: "Menetapkan kepala departemen", module: "DEPARTMENT" },

  // =====================================================
  // CLASSIFICATION
  // =====================================================
  { code: "classification.read", name: "Melihat klasifikasi", module: "CLASSIFICATION" },
  { code: "classification.create", name: "Membuat klasifikasi", module: "CLASSIFICATION" },
  { code: "classification.update", name: "Memperbarui klasifikasi", module: "CLASSIFICATION" },
  { code: "classification.delete", name: "Menghapus klasifikasi", module: "CLASSIFICATION" },
  { code: "classification.access.manage", name: "Mengelola akses klasifikasi", module: "CLASSIFICATION" },

  // =====================================================
  // AUDIT
  // =====================================================
  { code: "audit.read", name: "Melihat audit log", module: "AUDIT" },
  { code: "audit.export", name: "Mengekspor audit log", module: "AUDIT" },

  // =====================================================
  // SECURITY
  // =====================================================
  { code: "security.access.read", name: "Melihat informasi akses", module: "SECURITY" },
  { code: "security.session.manage", name: "Mengelola session", module: "SECURITY" },
  { code: "security.policy.read", name: "Melihat security policy", module: "SECURITY" },
  { code: "security.policy.manage", name: "Mengelola security policy", module: "SECURITY" },

  // =====================================================
  // SYSTEM
  // =====================================================
  { code: "system.config.read", name: "Melihat konfigurasi sistem", module: "SYSTEM" },
  { code: "system.config.manage", name: "Mengelola konfigurasi sistem", module: "SYSTEM" },
  { code: "system.health.read", name: "Melihat kesehatan sistem", module: "SYSTEM" },
  { code: "system.storage.manage", name: "Mengelola storage", module: "SYSTEM" },
  { code: "system.backup.manage", name: "Mengelola backup", module: "SYSTEM" },
  { code: "system.maintenance.manage", name: "Mengelola maintenance sistem", module: "SYSTEM" },
];

const roles: RoleDefinition[] = [
  // =====================================================
  // IT SUPERADMIN
  // =====================================================
  {
    code: "IT_SUPERADMIN",
    name: "IT / Superadmin",
    description: "Administrator teknis EDW yang mengelola pengguna, RBAC, workflow, security, konfigurasi, dan infrastruktur sistem.",
    permissions: [
      "user.read",
      "user.create",
      "user.update",
      "user.delete",
      "user.status.manage",
      "user.activation.manage",
      "user.department.assign",
      "user.role.assign",
      "user.password.reset",

      "role.read",
      "role.create",
      "role.update",
      "role.delete",
      "role.permission.read",
      "role.permission.assign",

      "permission.read",
      "permission.create",
      "permission.update",
      "permission.delete",

      "workflow.read",
      "workflow.create",
      "workflow.update",
      "workflow.delete",
      "workflow.manage",
      "workflow.assign",

      "signature.verify",
      "signature.config.manage",
      "signature.provider.manage",

      "classification.read",
      "classification.create",
      "classification.update",
      "classification.delete",
      "classification.access.manage",

      "department.read",
      "department.create",
      "department.update",
      "department.delete",
      "department.member.manage",
      "department.head.assign",

      "audit.read",
      "audit.export",

      "security.access.read",
      "security.session.manage",
      "security.policy.read",
      "security.policy.manage",

      "system.config.read",
      "system.config.manage",
      "system.health.read",
      "system.storage.manage",
      "system.backup.manage",
      "system.maintenance.manage",
    ],
  },

  // =====================================================
  // DOCUMENT CONTROL
  // =====================================================
  {
    code: "DOCUMENT_CONTROL",
    name: "Document Control",
    description: "Mengelola administrasi dokumen, metadata, registrasi, numbering, version control, dan pengarsipan.",
    permissions: [
      "document.read",
      "document.read.all",
      "document.create",
      "document.upload",
      "document.update",
      "document.metadata.manage",
      "document.archive",
      "document.restore",
      "document.download",
      "document.export",
      "document.share",
      "document.version.read",
      "document.version.upload",
      "document.version.manage",

      "registration.read",
      "registration.create",
      "registration.update",
      "registration.cancel",
      "registration.verify",
      "registration.number.manage",

      "workflow.read",
      "workflow.assign",
      "workflow.history.read",

      "approval.read",
      "approval.return",

      "signature.read",
      "signature.verify",
      "signature.cancel",
      "signature.history.read",

      "classification.read",
    ],
  },

  // =====================================================
  // MANAGEMENT
  // =====================================================
  {
    code: "MANAGEMENT",
    name: "Management",
    description: "Melakukan review, approval, rejection, delegation, dan tanda tangan dokumen sesuai workflow assignment.",
    permissions: [
      "document.read",
      "document.read.assigned",
      "document.download",
      "document.export",
      "document.version.read",

      "workflow.history.read",

      "approval.read",
      "approval.execute",
      "approval.reject",
      "approval.return",
      "approval.delegate",

      "signature.read",
      "signature.execute",
      "signature.verify",
      "signature.history.read",
    ],
  },

  // =====================================================
  // DEPARTMENT HEAD
  // =====================================================
  {
    code: "DEPARTMENT_HEAD",
    name: "Kepala Bagian",
    description: "Mengelola dokumen departemen, upload, pengajuan revisi, dan akses dokumen sesuai department scope.",
    permissions: [
      "document.read",
      "document.read.department",
      "document.create",
      "document.upload",
      "document.download",
      "document.version.read",
      "document.version.upload",

      "workflow.history.read",
    ],
  },

  // =====================================================
  // GENERAL USER
  // =====================================================
  {
    code: "USER",
    name: "User",
    description: "Pengguna umum EDW untuk membuat, mengunggah, membaca, dan mengakses dokumen sesuai policy.",
    permissions: [
      "document.read",
      "document.read.department",
      "document.create",
      "document.upload",
      "document.download",
      "document.version.read",
    ],
  },
];

async function main() {
  console.log("========================================");
  console.log("EDW Permission Seeder");
  console.log("========================================");

  // 1. Upsert seluruh katalog permission
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

  console.log(`Permission catalog tersedia: ${permissionMap.size}`);

  // 2. Upsert role dan tambahkan mapping permission
  for (const roleData of roles) {
    const { permissions: permissionCodes, ...roleFields } = roleData;

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

    let assignedCount = 0;

    for (const permissionCode of permissionCodes) {
      const permissionId = permissionMap.get(permissionCode);

      if (!permissionId) {
        throw new Error(
          `Permission tidak ditemukan pada catalog: ${permissionCode}`,
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

      assignedCount++;
    }

    console.log(
      `Role siap: ${role.code} | Permission baseline: ${assignedCount}`,
    );
  }

  console.log("----------------------------------------");
  console.log("EDW Permission Seeder berhasil.");
  console.log(`Total permission catalog: ${permissions.length}`);
  console.log(`Total role baseline: ${roles.length}`);
  console.log("----------------------------------------");
}

main()
  .catch((error) => {
    console.error("EDW Permission Seeder gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
