import { useState } from "react";

import DashboardSidebar from "./dashboard/DashboardSidebar";
import DashboardHeader from "./dashboard/DashboardHeader";
import navigation from "./dashboard/dashboard.navigation";
import DashboardOverview from "./dashboard/DashboardOverview";
import UserManagement from "./dashboard/user-management/UserManagement";
import type { DashboardUser } from "./dashboard/dashboard.types";

interface DashboardLayoutProps {
  user: DashboardUser;
  onLogout: () => void;
}

export default function DashboardLayout({
  user,
  onLogout,
}: DashboardLayoutProps) {
  const [activeMenu, setActiveMenu] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const currentMenu = navigation.find((item) => item.key === activeMenu);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-edw-navy">
      <DashboardSidebar
        activeMenu={activeMenu}
        sidebarOpen={sidebarOpen}
        onMenuChange={setActiveMenu}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          pageTitle={currentMenu?.label || "Dashboard"}
          profileOpen={profileOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleProfile={() => setProfileOpen((value) => !value)}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto p-5 sm:p-8">
          {activeMenu === "overview" ? (
            <DashboardOverview user={user} onNavigate={setActiveMenu} />
          ) : activeMenu === "users" ? (
            <UserManagement />
          ) : (
            <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm font-semibold text-edw-teal">
                Administration Module
              </p>
              <h1 className="mt-2 text-2xl font-bold text-edw-navy">
                {currentMenu?.label}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Modul ini akan kita implementasikan pada tahap pengembangan
                berikutnya.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
