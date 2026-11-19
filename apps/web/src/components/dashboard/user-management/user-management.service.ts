import axios from "axios";

import type {
  UserListResponse,
  UserDetailResponse,
  RoleListResponse,
  DepartmentListResponse,
  UpdateUserPayload,
} from "./user-management.types";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function getUsers(
  page = 1,
  limit = 10,
): Promise<UserListResponse> {
  const accessToken = sessionStorage.getItem("edw_access_token");

  const response = await axios.get<UserListResponse>(`${API_URL}/users`, {
    params: {
      page,
      limit,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

function getAuthConfig() {
  const accessToken = sessionStorage.getItem("edw_access_token");

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export async function getUserDetail(id: string): Promise<UserDetailResponse> {
  const response = await axios.get<UserDetailResponse>(
    `${API_URL}/users/${id}`,
    getAuthConfig(),
  );

  return response.data;
}

export async function getUserRoles(): Promise<RoleListResponse> {
  const response = await axios.get<RoleListResponse>(
    `${API_URL}/users/roles`,
    getAuthConfig(),
  );

  return response.data;
}

export async function getDepartments(): Promise<DepartmentListResponse> {
  const response = await axios.get<DepartmentListResponse>(
    `${API_URL}/users/departments`,
    getAuthConfig(),
  );

  return response.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const response = await axios.patch(
    `${API_URL}/users/${id}`,
    payload,
    getAuthConfig(),
  );

  return response.data;
}

export async function updateUserRoles(id: string, roleIds: string[]) {
  const response = await axios.patch(
    `${API_URL}/users/${id}/roles`,
    { roleIds },
    getAuthConfig(),
  );

  return response.data;
}

export async function updateUserStatus(id: string, isActive: boolean) {
  const response = await axios.patch(
    `${API_URL}/users/${id}/status`,
    { isActive },
    getAuthConfig(),
  );

  return response.data;
}

export async function resendUserActivation(id: string) {
  const response = await axios.post(
    `${API_URL}/users/${id}/resend-activation`,
    {},
    getAuthConfig(),
  );

  return response.data;
}
