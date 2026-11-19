import { useEffect, useState } from "react";
import {
  X,
  User,
  Mail,
  Building2,
  Calendar,
  ShieldCheck,
  Clock,
  FileText,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import axios from "axios";

import registrationService from "./registration.service";
import ApprovalModal from "./ApprovalModal";

import type {
  RegistrationDetail as RegistrationDetailType,
  RegistrationStatus,
} from "./registration.types";

interface RegistrationDetailProps {
  registrationId: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  EXPIRED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");

    return error.message;
  }

  if (error instanceof Error) return error.message;

  return "Failed to load registration detail.";
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value?: string | null;
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon size={16} />
    </div>

    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  </div>
);

export default function RegistrationDetail({
  registrationId,
  onClose,
  onRefresh,
}: RegistrationDetailProps) {
  const [registration, setRegistration] =
    useState<RegistrationDetailType | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      try {
        const response =
          await registrationService.getRegistrationById(registrationId);

        if (cancelled) return;

        setRegistration(response.data);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;

        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  const getStatusLabel = (status: RegistrationStatus) =>
    status.charAt(0) + status.slice(1).toLowerCase();

  const handleApprovalSuccess = async (emailSent: boolean) => {
    setShowApprovalModal(false);

    window.alert(
      emailSent
        ? "Registration approved successfully. Activation email has been sent."
        : "Registration approved successfully, but activation email failed to send.",
    );

    await onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-edw-teal">
              Account Administration
            </p>

            <h2 className="mt-1 text-xl font-bold text-edw-navy">
              Registration Detail
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Applicant information and registration status
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LoaderCircle size={32} className="animate-spin text-edw-teal" />

              <p className="mt-4 text-sm text-slate-500">
                Loading registration detail...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <AlertCircle size={22} />
              </div>

              <h3 className="mt-3 font-semibold text-slate-800">
                Failed to load detail
              </h3>

              <p className="mt-2 text-sm text-slate-500">{error}</p>
            </div>
          ) : registration ? (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-400">Registration Status</p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      STATUS_STYLES[registration.status]
                    }`}
                  >
                    {getStatusLabel(registration.status)}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Registration ID</p>
                  <p className="mt-1 max-w-[220px] break-all text-xs font-medium text-slate-600">
                    {registration.id}
                  </p>
                </div>
              </div>

              {/* Applicant */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-edw-navy">
                  <User size={17} className="text-edw-teal" />
                  Applicant Information
                </h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InfoItem
                    icon={User}
                    label="Full Name"
                    value={registration.fullName}
                  />

                  <InfoItem
                    icon={Mail}
                    label="Email Address"
                    value={registration.email}
                  />

                  <InfoItem
                    icon={FileText}
                    label="Employee Number"
                    value={registration.employeeNo}
                  />

                  <InfoItem
                    icon={Building2}
                    label="Requested Department"
                    value={
                      registration.requestedDepartment
                        ? `${registration.requestedDepartment.name} (${registration.requestedDepartment.code})`
                        : "Not specified"
                    }
                  />
                </div>
              </section>

              {/* Registration */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-edw-navy">
                  <Calendar size={17} className="text-edw-teal" />
                  Registration Information
                </h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InfoItem
                    icon={Clock}
                    label="Submitted At"
                    value={formatDate(registration.createdAt)}
                  />

                  <InfoItem
                    icon={Clock}
                    label="Last Updated"
                    value={formatDate(registration.updatedAt)}
                  />
                </div>
              </section>

              {/* Review */}
              {(registration.reviewedBy || registration.reviewedAt) && (
                <section>
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-edw-navy">
                    <ShieldCheck size={17} className="text-edw-teal" />
                    Review Information
                  </h3>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <InfoItem
                      icon={User}
                      label="Reviewed By"
                      value={registration.reviewedBy?.fullName}
                    />

                    <InfoItem
                      icon={Calendar}
                      label="Reviewed At"
                      value={formatDate(registration.reviewedAt)}
                    />
                  </div>
                </section>
              )}

              {/* Rejection */}
              {registration.status === "REJECTED" &&
                registration.rejectionReason && (
                  <section>
                    <h3 className="mb-3 font-semibold text-red-700">
                      Rejection Reason
                    </h3>

                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-red-700">
                        {registration.rejectionReason}
                      </p>
                    </div>
                  </section>
                )}

              {/* Created account */}
              {registration.createdUser && (
                <section>
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-edw-navy">
                    <ShieldCheck size={17} className="text-edw-teal" />
                    Created Account
                  </h3>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800">
                          {registration.createdUser.fullName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {registration.createdUser.email}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          registration.createdUser.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {registration.createdUser.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-slate-200 px-6 py-4">
          <div>
            {registration?.status === "PENDING" && !loading && !error && (
              <button
                onClick={() => setShowApprovalModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <ShieldCheck size={16} />
                Approve Registration
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
      {showApprovalModal && registration && (
        <ApprovalModal
          registrationId={registration.id}
          applicantName={registration.fullName}
          applicantEmail={registration.email}
          onClose={() => setShowApprovalModal(false)}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  );
}
