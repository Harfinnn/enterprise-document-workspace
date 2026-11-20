import { useEffect } from "react";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { getNavigationByRole } from "./dashboard.navigation";
import type {
  DashboardUser,
  WorkspaceRole,
  NavigationItem,
} from "./dashboard.types";

interface DashboardSidebarProps {
  user: DashboardUser;
  activeMenu: string;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onMenuChange: (menu: string) => void;
  onClose: () => void;
  onToggleCollapse: () => void;
}

interface NavigationGroup {
  label: string;
  keys: string[];
}

const rolePriority: WorkspaceRole[] = [
  "IT_SUPERADMIN",
  "DOCUMENT_CONTROL",
  "MANAGEMENT",
  "DEPARTMENT_HEAD",
  "USER",
];

const navigationGroups: NavigationGroup[] = [
  { label: "Workspace", keys: ["overview"] },
  {
    label: "Administration",
    keys: [
      "registrations",
      "users",
      "roles",
      "departments",
      "documents",
      "audit",
      "settings",
    ],
  },
  {
    label: "Document Governance",
    keys: [
      "document-repository",
      "document-review",
      "document-approval",
      "document-classification",
      "document-archive",
    ],
  },
  {
    label: "Executive Insights",
    keys: [
      "executive-reports",
      "document-monitoring",
      "organizational-insights",
    ],
  },
  {
    label: "Department",
    keys: [
      "department-documents",
      "review-requests",
      "team-documents",
      "department-reports",
    ],
  },
  {
    label: "Personal Documents",
    keys: ["my-documents", "shared-documents", "recent-documents", "favorites"],
  },
];

function getPrimaryRole(user: DashboardUser): WorkspaceRole {
  const matchedRole = rolePriority.find((role) =>
    user.roles.some((userRole) => userRole.code === role),
  );

  return matchedRole ?? "USER";
}

export default function DashboardSidebar({
  user,
  activeMenu,
  sidebarOpen,
  sidebarCollapsed,
  onMenuChange,
  onClose,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const role = getPrimaryRole(user);
  const navigation = getNavigationByRole(role);

  const groupedNavigation = navigationGroups
    .map((group) => ({
      ...group,
      items: navigation.filter((item) => group.keys.includes(item.key)),
    }))
    .filter((group) => group.items.length > 0);

  // Tutup sidebar mobile dengan tombol Escape
  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, onClose]);

  const renderNavigationItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const active = activeMenu === item.key;

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => {
          onMenuChange(item.key);
          onClose();
        }}
        aria-current={active ? "page" : undefined}
        title={sidebarCollapsed ? item.label : undefined}
        className={`group relative flex w-full items-center rounded-xl py-2.5 text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-edw-cyan/70 ${
          sidebarCollapsed ? "lg:justify-center lg:px-2" : "gap-3 px-3"
        } ${
          active
            ? "bg-edw-teal font-semibold text-white shadow-md shadow-black/20"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        {/* Indikator aktif */}
        <span
          aria-hidden="true"
          className={`absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-edw-cyan transition-all duration-200 ${
            active ? "opacity-100" : "opacity-0"
          } ${sidebarCollapsed ? "lg:-left-2" : ""}`}
        />

        <Icon
          size={19}
          className={`shrink-0 transition-transform duration-200 ${
            active ? "" : "group-hover:scale-110"
          }`}
        />

        <span className={sidebarCollapsed ? "truncate lg:hidden" : "truncate"}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-edw-navy text-white transition-all duration-300 ease-in-out lg:static ${
          sidebarCollapsed ? "w-72 lg:w-20" : "w-72"
        } ${
          sidebarOpen
            ? "translate-x-0 shadow-2xl shadow-black/40 lg:shadow-none"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Branding */}
        <div
          className={`flex h-20 shrink-0 items-center border-b border-white/10 ${
            sidebarCollapsed
              ? "justify-between px-6 lg:justify-center lg:px-2"
              : "justify-between px-6"
          }`}
        >
          {/* Disembunyikan di desktop saat collapsed */}
          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <h1 className="text-2xl font-bold leading-none tracking-widest">
              EDW
            </h1>

            <p className="mt-1.5 text-[10px] leading-none tracking-wider text-edw-cyan">
              ENTERPRISE DOCUMENT WORKSPACE
            </p>
          </div>

          {/* Collapse Toggle Desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group relative hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-edw-cyan/70 lg:flex"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}
          >
            {/* Ikon "Close": tampil saat sidebar terbuka */}
            <PanelLeftClose
              size={19}
              aria-hidden="true"
              className={`absolute transition-all duration-300 ease-in-out ${
                sidebarCollapsed
                  ? "scale-75 -rotate-90 opacity-0"
                  : "scale-100 rotate-0 opacity-100 group-hover:-translate-x-0.5"
              }`}
            />

            {/* Ikon "Open": tampil saat sidebar collapsed */}
            <PanelLeftOpen
              size={19}
              aria-hidden="true"
              className={`absolute transition-all duration-300 ease-in-out ${
                sidebarCollapsed
                  ? "scale-100 rotate-0 opacity-100 group-hover:translate-x-0.5"
                  : "scale-75 rotate-90 opacity-0"
              }`}
            />
          </button>

          {/* Close Mobile */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-edw-cyan/70 lg:hidden"
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className={`flex-1 overflow-y-auto overflow-x-hidden py-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] ${
            sidebarCollapsed ? "px-4 lg:px-2" : "px-4"
          }`}
        >
          <div className="space-y-5">
            {groupedNavigation.map((group, index) => (
              <section key={group.label} aria-label={group.label}>
                {/* Label grup (expanded) */}
                <p
                  className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${
                    sidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {group.label}
                </p>

                {/* Pemisah grup (collapsed desktop) */}
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className={`mx-2 mb-3 hidden h-px bg-white/10 ${
                      sidebarCollapsed ? "lg:block" : ""
                    }`}
                  />
                )}

                <div className="space-y-1">
                  {group.items.map(renderNavigationItem)}
                </div>
              </section>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div
          className={`shrink-0 border-t border-white/10 ${
            sidebarCollapsed ? "p-5 lg:p-3 lg:text-center" : "p-5"
          }`}
        >
          {sidebarCollapsed && (
            <span className="hidden text-[10px] font-semibold text-slate-500 lg:inline">
              EDW
            </span>
          )}

          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <p className="text-xs text-slate-500">
              © 2026 Enterprise Document Workspace
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              Manage. Convert. Create. Collaborate. Secure.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
