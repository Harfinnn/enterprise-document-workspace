
import axios from "axios";

import type {
  RegistrationApprovePayload,
  RegistrationApproveResponse,
  RegistrationDetailResponse,
  RegistrationListParams,
  RegistrationListResponse,
  RegistrationRejectPayload,
  RegistrationRejectResponse,
} from "./registration.types";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const REGISTRATION_ENDPOINT = `${API_URL}/registration`;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("edw_access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const registrationService = {
  /**
   * Get registration list with status filter and pagination.
   */
  async getRegistrations(
    params: RegistrationListParams = {},
  ): Promise<RegistrationListResponse> {
    const response = await axios.get<RegistrationListResponse>(
      `${REGISTRATION_ENDPOINT}/admin`,
      {
        headers: getAuthHeaders(),
        params: {
          status: params.status,
          page: params.page ?? 1,
          limit: params.limit ?? 10,
        },
      },
    );

    return response.data;
  },

  /**
   * Get registration detail by ID.
   */
  async getRegistrationById(
    id: string,
  ): Promise<RegistrationDetailResponse> {
    const response = await axios.get<RegistrationDetailResponse>(
      `${REGISTRATION_ENDPOINT}/admin/${id}`,
      {
        headers: getAuthHeaders(),
      },
    );

    return response.data;
  },

  /**
   * Approve registration and assign department + role.
   */
  async approveRegistration(
    id: string,
    payload: RegistrationApprovePayload,
  ): Promise<RegistrationApproveResponse> {
    const response = await axios.post<RegistrationApproveResponse>(
      `${REGISTRATION_ENDPOINT}/admin/${id}/approve`,
      payload,
      {
        headers: getAuthHeaders(),
      },
    );

    return response.data;
  },

  /**
   * Reject registration with a reason.
   */
  async rejectRegistration(
    id: string,
    payload: RegistrationRejectPayload,
  ): Promise<RegistrationRejectResponse> {
    const response = await axios.post<RegistrationRejectResponse>(
      `${REGISTRATION_ENDPOINT}/admin/${id}/reject`,
      payload,
      {
        headers: getAuthHeaders(),
      },
    );

    return response.data;
  },
};

export default registrationService;
