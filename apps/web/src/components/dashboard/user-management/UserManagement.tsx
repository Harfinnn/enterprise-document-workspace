import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  RefreshCw,
  Users,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Mail,
  Building2,
} from "lucide-react";

import {
  getUsers,
  getUserDetail,
  getDepartments,
  getUserRoles,
  updateUserStatus,
  resendUserActivation,
  createUser,
} from "./user-management.service";

import type { CreateUserPayload } from "./user-management.service";

import UserDetail from "./UserDetail";

import UserEdit from "./UserEdit";

import UserCreate from "./UserCreate";

import type {
  ManagedUser,
  UserPaginationMeta,
  ManagedRole,
  ManagedDepartment,
} from "./user-management.types";

type StatusFilter = "ALL" | "ACTIVE" | "PENDING_ACTIVATION" | "INACTIVE";

const initialMeta: UserPaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [meta, setMeta] = useState<UserPaginationMeta>(initialMeta);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [departments, setDepartments] = useState<ManagedDepartment[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState("");
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    fullName: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const handleViewDetail = async (userId: string) => {
    setDetailLoading(true);
    setDetailError("");

    try {
      const response = await getUserDetail(userId);
      setSelectedUser(response.data);
    } catch {
      setDetailError("Gagal mengambil detail pengguna.");
    } finally {
      setDetailLoading(false);
    }
  };

  const requestId = useRef(0);

  const fetchUsers = useCallback(
    async (targetPage: number) => {
      const currentRequestId = ++requestId.current;

      setLoading(true);
      setError("");

      try {
        const response = await getUsers(
          targetPage,
          10,
          search,
          statusFilter === "ALL" ? undefined : statusFilter,
          {
            departmentId: departmentFilter || undefined,
            roleId: roleFilter || undefined,
          },
        );

        // Abaikan hasil request lama.
        if (currentRequestId !== requestId.current) return;

        setUsers(response.data);
        setMeta(response.meta);
      } catch {
        if (currentRequestId !== requestId.current) return;

        setError("Gagal mengambil data pengguna.");
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
        }
      }
    },
    [search, statusFilter, departmentFilter, roleFilter],
  );

  const refreshUserAfterAction = async (user: ManagedUser) => {
    // Refresh tabel
    await fetchUsers(meta.page);

    // Refresh detail user agar status terbaru tampil
    try {
      const response = await getUserDetail(user.id);
      setSelectedUser(response.data);
    } catch {
      setDetailError(
        "Aksi berhasil, tetapi gagal memperbarui detail pengguna.",
      );
    }
  };

  const handleActivateUser = async (user: ManagedUser) => {
    await updateUserStatus(user.id, true);
    await refreshUserAfterAction(user);
  };

  const handleDeactivateUser = async (user: ManagedUser) => {
    await updateUserStatus(user.id, false);
    await refreshUserAfterAction(user);
  };

  const handleResendActivation = async (user: ManagedUser) => {
    await resendUserActivation(user.id);
    await refreshUserAfterAction(user);
  };

  const handleCreateUser = async (payload: CreateUserPayload) => {
    setIsCreatingUser(true);
    setCreateUserError("");

    try {
      const response = await createUser(payload);
      const created = response.data;

      setCreatedUserCredentials({
        fullName: created.user.fullName,
        email: created.user.email,
        temporaryPassword: created.temporaryPassword,
      });

      setIsCreateUserOpen(false);
      await fetchUsers(1);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Gagal membuat pengguna. Periksa data dan coba kembali.";

      setCreateUserError(message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsers(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [departmentResponse, roleResponse] = await Promise.all([
          getDepartments(),
          getUserRoles(),
        ]);

        setDepartments(departmentResponse.data);
        setRoles(roleResponse.data);
      } catch (error) {
        console.error("Gagal mengambil opsi filter pengguna:", error);
      }
    };

    void loadFilterOptions();
  }, []);
  const formatDate = (value: string | null) => {
    if (!value) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const getDepartmentName = (user: ManagedUser) => {
    if (!user.department) return "-";

    const department = user.department;

    if ("name" in department && typeof department.name === "string") {
      return department.name;
    }

    return "-";
  };

  const getUserStatus = (user: ManagedUser) => {
    if (!user.emailVerifiedAt) {
      return {
        label: "Pending Activation",
        className: "bg-amber-50 text-amber-700",
        dotClassName: "bg-amber-500",
      };
    }

    if (user.isActive) {
      return {
        label: "Active",
        className: "bg-emerald-50 text-emerald-700",
        dotClassName: "bg-emerald-500",
      };
    }

    return {
      label: "Inactive",
      className: "bg-slate-100 text-slate-500",
      dotClassName: "bg-slate-400",
    };
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-edw-teal">Administration</p>

          <h1 className="mt-1 text-2xl font-bold text-edw-navy">
            User Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kelola akun pengguna dan akses workspace EDW.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateUserError("");
            setCreatedUserCredentials(null);
            setIsCreateUserOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-edw-teal/90"
        >
          <UserPlus size={18} />
          Add User
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Users</p>

              <p className="mt-2 text-2xl font-bold text-edw-navy">
                {meta.total}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-edw-cyan/40 text-edw-teal">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Users on This Page</p>

              <p className="mt-2 text-2xl font-bold text-edw-navy">
                {users.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-edw-cyan/40 text-edw-teal">
              <Users size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-edw-navy">All Users</h2>

            <p className="mt-1 text-xs text-slate-500">
              Daftar akun pengguna EDW.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, email, employee no..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-edw-teal sm:w-72"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              <option value="">All Departments</option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_ACTIVATION">Pending Activation</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <button
              type="button"
              onClick={() => void fetchUsers(meta.page)}
              disabled={loading}
              title="Refresh users"
              className="flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => void fetchUsers(meta.page)}
              className="mt-2 text-sm font-semibold text-red-700 underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-semibold">User</th>

                <th className="px-5 py-4 font-semibold">Employee No.</th>

                <th className="px-5 py-4 font-semibold">Department</th>

                <th className="px-5 py-4 font-semibold">Role</th>

                <th className="px-5 py-4 font-semibold">Status</th>

                <th className="px-5 py-4 font-semibold">Email Verification</th>

                <th className="px-5 py-4 font-semibold">Created At</th>

                <th className="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm text-slate-400"
                  >
                    <RefreshCw
                      size={22}
                      className="mx-auto mb-3 animate-spin text-edw-teal"
                    />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    Data belum dapat ditampilkan.
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <Users size={28} className="mx-auto mb-3 text-slate-300" />

                    <p className="text-sm font-semibold text-slate-600">
                      Tidak ada pengguna ditemukan
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Coba ubah kata kunci atau filter.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-edw-cyan/40 text-sm font-bold text-edw-teal">
                          {user.fullName
                            .split(" ")
                            .slice(0, 2)
                            .map((name) => name[0])
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-edw-navy">
                            {user.fullName}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Mail size={12} />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Employee Number */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {user.employeeNo || "-"}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 size={15} className="text-slate-400" />
                        {getDepartmentName(user)}
                      </div>
                    </td>

                    {/* Roles */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.userRoles.length > 0 ? (
                          user.userRoles.map(({ role }) => (
                            <span
                              key={role.id}
                              className="rounded-lg bg-edw-cyan/30 px-2.5 py-1 text-xs font-medium text-edw-teal"
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            No role
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="px-5 py-4">
                      {(() => {
                        const status = getUserStatus(user);

                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`}
                            />
                            {status.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Email Verification */}
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium ${
                          user.emailVerifiedAt
                            ? "text-emerald-700"
                            : "text-amber-600"
                        }`}
                      >
                        {user.emailVerifiedAt ? "Verified" : "Not Verified"}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void handleViewDetail(user.id)}
                        className="rounded-lg border border-edw-teal/20 px-3 py-2 text-xs font-semibold text-edw-teal transition hover:bg-edw-cyan/20"
                      >
                        View Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {detailLoading && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30">
              <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-edw-navy shadow-xl">
                Memuat detail pengguna...
              </div>
            </div>
          )}

          {detailError && (
            <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-red-200 bg-white px-5 py-4 text-sm font-medium text-red-600 shadow-xl">
              {detailError}
              <button
                type="button"
                onClick={() => setDetailError("")}
                className="ml-3 font-bold"
              >
                Tutup
              </button>
            </div>
          )}

          {selectedUser && (
            <UserDetail
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onEdit={(user) => {
                setSelectedUser(null);
                setEditingUser(user);
              }}
              onActivate={handleActivateUser}
              onDeactivate={handleDeactivateUser}
              onResendActivation={handleResendActivation}
            />
          )}

          {editingUser && (
            <UserEdit
              user={editingUser}
              onClose={() => setEditingUser(null)}
              onSuccess={() => {
                setEditingUser(null);
                void fetchUsers(meta.page);
              }}
            />
          )}

          {isCreateUserOpen && (
            <UserCreate
              departments={departments}
              roles={roles}
              loading={isCreatingUser}
              error={createUserError}
              onClose={() => {
                setIsCreateUserOpen(false);
                setCreateUserError("");
              }}
              onSubmit={handleCreateUser}
            />
          )}

          {createdUserCredentials && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    ✓
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-edw-navy">
                    User Berhasil Dibuat
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Akun berhasil dibuat. Simpan temporary password berikut dan
                    berikan kepada pengguna.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Full Name
                    </label>
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                      {createdUserCredentials.fullName}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Email
                    </label>
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {createdUserCredentials.email}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Temporary Password
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-mono text-sm font-semibold text-amber-800 break-all">
                        {createdUserCredentials.temporaryPassword}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            createdUserCredentials.temporaryPassword,
                          )
                        }
                        className="shrink-0 rounded-lg bg-edw-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-edw-teal/90"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Pengguna wajib mengganti password saat login pertama kali.
                    Jangan tutup dialog ini sebelum temporary password disimpan.
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setCreatedUserCredentials(null)}
                    className="rounded-xl bg-edw-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-navy/90"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Menampilkan{" "}
            {users.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0}
            {" - "}
            {Math.min(meta.page * meta.limit, meta.total)}
            {" dari "}
            {meta.total} pengguna
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || meta.page <= 1}
              onClick={() => void fetchUsers(meta.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span className="px-2 text-xs font-medium text-slate-600">
              {meta.page} / {Math.max(meta.totalPages, 1)}
            </span>

            <button
              type="button"
              disabled={
                loading || meta.page >= meta.totalPages || meta.totalPages === 0
              }
              onClick={() => void fetchUsers(meta.page + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
