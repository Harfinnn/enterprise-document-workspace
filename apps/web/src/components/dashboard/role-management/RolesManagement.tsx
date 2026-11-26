import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Plus,
  Search,
  Users,
  KeyRound,
  Loader2,
  X,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";

import PermissionMatrix from "./PermissionMatrix";

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const token = sessionStorage.getItem("edw_access_token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/access-control/roles`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data role.");
      }

      const result = await response.json();

      setRoles(result.data ?? result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageRole = (role: Role) => {
    setSelectedRole(role);
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialRoles = async () => {
      try {
        const response = await fetch(`${API_URL}/access-control/roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil data role.");
        }

        const result = await response.json();

        if (!cancelled) {
          setRoles(result.data ?? result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialRoles();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRoles = roles.filter((role) => {
    const keyword = search.toLowerCase();

    return (
      role.name.toLowerCase().includes(keyword) ||
      role.code.toLowerCase().includes(keyword) ||
      role.description?.toLowerCase().includes(keyword)
    );
  });

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        code: form.code.toUpperCase().replace(/\s+/g, "_"),
        name: form.name,
        description: form.description,
      };

      const isEditing = Boolean(editingRole);

      const response = await fetch(
        isEditing
          ? `${API_URL}/access-control/roles/${editingRole!.id}`
          : `${API_URL}/access-control/roles`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            (isEditing ? "Gagal memperbarui role." : "Gagal membuat role."),
        );
      }

      setModalOpen(false);
      setEditingRole(null);
      setForm({
        code: "",
        name: "",
        description: "",
      });

      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const systemRoles = roles.filter((role) => role.isSystem).length;
  const customRoles = roles.filter((role) => !role.isSystem).length;

  const handleEditRole = (role: Role) => {
    if (role.isSystem) return;

    setEditingRole(role);

    setForm({
      code: role.code,
      name: role.name,
      description: role.description || "",
    });

    setError("");
    setModalOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      setError("System Role tidak dapat dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus role "${role.name}"? Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/access-control/roles/${role.id}`,
        {
          method: "DELETE",
          headers,
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus role.");
      }

      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus role.");
    }
  };

  if (selectedRole) {
    return (
      <PermissionMatrix
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
        onSaved={fetchRoles}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-edw-navy">
            Role & Permission
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola role pengguna dan hak akses sistem EDW.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRole(null);
            setForm({
              code: "",
              name: "",
              description: "",
            });
            setError("");
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#167D8D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126979]"
        >
          <Plus size={18} />
          Create Role
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Roles</p>
              <p className="mt-2 text-3xl font-bold text-edw-navy">
                {roles.length}
              </p>
            </div>

            <div className="rounded-xl bg-[#B9E4E8]/40 p-3 text-[#167D8D]">
              <ShieldCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">System Roles</p>
              <p className="mt-2 text-3xl font-bold text-edw-navy">
                {systemRoles}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
              <KeyRound size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Custom Roles</p>
              <p className="mt-2 text-3xl font-bold text-edw-navy">
                {customRoles}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Users size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ROLE TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-edw-navy">Role List</h2>
            <p className="mt-1 text-xs text-slate-500">
              Daftar role dan konfigurasi hak akses.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#167D8D] focus:ring-2 focus:ring-[#167D8D]/10"
              />
            </div>

            <button
              onClick={fetchRoles}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Loading roles...
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck className="mx-auto mb-3 text-slate-300" size={36} />
            <p className="font-medium text-slate-600">Role tidak ditemukan</p>
            <p className="mt-1 text-sm text-slate-400">
              Coba kata kunci pencarian lain.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Users
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Permissions
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-edw-navy">
                        {role.name}
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-400">
                        {role.code}
                      </div>
                      {role.description && (
                        <p className="mt-1 max-w-md text-xs text-slate-500">
                          {role.description}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {role.isSystem ? (
                        <span className="rounded-full bg-[#B9E4E8]/50 px-3 py-1 text-xs font-medium text-[#126979]">
                          System Role
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Custom Role
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <Users size={15} />
                        {role.userCount}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <KeyRound size={15} />
                        {role.permissionCount}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleManageRole(role)}
                          title="Manage Permissions"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-[#167D8D] transition hover:bg-[#B9E4E8]/30"
                        >
                          Manage
                        </button>

                        {!role.isSystem && (
                          <>
                            <button
                              onClick={() => handleEditRole(role)}
                              title="Edit Role"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => handleDeleteRole(role)}
                              title="Delete Role"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Showing {filteredRoles.length} of {roles.length} roles
        </div>
      </div>

      {/* CREATE ROLE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-edw-navy">
                  {editingRole ? "Edit Custom Role" : "Create Custom Role"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buat role baru untuk kebutuhan organisasi.
                </p>
              </div>

              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditingRole(null);
                  setError("");
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Role Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Document Reviewer"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#167D8D] focus:ring-2 focus:ring-[#167D8D]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Role Code
                </label>
                <input
                  required
                  disabled={Boolean(editingRole)}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. DOCUMENT_REVIEWER"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#167D8D] focus:ring-2 focus:ring-[#167D8D]/10"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Kode akan otomatis diubah menjadi uppercase dan underscore.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Deskripsi role..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#167D8D] focus:ring-2 focus:ring-[#167D8D]/10"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingRole(null);
                    setError("");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#167D8D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126979] disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
