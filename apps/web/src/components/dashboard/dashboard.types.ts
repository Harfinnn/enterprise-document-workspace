import type { LucideIcon } from "lucide-react";

export interface DashboardUser {
  id: string;
  fullName: string;
  email: string;
  employeeNo?: string | null;
  roles: {
    code: string;
    name: string;
  }[];
}

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  key: string;
}