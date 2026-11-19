import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL belum dikonfigurasi.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Reconciliation RBAC EDW
 *
 * Default     : DRY RUN
 * --apply     : Execute changes
 *
 * Role custom tidak disentuh.
 * Permission catalog tidak dihapus.
 */

const applyMode = process.argv.includes('--apply');

const baseline: Record<string, string[]> = {
  IT_SUPERADMIN: [
    // USER
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'user.status.manage',
    'user.activation.manage',
    'user.department.assign',
    'user.role.assign',
    'user.password.reset',

    // ACCESS CONTROL
    'role.read',
    'role.create',
    'role.update',
    'role.delete',
    'role.permission.read',
    'role.permission.assign',
    'permission.read',
    'permission.create',
    'permission.update',
    'permission.delete',

    // WORKFLOW
    'workflow.read',
    'workflow.create',
    'workflow.update',
    'workflow.delete',
    'workflow.manage',
    'workflow.assign',
    'workflow.history.read',

    // SIGNATURE
    'signature.verify',
    'signature.config.manage',
    'signature.provider.manage',

    // CLASSIFICATION
    'classification.read',
    'classification.create',
    'classification.update',
    'classification.delete',
    'classification.access.manage',

    // DEPARTMENT
    'department.read',
    'department.create',
    'department.update',
    'department.delete',
    'department.member.manage',
    'department.head.assign',

    // AUDIT
    'audit.read',
    'audit.export',

    // SECURITY
    'security.access.read',
    'security.session.manage',
    'security.policy.read',
    'security.policy.manage',

    // SYSTEM
    'system.config.read',
    'system.config.manage',
    'system.health.read',
    'system.storage.manage',
    'system.backup.manage',
    'system.maintenance.manage',
  ],

  DOCUMENT_CONTROL: [
    'document.read',
    'document.read.all',
    'document.create',
    'document.upload',
    'document.update',
    'document.metadata.manage',
    'document.archive',
    'document.restore',
    'document.download',
    'document.export',
    'document.share',
    'document.version.read',
    'document.version.upload',
    'document.version.manage',

    'registration.read',
    'registration.create',
    'registration.update',
    'registration.cancel',
    'registration.verify',
    'registration.number.manage',

    'workflow.read',
    'workflow.assign',
    'workflow.history.read',

    'approval.read',
    'approval.return',

    'signature.read',
    'signature.verify',
    'signature.cancel',
    'signature.history.read',

    'classification.read',
  ],

  MANAGEMENT: [
    'document.read',
    'document.read.assigned',
    'document.download',
    'document.export',
    'document.version.read',

    'workflow.history.read',

    'approval.read',
    'approval.execute',
    'approval.reject',
    'approval.return',
    'approval.delegate',

    'signature.read',
    'signature.execute',
    'signature.verify',
    'signature.history.read',
  ],

  DEPARTMENT_HEAD: [
    'document.read',
    'document.read.department',
    'document.create',
    'document.upload',
    'document.download',
    'document.version.read',
    'document.version.upload',

    'workflow.history.read',
  ],

  USER: [
    'document.read',
    'document.read.department',
    'document.create',
    'document.upload',
    'document.download',
    'document.version.read',
  ],
};

async function main() {
  console.log('==========================================');
  console.log(' EDW RBAC RECONCILIATION');
  console.log('==========================================');
  console.log(`Mode: ${applyMode ? 'APPLY' : 'DRY RUN'}`);
  console.log();

  const roleCodes = Object.keys(baseline);

  // Validate system roles
  const roles = await prisma.role.findMany({
    where: {
      code: {
        in: roleCodes,
      },
      isSystem: true,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  const foundRoleCodes = new Set(roles.map((role) => role.code));

  const missingRoles = roleCodes.filter((code) => !foundRoleCodes.has(code));

  if (missingRoles.length > 0) {
    throw new Error(`System role tidak ditemukan: ${missingRoles.join(', ')}`);
  }

  // Validate permission catalog
  const desiredPermissionCodes = [...new Set(Object.values(baseline).flat())];

  const permissions = await prisma.permission.findMany({
    where: {
      code: {
        in: desiredPermissionCodes,
      },
    },
  });

  const foundPermissionCodes = new Set(
    permissions.map((permission) => permission.code),
  );

  const missingPermissions = desiredPermissionCodes.filter(
    (code) => !foundPermissionCodes.has(code),
  );

  if (missingPermissions.length > 0) {
    console.error('\nPermission catalog belum lengkap:');
    missingPermissions.forEach((code) => {
      console.error(` - ${code}`);
    });

    throw new Error(
      'Reconciliation dibatalkan. Jalankan bootstrap permission catalog terlebih dahulu.',
    );
  }

  const permissionIdMap = new Map(
    permissions.map((permission) => [permission.code, permission.id]),
  );

  const changes: Array<{
    roleCode: string;
    roleName: string;
    add: string[];
    remove: string[];
  }> = [];

  for (const role of roles) {
    const desired = new Set(baseline[role.code]);

    const current = new Set(
      role.rolePermissions.map((rp) => rp.permission.code),
    );

    const add = [...desired].filter((code) => !current.has(code));

    const remove = [...current].filter((code) => !desired.has(code));

    changes.push({
      roleCode: role.code,
      roleName: role.name,
      add,
      remove,
    });
  }

  // Preview changes
  console.log('CHANGE SUMMARY');
  console.log('------------------------------------------');

  let totalAdd = 0;
  let totalRemove = 0;

  for (const change of changes) {
    totalAdd += change.add.length;
    totalRemove += change.remove.length;

    console.log(`\n[${change.roleCode}] ${change.roleName}`);

    console.log(`  Add: ${change.add.length}`);

    change.add.forEach((code) => {
      console.log(`    + ${code}`);
    });

    console.log(`  Remove: ${change.remove.length}`);

    change.remove.forEach((code) => {
      console.log(`    - ${code}`);
    });
  }

  console.log('\n==========================================');
  console.log(`Total permission to ADD    : ${totalAdd}`);
  console.log(`Total permission to REMOVE : ${totalRemove}`);
  console.log('==========================================');

  if (!applyMode) {
    console.log('\nDRY RUN selesai.');
    console.log('Database tidak mengalami perubahan.');
    console.log('\nJika preview sudah benar, jalankan:');
    console.log('npx tsx prisma/reconcile-rbac.ts --apply');

    return;
  }

  // Apply changes atomically
  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      const role = roles.find((item) => item.code === change.roleCode);

      if (!role) {
        throw new Error(`Role ${change.roleCode} tidak ditemukan.`);
      }

      // Remove obsolete mappings
      if (change.remove.length > 0) {
        const obsoletePermissionIds = change.remove
          .map((code) => {
            const permission = role.rolePermissions.find(
              (rp) => rp.permission.code === code,
            );

            return permission?.permissionId;
          })
          .filter((id): id is string => Boolean(id));

        console.log(`\n[DELETE DEBUG] ${change.roleCode}`);
        console.log('Permission codes:', change.remove);
        console.log('Permission IDs:', obsoletePermissionIds);
        console.log('Role ID:', role.id);

        const deleteResult = await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,
            permissionId: {
              in: obsoletePermissionIds,
            },
          },
        });

        console.log(`Deleted rows: ${deleteResult.count}`);

        if (deleteResult.count !== obsoletePermissionIds.length) {
          console.warn(
            `[WARNING] Expected ${obsoletePermissionIds.length} rows deleted, but only ${deleteResult.count} rows deleted.`,
          );
        }
      }

      // Add missing mappings
      if (change.add.length > 0) {
        const newMappings = change.add.map((code) => ({
          roleId: role.id,
          permissionId: permissionIdMap.get(code)!,
        }));

        await tx.rolePermission.createMany({
          data: newMappings,
          skipDuplicates: true,
        });
      }
    }
  });

  console.log('\nRECONCILIATION BERHASIL');
  console.log('Semua mapping role sistem telah disinkronkan.');
}

main()
  .catch((error) => {
    console.error('\nRECONCILIATION ERROR:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
