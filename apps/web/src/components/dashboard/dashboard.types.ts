import type { LucideIcon } from "lucide-react";

export type WorkspaceRole =
  | "IT_SUPERADMIN"
  | "DOCUMENT_CONTROL"
  | "MANAGEMENT"
  | "DEPARTMENT_HEAD"
  | "USER";

export type WorkspaceType =
  | "system"
  | "document"
  | "executive"
  | "department"
  | "personal";

export interface DashboardUser {
  id: string;
  fullName: string;
  email: string;
  employeeNo?: string | null;

  // Profile information
  phone?: string | null;
  department?: string | null;
  position?: string | null;

  // Account information
  accountStatus?: string | null;

  roles: {
    code: string;
    name: string;
  }[];
}

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  key: string;

  allowedRoles?: WorkspaceRole[];
}

export interface WorkspaceConfig {
  type: WorkspaceType;
  title: string;
  description: string;
  role: WorkspaceRole;
}

export interface WorkspaceRoleConfig {
  workspace: WorkspaceConfig;
  defaultMenu: string;
}
