import { useEffect, useState, type FormEvent } from "react";
import {
  X,
  Save,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Building2,
  Hash,
} from "lucide-react";

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

export default function UserEdit({ user, onClose, onSuccess }: UserEditProps) {
  const departmentId =
    user.department &&
    typeof user.department === "object" &&
    "id" in user.department
      ? String(user.department.id)
      : "";

  const [fullName, setFullName] = useState(user.fullName);
  const [employeeNo, setEmployeeNo] = useState(user.employeeNo || "");
  const [selectedDepartment, setSelectedDepartment] = useState(departmentId);

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-edw-navy">Edit User</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update user information and access roles.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* SCROLLABLE CONTENT */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <LoaderCircle
                  size={20}
                  className="animate-spin text-edw-teal"
                />
                Memuat data pengguna...
              </div>
            ) : (
              <>
                {/* BASIC INFORMATION */}
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-edw-navy">
                      Personal Information
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Informasi dasar dan kontak pengguna.
                    </p>
                  </div>

                  {/* FULL NAME */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <UserRound size={15} className="text-slate-400" />
                      Full Name
                    </label>

                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  {/* EMAIL AND WHATSAPP */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* EMAIL */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Mail size={15} className="text-slate-400" />
                        Email Address
                      </label>

                      <input
                        value={user.email}
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                      />

                      <p className="mt-1 text-xs text-slate-400">
                        Email tidak dapat diubah.
                      </p>
                    </div>

                    {/* WHATSAPP */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Phone size={15} className="text-slate-400" />
                        WhatsApp Number
                      </label>

                      <input
                        value={user.phoneNumber || ""}
                        disabled
                        placeholder="Belum tersedia"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                      />

                      <div className="mt-2 flex items-center gap-2">
                        {user.phoneNumberVerifiedAt ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-medium text-emerald-700">
                              WhatsApp Verified
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-medium text-amber-700">
                              Not Verified
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* EMPLOYEE INFORMATION */}
                <section className="space-y-4 border-t border-slate-100 pt-5">
                  <div>
                    <h3 className="text-sm font-bold text-edw-navy">
                      Organization Information
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Pengaturan identitas dan unit kerja pengguna.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* EMPLOYEE NUMBER */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Hash size={15} className="text-slate-400" />
                        Employee Number
                      </label>

                      <input
                        value={employeeNo}
                        onChange={(event) => setEmployeeNo(event.target.value)}
                        placeholder="Employee number"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                      />
                    </div>

                    {/* DEPARTMENT */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Building2 size={15} className="text-slate-400" />
                        Department
                      </label>

                      <select
                        value={selectedDepartment}
                        onChange={(event) =>
                          setSelectedDepartment(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                      >
                        <option value="">No Department</option>

                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* ROLE MANAGEMENT */}
                <section className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-edw-navy">
                        Access & Permissions
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Tentukan role dan hak akses pengguna.
                      </p>
                    </div>

                    <ShieldCheck size={20} className="text-edw-teal" />
                  </div>

                  <div className="space-y-1 rounded-xl border border-slate-200 p-3">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="h-4 w-4 accent-[#167D8D]"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-700">
                            {role.name}
                          </p>
                          <p className="text-xs text-slate-400">{role.code}</p>
                        </div>
                      </label>
                    ))}

                    {roles.length === 0 && (
                      <p className="p-3 text-sm text-slate-400">
                        Tidak ada role tersedia.
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Minimal satu role harus diberikan kepada pengguna.
                  </p>
                </section>
              </>
            )}

            {/* ERROR */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex shrink-0 justify-between border-t border-slate-100 bg-white px-6 py-4">
            <p className="hidden items-center text-xs text-slate-400 sm:flex">
              Changes will be applied to this user account.
            </p>

            <div className="flex w-full justify-end gap-3 sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || saving}
                className="flex items-center gap-2 rounded-xl bg-edw-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}

                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
