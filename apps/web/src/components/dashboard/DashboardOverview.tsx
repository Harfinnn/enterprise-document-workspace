import { UserCircle } from "lucide-react";

import { getNavigationByRole } from "./dashboard.navigation";
import type { DashboardUser, WorkspaceRole } from "./dashboard.types";

interface DashboardOverviewProps {
  user: DashboardUser;
  onNavigate: (menu: string) => void;
}

interface OverviewContent {
  workspaceLabel: string;
  heroTitle: string;
  heroDescription: string;
  moduleTitle: string;
  moduleDescription: string;
  cardDescription: string;
}

const rolePriority: WorkspaceRole[] = [
  "IT_SUPERADMIN",
  "DOCUMENT_CONTROL",
  "MANAGEMENT",
  "DEPARTMENT_HEAD",
  "USER",
];

const overviewContent: Record<WorkspaceRole, OverviewContent> = {
  IT_SUPERADMIN: {
    workspaceLabel: "System Administration Workspace",
    heroTitle: "Manage your enterprise workspace.",
    heroDescription:
      "Kelola pengguna, hak akses, departemen, dan konfigurasi platform Enterprise Document Workspace dalam satu pusat administrasi.",
    moduleTitle: "Administration Modules",
    moduleDescription: "Akses seluruh modul administrasi platform.",
    cardDescription: "Kelola",
  },

  DOCUMENT_CONTROL: {
    workspaceLabel: "Document Governance Workspace",
    heroTitle: "Maintain enterprise document governance.",
    heroDescription:
      "Kelola siklus hidup dokumen perusahaan mulai dari repository, review, approval, klasifikasi, hingga pengarsipan.",
    moduleTitle: "Document Governance",
    moduleDescription: "Kelola dokumen dan proses tata kelola perusahaan.",
    cardDescription: "Buka",
  },

  MANAGEMENT: {
    workspaceLabel: "Executive Workspace",
    heroTitle: "Enterprise document visibility at a glance.",
    heroDescription:
      "Pantau kondisi dokumen perusahaan, aktivitas tata kelola, laporan, dan insight untuk mendukung pengambilan keputusan.",
    moduleTitle: "Executive Modules",
    moduleDescription: "Monitoring, laporan, dan informasi strategis EDW.",
    cardDescription: "Lihat",
  },

  DEPARTMENT_HEAD: {
    workspaceLabel: "Department Workspace",
    heroTitle: "Manage your department workspace.",
    heroDescription:
      "Pantau dokumen departemen, aktivitas tim, permintaan review, dan laporan dalam satu workspace.",
    moduleTitle: "Department Modules",
    moduleDescription: "Kelola dokumen dan aktivitas departemen.",
    cardDescription: "Buka",
  },

  USER: {
    workspaceLabel: "Personal Workspace",
    heroTitle: "Your documents, all in one place.",
    heroDescription:
      "Kelola dokumen pribadi, akses dokumen yang dibagikan, temukan aktivitas terbaru, dan simpan dokumen favorit dalam satu workspace.",
    moduleTitle: "My Workspace",
    moduleDescription: "Akses dokumen dan aktivitas personal Anda.",
    cardDescription: "Buka",
  },
};

function getPrimaryRole(user: DashboardUser): WorkspaceRole {
  return (
    rolePriority.find((role) =>
      user.roles.some((userRole) => userRole.code === role),
    ) ?? "USER"
  );
}

export default function DashboardOverview({
  user,
  onNavigate,
}: DashboardOverviewProps) {
  const role = getPrimaryRole(user);
  const content = overviewContent[role];

  const navigation = getNavigationByRole(role).filter(
    (item) => item.key !== "overview",
  );

  const quickAccess = navigation.slice(0, 3);

  const firstName = user.fullName.trim().split(/\s+/)[0] || "User";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome Header */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-edw-teal">
          {content.workspaceLabel}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-edw-navy sm:text-3xl">
              Welcome back, {firstName}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Selamat datang di Enterprise Document Workspace.
            </p>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-edw-navy via-edw-navy to-[#0F766E] p-6 shadow-sm sm:p-8">
        {/* Decorative element */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border border-white/10" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-edw-cyan">
            Enterprise Workspace
          </div>

          <h2 className="mt-5 max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            {content.heroTitle}
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            {content.heroDescription}
          </p>
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold tracking-tight text-edw-navy">
            Quick Access
          </h3>

          <p className="text-sm text-slate-500">
            Quickly access your frequently used workspace modules.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickAccess.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-edw-teal/50 hover:bg-slate-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-edw-teal/40"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-edw-cyan/30 text-edw-teal transition-colors group-hover:bg-edw-teal group-hover:text-white">
                  <Icon size={22} strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-edw-navy">
                    {item.label}
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    {content.cardDescription} {item.label.toLowerCase()}
                  </p>
                </div>

                <span className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-edw-teal">
                  →
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Workspace Modules */}
      <section>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold tracking-tight text-edw-navy">
            {content.moduleTitle}
          </h3>

          <p className="text-sm text-slate-500">{content.moduleDescription}</p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-edw-teal/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-edw-teal/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-edw-cyan/30 text-edw-teal transition-colors group-hover:bg-edw-teal group-hover:text-white">
                    <Icon size={21} strokeWidth={1.8} />
                  </div>

                  <span className="text-slate-300 transition-colors group-hover:text-edw-teal">
                    <span className="text-lg">↗</span>
                  </span>
                </div>

                <h4 className="mt-5 text-sm font-bold text-edw-navy">
                  {item.label}
                </h4>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {content.cardDescription} {item.label.toLowerCase()}.
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Account Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-edw-cyan/30">
            <UserCircle size={21} className="text-edw-teal" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-edw-navy">
              Account Information
            </h3>

            <p className="text-xs text-slate-500">
              Informasi akun pengguna yang sedang aktif
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">Full Name</p>

            <p className="mt-1.5 text-sm font-semibold text-slate-700">
              {user.fullName}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">Email</p>

            <p className="mt-1.5 break-all text-sm font-semibold text-slate-700">
              {user.email}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">
              Employee Number
            </p>

            <p className="mt-1.5 text-sm font-semibold text-slate-700">
              {user.employeeNo || "-"}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">Role</p>

            <p className="mt-1.5 text-sm font-semibold text-slate-700">
              {user.roles.map((role) => role.name).join(", ") || "-"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
