
export interface UserRole {
  role: {
    id: string;
    code: string;
    name: string;
  };
}

export interface ManagedUser {
  id: string;
  employeeNo: string | null;
  fullName: string;
  email: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department: Record<string, unknown> | null;
  userRoles: UserRole[];
}

export interface UserPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResponse {
  data: ManagedUser[];
  meta: UserPaginationMeta;
}
