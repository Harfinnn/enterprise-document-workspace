
import { X, Pencil, Mail, Building2, ShieldCheck, CalendarDays, Hash, UserRound } from "lucide-react";
import type { ManagedUser } from "./user-management.types";

interface UserDetailProps {
  user: ManagedUser;
  onClose: () => void;
  onEdit: (user: ManagedUser) => void;
}

export default function UserDetail({
  user,
  onClose,
  onEdit,
}: UserDetailProps) {
  const roles = user.userRoles?.map((item) => item.role.name).join(", ");

  const department = user.department &&
    typeof user.department === "object" &&
    "name" in user.department
      ? String(user.department.name)
      : "-";

  const detailItems = [
    {
      label: "Full Name",
      value: user.fullName,
      icon: UserRound,
    },
    {
      label: "Email Address",
      value: user.email,
      icon: Mail,
    },
    {
      label: "Employee Number",
      value: user.employeeNo || "-",
      icon: Hash,
    },
    {
      label: "Department",
      value: department,
      icon: Building2,
    },
    {
      label: "Assigned Role",
      value: roles || "-",
      icon: ShieldCheck,
    },
    {
      label: "Registered At",
      value: new Date(user.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-edw-navy">
              User Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Information and account details
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-edw-teal/10 text-xl font-bold text-edw-teal">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-edw-navy">
                {user.fullName}
              </h3>
              <p className="truncate text-sm text-slate-500">
                {user.email}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detailItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <Icon size={15} />
                    <span className="text-xs font-medium">
                      {item.label}
                    </span>
                  </div>

                  <p className="break-words text-sm font-semibold text-edw-navy">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-400">
              Email Verification
            </p>
            <p className="mt-2 text-sm font-semibold text-edw-navy">
              {user.emailVerifiedAt
                ? `Verified on ${new Date(user.emailVerifiedAt).toLocaleDateString("id-ID")}`
                : "Not verified"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>

          <button
            onClick={() => onEdit(user)}
            className="flex items-center gap-2 rounded-xl bg-edw-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90"
          >
            <Pencil size={15} />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
}
