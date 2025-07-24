import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FolderOpen } from "lucide-react";

export default function FileTypeSelection() {
  const { project_id } = useParams();
  const { user } = useAuth();
  const role = user?.role;
  const location = useLocation();
  // Try to get project details from navigation state
  const project = location.state?.project;

  return (
    <section className="mt-4 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-neutral-800">File Explorer</h2>
        {project ? (
          <div className="mt-1 text-slate-700 text-base">
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
          <div className="mt-1 text-slate-700 text-base">
            <span className="font-semibold">Project ID:</span> {project_id}
          </div>
        )}
      </div>
      <div className="flex  rounded-lg shadow   min-h-[320px]">
        <div className="flex-1">
          <div className="font-semibold text-slate-600 mb-4 text-sm md:hidden">
            File Types
          </div>
          <div className="flex flex-col gap-4">
            <Link
              to={`/${role}/documents/${project_id}/outgoing`}
              state={project ? { project } : undefined}
              className="flex items-center gap-4 bg-white rounded-lg shadow-sm px-4 py-3 hover:bg-slate-100 transition"
            >
              <FolderOpen className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-lg font-medium text-slate-800">
                  Ongoing Files
                </div>
                <div className="text-xs text-slate-500">
                  All files you are currently working on
                </div>
              </div>
            </Link>
            <Link
              to={`/${role}/documents/${project_id}/incoming`}
              state={project ? { project } : undefined}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-3 hover:bg-slate-100 transition"
            >
              <FolderOpen className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-lg font-medium text-slate-800">
                  Incoming Files
                </div>
                <div className="text-xs text-slate-500">
                  Files received from other teams or sources
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
