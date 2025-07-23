import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_ENDPOINT } from "@/config/backend";
import Loading from "./atomic/Loading";

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

  const { user, authToken } = useAuth();

  const [files, setFiles] = useState<IDocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  const role = user?.role;

  useEffect(() => {
    console.log("User ID:", userId);
    console.log("Role:", role);
    console.log("Project ID:", project_id);
    console.log("Type:", type);
  }, [userId, role, project_id, type]);

  const fetchFiles = useCallback(async () => {
    if (!project_id || !type || !userId || !role) {
      setError("Missing required parameters.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL(API_ENDPOINT.GET_ALL_PROJECT_UPLOAD_FILES);
      url.searchParams.append("project_id", project_id);
      url.searchParams.append("type", type);
      url.searchParams.append("user_id", userId.toString());
      url.searchParams.append("role", role);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      console.log("Fetched files response:", json);

      // ✅ Use the actual response shape
      if (Array.isArray(json.data)) {
        setFiles(json.data);
      } else {
        setFiles([]);
        setError("Invalid data format received.");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to fetch files.");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [project_id, type, userId, role, authToken]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  if (!project_id || !type) {
    return (
      <div className="text-red-600 font-bold p-4">
        Missing route parameters: `project_id` or `type`
      </div>
    );
  }

  if (isLoading) return <Loading full />;

  if (error)
    return (
      <div className="text-red-600 font-semibold p-4">
        Error loading files: {error}
      </div>
    );

  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold mb-4">
        File Details for Project ID: {project_id} / {type}
      </h2>
      {files.length === 0 ? (
        <p>No files found.</p>
      ) : (
        <ul className="space-y-3">
          {files.map((file) => (
            <li key={file.id} className="border p-3 rounded shadow-sm">
              <p>
                <strong>{file.label}</strong>
              </p>
              <p>
                <a
                  href={file.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View File
                </a>
              </p>
              <p>Status: {file.status}</p>
              <p>Uploaded By: {file.uploaded_by_name ?? "Unknown"}</p>
              <p>Direction: {file.direction ?? "N/A"}</p>
              <p>Uploaded At: {new Date(file.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
