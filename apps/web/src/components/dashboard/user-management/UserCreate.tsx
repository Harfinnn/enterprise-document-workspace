
import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";

import type {
  ManagedDepartment,
  ManagedRole,
} from "./user-management.types";

import type { CreateUserPayload } from "./user-management.service";

interface UserCreateProps {
  departments: ManagedDepartment[];
  roles: ManagedRole[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
}

export default function UserCreate({
  departments,
  roles,
  loading,
  error,
  onClose,
  onSubmit,
}: UserCreateProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");

  const availableRoles = roles.filter(
    (role) => role.code !== "IT_SUPERADMIN",
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      employeeNo: employeeNo.trim() || undefined,
      departmentId,
      roleId,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-edw-cyan/40 text-edw-teal">
              <UserPlus size={21} />
            </div>

            <h2 className="mt-3 text-lg font-bold text-edw-navy">
              Add New User
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tambahkan pengguna baru ke workspace EDW.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              maxLength={150}
              placeholder="Enter full name"
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10 disabled:bg-slate-50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={255}
              placeholder="user@company.com"
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10 disabled:bg-slate-50"
            />
          </div>

          {/* Employee Number */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Employee Number
            </label>

            <input
              type="text"
              value={employeeNo}
              onChange={(event) => setEmployeeNo(event.target.value)}
              maxLength={50}
              placeholder="Enter employee number (optional)"
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10 disabled:bg-slate-50"
            />
          </div>

          {/* Department */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Department <span className="text-red-500">*</span>
            </label>

            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10 disabled:bg-slate-50"
            >
              <option value="">Select department</option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Role <span className="text-red-500">*</span>
            </label>

            <select
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10 disabled:bg-slate-50"
            >
              <option value="">Select role</option>

              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !fullName.trim() ||
                !email.trim() ||
                !departmentId ||
                !roleId
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
