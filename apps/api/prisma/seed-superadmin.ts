
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import * as bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const email = process.env.EDW_ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.EDW_ADMIN_NAME?.trim();
const password = process.env.EDW_ADMIN_PASSWORD;

async function main() {
  // Validasi konfigurasi
  if (!connectionString) {
    throw new Error("DATABASE_URL belum dikonfigurasi.");
  }

  if (!email || !fullName || !password) {
    throw new Error("Konfigurasi Superadmin belum lengkap.");
  }

  if (password.length < 12) {
    throw new Error("Password Superadmin minimal 12 karakter.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error(
        "Email sudah terdaftar. Bootstrap dihentikan.",
      );
    }

    const role = await prisma.role.findUnique({
      where: { code: "IT_SUPERADMIN" },
    });

    if (!role) {
      throw new Error("Role IT_SUPERADMIN tidak ditemukan.");
    }

    const passwordHash: string = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        isActive: true,
        emailVerifiedAt: null,
        userRoles: {
          create: {
            roleId: role.id,
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });

    console.log("Superadmin berhasil dibuat:");
    console.log(user);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Bootstrap gagal:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
