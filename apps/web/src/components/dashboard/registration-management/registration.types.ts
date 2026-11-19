
export type RegistrationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface RegistrationDepartment {
  id: string;
  code: string;
  name: string;
}

export interface RegistrationReviewer {
  id: string;
  fullName: string;
  email: string;
}

export interface RegistrationCreatedUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
}

export interface RegistrationItem {
  id: string;
  fullName: string;
  email: string;
  employeeNo: string | null;
  requestedDepartmentId: string | null;
  status: RegistrationStatus;
  requestIp?: string | null;
  userAgent?: string | null;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  createdUserId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  requestedDepartment?: RegistrationDepartment | null;
}

export interface RegistrationDetail extends RegistrationItem {
  reviewedBy: RegistrationReviewer | null;
  createdUser: RegistrationCreatedUser | null;
}

export interface RegistrationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RegistrationListResponse {
  data: RegistrationItem[];
  pagination: RegistrationPagination;
}

export interface RegistrationDetailResponse {
  data: RegistrationDetail;
}

export interface RegistrationApprovePayload {
  departmentId: string;
  roleId: string;
}

export interface RegistrationApprovedUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
}

export interface RegistrationApproveResponse {
  message: string;
  data: {
    registrationId: string;
    user: RegistrationApprovedUser;
    activationEmailSent: boolean;
  };
}

export interface RegistrationRejectPayload {
  reason: string;
}

export interface RegistrationRejectResponse {
  message: string;
  data: {
    id: string;
    fullName: string;
    email: string;
    status: RegistrationStatus;
    rejectionReason: string;
    reviewedAt: string | null;
  };
}

export interface RegistrationListParams {
  status?: RegistrationStatus;
  page?: number;
  limit?: number;
}
