/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { API_ENDPOINT } from "@/config/backend";
import { useAPICall } from "@/hooks/useApiCall";
import { useAuth } from "@/contexts/AuthContext";
import ShowFile from "@/components/ShowFile";
import Submission from "@/components/Submission";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import Loading from "@/components/atomic/Loading";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Phone,
  Mail,
  FileText,
  Info,
  ClipboardList,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirmDialog } from "./ui/alert-dialog";

const ProjectTrack: React.FC = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const { makeApiCall, fetching, fetchType, isFetched } = useAPICall();
  const { authToken, user } = useAuth();
  const isAdmin = user.role == "admin";
  const confirmDialog = useConfirmDialog();

  const [selectedStepIdx, setSelectedStepIdx] = useState(null);
  type DeliveryFile = { id: number; label: string; url: string };
  const [files, setFiles] = useState<DeliveryFile[]>([]); // Store files for delivery
  const [enableDelivery, setEnableDelivery] = useState(false); // Control Make Delivery button
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [selectedDeliveryFiles, setSelectedDeliveryFiles] = useState<number[]>(
    []
  );
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  useEffect(() => {
    document.getElementsByTagName("main")[0].style.overflowY = "hidden";
  }, []);

  useEffect(() => {
    const fetchProject = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_PROJECT_BY_ID(projectId),
        {},
        "application/json",
        authToken,
        "getProject"
      );
      if (response.status === 200) {
        setProject(response.data);
      }
    };
    fetchProject();
    // eslint-disable-next-line
  }, [projectId]);
  useEffect(() => {
    if (project) {
      setEnableDelivery(project.status.toLowerCase() === "completed");
    }
  }, [project]);

  if ((fetching && fetchType == "getProject") || !project) {
    return <Loading />;
  }

  const STEP_CONFIG = [
    {
      label: "Project Creation",
      key: "creation",
      getCompleted: (project) => project.status !== "draft",
      renderContent: (project, stepStatus) => (
        <div className="rounded-2xl shadow-lg border bg-white ">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-400">
            <div className="flex items-center gap-3">
              <FileText className="text-white" size={28} />
              <span className="text-lg font-bold text-white">Project Data</span>
            </div>
            <span className="text-xs font-semibold text-white bg-blue-800 px-2 py-1 rounded capitalize">
              {project.project_id}
            </span>
          </div>
          {/* Details Grid */}
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 border-b">
            <div>
              <span className="font-medium text-slate-700">Client Name:</span>{" "}
              <span className="text-slate-900 capitalize">
                {project.client_name}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-700">
                Client Company:
              </span>{" "}
              <span className="text-slate-900 capitalize">
                {project.client_company}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Location:</span>{" "}
              <span className="text-slate-900 capitalize">
                {project.location}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Project Type:</span>{" "}
              <span className="text-slate-900 capitalize">
                {project.project_type}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Received Date:</span>{" "}
              <span className="text-slate-900 capitalize">
                {new Date(project.received_date).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Priority:</span>{" "}
              <span className="capitalize text-slate-900">
                {project.priority}
              </span>
            </div>
          </div>
          {/* Contact Section */}
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b">
            <div className="flex items-center gap-2">
              <User className="text-blue-700" size={18} />
              <span className="font-medium text-slate-700">
                Contact Person:
              </span>{" "}
              <span className="text-slate-900 capitalize">
                {project.contact_person}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="text-blue-700" size={18} />
              <span className="font-medium text-slate-700">Phone:</span>{" "}
              <span className="text-slate-900 capitalize">
                {project.contact_person_phone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="text-blue-700" size={18} />
              <span className="font-medium text-slate-700">Email:</span>{" "}
              <span className="text-blue-700 lowercase">
                {project.contact_person_email}
              </span>
            </div>
          </div>
          {/* Notes/Description */}
          <div className="px-6 py-4 border-b">
            <div className="text-xs text-slate-500 mb-1">Notes</div>
            <div className="bg-slate-50 rounded p-3 text-slate-800 capitalize">
              {project.notes || (
                <span className="text-slate-400">No notes provided.</span>
              )}
            </div>
          </div>
          {/* Uploaded Files */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="text-blue-700" size={18} />
              <span className="text-xs font-semibold text-slate-700">
                Uploaded Files:
              </span>
            </div>
            <div className="flex flex-wrap gap-2 ml-1">
              {project.uploaded_files && project.uploaded_files.length > 0 ? (
                project.uploaded_files.map((file, i) => (
                  <ShowFile
                    key={file.id || i}
                    label={file.label}
                    url={file.file}
                  />
                ))
              ) : (
                <span className="text-slate-400 text-xs">
                  No files uploaded.
                </span>
              )}
            </div>
          </div>
          {Array.isArray(project.more_info) && project.more_info.length > 0 && (
            <div className="px-6 py-4 border-b">
              <div className="text-sm font-semibold text-blue-600 mb-3">
                Additional Info
              </div>
              <div className="flex flex-col gap-4">
                {project.more_info.map((info, index) => (
                  <div
                    key={info.id || index}
                    className="border rounded-lg p-4 bg-slate-50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Entry #{index + 1}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(info.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      <div>
                        <span className="font-medium text-slate-700">
                          Enquiry:
                        </span>{" "}
                        <span className="text-slate-800 capitalize">
                          {info.enquiry || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">
                          Notes:
                        </span>{" "}
                        <span className="text-slate-800 capitalize">
                          {info.notes || "—"}
                        </span>
                      </div>
                    </div>
                    {info.uploaded_files?.length > 0 && (
                      <div>
                        <div className="font-medium text-slate-700 mb-1">
                          Uploaded Files:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {info.uploaded_files.map((file, i) => (
                            <ShowFile
                              key={file.id || i}
                              label={file.label}
                              url={file.file}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Progression Bar */}
          <div className="px-6 py-4 flex items-center gap-3">
            <Progress
              value={project.status == "draft" ? 50 : 100}
              className="h-2 bg-gray-200 flex-1"
            />
            <span className="text-xs font-mono text-slate-600">
              {project.status == "draft" ? 50 : 100}
            </span>
          </div>
        </div>
      ),
    },
    {
      label: "Project Estimation",
      key: "estimation",
      status: project.estimation_status,
      getCompleted: (project) =>
        project.estimation && project.estimation.sent_to_pm == true,
      renderContent: (project, stepStatus) => (
        <div className="rounded-2xl shadow-lg border bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-gradient-to-r from-green-600 to-green-400">
            <div className="flex items-center gap-3">
              <FileText className="text-white" size={28} />
              <span className="text-lg font-bold text-white">
                Estimation Data
              </span>
            </div>
            <span className="text-xs font-semibold text-white bg-green-800 px-2 py-1 rounded capitalize">
              {project.project_id}
            </span>
          </div>
          {/* If no estimation, show message */}
          {!project.estimation ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileText size={40} className="mb-2" />
              <div className="text-lg font-semibold">
                Estimation not yet added
              </div>
            </div>
          ) : (
            <>
              {/* Details Grid */}
              <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 border-b">
                <div>
                  <span className="font-medium text-slate-700">Status:</span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation_status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Cost:</span>{" "}
                  <span className="text-slate-900">
                    ₹{project.estimation.cost.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Deadline:</span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation.deadline}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">
                    Approval Date:
                  </span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation.approval_date}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Approved:</span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation.approved ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">
                    Sent to PM:
                  </span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation.sent_to_pm ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">
                    Reviewed By:
                  </span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation.user?.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">
                    Forwarded To:
                  </span>{" "}
                  <span className="text-slate-900 capitalize">
                    {project.estimation.forwarded_to?.name}
                  </span>
                </div>
              </div>
              {/* Log, Notes, Updates */}
              <div className="px-6 py-4 border-b grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Log</div>
                  <div className="bg-slate-50 rounded p-3 text-slate-800 capitalize">
                    {project.estimation.log || (
                      <span className="text-slate-400">No log provided.</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Notes</div>
                  <div className="bg-slate-50 rounded p-3 text-slate-800 capitalize">
                    {project.estimation.notes || (
                      <span className="text-slate-400">No notes provided.</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-500 mb-1">Updates</div>
                  <div className="bg-slate-50 rounded p-3 text-slate-800 capitalize">
                    {project.estimation.updates || (
                      <span className="text-slate-400">
                        No updates provided.
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Uploaded Files */}
              <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="text-green-700" size={18} />
                  <span className="text-xs font-semibold text-slate-700">
                    Estimation Files:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 ml-1">
                  {project.estimation &&
                  project.estimation.uploaded_files &&
                  project.estimation.uploaded_files.length > 0 ? (
                    project.estimation.uploaded_files.map((file, i) => (
                      <ShowFile
                        key={file.id || i}
                        label={file.label}
                        url={file.file}
                      />
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">
                      No files uploaded.
                    </span>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-b">
                <div className="font-semibold text-blue-700 mb-1 flex items-center gap-2">
                  <AlertCircle size={18} className="text-blue-500" />
                  Corrections:{" "}
                  {!project.estimation.corrections && (
                    <span className="text-xs text-gray-400">
                      No Correction made
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {project.estimation.corrections &&
                  project.estimation.corrections.length > 0 ? (
                    project.estimation.corrections.map((corr, i) => (
                      <div
                        key={corr.id}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-2 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-1 md:mb-0">
                          <AlertCircle
                            size={18}
                            className="text-blue-400 shrink-0"
                          />
                          <span className="font-semibold text-blue-800 text-xs md:text-sm ">
                            Correction #
                            {project.estimation.corrections.length - i}
                          </span>
                        </div>
                        <div
                          className="flex-1 text-slate-800 text-sm md:text-base max-w-full break-words"
                          style={{ maxWidth: "600px", wordBreak: "break-word" }}
                        >
                          {corr.correction}
                        </div>
                        <div className="text-xs text-gray-500 ml-auto whitespace-nowrap">
                          {new Date(corr.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 ml-2 text-xs">
                      No corrections made.
                    </div>
                  )}
                </div>
              </div>
              {/* Progression Bar */}
              <div className="px-6 py-4 pt-4 flex items-center gap-3">
                <Progress
                  value={
                    project.status == "estimating" ? project.progress : 100
                  }
                  className="h-2 bg-gray-200 flex-1"
                />
                <span className="text-xs font-mono text-slate-600">
                  {project.status == "estimating" ? project.progress : 100}%
                </span>
              </div>
              {/* Admin Action Buttons */}
              {project.estimation_status === "sent_to_admin" && isAdmin && (
                <div className="w-full flex flex-col sm:flex-row gap-2 mt-6 px-6 pb-4">
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    onClick={handleCloseProject}
                    loading={fetching && fetchType == "EditCloseProject"}
                  >
                    Close this project
                  </Button>
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white flex-1"
                    onClick={() => setShowCorrectionDialog(true)}
                  >
                    Correction request
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    onClick={handleApproveProject}
                    loading={fetching && fetchType == "ApproveEstimation"}
                    disabled={fetching && fetchType == "ApproveEstimation"}
                  >
                    Approve
                  </Button>
                </div>
              )}
              {/* Correction Request Dialog */}
              <Dialog
                open={showCorrectionDialog}
                onOpenChange={setShowCorrectionDialog}
              >
                <DialogContent>
                  <DialogHeader className="px-6 py-4">
                    <DialogTitle>Correction Request</DialogTitle>
                  </DialogHeader>
                  <div className="p-6">
                    <div className="mb-4 ">
                      <label className="block font-medium mb-1">
                        Correction Details
                      </label>
                      <textarea
                        className="border rounded w-full p-2 text-sm"
                        rows={3}
                        value={correctionText}
                        onChange={(e) => setCorrectionText(e.target.value)}
                        placeholder="Enter correction details..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCorrectionDialog(false)}
                        disabled={
                          fetching && fetchType == "createEstimationCorrection"
                        }
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        onClick={handleCorrectionRequest}
                        loading={
                          fetching && fetchType == "createEstimationCorrection"
                        }
                        disabled={
                          fetching && fetchType == "createEstimationCorrection"
                        }
                      >
                        Send Correction
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      ),
    },
    {
      label: "Project Working",
      key: "working",
      getCompleted: (project) => project.status.toLowerCase() != "working",
      renderContent: (project) => (
        <div className="space-y-2">
          <div className="flex flex-row justify-between items-center">
            <h2 className="text-xl font-bold text-blue-800 mb-2">
              Project Working
            </h2>
          </div>
          <Submission projectId={project.id} />
        </div>
      ),
    },
    {
      label: "Project Delivery",
      key: "delivery",
      getCompleted: (project) => project.status == "delivered",
      renderContent: (project) => (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-blue-800 mb-2">
              Delivery Files
            </h2>
            {!isAdmin &&
              enableDelivery &&
              project.delivery_files.length == 0 && (
                <Button
                  className="text-white font-semibold px-4 py-2 rounded shadow"
                  onClick={handleMakeDeliveryClick}
                  loading={fetching && fetchType == "getDeliveryFiles"}
                >
                  Make Delivery
                </Button>
              )}
          </div>
          <div className="flex flex-wrap gap-2">
            {project.delivery_files && project.delivery_files.length > 0 ? (
              project.delivery_files.map((file, i) => (
                <ShowFile
                  key={file.id || i}
                  label={file.label}
                  url={file.file || file.url}
                />
              ))
            ) : (
              <span className="text-slate-400">
                No delivery files available.
              </span>
            )}
          </div>
        </div>
      ),
    },
  ];
  const getStepStatus = (project) => {
    let foundCurrent = false;
    return STEP_CONFIG.map((step, idx) => {
      const completed = step.getCompleted(project);
      if (foundCurrent) {
        return { ...step, completed: false, current: false, notStarted: true };
      }
      if (completed)
        return { ...step, completed: true, current: false, notStarted: false };
      else {
        foundCurrent = true;
        return { ...step, completed: false, current: true, notStarted: false };
      }
    });
  };

  const STEP_ICONS = [FileText, ClipboardList, Clock, CheckCircle2];
  const steps = getStepStatus(project);
  const defaultStepIdx = steps.findIndex((step) => step.current);
  const currentStepIdx =
    selectedStepIdx !== null
      ? selectedStepIdx
      : defaultStepIdx !== -1
      ? defaultStepIdx
      : 0;
  const currentStep = steps[currentStepIdx] || steps[-1];

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
      API_ENDPOINT.ADD_DELIVERY_FILES(project.id),
      { file_ids: selectedDeliveryFiles },
      "application/json",
      authToken,
      "addDeliverySubmit"
    );
    if (response.status === 201) {
      setProject({
        ...project,
        delivery_files: response.data,
        status: "delivered",
      });
      setShowDeliveryDialog(false);
    } else {
      toast.error("Failed to fetch final files");
      setShowDeliveryDialog(true);
    }
  };

  // Fetch delivery files when Make Delivery is clicked
  const handleMakeDeliveryClick = async () => {
    if (files.length != 0) {
      setShowDeliveryDialog(true);
      return;
    }
    try {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_DELIVERY_FILES(project.id),
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

  const handleCloseProject = async () => {
    const confirmed = await confirmDialog({
      title: "Close Project",
      description: `Are you sure you want to close this project?`,
      confirmText: "Close",
      cancelText: "Cancel",
    });
    if (confirmed) {
      const response = await makeApiCall(
        "patch",
        API_ENDPOINT.EDIT_PROJECT(project.id),
        {
          estimation_status: "rejected",
          status: "rejected",
        },
        "application/json",
        authToken,
        `EditCloseProject`
      );
      if (response.status == 200) {
        setProject({
          ...project,
          estimation_status: response.data.estimation_status,
          progress: response.data.progress,
        });
        toast.success("Successfully marked as closed");
      } else {
        toast.error(`Failed to mark as closed`);
      }
    }
  };
  const handleApproveProject = async () => {
    const data = {
      project_id: project.id,
      approved: true,
      sent_to_pm: true,
    };
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_ESTIMATION(project.estimation.id),
      data,
      "application/json",
      authToken,
      "ApproveEstimation"
    );
    if (response.status == 200) {
      setProject({
        ...project,
        estimation_status: "approved",
        status: "working",
        estimation: { ...project.estimation, sent_to_pm: true, approved: true },
      });
      toast.success(response.detail);
    } else {
      toast.error("Failed to update estimation");
    }
  };
  const handleCorrectionRequest = async () => {
    if (!correctionText) {
      toast.error("Correction is required");
      return;
    }
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_ESTIMATION_CORRECTION,
      {
        correction: correctionText,
        estimation_id: project.estimation.id,
        project_id: project.id,
      },
      "application/json",
      authToken,
      "createEstimationCorrection"
    );
    if (response.status == 201) {
      setProject((prevProject) => ({
        ...prevProject,
        estimation_status: response.data.project.estimation_status,
        progress: response.data.project.progress,
        estimation: {
          ...prevProject.estimation,
          corrections: [
            response.data.estimationCorrection,
            ...(prevProject.estimation.corrections || []),
          ],
        },
      }));
      toast.success("Successfully submitted correction request");
      setShowCorrectionDialog(false);
      setCorrectionText("");
    } else {
      toast.success("Failed to submit correction request");
    }
  };
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 ">
      {/* Step Content */}
      <div className="w-full flex flex-col items-center pt-8 pb-4 px-2 md:px-8">
        <div className="w-full max-w-full overflow-x-auto whitespace-nowrap flex flex-row items-start justify-between gap-1 md:gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[idx] || FileText;
            let circleColor = "bg-gray-200 text-gray-500";
            let border = "border-transparent";
            let iconColor = "text-gray-400";
            let labelColor = "text-gray-500";
            let shadow = "";
            if (step.completed) {
              circleColor = "bg-green-500 text-white";
              iconColor = "text-white";
              labelColor = "text-green-700 font-semibold";
            } else if (step.current) {
              circleColor = "bg-yellow-400 text-white ";
              border = "border-2 border-blue-700";
              iconColor = "text-white";
              labelColor = "text-yellow-700 font-semibold";
              shadow = "shadow-lg";
            }
            const status = step.status;
            if (status == "rejected") {
              circleColor = "bg-red-500 text-white";
              border = "border-2 border-red-600";
              iconColor = "text-white";
              labelColor = "text-red-700 font-semibold";
              shadow = "shadow-lg";
            }
            return (
              <button
                key={step.key}
                className={`relative inline-flex md:flex flex-col items-center group focus:outline-none bg-transparent transition-all duration-150 ${
                  idx < steps.length - 1 ? "mr-2 md:mr-0" : ""
                }`}
                style={{ minWidth: 50 }}
                onClick={() => setSelectedStepIdx(idx)}
                type="button"
                tabIndex={0}
                disabled={step.notStarted}
              >
                {/* Horizontal line */}
                {idx < steps.length - 1 && (
                  <span className="absolute top-1/2 left-full w-full h-0.5 md:h-1 bg-gradient-to-r from-gray-200 to-gray-100 z-0 -translate-y-1/2" />
                )}
                {/* Step circle with icon */}
                <span
                  className={`z-10 w-8 h-8 md:w-14 md:h-14 flex items-center justify-center rounded-full border-4 ${border} ${circleColor} ${shadow} transition-all duration-150`}
                >
                  <Icon className={`w-4 h-4 md:w-7 md:h-7 ${iconColor}`} />
                </span>
                <span
                  className={`mt-1 md:mt-2 text-[10px] md:text-base ${labelColor} tracking-wide text-center`}
                >
                  {step.label}
                </span>
                {step.completed && (
                  <div className="text-[10px] md:text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                    Completed
                  </div>
                )}
                {step.current && (
                  <div className="text-[10px] md:text-xs text-yellow-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 md:w-4 md:h-4" />
                    Current
                  </div>
                )}
                {step.notStarted && (
                  <div className="text-[10px] md:text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 md:w-4 md:h-4" />
                    Not Started
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 bg-white flex justify-center items-start px-0 md:px-0  h-full  max-h-screen overflow-y-auto ">
        <div className="w-full bg-white rounded-2xl  p-2 md:p-8 border min-h-[30px] flex flex-col justify-start mt-2 ">
          {currentStep.renderContent(project, currentStep)}
        </div>
      </div>
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent >
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Select Files for Delivery</DialogTitle>
          </DialogHeader>
          <div className="p-6">

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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectTrack;
