import {
  X,
  Pencil,
  Mail,
  Building2,
  ShieldCheck,
  CalendarDays,
  Hash,
  UserRound,
  Phone,
  ShieldAlert,
  ShieldOff,
  Shield,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

import type { ManagedUser } from "./user-management.types";

interface UserDetailProps {
  user: ManagedUser;
  onClose: () => void;
  onEdit: (user: ManagedUser) => void;
  onActivate: (user: ManagedUser) => Promise<void>;
  onDeactivate: (user: ManagedUser) => Promise<void>;
  onResendActivation: (user: ManagedUser) => Promise<void>;
}

export default function UserDetail({
  user,
  onClose,
  onEdit,
  onActivate,
  onDeactivate,
  onResendActivation,
}: UserDetailProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const roles = user.userRoles?.map((item) => item.role.name).join(", ");

  const isSuperAdmin = user.userRoles?.some(
    (item) => item.role.name === "IT_SUPERADMIN",
  );

  const isPending = !user.emailVerifiedAt;
  const isActive = Boolean(user.emailVerifiedAt && user.isActive);
  const isInactive = Boolean(user.emailVerifiedAt && !user.isActive);

  const department =
    user.department &&
    typeof user.department === "object" &&
    "name" in user.department
      ? String(user.department.name)
      : "-";

  const detailItems = [
    {
      label: "Full Name",
      value: user.fullName,
      icon: UserRound,
    },
    {
      label: "Email Address",
      value: user.email,
      icon: Mail,
    },
    {
      label: "WhatsApp Number",
      value: user.phoneNumber || "-",
      icon: Phone,
    },
    {
      label: "Employee Number",
      value: user.employeeNo || "-",
      icon: Hash,
    },
    {
      label: "Department",
      value: department,
      icon: Building2,
    },
    {
      label: "Assigned Role",
      value: roles || "-",
      icon: ShieldCheck,
    },
    {
      label: "Registered At",
      value: new Date(user.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      icon: CalendarDays,
    },
  ];

  const executeAction = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    if (actionLoading) return;

    setActionLoading(true);
    setActionFeedback(null);

    try {
      await action();

      setActionFeedback({
        type: "success",
        message: successMessage,
      });
    } catch {
      setActionFeedback({
        type: "error",
        message: "Action gagal dilakukan. Silakan coba kembali.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = () => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menonaktifkan akun ${user.fullName}?`,
    );

    if (!confirmed) return;

    void executeAction(
      () => onDeactivate(user),
      "Account berhasil dinonaktifkan.",
    );
  };

  const handleActivate = () => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin mengaktifkan akun ${user.fullName}?`,
    );

    if (!confirmed) return;

    void executeAction(() => onActivate(user), "Account berhasil diaktifkan.");
  };

  const handleResendActivation = () => {
    const confirmed = window.confirm(
      `Kirim ulang email aktivasi ke ${user.email}?`,
    );

    if (!confirmed) return;

    void executeAction(
      () => onResendActivation(user),
      "Email aktivasi berhasil dikirim ulang.",
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-edw-navy">User Details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Information and account details
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {/* User Header */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-edw-teal/10 text-xl font-bold text-edw-teal">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-edw-navy">
                {user.fullName}
              </h3>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                isPending
                  ? "bg-amber-50 text-amber-700"
                  : isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {isPending
                ? "Pending Activation"
                : isActive
                  ? "Active"
                  : "Inactive"}
            </span>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detailItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <Icon size={15} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>

                  <p className="break-words text-sm font-semibold text-edw-navy">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Email Verification */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-400">
              Email Verification
            </p>

            <p className="mt-2 text-sm font-semibold text-edw-navy">
              {user.emailVerifiedAt
                ? `Verified on ${new Date(
                    user.emailVerifiedAt,
                  ).toLocaleDateString("id-ID")}`
                : "Not verified"}
            </p>
          </div>

          {/* WhatsApp Verification */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-400">
              WhatsApp Verification
            </p>

            <p className="mt-2 text-sm font-semibold text-edw-navy">
              {user.phoneNumberVerifiedAt
                ? `Verified on ${new Date(
                    user.phoneNumberVerifiedAt,
                  ).toLocaleDateString("id-ID")}`
                : "Not verified"}
            </p>
          </div>

          {/* Account Actions */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Shield size={18} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-edw-navy">
                  Account Actions
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Manage account access and activation status.
                </p>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <ShieldAlert
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Protected Account
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Account IT Super Admin tidak dapat diubah melalui Account
                    Actions.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isActive && (
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <ShieldOff size={16} />
                    )}
                    Deactivate Account
                  </button>
                )}

                {isInactive && (
                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    Activate Account
                  </button>
                )}

                {isPending && (
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Mail size={16} />
                    )}
                    Resend Activation Email
                  </button>
                )}
              </>
            )}

            {/* Action Feedback */}
            {actionFeedback && (
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                  actionFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {actionFeedback.message}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => onEdit(user)}
            disabled={actionLoading || isSuperAdmin}
            className="flex items-center gap-2 rounded-xl bg-edw-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil size={15} />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
}
