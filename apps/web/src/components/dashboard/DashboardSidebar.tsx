
import { X } from "lucide-react";

import navigation from "./dashboard.navigation";

interface DashboardSidebarProps {
  activeMenu: string;
  sidebarOpen: boolean;
  onMenuChange: (menu: string) => void;
  onClose: () => void;
}

export default function DashboardSidebar({
  activeMenu,
  sidebarOpen,
  onMenuChange,
  onClose,
}: DashboardSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-edw-navy text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-widest">
              EDW
            </h1>

            <p className="text-[10px] tracking-wider text-edw-cyan">
              ENTERPRISE DOCUMENT WORKSPACE
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        {/* Workspace Information */}
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <div className="mt-3 rounded-xl border border-edw-teal/30 bg-edw-teal/10 p-3">
            <p className="text-xs font-semibold text-edw-cyan">
              Administrator Console
            </p>

            <p className="mt-1 text-xs text-slate-400">
              IT SuperAdmin Workspace
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Main Menu
          </p>

          {navigation.map((item) => {
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
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  active
                    ? "bg-edw-teal font-semibold text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-5">
          <p className="text-xs text-slate-500">
            © 2026 Enterprise Document Workspace
          </p>

          <p className="mt-1 text-[10px] text-slate-600">
            Manage. Convert. Create. Collaborate. Secure.
          </p>
        </div>
      </aside>
    </>
  );
}
