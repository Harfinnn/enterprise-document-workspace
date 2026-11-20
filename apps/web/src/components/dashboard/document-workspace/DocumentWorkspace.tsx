import { useMemo, useState } from "react";
import {
  FileText,
  FolderOpen,
  Search,
  Upload,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowUpDown,
  X,
} from "lucide-react";

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  category: string;
  owner: string;
  updatedAt: string;
  status: string;
};

type ViewMode = "list" | "grid";

type SortOption = "name" | "newest" | "oldest";

const documents: DocumentItem[] = [];

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

export default function DocumentWorkspace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

      return matchesSearch && matchesCategory;
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
  }, [searchQuery, selectedCategory, sortOption]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedCategory !== "All Categories";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setSortOption("newest");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-edw-teal">
            Document Workspace
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-edw-navy sm:text-3xl">
            Document Repository
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage, discover, and organize enterprise documents.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Upload functionality will be implemented in a later phase"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-edw-teal px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
        >
          <Upload size={17} />
          Upload Document
        </button>
      </section>

      {/* Repository Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-edw-cyan/30 text-edw-teal">
              <FolderOpen size={20} />
            </div>

            <div>
              <p className="text-sm font-semibold text-edw-navy">
                My Repository
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Personal document workspace
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <FileText size={20} />
            </div>

            <div>
              <p className="text-sm font-semibold text-edw-navy">
                All Documents
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Enterprise document repository
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <SlidersHorizontal size={20} />
            </div>

            <div>
              <p className="text-sm font-semibold text-edw-navy">
                Document Filters
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Search and filter documents
              </p>
            </div>
          </div>
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
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by document name, category, owner..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-edw-teal focus:ring-2 focus:ring-edw-teal/10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-slate-400" />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-edw-teal"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
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
          <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 md:grid">
            <div className="col-span-5">Document</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Owner</div>
            <div className="col-span-2">Last Updated</div>
            <div className="col-span-1">Status</div>
          </div>
        )}

        {/* Document Results */}
        {filteredDocuments.length > 0 ? (
          viewMode === "list" ? (
            <div className="divide-y divide-slate-100">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-12 md:items-center md:gap-4"
                >
                  <div className="flex items-center gap-3 md:col-span-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-edw-cyan/20 text-edw-teal">
                      <FileText size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-edw-navy">
                        {document.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {document.type}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 md:col-span-2">
                    <span className="md:hidden text-xs text-slate-400">
                      Category:{" "}
                    </span>
                    {document.category}
                  </div>

                  <div className="text-sm text-slate-600 md:col-span-2">
                    <span className="md:hidden text-xs text-slate-400">
                      Owner:{" "}
                    </span>
                    {document.owner}
                  </div>

                  <div className="text-sm text-slate-600 md:col-span-2">
                    <span className="md:hidden text-xs text-slate-400">
                      Updated:{" "}
                    </span>
                    {formatDate(document.updatedAt)}
                  </div>

                  <div className="md:col-span-1">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {document.status}
                    </span>
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

                  <p className="mt-2 text-xs text-slate-500">
                    {document.category}
                  </p>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">{document.owner}</p>

                    <p className="mt-1 text-xs text-slate-400">
                      Updated {formatDate(document.updatedAt)}
                    </p>
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
    </div>
  );
}
