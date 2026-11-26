import { useId, useEffect, useCallback, useState, type ReactNode } from "react";

import axios from "axios";

import {
  UserRound,
  Mail,
  Phone,
  Building2,
  BriefcaseBusiness,
  ShieldCheck,
  KeyRound,
  Pencil,
  Save,
  X,
  LockKeyhole,
  BadgeCheck,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Clock,
  LoaderCircle,
  ArrowRight,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";

import type {
  UserProfileProps,
  PhoneProfileData,
  PhoneStatus,
} from "./UserProfile.types";

import { UserProfileService } from "./UserProfile.service";

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-slate-400";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edw-teal focus-visible:ring-offset-2 active:scale-[0.98]";

const btnPrimary = `${btnBase} bg-edw-teal text-white shadow-sm hover:opacity-90 hover:shadow-md`;

const btnSecondary = `${btnBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;

function SectionCard({
  icon: Icon,

  title,

  description,

  action,

  className = "",

  children,
}: {
  icon: LucideIcon;

  title: string;

  description: string;

  action?: ReactNode;

  className?: string;

  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <header className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-edw-teal">
            <Icon size={20} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-edw-navy">{title}</h2>

            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {action}
      </header>

      <div className="flex-1 p-6">{children}</div>
    </section>
  );
}

function Notice({
  tone,

  icon: Icon,

  role,

  children,
}: {
  tone: "success" | "error";

  icon: LucideIcon;

  role: "status" | "alert";

  children: ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-600";

  return (
    <div
      role={role}
      className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${styles}`}
    >
      <Icon size={18} className="shrink-0" />

      {children}
    </div>
  );
}

function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
      <Icon size={16} />
    </span>
  );
}

function InfoField({
  label,

  value,

  icon,
}: {
  label?: string;

  value: string;

  icon: LucideIcon;
}) {
  return (
    <div className="space-y-2">
      {label && <p className={labelClass}>{label}</p>}

      <div className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <IconChip icon={icon} />

        <span className="truncate text-sm font-medium text-slate-700">
          {value || "Not provided"}
        </span>
      </div>
    </div>
  );
}

function EditableField({
  label,

  value,

  icon,

  editing,

  onChange,

  type = "text",

  placeholder,
}: {
  label: string;

  value: string;

  icon: LucideIcon;

  editing: boolean;

  onChange: (value: string) => void;

  type?: "text" | "email" | "tel";

  placeholder: string;
}) {
  const id = useId();

  const Icon = icon;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={`block ${labelClass}`}>
        {label}
      </label>

      {editing ? (
        <div className="relative">
          <Icon
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-edw-teal focus:ring-4 focus:ring-teal-100"
          />
        </div>
      ) : (
        <InfoField value={value} icon={icon} />
      )}
    </div>
  );
}

function Badge({
  icon: Icon,

  children,
}: {
  icon: LucideIcon;

  children: ReactNode;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
      <Icon size={16} className="shrink-0" />

      <span className="truncate">{children}</span>
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX = /^[0-9+\-\s()]{8,20}$/;

function validateProfile(fullName: string, email: string, phone: string) {
  if (!fullName.trim()) return "Full name is required.";

  if (!email.trim()) return "Email address is required.";

  if (!EMAIL_REGEX.test(email.trim()))
    return "Please enter a valid email address.";

  if (phone && !PHONE_REGEX.test(phone))
    return "Please enter a valid phone number.";

  return "";
}

export default function UserProfile({ user }: UserProfileProps) {
  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState(user.fullName);

  const [email, setEmail] = useState(user.email);

  const [phone, setPhone] = useState(user.phone ?? "");

  const [saved, setSaved] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);

  const [error, setError] = useState("");

  const [phoneEditing, setPhoneEditing] = useState(false);

  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("unverified");

  const [pendingPhone, setPendingPhone] = useState("");

  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const [otp, setOtp] = useState("");

  const [otpError, setOtpError] = useState("");

  const [otpLoading, setOtpLoading] = useState(false);

  const [otpCountdown, setOtpCountdown] = useState(300);

  const [otpResendAvailable, setOtpResendAvailable] = useState(false);

  const [phoneRequestError, setPhoneRequestError] = useState("");

  const [confirmPhoneChangeOpen, setConfirmPhoneChangeOpen] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(60);

  const [resendLoading, setResendLoading] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);

  const [phoneProfile, setPhoneProfile] = useState<PhoneProfileData>({
    phoneNumber: null,

    phoneNumberVerifiedAt: null,

    pendingPhoneNumber: null,
  });

  const [showChangePassword, setShowChangePassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);

  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const primaryRole = user.roles[0]?.name ?? "Employee";

  const roleCode = user.roles[0]?.code ?? "USER";

  const initials = fullName

    .split(" ")

    .filter(Boolean)

    .slice(0, 2)

    .map((name) => name[0])

    .join("")

    .toUpperCase();

  const handleEdit = () => {
    setEditing(true);

    setSaved(false);

    setError("");
  };

  const handleCancel = () => {
    setFullName(user.fullName);

    setEmail(user.email);

    setPhone(phoneProfile.phoneNumber ?? user.phone ?? "");

    setEditing(false);

    setError("");

    setSaved(false);
  };

  const handleSave = async () => {
    const message = validateProfile(fullName, email, phone);
    setError(message);
    setSaved(false);
    if (message) return;

    const token = sessionStorage.getItem("edw_access_token");
    if (!token) {
      setError("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    try {
      setProfileSaving(true);
      const response = await UserProfileService.updateProfile(token, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setFullName(updatedUser.fullName ?? fullName.trim());
        setEmail(updatedUser.email ?? email.trim().toLowerCase());
      }
      setEditing(false);
      setError("");
      setSaved(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;
        setError(
          Array.isArray(apiMessage)
            ? apiMessage.join("\n")
            : (apiMessage ?? "Gagal menyimpan profil. Silakan coba kembali."),
        );
      } else {
        setError("Terjadi kesalahan saat menyimpan profil.");
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setPhoneRequestError("");

    setOtpError("");

    const accessToken = sessionStorage.getItem("edw_access_token");

    if (!accessToken) {
      setPhoneRequestError(
        "Session Anda tidak ditemukan. Silakan login kembali.",
      );

      return;
    }

    if (!phone.trim()) {
      setPhoneRequestError("Nomor WhatsApp tidak boleh kosong.");

      return;
    }

    setOtpLoading(true);

    try {
      await UserProfileService.updatePhoneNumber(accessToken, phone.trim());

      await UserProfileService.sendPhoneOtp(accessToken);

      setPendingPhone(phone.trim());

      setOtp("");

      setOtpError("");

      setOtpCountdown(300);

      setResendCountdown(60);

      setOtpResendAvailable(false);

      setPhoneEditing(false);

      setConfirmPhoneChangeOpen(false);

      setOtpModalOpen(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        const message = err.response?.data?.message;

        if (status === 401) {
          setPhoneRequestError(
            "Session Anda telah berakhir. Silakan login kembali.",
          );
        } else if (status === 429) {
          setPhoneRequestError(
            "Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba kembali.",
          );
        } else if (!err.response) {
          setPhoneRequestError(
            "Tidak dapat terhubung ke server EDW. Periksa koneksi internet Anda.",
          );
        } else {
          setPhoneRequestError(
            message || "Gagal memproses perubahan nomor WhatsApp.",
          );
        }
      } else {
        setPhoneRequestError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setOtpError("");

    const accessToken = sessionStorage.getItem("edw_access_token");

    if (!accessToken) {
      setOtpError("Session Anda tidak ditemukan. Silakan login kembali.");

      return;
    }

    if (otp.length !== 6) {
      setOtpError("Masukkan kode OTP 6 digit.");

      return;
    }

    setOtpLoading(true);

    try {
      await UserProfileService.verifyPhoneOtp(accessToken, otp);

      await fetchPhoneProfile();

      setOtp("");

      setOtpError("");

      setOtpModalOpen(false);

      setOtpCountdown(0);

      setOtpResendAvailable(false);

      setPhoneEditing(false);

      setSaved(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        const message = err.response?.data?.message;

        if (status === 401) {
          setOtpError("Session Anda telah berakhir. Silakan login kembali.");
        } else if (status === 429) {
          setOtpError(
            "Terlalu banyak percobaan. Silakan tunggu sebelum mencoba kembali.",
          );
        } else if (status === 400 || status === 422) {
          setOtpError(message || "Kode OTP salah atau sudah kedaluwarsa.");
        } else if (status === 404) {
          setOtpError(
            "Permintaan OTP tidak ditemukan. Silakan kirim OTP kembali.",
          );
        } else if (!err.response) {
          setOtpError(
            "Tidak dapat terhubung ke server EDW. Periksa koneksi internet Anda.",
          );
        } else {
          setOtpError(message || "Verifikasi nomor WhatsApp gagal.");
        }
      } else {
        setOtpError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    setOtpError("");

    const accessToken = sessionStorage.getItem("edw_access_token");

    if (!accessToken) {
      setOtpError("Session Anda tidak ditemukan. Silakan login kembali.");

      return;
    }

    if (!pendingPhone) {
      setOtpError("Nomor WhatsApp pending tidak ditemukan.");

      return;
    }

    if (resendCountdown > 0) {
      setOtpError(
        `Silakan tunggu ${resendCountdown} detik sebelum meminta OTP kembali.`,
      );

      return;
    }

    setResendLoading(true);

    try {
      await UserProfileService.sendPhoneOtp(accessToken);

      // Reset OTP input setelah OTP baru dikirim

      setOtp("");

      setOtpError("");

      // Reset timer OTP expiration

      setOtpCountdown(300);

      // Reset resend cooldown

      setResendCountdown(60);

      setOtpResendAvailable(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        const message = err.response?.data?.message;

        if (status === 401) {
          setOtpError("Session Anda telah berakhir. Silakan login kembali.");
        } else if (status === 429) {
          setOtpError(
            message ||
              "Anda terlalu sering meminta OTP. Silakan tunggu beberapa saat.",
          );
        } else if (!err.response) {
          setOtpError(
            "Tidak dapat terhubung ke server EDW. Periksa koneksi internet Anda.",
          );
        } else {
          setOtpError(message || "Gagal mengirim ulang OTP.");
        }
      } else {
        setOtpError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const editActions = !editing ? (
    <button type="button" onClick={handleEdit} className={btnPrimary}>
      <Pencil size={16} />
      Edit Profile
    </button>
  ) : (
    <div className="flex gap-2">
      <button type="button" onClick={handleCancel} className={btnSecondary}>
        <X size={16} />
        Cancel
      </button>

      <button
        type="button"
        onClick={handleSave}
        className={btnPrimary}
        disabled={profileSaving}
      >
        <Save size={16} />

        {profileSaving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const fetchPhoneProfile = useCallback(async () => {
    const token = sessionStorage.getItem("edw_access_token");

    if (!token) return;

    try {
      setProfileLoading(true);

      const response = await UserProfileService.getCurrentProfile(token);
      const profile = response.data.user;

      setPhoneProfile({
        phoneNumber: profile.phoneNumber ?? null,

        phoneNumberVerifiedAt: profile.phoneNumberVerifiedAt ?? null,

        pendingPhoneNumber: profile.pendingPhoneNumber ?? null,
      });

      setPhone(profile.phoneNumber ?? "");

      setPendingPhone(profile.pendingPhoneNumber ?? "");

      if (profile.phoneNumberVerifiedAt) {
        setPhoneStatus("verified");
      } else if (profile.pendingPhoneNumber) {
        setPhoneStatus("pending");
      } else {
        setPhoneStatus("unverified");
      }
    } catch (err) {
      console.error("Fetch phone profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhoneProfile();
  }, [fetchPhoneProfile]);

  useEffect(() => {
    if (!otpModalOpen || otpCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setOtpCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpModalOpen]);

  useEffect(() => {
    if (!otpModalOpen || resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          setOtpResendAvailable(true);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpModalOpen]);

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 12) {
      setPasswordError("Password minimal 12 karakter.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password harus mengandung minimal 1 huruf kapital.");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError("Password harus mengandung minimal 1 huruf kecil.");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Password harus mengandung minimal 1 angka.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordError("Password harus mengandung minimal 1 karakter spesial.");
      return;
    }

    const token = sessionStorage.getItem("edw_access_token");

    if (!token) {
      setPasswordError("Session login tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      setPasswordLoading(true);

      await UserProfileService.changePassword(token, {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Password berhasil diubah.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;

        setPasswordError(
          Array.isArray(apiMessage)
            ? apiMessage.join("\n")
            : apiMessage || "Gagal mengubah password.",
        );
      } else {
        setPasswordError("Terjadi kesalahan saat mengubah password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-edw-navy">
          My Profile
        </h1>

        <p className="mt-1.5 text-sm text-slate-500">
          Manage your personal information and account settings.
        </p>

        {profileLoading && (
          <p className="mt-2 text-xs text-slate-400">Loading profile data...</p>
        )}
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-edw-teal to-teal-700 sm:h-32">
          <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10" />

          <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-white/10" />

          <div className="absolute right-1/4 top-10 h-16 w-16 rounded-full bg-white/5" />
        </div>

        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-14 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative w-fit shrink-0">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-teal-50 text-3xl font-bold text-edw-teal shadow-lg">
                  {initials || <UserRound size={36} />}
                </div>

                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
              </div>

              <div className="min-w-0 sm:pb-0">
                <h2 className="truncate text-2xl font-bold text-edw-navy">
                  {fullName}
                </h2>

                <p className="mt-1 truncate text-sm text-slate-500">{email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:pb-2">
              <Badge icon={ShieldCheck}>{primaryRole}</Badge>

              <Badge icon={Building2}>
                {user.employeeNo || "Employee Account"}
              </Badge>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <BadgeCheck size={15} />
                Active Account
              </div>
            </div>
          </div>
        </div>
      </section>

      {saved && (
        <Notice tone="success" icon={BadgeCheck} role="status">
          Profile changes saved successfully.
        </Notice>
      )}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          icon={UserRound}
          title="Personal Information"
          description="Your personal account information."
          action={editActions}
        >
          {error && (
            <div className="mb-5">
              <Notice tone="error" icon={AlertCircle} role="alert">
                {error}
              </Notice>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <EditableField
              label="Full Name"
              value={fullName}
              icon={UserRound}
              editing={editing}
              onChange={setFullName}
              placeholder="Enter your full name"
            />

            <EditableField
              label="Email Address"
              value={email}
              icon={Mail}
              type="email"
              editing={editing}
              onChange={setEmail}
              placeholder="Enter your email"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={labelClass}>WhatsApp Number</p>

                {!phoneEditing && (
                  <button
                    type="button"
                    onClick={() => setPhoneEditing(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-edw-teal hover:opacity-80"
                  >
                    <Pencil size={14} />
                    Change
                  </button>
                )}
              </div>

              <div className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <IconChip icon={MessageCircle} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {phone || "Not provided"}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    {phoneStatus === "verified" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 size={13} />
                        Verified
                      </span>
                    )}

                    {phoneStatus === "unverified" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <AlertCircle size={13} />
                        Not verified
                      </span>
                    )}

                    {phoneStatus === "pending" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Clock size={13} />
                        Pending verification
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {phoneEditing && (
                <div className="space-y-3">
                  <div className="relative">
                    <Phone
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter new WhatsApp number"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-edw-teal focus:ring-4 focus:ring-teal-100"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhone(phoneProfile.phoneNumber ?? user.phone ?? "");

                        setPhoneEditing(false);
                      }}
                      className={btnSecondary}
                    >
                      <X size={16} />
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmPhoneChangeOpen(true);
                      }}
                      className={btnPrimary}
                    >
                      <Save size={16} />
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {confirmPhoneChangeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <MessageCircle size={24} />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Change WhatsApp Number?
                        </h3>

                        <p className="text-sm text-gray-500">
                          Confirm your new phone number
                        </p>
                      </div>
                    </div>

                    <div className="mb-5 rounded-xl bg-gray-50 p-4">
                      <p className="mb-1 text-sm text-gray-500">
                        New WhatsApp Number
                      </p>

                      <p className="font-semibold text-gray-900">{phone}</p>
                    </div>

                    <p className="mb-6 text-sm leading-relaxed text-gray-600">
                      Your new WhatsApp number will be used after verification.
                      Your current number will remain active until the new
                      number is successfully verified.
                    </p>

                    {phoneRequestError && (
                      <div
                        role="alert"
                        className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" />

                          <span>{phoneRequestError}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmPhoneChangeOpen(false);

                          setPhoneRequestError("");
                        }}
                        disabled={otpLoading}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={otpLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {otpLoading ? (
                          <>
                            <LoaderCircle size={16} className="animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>Confirm Change</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {otpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0F766E]">
                        <MessageCircle size={24} />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Verify WhatsApp Number
                        </h3>

                        <p className="text-sm text-gray-500">
                          Secure your account
                        </p>
                      </div>
                    </div>

                    <div className="mb-5 rounded-xl bg-gray-50 p-4">
                      <p className="mb-1 text-xs text-gray-500">OTP sent to</p>

                      <p className="font-semibold text-gray-900">
                        {pendingPhone}
                      </p>
                    </div>

                    <p className="mb-5 text-sm leading-relaxed text-gray-600">
                      Enter the 6-digit verification code sent to your WhatsApp
                      number to confirm this change.
                    </p>

                    {otpError && (
                      <div
                        role="alert"
                        className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      >
                        {otpError}
                      </div>
                    )}

                    <div className="mb-5">
                      <label
                        htmlFor="phone-verification-otp"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Verification Code
                      </label>

                      <input
                        id="phone-verification-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(event) => {
                          setOtp(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          );

                          setOtpError("");
                        }}
                        disabled={otpLoading}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-center text-2xl font-semibold tracking-[0.5em] text-gray-900 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
                      />

                      <p className="mt-2 text-xs text-gray-400">
                        OTP expires in 5 minutes. Never share this code with
                        anyone.
                      </p>
                    </div>

                    <div className="mb-5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock size={16} />

                        <span>Time remaining</span>
                      </div>

                      <span className="font-semibold text-[#0F766E]">
                        {formatCountdown(otpCountdown)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        otpLoading || otp.length !== 6 || otpCountdown === 0
                      }
                      onClick={handleVerifyPhoneOtp}
                      className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3 font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {otpLoading ? (
                        <>
                          <LoaderCircle size={18} className="animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify Number
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      {otpResendAvailable ? (
                        <button
                          type="button"
                          onClick={handleResendPhoneOtp}
                          disabled={resendLoading || otpLoading}
                          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0F766E] transition hover:text-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resendLoading ? (
                            <>
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                              />
                              Sending OTP...
                            </>
                          ) : (
                            "Resend OTP"
                          )}
                        </button>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Resend code in{" "}
                          <span className="font-semibold text-gray-700">
                            {resendCountdown}s
                          </span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpModalOpen(false);

                        setOtp("");

                        setOtpError("");
                      }}
                      className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <InfoField
              label="Employee ID"
              value={user.employeeNo || "Not assigned"}
              icon={BriefcaseBusiness}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={Building2}
          title="Organization Information"
          description="Organization data managed by administrator."
        >
          <div className="grid grid-cols-1 gap-5">
            <InfoField
              label="Department"
              value={user.department || "Not assigned"}
              icon={Building2}
            />
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          icon={ShieldCheck}
          title="Account & Access"
          description="Your access information. These settings cannot be changed here."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <InfoField
              label="Assigned Role"
              value={`${primaryRole} (${roleCode})`}
              icon={ShieldCheck}
            />

            <InfoField
              label="Account Status"
              value="Active"
              icon={BadgeCheck}
            />
          </div>

          <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <LockKeyhole size={18} className="mt-0.5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Protected Account Settings
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Role, permissions, department, and account status are managed by
                authorized administrators and cannot be modified from your
                personal profile.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={LockKeyhole}
          title="Security"
          description="Manage your account security."
        >
          <div className="flex h-full flex-col justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <KeyRound size={20} className="text-slate-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-edw-navy">Password</p>

                <p className="mt-1 text-xs text-slate-500">
                  Update your account password regularly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowChangePassword(true);
                setPasswordError("");
                setPasswordSuccess("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-edw-teal hover:bg-slate-50"
            >
              Change Password
            </button>
          </div>
        </SectionCard>
      </div>
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Change Password
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update your account password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error */}
            {passwordError && (
              <Notice tone="error" icon={AlertCircle} role="alert">
                {passwordError}
              </Notice>
            )}

            {/* Success */}
            {passwordSuccess && (
              <Notice tone="success" icon={CheckCircle2} role="status">
                {passwordSuccess}
              </Notice>
            )}

            <div className="mt-5 space-y-4">
              {/* Current Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Current Password
                </label>

                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  New Password
                </label>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Minimum 12 characters, including uppercase, lowercase, number,
                  and special character.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm New Password
                </label>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError("");
                  setPasswordSuccess("");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={passwordLoading}
                className={btnSecondary + " flex-1"}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className={btnPrimary + " flex-1"}
              >
                {passwordLoading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
