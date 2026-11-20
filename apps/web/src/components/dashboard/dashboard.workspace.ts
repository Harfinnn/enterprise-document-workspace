
import type {
  WorkspaceRole,
  WorkspaceRoleConfig,
} from "./dashboard.types";

const workspaceConfig: Record<WorkspaceRole, WorkspaceRoleConfig> = {
  IT_SUPERADMIN: {
    workspace: {
      type: "system",
      title: "System Administration",
      description: "Manage and monitor the EDW platform.",
      role: "IT_SUPERADMIN",
    },
    defaultMenu: "overview",
  },

  DOCUMENT_CONTROL: {
    workspace: {
      type: "document",
      title: "Document Governance",
      description: "Manage enterprise documents and document lifecycle.",
      role: "DOCUMENT_CONTROL",
    },
    defaultMenu: "overview",
  },

  MANAGEMENT: {
    workspace: {
      type: "executive",
      title: "Executive Workspace",
      description: "Executive overview, monitoring, and insights.",
      role: "MANAGEMENT",
    },
    defaultMenu: "overview",
  },

  DEPARTMENT_HEAD: {
    workspace: {
      type: "department",
      title: "Department Workspace",
      description: "Manage departmental documents and activities.",
      role: "DEPARTMENT_HEAD",
    },
    defaultMenu: "overview",
  },

  USER: {
    workspace: {
      type: "personal",
      title: "My Workspace",
      description: "Access and manage your personal documents.",
      role: "USER",
    },
    defaultMenu: "overview",
  },
};

export function getWorkspaceConfig(
  role: WorkspaceRole,
): WorkspaceRoleConfig {
  return workspaceConfig[role];
}

export default workspaceConfig;
