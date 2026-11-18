
import {
  LogOut,
  Menu,
  ChevronDown,
} from "lucide-react";

import type { DashboardUser } from "./dashboard.types";

interface DashboardHeaderProps {
  user: DashboardUser;
  pageTitle: string;
  profileOpen: boolean;
  onOpenSidebar: () => void;
  onToggleProfile: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({
  user,
  pageTitle,
  profileOpen,
  onOpenSidebar,
  onToggleProfile,
  onLogout,
}: DashboardHeaderProps) {
  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <header className="relative z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      {/* Page Information */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <p className="text-xs text-slate-400">
            EDW / Administrator
          </p>

          <h2 className="text-lg font-bold text-edw-navy">
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

            <p className="text-xs text-slate-400">
              IT SuperAdmin
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-edw-teal text-sm font-bold text-white">
            {initials}
          </div>

          <ChevronDown
            size={16}
            className="text-slate-400"
          />
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
            </div>

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
