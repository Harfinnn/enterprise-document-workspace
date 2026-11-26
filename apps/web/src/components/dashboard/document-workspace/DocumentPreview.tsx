import { useEffect, useRef, useState } from "react";
import { X, Loader2, FileText, AlertCircle, Eye } from "lucide-react";

interface DocumentPreviewProps {
  documentId: string;
  versionId: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const OPENDOC_URL =
  import.meta.env.VITE_OPENDOC_EDITOR_URL ||
  "http://localhost:8099/editor.html";

export default function DocumentPreview({
  documentId,
  versionId,
  fileName,
  mimeType,
  onClose,
}: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState<"preview" | "edit">("preview");
  const [error, setError] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const requestIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editorUrl = new URL(OPENDOC_URL);

  editorUrl.searchParams.set("mode", "edit");
  editorUrl.searchParams.set("can", "-save,-download,-autosave,-print");

  editorUrl.searchParams.set("hostOrigin", window.location.origin);
  editorUrl.searchParams.set("blank", "1");

  const editorOrigin = editorUrl.origin;

  const isSupported =
    mimeType === "application/pdf" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(pdf|docx)$/i.test(fileName);

  const fileExtension = fileName.split(".").pop()?.toUpperCase() || "DOCUMENT";

  // Load document from EDW API
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        setFileBuffer(null);

        if (!isSupported) {
          throw new Error("Format dokumen belum didukung oleh OpenDoc Editor.");
        }

        const token = sessionStorage.getItem("edw_access_token");

        if (!token) {
          throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
        }

        const response = await fetch(
          `${API_URL}/documents/${documentId}/versions/${versionId}/preview`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sesi login telah berakhir. Silakan login kembali."
              : response.status === 403
                ? "Anda tidak memiliki izin untuk melihat dokumen ini."
                : response.status === 404
                  ? "Dokumen atau revisi tidak ditemukan."
                  : "Gagal mengambil dokumen dari server.",
          );
        }

        const buffer = await response.arrayBuffer();

        if (!active) return;

        if (buffer.byteLength === 0) {
          throw new Error("File dokumen kosong.");
        }

        if (buffer.byteLength > 64 * 1024 * 1024) {
          throw new Error("Ukuran dokumen melebihi batas 64 MB.");
        }

        setFileBuffer(buffer);
      } catch (err) {
        if (!active || (err instanceof Error && err.name === "AbortError")) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat membuka dokumen.",
        );
      }
    };

    void loadDocument();

    return () => {
      active = false;
      controller.abort();
    };
  }, [documentId, versionId, isSupported]);

  // Close preview using Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Handle response from OpenDoc
  useEffect(() => {
    const handleEditorMessage = (event: MessageEvent) => {
      if (event.origin !== editorOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = event.data;

      if (!message || message.requestId !== requestIdRef.current) {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (message.type === "edw.document.opened") {
        requestIdRef.current = null;
        setLoading(false);
        setError(null);
        return;
      }

      if (message.type === "edw.document.error") {
        requestIdRef.current = null;
        setLoading(false);
        setError(
          typeof message.detail === "string"
            ? message.detail
            : "OpenDoc gagal membuka dokumen.",
        );
        return;
      }

      if (message.type === "edw.document.cancelled") {
        requestIdRef.current = null;
        setLoading(false);
        setError("Pembukaan dokumen dibatalkan.");
      }
    };

    window.addEventListener("message", handleEditorMessage);

    return () => {
      window.removeEventListener("message", handleEditorMessage);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      requestIdRef.current = null;
    };
  }, [editorOrigin]);

  // Send document to OpenDoc
  const handleEditorLoad = () => {
    const iframeWindow = iframeRef.current?.contentWindow;

    if (!iframeWindow || !fileBuffer) return;

    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const requestId = crypto.randomUUID();
      requestIdRef.current = requestId;

      const bufferCopy = fileBuffer.slice(0);

      setLoading(true);
      setError(null);

      iframeWindow.postMessage(
        {
          type: "edw.document.open",
          requestId,
          name: fileName,
          buffer: bufferCopy,
        },
        editorOrigin,
        [bufferCopy],
      );

      timeoutRef.current = setTimeout(() => {
        if (requestIdRef.current !== requestId) return;

        requestIdRef.current = null;
        setLoading(false);
        setError(
          "OpenDoc tidak merespons dalam 30 detik. Silakan tutup dan coba kembali.",
        );
      }, 30000);
    } catch {
      requestIdRef.current = null;
      setLoading(false);
      setError("Gagal mengirim dokumen ke OpenDoc Editor.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen flex-col bg-[#071B2B]">
      {/* HEADER */}
      <header className="relative z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 bg-[#071B2B] px-5 shadow-lg md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#167D8D]/20 text-[#B9E4E8]">
            <FileText size={21} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-wide text-white md:text-base">
              {fileName}
            </h2>

            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">
                Document Preview
              </span>

              <span className="text-slate-600">•</span>

              <span className="text-[11px] font-medium text-slate-400">
                {fileExtension}
              </span>
            </div>
          </div>
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setEditorMode("preview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                editorMode === "preview"
                  ? "bg-[#167D8D] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye size={14} />
              Preview
            </button>

            <button
              type="button"
              onClick={() => setEditorMode("edit")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                editorMode === "edit"
                  ? "bg-[#167D8D] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText size={14} />
              Edit
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition-all duration-200 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400"
            aria-label="Tutup preview"
            title="Tutup preview"
          >
            <X
              size={20}
              className="transition-transform duration-200 group-hover:rotate-90"
            />
          </button>
        </div>
      </header>

      {/* PREVIEW AREA */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#E8EDF1]">
        {/* Loading */}
        {loading && !error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#E8EDF1]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Loader2 size={30} className="animate-spin text-[#167D8D]" />
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-[#071B2B]">
                Sedang memuat dokumen
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mohon tunggu, dokumen sedang dipersiapkan...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#E8EDF1] p-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <AlertCircle size={28} className="text-red-500" />
              </div>

              <h3 className="mt-5 text-base font-semibold text-[#071B2B]">
                Dokumen tidak dapat dibuka
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-xl bg-[#071B2B] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#167D8D]"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        )}

        {/* OpenDoc Editor */}
        {!error && fileBuffer && (
          <iframe
            ref={iframeRef}
            src={editorUrl.toString()}
            title={`OpenDoc - ${fileName}`}
            onLoad={handleEditorLoad}
            className="h-full w-full border-0 bg-white"
            allow="clipboard-read; clipboard-write"
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="flex h-9 shrink-0 items-center justify-between border-t border-white/10 bg-[#071B2B] px-5 text-[10px] text-slate-400 md:px-8">
        <div className="flex items-center gap-2">
          <Eye size={13} className="text-[#2CCABC]" />
          <span>Document Viewing Mode</span>
        </div>

        <span className="hidden sm:block">
          EDW · Enterprise Document Workspace
        </span>
      </footer>
    </div>
  );
}
