import { useMemo, useState, useEffect } from "react";
import {
  FileText,
  FolderOpen,
  Search,
  Upload,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Download,
  ArrowUpDown,
  X,
  ShieldCheck,
  Building2,
  Files,
  Loader2,
  GitBranch,
  Eye,
  Globe,
} from "lucide-react";

import DocumentPreview from "./DocumentPreview";

import type { DashboardUser } from "../dashboard.types";

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  category: string;
  department: string;
  classification: string;
  owner: string;
  updatedAt: string;
  status: string;
  majorVersion: number;
  minorVersion: number;
  sharedToAllAt: string | null;
};

type ApiDocument = {
  id: string;
  title: string;
  classification: string;
  status: string;
  updatedAt: string;
  sharedToAllAt: string | null;
  currentMajorVersion: number;
  currentMinorVersion: number;
  ownerId: string;
  workspaceType: "PERSONAL" | "DEPARTMENT";
  departmentId: string | null;
  owner?: {
    id?: string;
    fullName?: string;
  };
  documentType?: {
    name?: string;
  };
  department?: {
    id: string;
    name: string;
  } | null;
};

type DocumentVersion = {
  id: string;
  majorVersion: number;
  minorVersion: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string;
  changeNotes?: string | null;
  storageKey: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    fullName: string;
  };
};

type DocumentDetail = ApiDocument & {
  description?: string | null;
  documentType?: {
    name?: string;
  };
  versions: DocumentVersion[];
};

type ShareRecipient = {
  id: string;
  employeeNo: string;
  fullName: string;
  email: string;
  department?: {
    id: string;
    name: string;
  } | null;
};

type DocumentShareItem = {
  id: string;
  documentId: string;
  sharedWithUserId: string;
  sharedByUserId: string;
  createdAt: string;
  sharedWith: {
    id: string;
    employeeNo: string;
    fullName: string;
    email: string;
  };
  sharedBy: {
    id: string;
    fullName: string;
  };
};

type DocumentsApiResponse = {
  data: ApiDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ViewMode = "list" | "grid";

type SortOption = "name" | "newest" | "oldest";

type WorkspaceTab = "my-repository" | "department-workspace" | "all-documents";

const categories = [
  "All Categories",
  "Policy",
  "Procedure",
  "Guideline",
  "Form",
  "Report",
  "Other",
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface DocumentWorkspaceProps {
  user: DashboardUser;
  activeMenu: string;
}

export default function DocumentWorkspace({ user }: DocumentWorkspaceProps) {
  const isSuperAdmin = user.roles.some((role) => role.code === "IT_SUPERADMIN");

  const isDocumentControl = user.roles.some(
    (role) => role.code === "DOCUMENT_CONTROL",
  );

  const isUserRole = user.roles.some((role) => role.code === "USER");

  const isDepartmentHead = user.roles.some(
    (role) => role.code === "DEPARTMENT_HEAD",
  );

  // Permission
  const canUploadDocument = user.permissions.includes("document.upload");

  // Role-based access
  const canManageShareAll = isSuperAdmin || isDocumentControl;

  const canUploadToAnyDepartment = isSuperAdmin || isDocumentControl;

  const canUploadToOwnDepartment = canUploadToAnyDepartment || isDepartmentHead;

  const canAccessDepartmentWorkspace =
    isSuperAdmin || isDocumentControl || isDepartmentHead;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedClassification, setSelectedClassification] = useState(
    "All Classifications",
  );

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    documentTypeId: "",
    classification: "INTERNAL",
    changeNotes: "",
    workspaceType: "PERSONAL",
    departmentId: "",
  });

  type DepartmentOption = {
    id: string;
    code: string;
    name: string;
  };

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentDetail | null>(null);

  const canManageSelectedDocumentShares = Boolean(
    selectedDocument &&
    (isSuperAdmin ||
      isDocumentControl ||
      (isUserRole && selectedDocument.ownerId === user.id)),
  );

  const canUploadSelectedRevision = Boolean(
    selectedDocument &&
    (selectedDocument.workspaceType === "PERSONAL"
      ? selectedDocument.ownerId === user.id
      : isSuperAdmin ||
        isDocumentControl ||
        (!!user.departmentId &&
          selectedDocument.departmentId === user.departmentId)),
  );

  // Share to Users
  const [documentShares, setDocumentShares] = useState<DocumentShareItem[]>([]);
  const [shareRecipients, setShareRecipients] = useState<ShareRecipient[]>([]);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<
    ShareRecipient[]
  >([]);

  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [isUpdatingShareAll, setIsUpdatingShareAll] = useState(false);
  const [isSearchingRecipients, setIsSearchingRecipients] = useState(false);
  const [isSavingShares, setIsSavingShares] = useState(false);

  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(
    null,
  );

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  const [revisionFile, setRevisionFile] = useState<File | null>(null);

  const [revisionType, setRevisionType] = useState<"MINOR" | "MAJOR">("MINOR");

  const [revisionNotes, setRevisionNotes] = useState("");

  const [revisionUploading, setRevisionUploading] = useState(false);

  const [revisionError, setRevisionError] = useState<string | null>(null);

  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceTab>("my-repository");

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = documents.filter((document) => {
      const matchesSearch =
        !query ||
        document.name.toLowerCase().includes(query) ||
        document.category.toLowerCase().includes(query) ||
        document.owner.toLowerCase().includes(query) ||
        document.type.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All Categories" ||
        document.category === selectedCategory;

      const matchesClassification =
        selectedClassification === "All Classifications" ||
        document.classification === selectedClassification;

      return matchesSearch && matchesCategory && matchesClassification;
    });

    return result.sort((a, b) => {
      if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortOption === "oldest") {
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [
    documents,
    searchQuery,
    selectedCategory,
    sortOption,
    selectedClassification,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All Categories" ||
    selectedClassification !== "All Classifications";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setSelectedClassification("All Classifications");
    setSortOption("newest");
    setCurrentPage(1);
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) {
      setUploadError("Silakan pilih file terlebih dahulu.");
      return;
    }

    if (!uploadForm.title.trim()) {
      setUploadError("Judul dokumen wajib diisi.");
      return;
    }

    if (!uploadForm.documentTypeId) {
      setUploadError("Document Type wajib dipilih.");
      return;
    }

    if (uploadForm.workspaceType === "DEPARTMENT") {
      if (!canUploadToOwnDepartment) {
        setUploadError(
          "Anda tidak memiliki akses untuk mengunggah ke Departments Workspace.",
        );
        return;
      }

      if (canUploadToAnyDepartment && !uploadForm.departmentId) {
        setUploadError("Target Department wajib dipilih.");
        return;
      }

      if (isDepartmentHead && !user.departmentId) {
        setUploadError(
          "Akun Anda belum memiliki department. Hubungi administrator.",
        );
        return;
      }
    }

    try {
      setUploading(true);
      setUploadError(null);

      const token = sessionStorage.getItem("edw_access_token");

      if (!token) {
        throw new Error("Sesi login tidak ditemukan.");
      }

      const API_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

      const formData = new FormData();

      formData.append("file", uploadFile);
      formData.append("title", uploadForm.title);
      formData.append("description", uploadForm.description);
      formData.append("documentTypeId", uploadForm.documentTypeId);
      formData.append("classification", uploadForm.classification);
      formData.append("changeNotes", uploadForm.changeNotes);

      formData.append("workspaceType", uploadForm.workspaceType);

      if (uploadForm.workspaceType === "DEPARTMENT") {
        const targetDepartmentId = canUploadToAnyDepartment
          ? uploadForm.departmentId
          : user.departmentId;

        if (targetDepartmentId) {
          formData.append("departmentId", targetDepartmentId);
        }
      }

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        console.log("UPLOAD ERROR DETAIL:", JSON.stringify(result, null, 2));

        const errorMessage = Array.isArray(result?.message)
          ? result.message.join(", ")
          : result?.message || result?.error || `HTTP ${response.status}`;

        throw new Error(errorMessage);
      }

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadForm({
        title: "",
        description: "",
        documentTypeId: "",
        classification: "INTERNAL",
        changeNotes: "",
        workspaceType: "PERSONAL",
        departmentId: "",
      });

      alert("Dokumen berhasil diunggah!");

      window.location.reload();
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengunggah dokumen.",
      );
    } finally {
      setUploading(false);
    }
  };

  const [documentTypes, setDocumentTypes] = useState<
    { id: string; name: string }[]
  >([]);

  const handleOpenDetail = async (document: DocumentItem) => {
    const token = sessionStorage.getItem("edw_access_token");

    if (!token) {
      alert("Sesi login tidak ditemukan.");
      return;
    }

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    try {
      const response = await fetch(`${API_URL}/documents/${document.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil detail dokumen (${response.status})`);
      }

      const result = await response.json();

      setSelectedDocument(result);
      setIsDetailModalOpen(true);

      const canManageShares =
        isSuperAdmin ||
        isDocumentControl ||
        (isUserRole && result.ownerId === user.id);

      if (canManageShares) {
        await loadDocumentShares(document.id);
      } else {
        setDocumentShares([]);
      }
    } catch (error) {
      console.error("Gagal mengambil detail dokumen:", error);
      alert(
        error instanceof Error ? error.message : "Gagal memuat detail dokumen.",
      );
    }
  };

  // Mengambil daftar pengguna yang sudah menerima akses dokumen
  const loadDocumentShares = async (documentId: string) => {
    const token = sessionStorage.getItem("edw_access_token");
    if (!token) return;

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    setIsLoadingShares(true);
    setShareError(null);

    try {
      const response = await fetch(
        `${API_URL}/documents/${documentId}/shares`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || "Gagal mengambil daftar penerima dokumen.",
        );
      }

      setDocumentShares(result?.data ?? []);
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar penerima.",
      );
    } finally {
      setIsLoadingShares(false);
    }
  };

  // Mencari pengguna aktif dengan role USER
  const searchShareRecipients = async (keyword: string) => {
    const search = keyword.trim();

    if (search.length < 2) {
      setShareRecipients([]);
      return;
    }

    const token = sessionStorage.getItem("edw_access_token");
    if (!token || !selectedDocument) return;

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    setIsSearchingRecipients(true);
    setShareError(null);

    try {
      const response = await fetch(
        `${API_URL}/documents/${selectedDocument.id}/share-recipients?search=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Gagal mencari pengguna.");
      }

      setShareRecipients(result?.data ?? []);
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : "Gagal mencari pengguna.",
      );
    } finally {
      setIsSearchingRecipients(false);
    }
  };

  // Menambahkan pengguna ke daftar penerima dokumen
  const handleShareSelectedRecipients = async () => {
    if (!selectedDocument || selectedRecipients.length === 0) return;

    const token = sessionStorage.getItem("edw_access_token");
    if (!token) {
      setShareError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    setIsSavingShares(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/documents/${selectedDocument.id}/shares`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userIds: selectedRecipients.map((recipient) => recipient.id),
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Gagal membagikan dokumen.");
      }

      await loadDocumentShares(selectedDocument.id);

      setSelectedRecipients([]);
      setShareRecipients([]);
      setShareSearchQuery("");
      setShareSuccess("Dokumen berhasil dibagikan kepada pengguna terpilih.");
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : "Gagal membagikan dokumen.",
      );
    } finally {
      setIsSavingShares(false);
    }
  };

  // Mencabut akses pengguna terhadap dokumen
  const handleRevokeUserShare = async (recipientId: string) => {
    if (!selectedDocument) return;

    const confirmed = window.confirm(
      "Cabut akses pengguna ini terhadap dokumen?",
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("edw_access_token");
    if (!token) {
      setShareError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    setIsSavingShares(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/documents/${selectedDocument.id}/shares/${recipientId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Gagal mencabut akses pengguna.");
      }

      await loadDocumentShares(selectedDocument.id);

      setShareSuccess("Akses pengguna berhasil dicabut.");
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "Gagal mencabut akses pengguna.",
      );
    } finally {
      setIsSavingShares(false);
    }
  };

  const handleToggleShareAll = async () => {
    if (!selectedDocument || !canManageShareAll) return;

    const isCurrentlyShared = Boolean(selectedDocument.sharedToAllAt);

    const confirmed = window.confirm(
      isCurrentlyShared
        ? "Cabut publikasi global dokumen ini? Akses Share to Users tetap aktif."
        : "Publikasikan dokumen ini agar dapat diakses seluruh pengguna EDW?",
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("edw_access_token");

    if (!token) {
      setShareError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    setIsUpdatingShareAll(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/documents/${selectedDocument.id}/share-all`,
        {
          method: isCurrentlyShared ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || "Gagal memperbarui publikasi global dokumen.",
        );
      }

      // Ambil detail terbaru dari server
      const detailResponse = await fetch(
        `${API_URL}/documents/${selectedDocument.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const updatedDocument = await detailResponse.json().catch(() => null);

      if (!detailResponse.ok || !updatedDocument) {
        throw new Error(
          "Publikasi berhasil diproses, tetapi detail dokumen gagal diperbarui. Silakan buka kembali dokumen.",
        );
      }

      setSelectedDocument(updatedDocument);

      setDocuments((previous) =>
        previous.map((document) =>
          document.id === updatedDocument.id
            ? {
                ...document,
                sharedToAllAt: updatedDocument.sharedToAllAt,
              }
            : document,
        ),
      );

      setShareSuccess(
        isCurrentlyShared
          ? "Publikasi global berhasil dicabut. Share to Users tetap dipertahankan."
          : "Dokumen berhasil dipublikasikan untuk seluruh pengguna EDW.",
      );
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui publikasi global dokumen.",
      );
    } finally {
      setIsUpdatingShareAll(false);
    }
  };

  const handleDownloadVersion = async (version: DocumentVersion) => {
    if (!selectedDocument) return;

    const token = sessionStorage.getItem("edw_access_token");

    if (!token) {
      alert("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    try {
      const response = await fetch(
        `${API_URL}/documents/${selectedDocument.id}/versions/${version.id}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Gagal mengunduh dokumen (${response.status}).`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = version.originalFileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);
    } catch (error) {
      console.error("Gagal mengunduh versi dokumen:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengunduh dokumen.",
      );
    }
  };

  const handleUploadRevision = async () => {
    if (!selectedDocument) return;

    if (!revisionFile) {
      setRevisionError("Silakan pilih file dokumen terlebih dahulu.");
      return;
    }

    const token = sessionStorage.getItem("edw_access_token");

    if (!token) {
      setRevisionError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const API_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    const formData = new FormData();
    formData.append("file", revisionFile);
    formData.append("revisionType", revisionType);

    if (revisionNotes.trim()) {
      formData.append("changeNotes", revisionNotes.trim());
    }

    setRevisionUploading(true);
    setRevisionError(null);

    try {
      const response = await fetch(
        `${API_URL}/documents/${selectedDocument.id}/revisions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorResult = await response.json().catch(() => null);

        throw new Error(
          errorResult?.message ||
            `Gagal mengunggah revisi dokumen (${response.status}).`,
        );
      }

      // Ambil kembali detail dokumen terbaru
      const detailResponse = await fetch(
        `${API_URL}/documents/${selectedDocument.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!detailResponse.ok) {
        throw new Error(
          "Revisi berhasil diunggah, tetapi detail dokumen gagal diperbarui.",
        );
      }

      const updatedDocument = await detailResponse.json();

      setSelectedDocument(updatedDocument);

      // Reset form revisi
      setRevisionFile(null);
      setRevisionType("MINOR");
      setRevisionNotes("");
      setRevisionError(null);
      setIsRevisionModalOpen(false);
    } catch (error) {
      console.error("Gagal mengunggah revisi:", error);

      setRevisionError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengunggah revisi.",
      );
    } finally {
      setRevisionUploading(false);
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = sessionStorage.getItem("edw_access_token");

        if (!token) {
          throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
        }

        const API_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

        const workspaceType =
          activeWorkspace === "my-repository"
            ? "PERSONAL"
            : activeWorkspace === "department-workspace"
              ? "DEPARTMENT"
              : "ALL";

        const response = await fetch(
          `${API_URL}/documents?page=${currentPage}&limit=${pageSize}&workspaceType=${workspaceType}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Gagal mengambil dokumen (${response.status})`);
        }

        const result: DocumentsApiResponse = await response.json();

        const mappedDocuments: DocumentItem[] = result.data.map((document) => ({
          id: document.id,
          name: document.title,
          type: document.documentType?.name || "Unknown Type",
          category: "Other",
          department: document.department?.name || "-",
          classification: document.classification || "INTERNAL",
          owner: document.owner?.fullName || "Unknown Owner",
          updatedAt: document.updatedAt,
          sharedToAllAt: document.sharedToAllAt,
          status: document.status,
          majorVersion: document.currentMajorVersion,
          minorVersion: document.currentMinorVersion,
        }));

        setDocuments(mappedDocuments);
        setTotalDocuments(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil dokumen.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [currentPage, pageSize, activeWorkspace]);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const token = sessionStorage.getItem("edw_access_token");

        if (!token) return;

        const API_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

        const response = await fetch(`${API_URL}/documents/types`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil Document Types.");
        }

        const result = await response.json();

        setDocumentTypes(result);
      } catch (err) {
        console.error("Failed to fetch document types:", err);
      }
    };

    fetchDocumentTypes();
  }, []);

  useEffect(() => {
    if (!canUploadToAnyDepartment) return;

    const fetchDepartments = async () => {
      try {
        setIsLoadingDepartments(true);

        const token = sessionStorage.getItem("edw_access_token");

        if (!token) return;

        const API_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

        const response = await fetch(`${API_URL}/users/departments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil daftar department.");
        }

        const result: { data: DepartmentOption[] } = await response.json();

        setDepartments(result.data);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, [canUploadToAnyDepartment]);

  const workspaceInfo = {
    "my-repository": {
      title: "My Repository",
      description: "Manage your personal documents.",
    },
    "department-workspace": {
      title: "Departments Workspace",
      description: "Access and manage documents within your department.",
    },
    "all-documents": {
      title: "All Documents",
      description:
        "Explore all documents available to you, including documents published through Share All.",
    },
  };

  const currentWorkspace = workspaceInfo[activeWorkspace];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-edw-teal">
            {currentWorkspace.title}
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-edw-navy sm:text-3xl">
            Document Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {currentWorkspace.description}
          </p>
        </div>

        {canUploadDocument && (
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90"
          >
            <Upload size={17} />
            Upload Document
          </button>
        )}
      </section>

      {/* Repository Summary */}
      {/* Workspace Navigation */}
      <section className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              key: "my-repository",
              label: "My Repository",
              description: "Personal documents",
              icon: FolderOpen,
            },
            {
              key: "department-workspace",
              label: "Departments Workspace",
              description: "Department documents",
              icon: Building2,
            },
            {
              key: "all-documents",
              label: "All Documents",
              description: "Enterprise documents",
              icon: Files,
            },
          ]
            .filter(
              (tab) =>
                tab.key !== "department-workspace" ||
                canAccessDepartmentWorkspace,
            )
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeWorkspace === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveWorkspace(tab.key as WorkspaceTab);
                    setCurrentPage(1);
                    resetFilters();
                  }}
                  aria-pressed={isActive}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
                    isActive
                      ? "border-edw-teal bg-edw-cyan/10 shadow-sm"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-edw-teal text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon size={21} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? "text-edw-teal" : "text-edw-navy"
                      }`}
                    >
                      {tab.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </section>

      {/* Search and Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by document name, category, owner..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-slate-400" />

            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value);
                setCurrentPage(1);
              }}
              className="min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-400" />

            <select
              value={selectedClassification}
              onChange={(event) => {
                setSelectedClassification(event.target.value);
                setCurrentPage(1);
              }}
              className="min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              <option value="All Classifications">All Classifications</option>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-slate-400" />

            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as SortOption)
              }
              className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List view"
              aria-label="List view"
              className={`rounded-md p-2 transition ${
                viewMode === "list"
                  ? "bg-edw-teal text-white"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
            >
              <List size={17} />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid view"
              aria-label="Grid view"
              className={`rounded-md p-2 transition ${
                viewMode === "grid"
                  ? "bg-edw-teal text-white"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Active filters:</span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-edw-cyan/20 px-2.5 py-1 text-xs font-medium text-edw-teal">
                Search: {searchQuery}
              </span>
            )}

            {selectedCategory !== "All Categories" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-edw-cyan/20 px-2.5 py-1 text-xs font-medium text-edw-teal">
                {selectedCategory}
              </span>
            )}

            {selectedClassification !== "All Classifications" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-edw-cyan/20 px-2.5 py-1 text-xs font-medium text-edw-teal">
                {selectedClassification.charAt(0) +
                  selectedClassification.slice(1).toLowerCase()}
              </span>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-edw-teal"
            >
              <X size={13} />
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Document List */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-edw-navy">Documents</h2>

            <p className="mt-1 text-xs text-slate-500">
              {filteredDocuments.length} documents
            </p>
          </div>

          <div className="text-xs text-slate-400">
            {viewMode === "list" ? "List view" : "Grid view"}
          </div>
        </div>

        {/* Table Header */}
        {filteredDocuments.length > 0 && viewMode === "list" && (
          <div className="hidden lg:grid grid-cols-[minmax(0,2.2fr)_minmax(90px,0.8fr)_minmax(130px,1fr)_minmax(110px,1fr)_minmax(130px,1.1fr)_minmax(150px,1.2fr)] gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Document</div>
            <div>Category</div>
            <div>Department</div>
            <div>Owner</div>
            <div>Last Updated</div>
            <div className="text-left">Action</div>
          </div>
        )}

        {/* Document Results */}
        {isLoading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-edw-cyan/30 border-t-edw-teal" />
            <p className="text-sm text-slate-500">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-xl bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-600">
                Failed to load documents
              </p>
              <p className="mt-1 text-xs text-red-500">{error}</p>
            </div>
          </div>
        ) : filteredDocuments.length > 0 ? (
          viewMode === "list" ? (
            <div className="divide-y divide-slate-100">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="grid grid-cols-1 gap-4 px-5 py-5 transition-colors hover:bg-slate-50/70 lg:grid-cols-[minmax(0,2.2fr)_minmax(90px,0.8fr)_minmax(130px,1fr)_minmax(110px,1fr)_minmax(130px,1.1fr)_minmax(150px,1.2fr)] lg:items-center lg:gap-4 lg:px-6"
                >
                  {/* Document */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-edw-cyan/20 text-edw-teal">
                      <FileText size={20} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-edw-navy">
                        {document.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {document.type}
                      </p>

                      {document.sharedToAllAt && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-edw-cyan/20 px-2.5 py-1 text-[10px] font-semibold text-edw-teal">
                          <Globe size={12} />
                          Shared Globally
                        </span>
                      )}

                      <span className="mt-2 inline-flex rounded-md bg-edw-cyan/20 px-2 py-1 text-[11px] font-semibold text-edw-teal">
                        v{document.majorVersion}.{document.minorVersion}
                      </span>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 lg:block">
                    <span className="text-xs text-slate-400 lg:hidden">
                      Category:
                    </span>
                    {document.category}
                  </div>

                  {/* Department */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 lg:block">
                    <span className="text-xs text-slate-400 lg:hidden">
                      Department:
                    </span>
                    <span className="truncate">
                      {document.department || "-"}
                    </span>
                  </div>

                  {/* Owner */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 lg:block">
                    <span className="text-xs text-slate-400 lg:hidden">
                      Owner:
                    </span>
                    <span className="truncate">{document.owner}</span>
                  </div>

                  {/* Last Updated */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 lg:block">
                    <span className="text-xs text-slate-400 lg:hidden">
                      Updated:
                    </span>
                    {formatDate(document.updatedAt)}
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:justify-start lg:border-0 lg:pt-0">
                    {/* <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {document.status}
                    </span> */}

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(document)}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-edw-teal/30 px-3.5 py-2 text-xs font-semibold text-edw-teal transition hover:border-edw-teal hover:bg-edw-teal hover:text-white"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-edw-teal/50 hover:shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-edw-cyan/20 text-edw-teal">
                    <FileText size={21} />
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-sm font-semibold text-edw-navy">
                    {document.name}
                  </h3>

                  {document.sharedToAllAt && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-edw-cyan/20 px-2.5 py-1 text-[10px] font-semibold text-edw-teal">
                      <Globe size={12} />
                      Shared Globally
                    </span>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    {document.category}
                  </p>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">{document.owner}</p>

                    <p className="mt-1 text-xs text-slate-400">
                      Updated {formatDate(document.updatedAt)}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded-md bg-edw-cyan/20 px-2 py-1 text-[11px] font-semibold text-edw-teal">
                        v{document.majorVersion}.{document.minorVersion}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenDetail(document)}
                        className="rounded-lg border border-edw-teal/20 px-3 py-1.5 text-xs font-semibold text-edw-teal transition hover:bg-edw-teal hover:text-white"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-edw-cyan/20 text-edw-teal">
              {hasActiveFilters ? (
                <Search size={28} strokeWidth={1.5} />
              ) : (
                <FolderOpen size={30} strokeWidth={1.5} />
              )}
            </div>

            <h3 className="mt-5 text-base font-bold text-edw-navy">
              {hasActiveFilters
                ? "No matching documents"
                : "Your repository is empty"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasActiveFilters
                ? "No documents match your current search or filters. Try changing your search criteria."
                : "Documents added to your repository will appear here. Upload and document management features will be available in the next development phase."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-edw-teal hover:text-edw-teal"
              >
                Clear filters
              </button>
            )}

            {!hasActiveFilters && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                <FileText size={14} />
                Repository ready
              </div>
            )}
          </div>
        )}
      </section>
      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm  min-h-screen">
          <div className="my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-edw-navy">
                  Upload Document
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a new document to your repository.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadError(null);
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleUploadDocument();
              }}
              className="space-y-5 overflow-y-auto p-6"
            >
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Document Title <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(event) =>
                    setUploadForm({
                      ...uploadForm,
                      title: event.target.value,
                    })
                  }
                  placeholder="Enter document title"
                  maxLength={255}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  value={uploadForm.description}
                  onChange={(event) =>
                    setUploadForm({
                      ...uploadForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe this document..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                />
              </div>

              {/* Workspace Selection */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Destination Workspace <span className="text-red-500">*</span>
                </label>

                <select
                  value={uploadForm.workspaceType}
                  onChange={(event) => {
                    const workspaceType = event.target.value as
                      | "PERSONAL"
                      | "DEPARTMENT";

                    setUploadForm({
                      ...uploadForm,
                      workspaceType,
                      departmentId:
                        workspaceType === "DEPARTMENT" &&
                        canUploadToAnyDepartment
                          ? ""
                          : workspaceType === "DEPARTMENT"
                            ? user.departmentId || ""
                            : "",
                    });
                  }}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal"
                >
                  <option value="PERSONAL">My Repository</option>

                  {canUploadToOwnDepartment && (
                    <option value="DEPARTMENT">Departments Workspace</option>
                  )}
                </select>

                <p className="mt-1.5 text-xs text-slate-500">
                  Choose where this document will be stored.
                </p>
              </div>

              {/* Department Selection - Super Admin Only */}
              {uploadForm.workspaceType === "DEPARTMENT" &&
                canUploadToAnyDepartment && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Target Department <span className="text-red-500">*</span>
                    </label>

                    <select
                      value={uploadForm.departmentId}
                      onChange={(event) =>
                        setUploadForm({
                          ...uploadForm,
                          departmentId: event.target.value,
                        })
                      }
                      required
                      disabled={isLoadingDepartments}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {isLoadingDepartments
                          ? "Loading departments..."
                          : "Select target department"}
                      </option>

                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {uploadForm.workspaceType === "DEPARTMENT" &&
                isDepartmentHead &&
                !canUploadToAnyDepartment && (
                  <div className="rounded-lg border border-edw-cyan/40 bg-edw-cyan/10 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">
                      Target Department
                    </p>
                    <p className="mt-1 text-sm font-semibold text-edw-navy">
                      {user.department || "Department belum ditentukan"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Department ditentukan otomatis berdasarkan akun Anda.
                    </p>
                  </div>
                )}

              {/* Document Type & Classification */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Document Type <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={uploadForm.documentTypeId}
                    onChange={(event) =>
                      setUploadForm({
                        ...uploadForm,
                        documentTypeId: event.target.value,
                      })
                    }
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal"
                  >
                    <option value="">Select document type</option>

                    {documentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Classification <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={uploadForm.classification}
                    onChange={(event) =>
                      setUploadForm({
                        ...uploadForm,
                        classification: event.target.value,
                      })
                    }
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal"
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                  </select>
                </div>
              </div>

              {/* Change Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Change Notes
                </label>

                <textarea
                  value={uploadForm.changeNotes}
                  onChange={(event) =>
                    setUploadForm({
                      ...uploadForm,
                      changeNotes: event.target.value,
                    })
                  }
                  placeholder="Notes about this upload..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Document File <span className="text-red-500">*</span>
                </label>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition hover:border-edw-teal hover:bg-edw-cyan/10">
                  <Upload size={28} className="text-edw-teal" />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Click to select a file
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    PDF, Word, Excel, PowerPoint • Maximum 20 MB
                  </p>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setUploadFile(file);

                      if (file && !uploadForm.title) {
                        setUploadForm({
                          ...uploadForm,
                          title: file.name.replace(/\.[^/.]+$/, ""),
                        });
                      }
                    }}
                  />
                </label>

                {uploadFile && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-edw-cyan/40 bg-edw-cyan/10 p-3">
                    <FileText size={20} className="shrink-0 text-edw-teal" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-edw-navy">
                        {uploadFile.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-red-500"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadError(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-edw-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {isDetailModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:p-4 min-h-screen">
          <div className="my-auto flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-edw-navy sm:text-lg">
                  Document Details
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Document information and revision history.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedDocument(null);
                }}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="min-h-0 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
              {/* Document Information */}

              {/* Share All */}
              {canManageShareAll && (
                <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-edw-cyan/20 text-edw-teal">
                        <Globe size={19} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-edw-navy">
                          Share All
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Publikasikan dokumen agar dapat diakses seluruh
                          pengguna EDW.
                        </p>

                        <div className="mt-2">
                          {selectedDocument.sharedToAllAt ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                              <Globe size={12} />
                              Published Globally
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                              Not Published
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleShareAll}
                      disabled={isUpdatingShareAll}
                      className={`inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                        selectedDocument.sharedToAllAt
                          ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                          : "bg-edw-teal text-white hover:bg-edw-teal/90"
                      }`}
                    >
                      {isUpdatingShareAll && (
                        <Loader2 size={14} className="animate-spin" />
                      )}

                      {selectedDocument.sharedToAllAt
                        ? "Unshare All"
                        : "Publish to All"}
                    </button>
                  </div>
                </section>
              )}

              {/* Share to Users */}
              {canManageSelectedDocumentShares && (
                <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-edw-navy">
                      Share to Users
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Berikan akses baca, preview, dan download kepada pengguna.
                    </p>
                  </div>

                  {/* Search Recipient */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-600">
                      Cari Pengguna
                    </label>

                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={shareSearchQuery}
                        onChange={(event) => {
                          const value = event.target.value;
                          setShareSearchQuery(value);
                          setShareError(null);
                          setShareSuccess(null);

                          if (value.trim().length >= 2) {
                            void searchShareRecipients(value);
                          } else {
                            setShareRecipients([]);
                          }
                        }}
                        placeholder="Nama, email, atau nomor pegawai..."
                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                      />
                    </div>

                    {isSearchingRecipients && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        Mencari pengguna...
                      </div>
                    )}

                    {/* Search Results */}
                    {shareRecipients.length > 0 && (
                      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-2">
                        {shareRecipients.map((recipient) => {
                          const alreadyShared = documentShares.some(
                            (share) => share.sharedWithUserId === recipient.id,
                          );

                          const isSelected = selectedRecipients.some(
                            (item) => item.id === recipient.id,
                          );

                          return (
                            <label
                              key={recipient.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition ${
                                alreadyShared
                                  ? "cursor-not-allowed bg-slate-50 opacity-60"
                                  : isSelected
                                    ? "bg-edw-cyan/20"
                                    : "hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={alreadyShared}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedRecipients((previous) => [
                                      ...previous,
                                      recipient,
                                    ]);
                                  } else {
                                    setSelectedRecipients((previous) =>
                                      previous.filter(
                                        (item) => item.id !== recipient.id,
                                      ),
                                    );
                                  }
                                }}
                                className="h-4 w-4 accent-edw-teal"
                              />

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-edw-navy">
                                  {recipient.fullName}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {recipient.employeeNo} · {recipient.email}
                                </p>
                                {recipient.department?.name && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {recipient.department.name}
                                  </p>
                                )}
                              </div>

                              {alreadyShared && (
                                <span className="shrink-0 text-[10px] font-semibold text-emerald-600">
                                  Sudah dibagikan
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {shareSearchQuery.trim().length >= 2 &&
                      !isSearchingRecipients &&
                      shareRecipients.length === 0 &&
                      !shareError && (
                        <p className="py-2 text-xs text-slate-400">
                          Pengguna tidak ditemukan.
                        </p>
                      )}
                  </div>

                  {/* Selected Recipients */}
                  {selectedRecipients.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold text-slate-600">
                        Pengguna Terpilih ({selectedRecipients.length})
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {selectedRecipients.map((recipient) => (
                          <span
                            key={recipient.id}
                            className="inline-flex items-center gap-2 rounded-full bg-edw-cyan/20 px-3 py-1.5 text-xs font-medium text-edw-navy"
                          >
                            {recipient.fullName}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRecipients((previous) =>
                                  previous.filter(
                                    (item) => item.id !== recipient.id,
                                  ),
                                )
                              }
                              className="text-slate-500 hover:text-red-600"
                              aria-label={`Hapus ${recipient.fullName}`}
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleShareSelectedRecipients}
                        disabled={isSavingShares}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-edw-teal px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingShares && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        Bagikan Dokumen
                      </button>
                    </div>
                  )}

                  {/* Feedback */}
                  {shareError && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                      {shareError}
                    </p>
                  )}

                  {shareSuccess && (
                    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {shareSuccess}
                    </p>
                  )}

                  {/* Existing Shares */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-edw-navy">
                        Pengguna dengan Akses
                      </h4>
                      <span className="rounded-full bg-edw-cyan/20 px-2.5 py-1 text-[10px] font-semibold text-edw-teal">
                        {documentShares.length} Pengguna
                      </span>
                    </div>

                    {isLoadingShares ? (
                      <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        Memuat daftar penerima...
                      </div>
                    ) : documentShares.length > 0 ? (
                      <div className="space-y-2">
                        {documentShares.map((share) => (
                          <div
                            key={share.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-edw-navy">
                                {share.sharedWith.fullName}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {share.sharedWith.employeeNo} ·{" "}
                                {share.sharedWith.email}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                Dibagikan oleh {share.sharedBy.fullName}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRevokeUserShare(share.sharedWithUserId)
                              }
                              disabled={isSavingShares}
                              className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Cabut Akses
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-3 text-center text-xs text-slate-400">
                        Belum ada pengguna yang menerima akses.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Revision History */}
              <section>
                <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-edw-navy">
                      Revision History
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Complete history of document versions.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-edw-cyan/20 px-3 py-1 text-xs font-semibold text-edw-teal">
                    {selectedDocument.versions?.length || 0} Versions
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  {/* Master Document */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-edw-cyan/20 text-edw-teal">
                      <FolderOpen size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-edw-navy">
                        {selectedDocument.title}
                      </p>
                      <p className="text-xs text-slate-500">Master Document</p>
                    </div>
                  </div>

                  {/* Version Tree */}
                  <div className="ml-3 mt-4 border-l-2 border-edw-cyan/40 pl-4 sm:ml-5 sm:pl-5">
                    <div className="mb-4 flex items-center gap-2">
                      <GitBranch size={14} className="shrink-0 text-edw-teal" />
                      <span className="text-xs font-semibold text-slate-500">
                        Revision History
                      </span>
                    </div>

                    <div className="space-y-6">
                      {selectedDocument.versions?.map((version, index) => (
                        <div key={version.id} className="relative">
                          {/* Tree Connector */}
                          <div className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-edw-teal bg-white sm:-left-[26px]" />

                          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            {/* Version Information */}
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-edw-cyan/20 text-edw-teal">
                                <FileText size={17} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-edw-navy">
                                    v{version.majorVersion}.
                                    {version.minorVersion}
                                  </span>

                                  {index === 0 && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                                      Latest
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                                  {version.originalFileName}
                                </p>

                                <div className="mt-2 space-y-1">
                                  <p className="break-words text-xs text-slate-500">
                                    Uploaded by:{" "}
                                    <span className="font-medium text-slate-700">
                                      {version.uploadedBy?.fullName ||
                                        "Unknown"}
                                    </span>
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    Date: {formatDate(version.createdAt)}
                                  </p>

                                  {version.changeNotes && (
                                    <p className="break-words pt-1 text-xs leading-5 text-slate-600">
                                      {version.changeNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex w-full shrink-0 gap-2 pl-12 sm:w-auto sm:pl-0">
                              {(version.mimeType === "application/pdf" ||
                                version.mimeType ===
                                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document") && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewVersion(version)}
                                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-edw-teal/20 px-3 py-2 text-xs font-semibold text-edw-teal transition hover:bg-edw-teal hover:text-white sm:flex-none"
                                  title="View document"
                                >
                                  <Eye size={14} />
                                  <span>View</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDownloadVersion(version)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-edw-teal/20 px-3 py-2 text-xs font-semibold text-edw-teal transition hover:bg-edw-teal hover:text-white sm:flex-none"
                                title="Download document"
                              >
                                <Download size={14} />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!selectedDocument.versions ||
                        selectedDocument.versions.length === 0) && (
                        <p className="py-3 text-xs text-slate-400">
                          No revision history available.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Upload Revision */}
              {canUploadSelectedRevision && (
                <button
                  type="button"
                  onClick={() => {
                    setRevisionFile(null);
                    setRevisionType("MINOR");
                    setRevisionNotes("");
                    setRevisionError(null);
                    setIsRevisionModalOpen(true);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-edw-teal/90 sm:w-auto sm:py-2.5"
                >
                  <Upload size={16} />
                  Upload Revision
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {previewVersion && selectedDocument && (
        <DocumentPreview
          documentId={selectedDocument.id}
          versionId={previewVersion.id}
          fileName={previewVersion.originalFileName}
          mimeType={previewVersion.mimeType}
          onClose={() => setPreviewVersion(null)}
        />
      )}

      {/* Pagination */}
      {!isLoading && !error && totalDocuments > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {(currentPage - 1) * pageSize + 1}
            </span>
            {" - "}
            <span className="font-medium text-slate-700">
              {Math.min(currentPage * pageSize, totalDocuments)}
            </span>
            {" of "}
            <span className="font-medium text-slate-700">
              {totalDocuments}
            </span>{" "}
            documents
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-edw-teal hover:text-edw-teal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="rounded-lg bg-edw-cyan/20 px-3 py-2 text-sm font-semibold text-edw-teal">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-edw-teal hover:text-edw-teal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {isRevisionModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-edw-navy/50 p-4 backdrop-blur-sm min-h-screen">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-edw-navy">
                  Upload Revision
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a new version of this document.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-edw-navy"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-5 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-edw-navy">
                  Document
                </label>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {selectedDocument.title}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-edw-navy">
                  Revision Type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRevisionType("MINOR")}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      revisionType === "MINOR"
                        ? "border-edw-teal bg-edw-teal/10 text-edw-teal"
                        : "border-slate-200 text-slate-500 hover:border-edw-teal/50"
                    }`}
                  >
                    Minor Revision
                    <span className="mt-1 block text-xs font-normal">
                      Example: 1.0 → 1.1
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRevisionType("MAJOR")}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      revisionType === "MAJOR"
                        ? "border-edw-teal bg-edw-teal/10 text-edw-teal"
                        : "border-slate-200 text-slate-500 hover:border-edw-teal/50"
                    }`}
                  >
                    Major Revision
                    <span className="mt-1 block text-xs font-normal">
                      Example: 1.0 → 2.0
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-edw-navy">
                  Document File
                </label>

                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(event) => {
                    setRevisionFile(event.target.files?.[0] || null);
                    setRevisionError(null);
                  }}
                  className="block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-edw-teal/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-edw-teal"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Supported formats: PDF and DOCX.
                </p>

                {revisionFile && (
                  <p className="mt-2 text-xs font-medium text-edw-teal">
                    Selected: {revisionFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-edw-navy">
                  Change Notes
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  value={revisionNotes}
                  onChange={(event) => setRevisionNotes(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Describe what changed in this revision..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-edw-navy outline-none transition placeholder:text-slate-400 focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {revisionNotes.length}/1000
                </p>
              </div>

              {revisionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {revisionError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                disabled={revisionUploading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUploadRevision}
                disabled={revisionUploading || !revisionFile}
                className="inline-flex items-center gap-2 rounded-xl bg-edw-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-edw-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {revisionUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Revision
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
