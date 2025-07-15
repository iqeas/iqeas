/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ENDPOINT } from "@/config/backend";
import { useAPICall } from "@/hooks/useApiCall";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

interface ProjectSlidingPanelProps {
  selectedProject: Project;
  setProjects: any;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  console.log(status);
  switch (status.toLowerCase()) {
    case "draft":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "estimating":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "working":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-slate-200 text-slate-600 border-slate-200";
  }
};

const ProjectSlidingPanel: React.FC<ProjectSlidingPanelProps> = ({
  selectedProject,
  onClose,
  setProjects,
}) => {
  const [showEstimationModal, setShowEstimationModal] = useState(false);
  type DeliveryFile = { id: number; label: string; url: string };
  const [files, setFiles] = useState<DeliveryFile[]>([]); // Store files for delivery
  const [enableDelivery, setEnableDelivery] = useState(false); // Control Make Delivery button
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [selectedDeliveryFiles, setSelectedDeliveryFiles] = useState<number[]>(
    []
  );
  const { makeApiCall, fetching, fetchType } = useAPICall();
  const { authToken } = useAuth();

  // Handler for file selection in delivery dialog
  const handleFileToggle = (fileId: number) => {
    setSelectedDeliveryFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  // Handler for delivery submit
  const handleDeliverySubmit = async () => {
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.ADD_DELIVERY_FILES(selectedProject.id),
      { file_ids: selectedDeliveryFiles },
      "application/json",
      authToken,
      "addDeliverySubmit"
    );
    if (response.status === 201) {
      setProjects((prev) =>
        prev.map((item) => {
          if (item.id == selectedProject.id) {
            return { ...selectedProject, delivery_files: response.data };
          }
        })
      );
      setShowDeliveryDialog(false);
    } else {
      toast.error("Failed to fetch final files");
      setShowDeliveryDialog(true);
    }
  };

  // Enable delivery if all stages are approved (status 'completed')
  React.useEffect(() => {
    setEnableDelivery(selectedProject.status.toLowerCase() === "completed");
  }, [selectedProject.status]);

  // Fetch delivery files when Make Delivery is clicked
  const handleMakeDeliveryClick = async () => {
    if (files.length != 0) {
      setShowDeliveryDialog(true);
      return;
    }
    try {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_DELIVERY_FILES(selectedProject.id),
        {},
        "application/json",
        authToken,
        "getDeliveryFiles"
      );
      if (response.status === 200 && Array.isArray(response.data)) {
        setFiles(response.data);
      } else {
        setFiles([]);
        toast.error("Failed to fetch final files");
      }
      setShowDeliveryDialog(true);
    } catch (err) {
      setFiles([]);
      setShowDeliveryDialog(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black bg-opacity-20"
        onClick={onClose}
      />
      <div className="relative w-full h-full bg-white p-6 flex flex-col overflow-y-auto">
        <div className="mb-6">
          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-2xl text-blue-900">
                  {selectedProject.name}
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1 font-semibold">
                  {selectedProject.project_id}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-1 font-semibold border border-slate-200">
                  {selectedProject.project_type}
                </span>
                <span
                  className={`ml-auto px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(
                    selectedProject.status
                  )}`}
                >
                  {selectedProject.status.charAt(0).toUpperCase() +
                    selectedProject.status.slice(1)}
                </span>
                <div className="flex flex-col items-end ml-4 min-w-[120px]">
                  <span className="text-xs text-slate-600 mb-1">
                    Progress: {selectedProject.progress}%
                  </span>
                  <Progress
                    value={selectedProject.progress}
                    className="h-2 w-24 bg-slate-100"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Client</p>
                  <div className="font-medium text-slate-800">
                    {selectedProject.client_name}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Priority</p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      selectedProject.priority === "High"
                        ? "bg-red-100 text-red-700"
                        : selectedProject.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {selectedProject.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Created</p>
                  <div className="text-slate-700 text-sm">
                    {new Date(selectedProject.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1">Contact Person</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">
                    {selectedProject.contact_person}
                  </span>
                  {selectedProject.contact_person_phone && (
                    <span className="text-xs text-slate-500 ml-2">
                      {selectedProject.contact_person_phone}
                    </span>
                  )}
                  {selectedProject.contact_person_email && (
                    <span className="text-xs text-blue-600 ml-2 underline">
                      {selectedProject.contact_person_email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estimation Details Section as Modal */}
        <div className="mb-6 flex gap-4 items-center justify-between">
          {selectedProject.estimation && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
              onClick={() => setShowEstimationModal(true)}
            >
              View Estimation
            </Button>
          )}
          {/* Project Final Delivery Files */}

          {enableDelivery && selectedProject.delivery_files.length == 0 && (
            <Button
              className="text-white font-semibold px-4 py-2 rounded shadow"
              onClick={handleMakeDeliveryClick}
              loading={fetching && fetchType == "getDeliveryFiles"}
            >
              Make Delivery
            </Button>
          )}
          <Dialog
            open={showEstimationModal}
            onOpenChange={setShowEstimationModal}
          >
            <DialogContent className="max-w-3xl p-0 m-0">
              <AdminEstimationStage
                estimationDetails={selectedProject.estimation}
              />
            </DialogContent>
          </Dialog>
          {/* Delivery Dialog */}
          <Dialog
            open={showDeliveryDialog}
            onOpenChange={setShowDeliveryDialog}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Select Files for Delivery</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {files.length === 0 ? (
                  <div className="text-slate-500 text-center">
                    No files available for delivery.
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 border rounded p-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDeliveryFiles.includes(file.id)}
                        onChange={() => handleFileToggle(file.id)}
                        className="accent-blue-600"
                      />
                      <ShowFile label={file.label} url={file.url} />
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeliveryDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleDeliverySubmit}
                  loading={fetching && fetchType == "addDeliverySubmit"}
                  disabled={fetching && fetchType == "addDeliverySubmit"}
                >
                  Submit Delivery
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {Array.isArray(selectedProject.delivery_files) &&
          selectedProject.delivery_files.length > 0 && (
            <div className="w-full mt-4">
              <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                Project Final Delivery Files:
              </div>
              <div className="flex flex-wrap gap-2 mr-2">
                {selectedProject.delivery_files.map((f: any, i: number) => (
                  <ShowFile
                    key={f.id || i}
                    label={f.label || ""}
                    url={f.file || f.url || ""}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Submission component with file and delivery state handlers */}
        <Submission projectId={selectedProject.id} />
        <Button className="mt-6" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default ProjectSlidingPanel;
