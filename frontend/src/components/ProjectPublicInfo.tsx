import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_ENDPOINT } from "@/config/backend";
import { useAPICall } from "@/hooks/useApiCall";
import ShowFile from "@/components/ShowFile";
import Loading from "@/components/atomic/Loading";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  FileText,
  MapPin,
  User,
  Building2,
  Calendar,
  Layers3,
  ClipboardList,
  DollarSign,
  Clock,
  Info,
} from "lucide-react";

const capitalize = (str) => (str ? str.toString().toUpperCase() : "-");

const StageStatusBadge = ({ status }) => {
  const color =
    status === "completed"
      ? "bg-green-500 text-white"
      : status === "in_progress"
      ? "bg-yellow-500 text-white"
      : "bg-gray-300 text-gray-700";
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {capitalize(status)}
    </span>
  );
};
const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case "draft":
      return "bg-gray-200 text-gray-700 border border-gray-300";
    case "estimating":
      return "bg-yellow-100 text-yellow-700 border border-yellow-300";
    case "working":
      return "bg-blue-100 text-blue-700 border border-blue-300";
    case "delivered":
      return "bg-green-100 text-green-700 border border-green-300";
    case "completed":
      return "bg-green-100 text-green-700 border border-green-300";
    case "rejected":
      return "bg-red-100 text-red-700 border border-red-300";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-300";
  }
};

const ProjectPublicInfo = () => {
  const { token } = useParams();
  const { makeApiCall } = useAPICall();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_PUBLIC_PROJECT_INFO(token),
        {},
        "application/json",
        undefined,
        "getPublicProjectInfo"
      );
      if (response.status === 200) {
        setProject(response.data);
      }
      setLoading(false);
    };
    if (token) fetchProject();
  }, [token]);

  if (loading) return <Loading full={true} />;
  if (!project)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <AlertCircle size={40} className="mb-2" />
        <div className="text-lg font-semibold">No project found</div>
      </div>
    );

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center px-2 py-4">
      {/* Project Header */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-4 md:p-8 mb-6 mt-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            <div>
              <div className="text-lg md:text-2xl font-bold text-blue-800 tracking-wide">
                {capitalize(project.name)}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {project.project_id}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <User size={16} /> {capitalize(project.client_name)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Building2 size={16} /> {capitalize(project.client_company)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin size={16} /> {capitalize(project.location)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Layers3 size={16} /> {capitalize(project.project_type)}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar size={16} />
              {project.received_date
                ? new Date(project.received_date).toLocaleDateString()
                : "-"}
            </span>
          </div>
        </div>

        {/* Notes + Progress */}
        <div className="flex flex-col md:flex-row gap-4 mt-2">
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-xs text-gray-500 mb-1">Progress</div>
            <Progress value={parseFloat(project.progress)} className="h-2" />
            <div className="text-xs text-gray-700 mt-1">
              {project.progress}% completed
            </div>
          </div>
        </div>
        <div
          className={`w-full max-w-2xl mb-4 p-3 rounded-lg text-center font-semibold text-lg mt-4 ${getStatusStyle(
            project.status
          )}`}
        >
          {capitalize(project.status)}
        </div>
      </div>

      {/* Estimation Info */}
      {project.estimation && (
        // <div className="w-full max-w-2xl bg-white rounded-xl shadow p-4 md:p-8 mb-6">
        //   <div className="flex items-center gap-2 mb-3">
        //     <DollarSign className="text-blue-600" size={22} />
        //     <div className="text-lg font-semibold text-blue-800">
        //       Estimation
        //     </div>
        //   </div>
        //   <div className="text-sm text-gray-600 flex flex-col gap-1">
        //     <span>Status: {capitalize(project.estimation.status)}</span>
        //     <span>Cost: {project.estimation.cost ?? "-"}</span>
        //     <span>
        //       Deadline:{" "}
        //       {project.estimation.deadline
        //         ? new Date(project.estimation.deadline).toLocaleDateString()
        //         : "-"}
        //     </span>
        //     <span>
        //       Approved: {project.estimation.approved ? "Yes" : "No"}
        //       {project.estimation.approval_date &&
        //         ` (${new Date(
        //           project.estimation.approval_date
        //         ).toLocaleDateString()})`}
        //     </span>
        //     <span>Notes: {project.estimation.notes ?? "-"}</span>
        //   </div>
        // </div>
        <></>
      )}

      {/* Delivery Files */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-4 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="text-blue-600" size={22} />
          <div className="text-lg font-semibold text-blue-800">
            Delivery Files
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {project.delivery_files && project.delivery_files.length > 0 ? (
            project.delivery_files.map((file) => (
              <ShowFile key={file.id} label={file.label} url={file.file} />
            ))
          ) : (
            <span className="text-gray-400">No delivery files available.</span>
          )}
        </div>
      </div>

      {/* Stages */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-4 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Layers3 className="text-blue-600" size={22} />
          <div className="text-lg font-semibold text-blue-800">
            Workflow Stages
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {project.stages && project.stages.length > 0 ? (
            project.stages.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-700 text-base">
                    {capitalize(stage.name)}
                  </span>
                  <StageStatusBadge status={stage.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>Revision: {capitalize(stage.revision)}</span>
                  <span>Hours: {stage.allocated_hours}</span>
                  <span>
                    Updated:{" "}
                    {stage.updated_at
                      ? new Date(stage.updated_at).toLocaleString()
                      : "-"}
                  </span>
                  <span>Weight: {stage.weight}</span>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-400">No workflow stages available.</span>
          )}
        </div>
      </div>

      {/* Last Update */}
      {project.last_update && (
        <div className="w-full max-w-2xl bg-white rounded-xl shadow p-4 md:p-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="text-blue-600" size={22} />
            <div className="text-lg font-semibold text-blue-800">
              Latest Update
            </div>
          </div>
          <div className="text-sm text-gray-600 flex flex-col gap-1">
            <span>Step: {capitalize(project.last_update.step_name)}</span>
            <span>Status: {capitalize(project.last_update.status)}</span>
            <span>Notes: {project.last_update.notes ?? "-"}</span>
            <span>
              Updated:{" "}
              {project.last_update.updated_at
                ? new Date(project.last_update.updated_at).toLocaleString()
                : "-"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPublicInfo;
