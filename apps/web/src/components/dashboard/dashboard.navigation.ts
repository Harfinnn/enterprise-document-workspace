import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  Files,
  ClipboardList,
  Settings,
  ClipboardCheck,
} from "lucide-react";

import type { NavigationItem } from "./dashboard.types";

const navigation: NavigationItem[] = [
  { label: "Overview", icon: LayoutDashboard, key: "overview" },
  {
    label: "Registration Management",
    icon: ClipboardCheck,
    key: "registrations",
  },
  { label: "User Management", icon: Users, key: "users" },
  { label: "Role & Permission", icon: ShieldCheck, key: "roles" },
  { label: "Departments", icon: Building2, key: "departments" },
  { label: "Document Management", icon: Files, key: "documents" },
  { label: "Audit Log", icon: ClipboardList, key: "audit" },
  { label: "System Settings", icon: Settings, key: "settings" },
];

export default navigation;
