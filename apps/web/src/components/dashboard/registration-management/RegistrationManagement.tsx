import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Inbox,
} from "lucide-react";

import registrationService from "./registration.service";
import RegistrationDetail from "./RegistrationDetail";

import type {
  RegistrationItem,
  RegistrationStatus,
} from "./registration.types";

const STATUS_OPTIONS: { label: string; value: RegistrationStatus | "ALL" }[] = [
  { label: "All registrations", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Expired", value: "EXPIRED" },
];

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  EXPIRED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    return error.message || "Failed to load registration data.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
};

export default function RegistrationManagement() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [status, setStatus] = useState<RegistrationStatus | "ALL">("PENDING");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRegistrationId, setSelectedRegistrationId] = useState<
    string | null
  >(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      const result = await registrationService.getRegistrations({
        status: status === "ALL" ? undefined : status,
        page,
        limit,
      });

      setRegistrations(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page, limit]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const result = await registrationService.getRegistrations({
          status: status === "ALL" ? undefined : status,
          page,
          limit,
        });

        if (cancelled) return;

        setRegistrations(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
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

    loadData();

    return () => {
      cancelled = true;
    };
  }, [status, page, limit]);

  const handleStatusChange = (newStatus: RegistrationStatus | "ALL") => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRegistrations();
    setRefreshing(false);
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage((current) => current + 1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  const getStatusLabel = (value: RegistrationStatus) => {
    return value.charAt(0) + value.slice(1).toLowerCase();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-edw-teal">
            Account Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-edw-navy">
            Registration Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review and manage incoming account registration requests.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-edw-teal">
            <Users size={22} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Registrations in current view
            </p>

            <h2 className="text-2xl font-bold text-edw-navy">
              {loading ? "—" : total.toLocaleString("id-ID")}
            </h2>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-edw-navy text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-edw-navy">Registration Requests</h2>

          <p className="mt-1 text-sm text-slate-500">
            Review submitted registration requests.
          </p>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <Inbox size={22} />
            </div>

            <h3 className="mt-3 font-semibold text-slate-800">
              Failed to load registrations
            </h3>

            <p className="mt-1 text-sm text-slate-500">{error}</p>

            <button
              onClick={fetchRegistrations}
              className="mt-4 rounded-xl bg-edw-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : registrations.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={24} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-800">
              No registration requests found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              There are no registrations matching the selected filter.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">Applicant</th>
                    <th className="px-5 py-4">Employee No.</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Submitted</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {registrations.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {item.fullName}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {item.email}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.employeeNo || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {item.requestedDepartment ? (
                          <div>
                            <div className="text-sm font-medium text-slate-700">
                              {item.requestedDepartment.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.requestedDepartment.code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not specified
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            STATUS_STYLES[item.status]
                          }`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedRegistrationId(item.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-edw-navy transition hover:border-edw-teal hover:bg-teal-50"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {total === 0 ? 0 : (page - 1) * limit + 1}
                </span>
                {" - "}
                <span className="font-medium text-slate-700">
                  {Math.min(page * limit, total)}
                </span>
                {" of "}
                <span className="font-medium text-slate-700">
                  {total.toLocaleString("id-ID")}
                </span>
                {" registrations"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="px-2 text-sm text-slate-500">
                  {page} / {Math.max(totalPages, 1)}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {selectedRegistrationId && (
        <RegistrationDetail
          registrationId={selectedRegistrationId}
          onClose={() => setSelectedRegistrationId(null)}
          onRefresh={fetchRegistrations}
        />
      )}
    </div>
  );
}
