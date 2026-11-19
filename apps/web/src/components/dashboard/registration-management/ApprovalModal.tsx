
import { useEffect, useState } from "react";
import { X, LoaderCircle, ShieldCheck, AlertCircle } from "lucide-react";

import {
  getDepartments,
  getUserRoles,
} from "../user-management/user-management.service";

import type {
  ManagedDepartment,
  ManagedRole,
} from "../user-management/user-management.types";

import { registrationService } from "./registration.service";

interface ApprovalModalProps {
  registrationId: string;
  applicantName: string;
  applicantEmail: string;
  onClose: () => void;
  onSuccess: (emailSent: boolean) => void;
}

const ALLOWED_ROLE_CODES = [
  "USER",
  "DOCUMENT_CONTROL",
  "MANAGEMENT",
  "DEPARTMENT_HEAD",
];

export default function ApprovalModal({
  registrationId,
  applicantName,
  applicantEmail,
  onClose,
  onSuccess,
}: ApprovalModalProps) {
  const [departments, setDepartments] = useState<ManagedDepartment[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingData(true);
        setError(null);

        const [departmentResponse, roleResponse] = await Promise.all([
          getDepartments(),
          getUserRoles(),
        ]);

        if (cancelled) return;

        const filteredRoles = roleResponse.data.filter((role) =>
          ALLOWED_ROLE_CODES.includes(role.code),
        );

        setDepartments(departmentResponse.data);
        setRoles(filteredRoles);
      } catch {
        if (!cancelled) {
          setError("Gagal mengambil data department dan role.");
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleApprove = async () => {
    if (!departmentId || !roleId) {
      setError("Department dan role wajib dipilih.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await registrationService.approveRegistration(
        registrationId,
        {
          departmentId,
          roleId,
        },
      );

      onSuccess(result.data.activationEmailSent);
    } catch {
      setError("Approval gagal diproses. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-edw-navy">
              Approve Registration
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Assign department dan role pengguna
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Applicant */}
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Applicant
            </p>

            <p className="mt-2 font-semibold text-edw-navy">
              {applicantName}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {applicantEmail}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5 px-6 py-5">
          {loadingData ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <LoaderCircle size={20} className="animate-spin" />
              <span className="text-sm">Loading department & role...</span>
            </div>
          ) : (
            <>
              {/* Department */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Department <span className="text-red-500">*</span>
                </label>

                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select department</option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code
                        ? `${department.code} - ${department.name}`
                        : department.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role <span className="text-red-500">*</span>
                </label>

                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select role</option>

                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-amber-600" />

            <p className="text-xs leading-relaxed text-amber-800">
              Account will be created in inactive status. The applicant must
              complete email activation before logging in.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={loadingData || submitting || !departmentId || !roleId}
            className="inline-flex items-center gap-2 rounded-xl bg-edw-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Approve Registration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
