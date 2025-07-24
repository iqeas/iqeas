import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_ENDPOINT } from "@/config/backend";
import Loading from "./atomic/Loading";
import { useAPICall } from "@/hooks/useApiCall";
import toast from "react-hot-toast";
import { FileText, User2, Download, Eye } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface IDocumentFile {
  id: number;
  label: string;
  file: string;
  uploaded_by_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  uploaded_by_name?: string;
  direction?: string;
}

export default function DocumentFiles() {
  const { project_id, type } = useParams<{
    project_id?: string;
    type?: string;
  }>();

  const location = useLocation();
  const project = location.state?.project;

  const { user, authToken } = useAuth();

  const [files, setFiles] = useState<IDocumentFile[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 2;
  const [totalPages, setTotalPages] = useState(1);
  const { makeApiCall, fetching, isFetched, fetchType } = useAPICall();

  const userId = user?.id;
  const role = user?.role;

  const fetchFiles = useCallback(async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_ALL_PROJECT_UPLOAD_FILES(
        project_id,
        type,
        page,
        pageSize,
        searchTerm
      ),
      {},
      "application/json",
      authToken,
      "fetchFiles"
    );
    if (response.status === 200) {
      // Support both array and paginated object response
      if (Array.isArray(response.data)) {
        setFiles(response.data);
        setTotalPages(1);
      } else {
        setFiles(response.data.files || []);
        setTotalPages(response.data.total_pages || 1);
      }
    } else {
      setFiles([]);
      setTotalPages(1);
      toast.error("Failed to fetch files");
    }
  }, [
    project_id,
    type,
    userId,
    role,
    authToken,
    makeApiCall,
    page,
    pageSize,
    searchTerm,
  ]);

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFiles]);

  if (!project_id || !type) {
    return (
      <div className="text-red-600 font-bold p-4">
        Missing route parameters: `project_id` or `type`
      </div>
    );
  }

  if (!isFetched) return <Loading full />;

  return (
    <section className="mt-4 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-800 mb-1 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-500" />
          Files for Project{" "}
          <span className="text-blue-700">
            {project?.project_id || project_id}
          </span>{" "}
          / <span className="capitalize text-green-700">{type}</span>
        </h2>
        {project ? (
          <div className="text-slate-700 text-base mt-1">
            <div>
              <span className="font-semibold">Project Name:</span>{" "}
              {project.name}
            </div>
            <div>
              <span className="font-semibold">Project ID:</span>{" "}
              {project.project_id || project_id}
            </div>
            {project.description && (
              <div>
                <span className="font-semibold">Description:</span>{" "}
                {project.description}
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-700 text-base mt-1">
            <span className="font-semibold">Project ID:</span> {project_id}
          </div>
        )}
        <div className="text-slate-600 text-sm mt-1">
          All uploaded files for this project and type.
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchTerm(searchInput);
            setPage(1);
          }}
          className="flex gap-2 mb-6 py-6"
        >
          <Input
            placeholder="Search projects..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rounded-md  focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <Button type="submit" variant="secondary" className="rounded-md">
            Search
          </Button>
        </form>
      </div>
      {fetching && <Loading full={false} />}
      {!fetching && files.length === 0 && (
        <div className="text-slate-400 text-center py-12">No files found.</div>
      )}
      {!fetching && (
        <div className="flex flex-col gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-4 hover:bg-slate-50 transition"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full">
                <FileText className="w-7 h-7 text-blue-500" />
              </div>
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                  <div>
                    <div className="text-lg font-semibold text-slate-800 mb-1">
                      {file.label}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600 mb-1">
                      <span className="flex items-center gap-1">
                        <User2 className="w-4 h-4" />{" "}
                        {file.uploaded_by_name ?? "Unknown"}
                      </span>
                      <span>
                        Direction:{" "}
                        <span className="font-medium text-slate-700">
                          {file.direction ?? "N/A"}
                        </span>
                      </span>
                      <span>
                        Uploaded: {new Date(file.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 sm:mt-0">
                    <span
                      className={
                        "px-2 py-1 rounded text-xs font-semibold " +
                        (file.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : file.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : file.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700")
                      }
                    >
                      {file.status.charAt(0).toUpperCase() +
                        file.status.slice(1)}
                    </span>
                    <a
                      href={file.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium shadow hover:bg-blue-700 transition"
                      aria-label="View File"
                    >
                      <Eye className="w-4 h-4" /> View
                    </a>
                    <a
                      href={file.file}
                      download
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-200 text-slate-700 text-xs font-medium shadow hover:bg-slate-300 transition"
                      aria-label="Download File"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx + 1}
              className={`px-3 py-1 rounded border text-sm ${
                page === idx + 1
                  ? "bg-blue-600 text-white"
                  : "bg-white border-slate-300 hover:bg-slate-100"
              }`}
              onClick={() => setPage(idx + 1)}
            >
              {idx + 1}
            </button>
          ))}
          <button
            className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
