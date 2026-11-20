
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const UserProfileService = {
  // Update basic profile
  updateProfile(
    token: string,
    data: {
      fullName: string;
      email: string;
    },
  ) {
    return axios.patch(
      `${API_URL}/auth/profile`,
      data,
      {
        headers: getAuthHeaders(token),
      },
    );
  },

  // Update WhatsApp number
  updatePhoneNumber(token: string, phoneNumber: string) {
    return axios.patch(
      `${API_URL}/auth/profile/phone`,
      { phoneNumber },
      {
        headers: getAuthHeaders(token),
      },
    );
  },

  // Send OTP
  sendPhoneOtp(token: string) {
    return axios.post(
      `${API_URL}/auth/profile/phone/send-otp`,
      {},
      {
        headers: getAuthHeaders(token),
      },
    );
  },

  // Verify OTP
  verifyPhoneOtp(token: string, otp: string) {
    return axios.post(
      `${API_URL}/auth/profile/phone/verify-otp`,
      { otp },
      {
        headers: getAuthHeaders(token),
      },
    );
  },

  // Fetch current user profile
  getCurrentProfile(token: string) {
    return axios.get(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(token),
    });
  },
};
