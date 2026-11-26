import { useEffect, useState } from "react";

import DashboardSidebar from "./dashboard/DashboardSidebar";
import DashboardHeader from "./dashboard/DashboardHeader";
import { getNavigationByRole } from "./dashboard/dashboard.navigation";
import { getWorkspaceConfig } from "./dashboard/dashboard.workspace";
import DashboardOverview from "./dashboard/DashboardOverview";
import UserManagement from "./dashboard/user-management/UserManagement";
import RegistrationManagement from "./dashboard/registration-management/RegistrationManagement";
import type { DashboardUser, WorkspaceRole } from "./dashboard/dashboard.types";
import DocumentWorkspace from "./dashboard/document-workspace/DocumentWorkspace";
import UserProfile from "./dashboard/user-profile/UserProfile";
import RolesManagement from "./dashboard/role-management/RolesManagement";

interface DashboardLayoutProps {
  user: DashboardUser;
  onLogout: () => void;
}

const rolePriority: WorkspaceRole[] = [
  "IT_SUPERADMIN",
  "DOCUMENT_CONTROL",
  "MANAGEMENT",
  "DEPARTMENT_HEAD",
  "USER",
];

function getPrimaryRole(user: DashboardUser): WorkspaceRole {
  return (
    rolePriority.find((role) =>
      user.roles.some((userRole) => userRole.code === role),
    ) ?? "USER"
  );
}

export default function DashboardLayout({
  user,
  onLogout,
}: DashboardLayoutProps) {
  const role = getPrimaryRole(user);
  const workspaceConfig = getWorkspaceConfig(role);
  const navigation = getNavigationByRole(role);

  const menuStorageKey = `edw-active-menu-${role}`;

  const [activeMenu, setActiveMenu] = useState(() => {
    const savedMenu = localStorage.getItem(menuStorageKey);

    const validMenuKeys = navigation.map((item) => item.key);

    if (
      savedMenu &&
      (validMenuKeys.includes(savedMenu) || savedMenu === "profile")
    ) {
      return savedMenu;
    }

    return workspaceConfig.defaultMenu;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("edw-sidebar-collapsed") === "true";
  });
  const [profileOpen, setProfileOpen] = useState(false);

  const currentMenu = navigation.find((item) => item.key === activeMenu);

  const openProfile = () => {
    setActiveMenu("profile");
    setProfileOpen(false);
    setSidebarOpen(false);
  };

  useEffect(() => {
    localStorage.setItem("edw-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(menuStorageKey, activeMenu);
  }, [activeMenu, menuStorageKey]);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-edw-navy">
      <DashboardSidebar
        user={user}
        activeMenu={activeMenu}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onMenuChange={setActiveMenu}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          pageTitle={
            activeMenu === "profile"
              ? "My Profile"
              : currentMenu?.label || workspaceConfig.workspace.title
          }
          profileOpen={profileOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleProfile={() => setProfileOpen((value) => !value)}
          onLogout={onLogout}
          onOpenProfile={openProfile}
        />

        <main className="flex-1 overflow-y-auto p-5 sm:p-8">
          {activeMenu === "overview" ? (
            <DashboardOverview user={user} onNavigate={setActiveMenu} />
          ) : activeMenu === "registrations" ? (
            <RegistrationManagement />
          ) : activeMenu === "users" ? (
            <UserManagement />
          ) : activeMenu === "roles" ? (
            <RolesManagement />
          ) : activeMenu === "documents" ? (
            <DocumentWorkspace user={user} activeMenu={activeMenu} />
          ) : activeMenu === "profile" ? (
            <UserProfile user={user} />
          ) : (
            <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm font-semibold text-edw-teal">
                {workspaceConfig.workspace.title}
              </p>

              <h1 className="mt-2 text-2xl font-bold text-edw-navy">
                {currentMenu?.label || "Workspace"}
              </h1>

              <p className="mt-3 text-sm text-slate-500">
                {workspaceConfig.workspace.description}
              </p>

              <p className="mt-2 text-sm text-slate-500">
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
