import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Save,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string | null;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

interface PermissionMatrixProps {
  role: Role;
  onBack: () => void;
  onSaved: () => void;
}

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function PermissionMatrix({
  role,
  onBack,
  onSaved,
}: PermissionMatrixProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = sessionStorage.getItem("edw_access_token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [permissionResponse, rolePermissionResponse] = await Promise.all([
          fetch(`${API_URL}/access-control/permissions`, {
            headers,
          }),
          fetch(`${API_URL}/access-control/roles/${role.id}/permissions`, {
            headers,
          }),
        ]);

        if (!permissionResponse.ok || !rolePermissionResponse.ok) {
          throw new Error("Gagal memuat data permission.");
        }

        const permissionResult = await permissionResponse.json();
        const rolePermissionResult = await rolePermissionResponse.json();

        const permissionData = permissionResult.data ?? permissionResult;

        const rolePermissionData =
          rolePermissionResult.data ?? rolePermissionResult;

        const permissionList: Permission[] = Array.isArray(permissionData)
          ? permissionData
          : (permissionData.permissions ?? []);

        const assignedPermissions: Permission[] =
          rolePermissionData.permissions ?? [];

        if (!cancelled) {
          setPermissions(permissionList);
          setSelectedIds(assignedPermissions.map((item) => item.id));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat permission.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [role.id]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, item) => {
      if (!groups[item.module]) {
        groups[item.module] = [];
      }

      groups[item.module].push(item);
      return groups;
    }, {});
  }, [permissions]);

  const togglePermission = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleModule = (modulePermissions: Permission[]) => {
    const moduleIds = modulePermissions.map((item) => item.id);

    const allSelected = moduleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((previous) =>
      allSelected
        ? previous.filter((id) => !moduleIds.includes(id))
        : Array.from(new Set([...previous, ...moduleIds])),
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/access-control/roles/${role.id}/permissions`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            permissionIds: selectedIds,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan permission.");
      }

      setSuccess("Permission berhasil diperbarui.");
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan permission.",
      );
    } finally {
      setSaving(false);
    }
  };

  const totalSelected = selectedIds.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-edw-navy">{role.name}</h1>

              {role.isSystem ? (
                <span className="rounded-full bg-[#B9E4E8]/50 px-2.5 py-1 text-xs font-medium text-[#126979]">
                  System Role
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Custom Role
                </span>
              )}
            </div>

            <p className="mt-1 font-mono text-sm text-slate-400">{role.code}</p>

            <p className="mt-2 text-sm text-slate-500">
              Konfigurasi hak akses role berdasarkan module.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#167D8D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126979] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          Save Permissions
        </button>
      </div>

      {/* SUMMARY */}
      <div className="rounded-2xl border border-[#B9E4E8] bg-[#B9E4E8]/20 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#167D8D]" size={24} />

          <div>
            <p className="text-sm font-medium text-edw-navy">
              Permission Configuration
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {totalSelected} permission dipilih dari {permissions.length}{" "}
              permission tersedia.
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[#167D8D] transition-all"
            style={{
              width: `${permissions.length ? (totalSelected / permissions.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* ALERT */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <Check size={18} />
          {success}
        </div>
      )}

      {/* PERMISSION MODULES */}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Loading permissions...
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(
            ([module, modulePermissions]) => {
              const selectedCount = modulePermissions.filter((item) =>
                selectedIds.includes(item.id),
              ).length;

              const allSelected =
                modulePermissions.length > 0 &&
                selectedCount === modulePermissions.length;

              return (
                <div
                  key={module}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-edw-navy">
                        {module.replace(/_/g, " ")}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedCount} dari {modulePermissions.length}{" "}
                        permission aktif
                      </p>
                    </div>

                    <button
                      onClick={() => toggleModule(modulePermissions)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-[#167D8D] hover:text-[#167D8D]"
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modulePermissions.map((permission) => {
                      const checked = selectedIds.includes(permission.id);

                      return (
                        <label
                          key={permission.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            checked
                              ? "border-[#167D8D]/30 bg-[#B9E4E8]/20"
                              : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(permission.id)}
                            className="mt-0.5 h-4 w-4 accent-[#167D8D]"
                          />

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700">
                              {permission.name}
                            </p>

                            <p className="mt-1 break-all font-mono text-xs text-slate-400">
                              {permission.code}
                            </p>

                            {permission.description && (
                              <p className="mt-1 text-xs text-slate-500">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Back to Role List
        </button>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#167D8D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126979] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          Save Permissions ({totalSelected})
        </button>
      </div>
    </div>
  );
}
