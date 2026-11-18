import { useState, type FormEvent, type ReactNode } from "react";
import axios from "axios";
import {
  FileText,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  Files,
  Cloud,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import DashboardLayout from "./components/DashboardLayout";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

interface LoginResponse {
  message: string;
  user: {
    id: string;
    employeeNo?: string | null;
    fullName: string;
    email: string;
    departmentId?: string | null;
    roles: {
      code: string;
      name: string;
    }[];
  };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshTokenExpiresAt: string;
}

function App() {
  const [email, setEmail] = useState(
    localStorage.getItem("edw_remembered_email") || "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem("edw_remembered_email")),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  // REGISTER
  const [registerMode, setRegisterMode] = useState(false);
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerEmployeeNo, setRegisterEmployeeNo] = useState("");

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(email);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [resetMode, setResetMode] = useState(
    window.location.pathname === "/reset-password",
  );

  const [resetToken] = useState(
    new URLSearchParams(window.location.search).get("token") || "",
  );

  const [activationMode] = useState(
    window.location.pathname === "/activate-account",
  );

  const [activationToken] = useState(
    new URLSearchParams(window.location.search).get("token") || "",
  );

  const [activationPassword, setActivationPassword] = useState("");
  const [confirmActivationPassword, setConfirmActivationPassword] =
    useState("");
  const [showActivationPassword, setShowActivationPassword] = useState(false);
  const [showConfirmActivationPassword, setShowConfirmActivationPassword] =
    useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationSuccess, setActivationSuccess] = useState(false);

  const [dashboardUser, setDashboardUser] = useState<
    LoginResponse["user"] | null
  >(() => {
    const storedUser = sessionStorage.getItem("edw_user");

    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as LoginResponse["user"];
    } catch {
      sessionStorage.removeItem("edw_user");
      return null;
    }
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setShowForgotInfo(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/auth/login`,
        {
          email: normalizedEmail,
          password,
        },
      );

      const data = response.data;

      const isSuperAdmin = data.user.roles.some(
        (role) => role.code === "IT_SUPERADMIN",
      );

      if (!isSuperAdmin) {
        setError(
          "Dashboard untuk role Anda belum tersedia. Silakan hubungi administrator IT.",
        );
        return;
      }

      // Simpan token selama sesi browser berlangsung.
      // Untuk produksi, HttpOnly Secure Cookie lebih disarankan.
      sessionStorage.setItem("edw_access_token", data.accessToken);
      sessionStorage.setItem("edw_refresh_token", data.refreshToken);
      sessionStorage.setItem("edw_user", JSON.stringify(data.user));
      setDashboardUser(data.user);

      if (rememberMe) {
        localStorage.setItem("edw_remembered_email", normalizedEmail);
      } else {
        localStorage.removeItem("edw_remembered_email");
      }

      setPassword("");
      setSuccess(`Selamat datang, ${data.user.fullName}. Login berhasil.`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 401) {
          setError(
            "Email atau password tidak valid. Periksa kembali kredensial Anda.",
          );
        } else if (status === 429) {
          setError(
            "Terlalu banyak percobaan login. Silakan coba kembali beberapa saat lagi.",
          );
        } else if (!err.response) {
          setError(
            "Tidak dapat terhubung ke server EDW. Pastikan backend sedang berjalan.",
          );
        } else {
          setError(
            err.response.data?.message ||
              "Terjadi kesalahan. Silakan coba kembali.",
          );
        }
      } else {
        setError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setRegisterError("");
    setRegisterSuccess(false);

    const payload = {
      fullName: registerFullName.trim(),
      email: registerEmail.trim().toLowerCase(),
      employeeNo: registerEmployeeNo.trim(),
    };

    if (!payload.fullName || !payload.email || !payload.employeeNo) {
      setRegisterError("Semua field wajib diisi.");
      return;
    }

    setRegisterLoading(true);

    try {
      await axios.post(`${API_URL}/registration`, payload);

      setRegisterSuccess(true);

      setRegisterFullName("");
      setRegisterEmail("");
      setRegisterEmployeeNo("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = err.response?.data?.message;

        if (status === 409) {
          setRegisterError(
            message || "Email atau nomor pegawai sudah terdaftar.",
          );
        } else if (status === 400) {
          setRegisterError(message || "Data registrasi tidak valid.");
        } else if (status === 429) {
          setRegisterError(
            "Terlalu banyak permintaan. Silakan coba kembali nanti.",
          );
        } else if (!err.response) {
          setRegisterError("Tidak dapat terhubung ke server EDW.");
        } else {
          setRegisterError(message || "Registrasi gagal diproses.");
        }
      } else {
        setRegisterError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = async () => {
    const accessToken = sessionStorage.getItem("edw_access_token");
    const refreshToken = sessionStorage.getItem("edw_refresh_token");

    try {
      if (refreshToken) {
        await axios.post(
          `${API_URL}/auth/logout`,
          { refreshToken },
          {
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {},
          },
        );
      }
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      sessionStorage.removeItem("edw_access_token");
      sessionStorage.removeItem("edw_refresh_token");
      sessionStorage.removeItem("edw_user");

      setDashboardUser(null);
      setPassword("");
      setSuccess("");
      setError("");
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setForgotError("");
    setForgotSuccess(false);

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setForgotError("Email wajib diisi.");
      return;
    }

    setForgotLoading(true);

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, {
        email: normalizedEmail,
      });

      setForgotSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 429) {
          setForgotError(
            "Terlalu banyak permintaan. Silakan coba kembali beberapa saat lagi.",
          );
        } else if (!err.response) {
          setForgotError("Tidak dapat terhubung ke server EDW.");
        } else {
          setForgotError(
            err.response.data?.message ||
              "Permintaan gagal diproses. Silakan coba kembali.",
          );
        }
      } else {
        setForgotError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setResetError("");
    setResetSuccess(false);

    if (!resetToken) {
      setResetError("Token reset password tidak ditemukan.");
      return;
    }

    if (newPassword.length < 12) {
      setResetError("Password minimal harus 12 karakter.");
      return;
    }

    if (newPassword.length > 128) {
      setResetError("Password maksimal 128 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Konfirmasi password tidak sesuai.");
      return;
    }

    setResetLoading(true);

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token: resetToken,
        newPassword,
      });

      setResetSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 400 || status === 401) {
          setResetError(
            "Token tidak valid, sudah digunakan, atau telah kedaluwarsa. Silakan ajukan reset password kembali.",
          );
        } else if (status === 429) {
          setResetError(
            "Terlalu banyak percobaan. Silakan coba kembali nanti.",
          );
        } else if (!err.response) {
          setResetError("Tidak dapat terhubung ke server EDW.");
        } else {
          setResetError(
            err.response.data?.message ||
              "Reset password gagal. Silakan coba kembali.",
          );
        }
      } else {
        setResetError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleActivateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setActivationError("");
    setActivationSuccess(false);

    if (!activationToken) {
      setActivationError("Token aktivasi tidak ditemukan.");
      return;
    }

    if (activationPassword.length < 12) {
      setActivationError("Password minimal harus 12 karakter.");
      return;
    }

    if (activationPassword.length > 128) {
      setActivationError("Password maksimal 128 karakter.");
      return;
    }

    if (activationPassword !== confirmActivationPassword) {
      setActivationError("Konfirmasi password tidak sesuai.");
      return;
    }

    setActivationLoading(true);

    try {
      await axios.post(`${API_URL}/auth/activate-account`, {
        token: activationToken,
        newPassword: activationPassword,
      });

      setActivationSuccess(true);
      setActivationPassword("");
      setConfirmActivationPassword("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 400 || status === 401) {
          setActivationError(
            "Token aktivasi tidak valid, sudah digunakan, atau telah kedaluwarsa. Hubungi administrator IT untuk meminta link aktivasi baru.",
          );
        } else if (status === 429) {
          setActivationError(
            "Terlalu banyak percobaan. Silakan coba kembali nanti.",
          );
        } else if (!err.response) {
          setActivationError("Tidak dapat terhubung ke server EDW.");
        } else {
          setActivationError(
            err.response.data?.message ||
              "Aktivasi akun gagal. Silakan coba kembali.",
          );
        }
      } else {
        setActivationError("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setActivationLoading(false);
    }
  };

  if (dashboardUser && !activationMode && !resetMode && !forgotMode) {
    return <DashboardLayout user={dashboardUser} onLogout={handleLogout} />;
  }
  return (
    <main className="h-dvh w-full overflow-hidden bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* LEFT PANEL */}
      <section className="relative hidden min-h-screen overflow-hidden bg-edw-navy px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-20 top-40 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-edw-teal/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="edw-logo-float relative">
            {/* Ring pulse */}
            <span
              aria-hidden="true"
              className="edw-logo-ring pointer-events-none absolute inset-0 rounded-xl bg-edw-teal"
            />
            <span
              aria-hidden="true"
              className="edw-logo-ring edw-logo-ring-delay pointer-events-none absolute inset-0 rounded-xl bg-edw-teal"
            />

            {/* Kotak logo */}
            <div className="edw-logo-box relative overflow-hidden rounded-xl bg-edw-teal p-3">
              <FileText
                size={28}
                strokeWidth={2}
                className="edw-logo-icon relative z-10"
              />

              {/* Kilau cahaya */}
              <span
                aria-hidden="true"
                className="edw-logo-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
            </div>
          </div>

          <div>
            <h1 className="edw-logo-text text-2xl font-bold tracking-wider">
              EDW
            </h1>
            <p className="edw-logo-text-sub text-xs tracking-wide text-edw-cyan">
              ENTERPRISE DOCUMENT WORKSPACE
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-edw-cyan/20 bg-white/5 px-4 py-2 text-xs text-edw-cyan">
            <span className="h-2 w-2 rounded-full bg-edw-teal" />
            Enterprise Document Management
          </div>

          <h2 className="text-5xl font-bold leading-tight xl:text-6xl">
            Your documents.
            <br />
            <span className="text-edw-cyan">One workspace.</span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
            Satu platform terintegrasi untuk mengelola, membuat, mengonversi,
            dan berkolaborasi pada dokumen perusahaan dengan aman.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4">
            <Feature
              icon={<Files size={20} />}
              title="Manage"
              description="Document control"
            />
            <Feature
              icon={<Cloud size={20} />}
              title="Collaborate"
              description="Work together"
            />
            <Feature
              icon={<ShieldCheck size={20} />}
              title="Secure"
              description="Enterprise security"
            />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
          <span>© 2026 Enterprise Document Workspace</span>
          <span>Manage. Convert. Create. Collaborate. Secure.</span>
        </div>
      </section>

      {/* RIGHT PANEL */}
      <section className="flex h-dvh items-center justify-center overflow-hidden px-6 py-4 sm:px-10 lg:px-14 xl:px-24">
        <div className="w-full max-w-md">
          {activationMode ? (
            // ACCOUNT ACTIVATION
            <div className="w-full">
              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-edw-teal">
                  Account Activation
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-edw-navy sm:text-4xl">
                  Activate Your Account
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Registrasi Anda telah disetujui. Buat password untuk mulai
                  menggunakan Enterprise Document Workspace.
                </p>
              </div>

              {activationError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {activationError}
                </div>
              )}

              {activationSuccess ? (
                <div className="rounded-xl border border-edw-cyan bg-edw-cyan/20 p-5">
                  <div className="mb-3 flex items-center gap-2 text-edw-teal">
                    <CheckCircle2 size={22} />
                    <p className="font-semibold">Akun Berhasil Diaktifkan</p>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    Akun EDW Anda sudah aktif. Silakan login menggunakan email
                    dan password yang baru dibuat.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/";
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white transition hover:bg-edw-navy"
                  >
                    Go to Sign In
                    <ArrowRight size={18} />
                  </button>
                </div>
              ) : !activationToken ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <p className="font-semibold text-red-700">
                    Activation Link Tidak Valid
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-600">
                    Token aktivasi tidak ditemukan. Silakan hubungi
                    administrator IT untuk meminta link aktivasi baru.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/";
                    }}
                    className="mt-5 text-sm font-semibold text-edw-teal"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleActivateAccount} className="space-y-5">
                  <div>
                    <label
                      htmlFor="activation-password"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      New Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="activation-password"
                        type={showActivationPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Masukkan password baru"
                        value={activationPassword}
                        onChange={(event) =>
                          setActivationPassword(event.target.value)
                        }
                        disabled={activationLoading}
                        required
                        minLength={12}
                        maxLength={128}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-edw-navy outline-none transition focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowActivationPassword((value) => !value)
                        }
                        aria-label={
                          showActivationPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-edw-teal"
                      >
                        {showActivationPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Password harus terdiri dari 12–128 karakter.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-activation-password"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      Confirm Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="confirm-activation-password"
                        type={
                          showConfirmActivationPassword ? "text" : "password"
                        }
                        autoComplete="new-password"
                        placeholder="Ulangi password baru"
                        value={confirmActivationPassword}
                        onChange={(event) =>
                          setConfirmActivationPassword(event.target.value)
                        }
                        disabled={activationLoading}
                        required
                        maxLength={128}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-edw-navy outline-none transition focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmActivationPassword((value) => !value)
                        }
                        aria-label={
                          showConfirmActivationPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-edw-teal"
                      >
                        {showConfirmActivationPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={activationLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-edw-teal/20 transition hover:bg-edw-navy disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {activationLoading ? (
                      <>
                        <LoaderCircle size={19} className="animate-spin" />
                        Activating Account...
                      </>
                    ) : (
                      <>
                        Activate Account
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-edw-teal" />
                Protected by EDW Authentication System
              </div>
            </div>
          ) : resetMode ? (
            // RESET PASSWORD
            <div className="w-full">
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState({}, "", "/");
                  setResetMode(false);
                  setForgotMode(false);
                  setResetError("");
                }}
                className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-edw-teal"
              >
                <ArrowRight className="rotate-180" size={17} />
                Back to Sign In
              </button>

              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-edw-teal">
                  Account Security
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-edw-navy sm:text-4xl">
                  Reset Password
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Buat password baru untuk mengamankan kembali akun EDW Anda.
                </p>
              </div>

              {resetError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {resetError}
                </div>
              )}

              {resetSuccess ? (
                <div className="rounded-xl border border-edw-cyan bg-edw-cyan/20 p-5">
                  <div className="mb-3 flex items-center gap-2 text-edw-teal">
                    <CheckCircle2 size={22} />
                    <p className="font-semibold">
                      Password Berhasil Diperbarui
                    </p>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    Password akun EDW Anda sudah berhasil diubah. Silakan masuk
                    kembali menggunakan password baru.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      window.history.replaceState({}, "", "/");
                      setResetMode(false);
                      setForgotMode(false);
                      setSuccess(
                        "Password berhasil diperbarui. Silakan login.",
                      );
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white transition hover:bg-edw-navy"
                  >
                    Back to Sign In
                    <ArrowRight size={18} />
                  </button>
                </div>
              ) : !resetToken ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <p className="font-semibold text-red-700">
                    Reset link tidak valid
                  </p>
                  <p className="mt-2 text-sm leading-6 text-red-600">
                    Token tidak ditemukan. Silakan ajukan permintaan reset
                    password baru.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      window.history.replaceState({}, "", "/");
                      setResetMode(false);
                      setForgotMode(true);
                    }}
                    className="mt-5 text-sm font-semibold text-edw-teal"
                  >
                    Request New Reset Link
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      New Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Masukkan password baru"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        disabled={resetLoading}
                        required
                        minLength={12}
                        maxLength={128}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-edw-navy outline-none transition focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                      />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-edw-teal"
                      >
                        {showNewPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Password harus terdiri dari 12–128 karakter.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      Confirm New Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Ulangi password baru"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        disabled={resetLoading}
                        required
                        maxLength={128}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-edw-navy outline-none transition focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-edw-teal"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-edw-teal/20 transition hover:bg-edw-navy disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {resetLoading ? (
                      <>
                        <LoaderCircle size={19} className="animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        Update Password
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-edw-teal" />
                Protected by EDW Authentication System
              </div>
            </div>
          ) : forgotMode ? (
            <div className="w-full">
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-edw-teal"
              >
                <ArrowRight className="rotate-180" size={17} />
                Back to Sign In
              </button>

              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-edw-teal">
                  Account Recovery
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-edw-navy sm:text-4xl">
                  Forgot Password?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Masukkan alamat email yang terdaftar. Kami akan mengirimkan
                  tautan untuk mengatur ulang password Anda.
                </p>
              </div>

              {forgotError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div className="rounded-xl border border-edw-cyan bg-edw-cyan/20 p-5">
                  <div className="mb-3 flex items-center gap-2 text-edw-teal">
                    <CheckCircle2 size={22} />
                    <p className="font-semibold">Permintaan diproses</p>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    Jika alamat email tersebut terdaftar dan memenuhi
                    persyaratan, instruksi pemulihan password akan dikirimkan.
                    Silakan periksa inbox atau folder spam Anda.
                  </p>

                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="mt-5 text-sm font-semibold text-edw-teal hover:text-edw-navy"
                  >
                    Kembali ke Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      Email Address
                    </label>

                    <div className="relative">
                      <Mail
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        placeholder="nama@perusahaan.com"
                        value={forgotEmail}
                        onChange={(event) => setForgotEmail(event.target.value)}
                        disabled={forgotLoading}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-edw-teal/20 transition hover:bg-edw-navy disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {forgotLoading ? (
                      <>
                        <LoaderCircle size={19} className="animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-edw-teal" />
                Protected by EDW Authentication System
              </div>
            </div>
          ) : registerMode ? (
            // REGISTER
            <div className="w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  setRegisterMode(false);
                  setRegisterError("");
                  setRegisterSuccess(false);
                }}
                className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-edw-teal"
              >
                <ArrowRight className="rotate-180" size={17} />
                Back to Sign In
              </button>

              <div className="mb-5">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-edw-teal">
                  Account Registration
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-edw-navy sm:text-3xl">
                  Create Your Account
                </h2>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  Daftarkan akun perusahaan Anda untuk mendapatkan akses ke
                  Enterprise Document Workspace.
                </p>
              </div>

              {registerError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  <p>{registerError}</p>
                </div>
              )}

              {registerSuccess ? (
                <div className="rounded-xl border border-edw-cyan bg-edw-cyan/20 p-5">
                  <div className="mb-3 flex items-center gap-2 text-edw-teal">
                    <CheckCircle2 size={22} />
                    <p className="font-semibold">Registration Submitted</p>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    Permohonan registrasi Anda berhasil dikirim dan sedang
                    menunggu persetujuan administrator IT. Anda akan menerima
                    email aktivasi setelah permohonan disetujui.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMode(false);
                      setRegisterSuccess(false);
                      setEmail(registerEmail);
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white transition hover:bg-edw-navy"
                  >
                    Back to Sign In
                    <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label
                      htmlFor="register-fullname"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      Full Name
                    </label>

                    <input
                      id="register-fullname"
                      type="text"
                      autoComplete="name"
                      placeholder="Masukkan nama lengkap"
                      value={registerFullName}
                      onChange={(event) =>
                        setRegisterFullName(event.target.value)
                      }
                      disabled={registerLoading}
                      required
                      maxLength={150}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-email"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      Corporate Email
                    </label>

                    <div className="relative">
                      <Mail
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        placeholder="nama@perusahaan.com"
                        value={registerEmail}
                        onChange={(event) =>
                          setRegisterEmail(event.target.value)
                        }
                        disabled={registerLoading}
                        required
                        maxLength={254}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="register-employee"
                      className="mb-2 block text-sm font-semibold text-edw-navy"
                    >
                      Employee Number
                    </label>

                    <input
                      id="register-employee"
                      type="text"
                      placeholder="Masukkan nomor pegawai"
                      value={registerEmployeeNo}
                      onChange={(event) =>
                        setRegisterEmployeeNo(event.target.value)
                      }
                      disabled={registerLoading}
                      required
                      maxLength={50}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10"
                    />
                  </div>

                  <div className="rounded-xl border border-edw-cyan bg-edw-cyan/20 p-3">
                    <div className="flex items-center gap-2 text-edw-teal">
                      <ShieldCheck size={18} />
                      <p className="text-sm font-semibold">
                        IT Approval Required
                      </p>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Permohonan registrasi akan ditinjau oleh administrator IT.
                      Department dan role akan ditentukan oleh administrator
                      saat persetujuan.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-edw-teal/20 transition hover:bg-edw-navy disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {registerLoading ? (
                      <>
                        <LoaderCircle size={19} className="animate-spin" />
                        Submitting Registration...
                      </>
                    ) : (
                      <>
                        Submit Registration
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-edw-teal" />
                Protected by EDW Authentication System
              </div>
            </div>
          ) : (
            <>
              {/* MOBILE BRAND */}
              <div className="mb-12 flex items-center gap-3 lg:hidden">
                <div className="rounded-xl bg-edw-navy p-3 text-white">
                  <FileText size={25} />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wider text-edw-navy">
                    EDW
                  </h1>
                  <p className="text-xs text-edw-teal">
                    Enterprise Document Workspace
                  </p>
                </div>
              </div>

              <div className="mb-9">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-edw-teal">
                  Welcome Back
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-edw-navy sm:text-4xl">
                  Sign in to EDW
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Masuk menggunakan akun perusahaan Anda untuk melanjutkan ke
                  workspace.
                </p>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* SUCCESS MESSAGE */}
              {success && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                >
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Autentikasi berhasil</p>
                    <p className="mt-1">{success}</p>
                  </div>
                </div>
              )}

              {showForgotInfo && (
                <div className="mb-5 rounded-xl border border-edw-cyan bg-edw-cyan/20 p-4 text-sm text-edw-navy">
                  Fitur pemulihan password melalui Email dan WhatsApp akan
                  tersedia pada tahap Forgot Password.
                </div>
              )}

              {/* LOGIN FORM */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-edw-navy"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="nama@perusahaan.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-edw-navy"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotError("");
                        setForgotSuccess(false);
                        setForgotMode(true);
                      }}
                      className="text-xs font-semibold text-edw-teal transition hover:text-edw-navy"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-4 focus:ring-edw-teal/10 disabled:bg-slate-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-edw-teal"
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-edw-teal"
                    />
                    Remember email
                  </label>

                  <span className="text-xs text-slate-400">Secure access</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-edw-teal px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-edw-teal/20 transition hover:bg-edw-navy hover:shadow-edw-navy/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={19} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={19} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Belum memiliki akun EDW?
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterError("");
                      setRegisterSuccess(false);
                      setRegisterMode(true);
                    }}
                    className="ml-1 font-semibold text-edw-teal transition hover:text-edw-navy"
                  >
                    Register Now
                  </button>
                </p>
              </div>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">
                  SECURE ENTERPRISE ACCESS
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-edw-teal" />
                Protected by EDW Authentication System
              </div>

              <p className="mt-10 text-center text-xs text-slate-400">
                © 2026 Enterprise Document Workspace. All rights reserved.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-edw-cyan">{icon}</div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default App;
