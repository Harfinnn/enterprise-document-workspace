
import {
  UserCircle,
} from "lucide-react";

import navigation from "./dashboard.navigation";
import type { DashboardUser } from "./dashboard.types";

interface DashboardOverviewProps {
  user: DashboardUser;
  onNavigate: (menu: string) => void;
}

export default function DashboardOverview({
  user,
  onNavigate,
}: DashboardOverviewProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Welcome Section */}
      <div>
        <p className="text-sm font-medium text-edw-teal">
          Administrator Workspace
        </p>

        <h1 className="mt-2 text-2xl font-bold text-edw-navy sm:text-3xl">
          Welcome back, {user.fullName.split(" ")[0]}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Selamat datang di pusat administrasi Enterprise
          Document Workspace.
        </p>
      </div>

      {/* Hero Section */}
      <div className="rounded-2xl bg-edw-navy p-6 text-white sm:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-edw-cyan">
            IT SuperAdmin
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Manage your enterprise workspace.
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Kelola pengguna, hak akses, departemen, dan
            tata kelola dokumen perusahaan melalui satu
            platform terintegrasi.
          </p>
        </div>
      </div>

      {/* Administration Modules */}
      <div>
        <h3 className="text-base font-bold text-edw-navy">
          Administration Modules
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Akses modul administrasi EDW.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navigation.slice(1).map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-edw-teal hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-edw-cyan/40 text-edw-teal">
                  <Icon size={21} />
                </div>

                <h4 className="mt-4 text-sm font-bold text-edw-navy">
                  {item.label}
                </h4>

                <p className="mt-2 text-xs text-slate-500">
                  Buka modul {item.label.toLowerCase()}.
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <UserCircle size={20} className="text-edw-teal" />

          <h3 className="text-sm font-bold text-edw-navy">
            Account Information
          </h3>
        </div>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">
              Full Name
            </p>
            <p className="mt-1 font-medium">
              {user.fullName}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Email
            </p>
            <p className="mt-1 font-medium">
              {user.email}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Employee Number
            </p>
            <p className="mt-1 font-medium">
              {user.employeeNo || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Role
            </p>
            <p className="mt-1 font-medium">
              {user.roles.map((role) => role.name).join(", ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
