import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  Files,
  ClipboardList,
  Settings,
  ClipboardCheck,
  FileText,
  FileSearch,
  Archive,
  Share2,
  Clock,
  Star,
  ChartNoAxesCombined,
  Inbox,
  BookOpen,
  Network,
} from "lucide-react";

import type { NavigationItem, WorkspaceRole } from "./dashboard.types";

const navigation: NavigationItem[] = [
  // =========================
  // SHARED WORKSPACES
  // =========================
  {
    label: "Overview",
    icon: LayoutDashboard,
    key: "overview",
  },
  {
    label: "Document Management",
    icon: Files,
    key: "documents",
  },

  // =========================
  // IT SUPERADMIN
  // =========================
  {
    label: "Registration Management",
    icon: ClipboardCheck,
    key: "registrations",
    allowedRoles: ["IT_SUPERADMIN"],
  },
  {
    label: "User Management",
    icon: Users,
    key: "users",
    allowedRoles: ["IT_SUPERADMIN"],
  },
  {
    label: "Role & Permission",
    icon: ShieldCheck,
    key: "roles",
    allowedRoles: ["IT_SUPERADMIN"],
  },
  {
    label: "Departments",
    icon: Building2,
    key: "departments",
    allowedRoles: ["IT_SUPERADMIN"],
  },
  {
    label: "Audit Log",
    icon: ClipboardList,
    key: "audit",
    allowedRoles: ["IT_SUPERADMIN"],
  },
  {
    label: "System Settings",
    icon: Settings,
    key: "settings",
    allowedRoles: ["IT_SUPERADMIN"],
  },

  // =========================
  // DOCUMENT CONTROL
  // =========================
  {
    label: "Document Review",
    icon: FileSearch,
    key: "document-review",
    allowedRoles: ["DOCUMENT_CONTROL"],
  },
  {
    label: "Document Approval",
    icon: ClipboardCheck,
    key: "document-approval",
    allowedRoles: ["DOCUMENT_CONTROL"],
  },
  {
    label: "Document Classification",
    icon: BookOpen,
    key: "document-classification",
    allowedRoles: ["DOCUMENT_CONTROL"],
  },
  {
    label: "Document Archive",
    icon: Archive,
    key: "document-archive",
    allowedRoles: ["DOCUMENT_CONTROL"],
  },

  // =========================
  // MANAGEMENT
  // =========================
  {
    label: "Executive Reports",
    icon: ChartNoAxesCombined,
    key: "executive-reports",
    allowedRoles: ["MANAGEMENT"],
  },
  {
    label: "Document Monitoring",
    icon: FileText,
    key: "document-monitoring",
    allowedRoles: ["MANAGEMENT"],
  },
  {
    label: "Organizational Insights",
    icon: Network,
    key: "organizational-insights",
    allowedRoles: ["MANAGEMENT"],
  },

  // =========================
  // DEPARTMENT HEAD
  // =========================
  {
    label: "Review Requests",
    icon: Inbox,
    key: "review-requests",
    allowedRoles: ["DEPARTMENT_HEAD"],
  },
  {
    label: "Team Documents",
    icon: Share2,
    key: "team-documents",
    allowedRoles: ["DEPARTMENT_HEAD"],
  },
  {
    label: "Department Reports",
    icon: ChartNoAxesCombined,
    key: "department-reports",
    allowedRoles: ["DEPARTMENT_HEAD"],
  },

  // =========================
  // USER
  // =========================
  {
    label: "Shared With Me",
    icon: Share2,
    key: "shared-documents",
    allowedRoles: ["USER"],
  },
  {
    label: "Recent Documents",
    icon: Clock,
    key: "recent-documents",
    allowedRoles: ["USER"],
  },
  {
    label: "Favorites",
    icon: Star,
    key: "favorites",
    allowedRoles: ["USER"],
  },
];

export function getNavigationByRole(role: WorkspaceRole): NavigationItem[] {
  return navigation.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role),
  );
}

export default navigation;
