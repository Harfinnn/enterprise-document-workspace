import { LogOut, Menu, ChevronDown, UserRound } from "lucide-react";

import type { DashboardUser, WorkspaceRole } from "./dashboard.types";

import { getWorkspaceConfig } from "./dashboard.workspace";

interface DashboardHeaderProps {
  user: DashboardUser;
  pageTitle: string;
  profileOpen: boolean;
  onOpenSidebar: () => void;
  onToggleProfile: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

const rolePriority: WorkspaceRole[] = [
  "IT_SUPERADMIN",
  "DOCUMENT_CONTROL",
  "MANAGEMENT",
  "DEPARTMENT_HEAD",
  "USER",
];

const roleLabels: Record<WorkspaceRole, string> = {
  IT_SUPERADMIN: "IT Super Administrator",
  DOCUMENT_CONTROL: "Document Control",
  MANAGEMENT: "Management",
  DEPARTMENT_HEAD: "Department Head",
  USER: "Employee",
};

function getPrimaryRole(user: DashboardUser): WorkspaceRole {
  return (
    rolePriority.find((role) =>
      user.roles.some((userRole) => userRole.code === role),
    ) ?? "USER"
  );
}

export default function DashboardHeader({
  user,
  pageTitle,
  profileOpen,
  onOpenSidebar,
  onToggleProfile,
  onLogout,
  onOpenProfile,
}: DashboardHeaderProps) {
  const role = getPrimaryRole(user);
  const workspaceConfig = getWorkspaceConfig(role);

  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <header className="relative z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      {/* Page Information */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-xs text-slate-400">
            EDW / {workspaceConfig.workspace.title}
          </p>

          <h2 className="truncate text-lg font-bold text-edw-navy">
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* Profile Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={onToggleProfile}
          aria-expanded={profileOpen}
          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-edw-navy">
              {user.fullName}
            </p>

            <p className="text-xs text-slate-400">{roleLabels[role]}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-edw-teal text-sm font-bold text-white">
            {initials}
          </div>

          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-14 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-3">
              <p className="text-sm font-semibold text-edw-navy">
                {user.fullName}
              </p>

              <p className="mt-1 break-all text-xs text-slate-400">
                {user.email}
              </p>

              <p className="mt-2 text-xs font-medium text-edw-teal">
                {workspaceConfig.workspace.title}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenProfile}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <UserRound size={17} className="text-slate-500" />
              My Profile
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
