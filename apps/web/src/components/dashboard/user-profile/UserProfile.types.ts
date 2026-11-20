
import type { DashboardUser } from "../dashboard.types";

export interface UserProfileProps {
  user: DashboardUser;
}

export interface PhoneProfileData {
  phoneNumber: string | null;
  phoneNumberVerifiedAt: string | null;
  pendingPhoneNumber: string | null;
}

export type PhoneStatus = "verified" | "unverified" | "pending";
