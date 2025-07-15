import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Deliverables } from "./Deliverables";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, Users, Clock, AlertCircle } from "lucide-react";
import TaskAssignmentPage from "./TaskAssignmentPage";
import Submission from "./Submission";
import ShowFile from "./ShowFile";
import AdminEstimationStage from "./AdminEstimationStage";
import { Project } from "@/types/apiTypes";



interface ProjectSlidingPanelProps {
  selectedProject: Project;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Data Collection":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Under Estimation":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "In Progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Finalized":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "text-red-600";
    case "Medium":
      return "text-yellow-600";
    case "Low":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
};

const ProjectSlidingPanel: React.FC<ProjectSlidingPanelProps> = ({
  selectedProject,
  onClose,
}) => {
  const [showEstimationDetails, setShowEstimationDetails] = useState(false);
 
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black bg-opacity-20"
        onClick={onClose}
      />
      <div className="relative w-full h-full bg-white p-6 flex flex-col overflow-y-auto">
        {/* Project Details */}
        <div className="mb-6">
          <div className="border rounded-xl p-6 bg-slate-50 mb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-slate-800 text-lg">
                    {selectedProject.id}
                  </h3>
                  <Badge className={getStatusColor(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                  {/* {isOverdue && (
                    <AlertCircle size={16} className="text-red-500" />
                  )} */}
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-1">
                  {selectedProject.client_name}
                </h2>
                <div className="flex items-center text-sm text-slate-500 space-x-4 mb-1">
                  <span className="flex items-center">
                    <MapPin size={14} className="mr-1" />
                    {selectedProject.location}
                  </span>
                  <span className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {new Date(selectedProject.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-end flex-col gap-4 min-w-[180px]">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Progress</p>
                  <div className="flex items-center space-x-2">
                    <Progress
                      value={20}
                      className="w-20"
                    />
                    <span className="text-sm font-medium">
                      {20}%
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Priority</p>
                  <span
                    className={`text-sm font-medium ${getPriorityColor(
                      selectedProject.priority
                    )}`}
                  >
                    {selectedProject.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estimation Details Section */}
        <div className="mb-6">
          <button
            className="flex items-center justify-between w-full px-4 py-2 bg-slate-100 rounded hover:bg-slate-200"
            onClick={() => setShowEstimationDetails((v) => !v)}
          >
            <span className="font-semibold text-blue-700">
              Estimation Details
            </span>
            <span>{showEstimationDetails ? "▲" : "▼"}</span>
          </button>
          {showEstimationDetails && selectedProject.estimation && (
            <div className="p-0">
              <AdminEstimationStage
                estimationDetails={selectedProject.estimation}
              />
            </div>
          )}
        </div>

        <Submission projectId={selectedProject.id} />
        <Button className="mt-6" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default ProjectSlidingPanel;
