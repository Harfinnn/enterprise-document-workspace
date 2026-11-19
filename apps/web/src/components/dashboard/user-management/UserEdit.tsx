
import { useEffect, useState, type FormEvent } from "react";
import { X, Save, LoaderCircle } from "lucide-react";

import {
  getUserRoles,
  getDepartments,
  updateUser,
  updateUserRoles,
} from "./user-management.service";

import type {
  ManagedUser,
  ManagedRole,
  ManagedDepartment,
} from "./user-management.types";

interface UserEditProps {
  user: ManagedUser;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserEdit({
  user,
  onClose,
  onSuccess,
}: UserEditProps) {
  const departmentId =
    user.department &&
    typeof user.department === "object" &&
    "id" in user.department
      ? String(user.department.id)
      : "";

  const [fullName, setFullName] = useState(user.fullName);
  const [employeeNo, setEmployeeNo] = useState(user.employeeNo || "");
  const [selectedDepartment, setSelectedDepartment] =
    useState(departmentId);

  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [departments, setDepartments] = useState<ManagedDepartment[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user.userRoles.map((item) => item.role.id),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const [roleResponse, departmentResponse] = await Promise.all([
          getUserRoles(),
          getDepartments(),
        ]);

        if (cancelled) return;

        setRoles(roleResponse.data);
        setDepartments(departmentResponse.data);
      } catch {
        if (!cancelled) {
          setError("Gagal mengambil data role dan department.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    if (selectedRoles.length === 0) {
      setError("Minimal satu role harus dipilih.");
      return;
    }

    setSaving(true);

    try {
      await updateUser(user.id, {
        fullName: fullName.trim(),
        employeeNo: employeeNo.trim() || null,
        departmentId: selectedDepartment || null,
      });

      await updateUserRoles(user.id, selectedRoles);

      onSuccess();
    } catch {
      setError("Gagal menyimpan perubahan pengguna.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-edw-navy">
              Edit User
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update user information and access roles.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" />
              Memuat data...
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-edw-teal"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  value={user.email}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Email tidak dapat diubah melalui menu ini.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Employee Number
                </label>
                <input
                  value={employeeNo}
                  onChange={(event) => setEmployeeNo(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-edw-teal"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(event) =>
                    setSelectedDepartment(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-edw-teal"
                >
                  <option value="">No Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Assigned Roles
                </label>

                <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 accent-[#167D8D]"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {role.name}
                      </span>
                    </label>
                  ))}

                  {roles.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Tidak ada role tersedia.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || saving}
              className="flex items-center gap-2 rounded-xl bg-edw-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-edw-teal/90 disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
