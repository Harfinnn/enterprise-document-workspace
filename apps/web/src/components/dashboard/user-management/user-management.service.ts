
import axios from "axios";

import type {
  UserListResponse,
} from "./user-management.types";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function getUsers(
  page = 1,
  limit = 10,
): Promise<UserListResponse> {
  const accessToken = sessionStorage.getItem("edw_access_token");

  const response = await axios.get<UserListResponse>(
    `${API_URL}/users`,
    {
      params: {
        page,
        limit,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
}
