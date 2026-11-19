import { useCallback, useEffect, useMemo, useState } from "react";
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

import { getUsers, getUserDetail } from "./user-management.service";

import UserDetail from "./UserDetail";

import UserEdit from "./UserEdit";

import type { ManagedUser, UserPaginationMeta } from "./user-management.types";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

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

  const fetchUsers = useCallback(async (targetPage: number) => {
    try {
      const response = await getUsers(targetPage, 10);

      setUsers(response.data);
      setMeta(response.meta);
      setError("");
    } catch {
      setError("Gagal mengambil data pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const response = await getUsers(1, 10);

        if (cancelled) return;

        setUsers(response.data);
        setMeta(response.meta);
        setError("");
      } catch {
        if (!cancelled) {
          setError("Gagal mengambil data pengguna.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        user.fullName.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        (user.employeeNo || "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

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
          disabled
          title="Fitur tambah pengguna akan diimplementasikan berikutnya"
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-3 text-sm font-semibold text-white opacity-60"
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
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
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
              ) : filteredUsers.length === 0 ? (
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
                filteredUsers.map((user) => (
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
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />

                        {user.isActive ? "Active" : "Inactive"}
                      </span>
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
