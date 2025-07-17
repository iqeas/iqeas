/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  X,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ShowFile from "./ShowFile";
import ProjectDocumentsDropdown from "./ProjectDocumentsDropdown";
import { useAPICall } from "@/hooks/useApiCall";
import { useAuth } from "@/contexts/AuthContext";
import { API_ENDPOINT } from "@/config/backend";
import type { DocumentationTask } from "@/types/apiTypes";
import Loading from "./atomic/Loading";
import toast from "react-hot-toast";
import { useLocation, useParams } from "react-router-dom";

export const DocumentationDashboard = () => {
  const { makeApiCall, fetching, fetchType, isFetched } = useAPICall();
  const { authToken } = useAuth();
  const { projectId } = useParams();
  const location = useLocation();
  const [project,setProject] = useState<any>()
  const [tasks, setTasks] = useState<DocumentationTask[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewDetail, setViewDetail] = useState<DocumentationTask | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    task: DocumentationTask | null;
  }>({ open: false, task: null });
  const [rejectFiles, setRejectFiles] = useState<
    { file: File; label: string; tempUrl: string }[]
  >([]);
  const [rejectNotes, setRejectNotes] = useState("");
  const [backToApprovalModal, setBackToApprovalModal] = useState<{
    open: boolean;
    task: DocumentationTask | null;
  }>({ open: false, task: null });
  const [backToApprovalNotes, setBackToApprovalNotes] = useState("");
  const [sentToSelectedFiles, setSentToSelectedFiles] = useState([]);
  const [currentSentToFiles, setCurrentSentToFiles] = useState([]);
  // Fetch tasks
  useEffect(() => {
    fetchTasks();
  }, [page]);
  const fetchTasks = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_WORKER_TASKS(projectId, page, 20),
      {},
      "application/json",
      authToken,
      "getDocumentationTasks"
    );
    if (
      response.status === 200 &&
      response.data &&
      Array.isArray(response.data.tasks)
    ) {
      setTasks(response.data.tasks);
      setTotalPages(response.data.total_pages || 1);
      setProject(response.data.project);
    } else {
      toast.error("Failed to fetch documentations");
      setTasks([]);
    }
  };
  // Mark as Started
  const handleMarkAsStarted = async (task: DocumentationTask) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(task.id),
      { status: "in_progress" },
      "application/json",
      authToken,
      `DocMarkAsStarted${task.id}`
    );
    if (response.status === 200) {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return { ...item, status: "in_progress" };
          } else {
            return item;
          }
        })
      );
      toast.success("successfully marked as started");
    } else {
      toast.error("Failed to mark as started");
    }
  };
  // Approve
  const handleApprove = async (task: DocumentationTask) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(task.id),
      { action_taken: "approved", status: "completed", is_sent: true },
      "application/json",
      authToken,
      `DocMarkAsApproved${task.id}`
    );
    if (response.status === 200) {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return response.data;
          }
          return item;
        })
      );
      toast.success("Successfully approved document");
    } else {
      toast.error("Failed to approve this document");
    }
  };
  // Reject
  const handleReject = async () => {
    if (rejectFiles.find((item) => !item.label || !item.label.trim())) {
      toast.error("All uploaded files must have a label.");
      return;
    }
    let uploadedFileIds = [];
    if (rejectFiles.length > 0) {
      try {
        const uploadResults = await Promise.all(
          rejectFiles.map((f) => uploadFile(f.file, f.label))
        );
        uploadedFileIds = uploadResults.map((res) => res.id);
      } catch (err) {
        return;
      }
    }
    const task = rejectModal.task;
    const data = {
      status: "completed",
      action_taken: "rejected",
      reason: rejectNotes,
      uploaded_files_ids: uploadedFileIds,
    };
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(task.id),
      data,
      "application/json",
      authToken,
      "DocMarkAsRejected"
    );
    if (response.status === 200) {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return response.data;
          } else {
            return item;
          }
        })
      );
      setRejectModal({ open: false, task: null });
      setRejectFiles([]);
      setRejectNotes("");
      toast.success("Successfully rejected thr drawing");
    } else {
      toast.error("Failed to reject drawing");
    }
  };
  // Back to Approval
  const handleBackToApproval = async () => {
    const task = backToApprovalModal.task;
    if (sentToSelectedFiles.length == 0) {
      toast.success("Choose at least one file to sent");
      return;
    }

    const data = {
      uploaded_files_ids: sentToSelectedFiles,
      status: "not_started",
      step_name: "approval",
      notes: backToApprovalNotes,
      log_id: task.id,
    };
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(task.drawing_id),
      data,
      "application/json",
      authToken,
      "DocBackToApproval"
    );
    if (response.status === 201) {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return response.data;
          } else {
            return item;
          }
        })
      );
      setBackToApprovalModal({ open: false, task: null });
      setBackToApprovalNotes("");
      toast.success("Successfully sent back to approval");
    } else {
      toast.error("Failed to sent back to approval");
    }
  };
  // File upload helper
  const uploadFile = async (file: File, label: string) => {
    const data = new FormData();
    data.append("label", label);
    data.append("file", file);
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.UPLOAD_FILE,
      data,
      "application/form-data",
      authToken,
      "uploadFile"
    );
    if (response.status == 201) {
      return response.data;
    } else {
      return null;
    }
  };

  // Helper to determine if a task is completed
  const isTaskCompleted = (task: DocumentationTask) => {
    return task.status === "completed";
  };
  // Helper to determine if a completed task is approved
  const isTaskApproved = (task: DocumentationTask) => {
    return isTaskCompleted(task) && task.action_taken === "approved";
  };
  // Helper to determine if a completed task is rejected
  const isTaskRejected = (task: DocumentationTask) => {
    return isTaskCompleted(task) && task.action_taken === "rejected";
  };

  console.log(project);
  return (
    <div className="p-6 mx-auto">
      <h2 className="text-2xl font-bold text-purple-900 mb-6">
        Documentation Team Dashboard
      </h2>
      {project && (
        <div className="mb-8 p-6 rounded-2xl shadow bg-white border-2 border-purple-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Project Details */}
          <div className="flex-1">
            <div className="text-xl font-bold text-purple-900 mb-1">
              {project.project_name || "Untitled Project"}
            </div>
            <div className="text-slate-700 text-base mb-2">
              {project.company_name || "Unknown Company"}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-2">
              <div>
                <span className="font-semibold">Project ID:</span>{" "}
                {project.project_code || "-"}
              </div>
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {project.created_at
                  ? new Date(project.created_at).toLocaleString()
                  : "-"}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <User size={16} className="text-purple-600" />
                <span className="font-semibold">Contact:</span>{" "}
                {project.contact_person || "-"}
              </div>
              <div className="flex items-center gap-1">
                <Phone size={16} className="text-green-600" />
                <span className="font-semibold">Phone:</span>{" "}
                <a
                  href={`tel:${project.contact_person_phone}`}
                  className="hover:underline text-green-700"
                >
                  {project.contact_person_phone || "-"}
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Mail size={16} className="text-blue-600" />
                <span className="font-semibold">Email:</span>{" "}
                <a
                  href={`mailto:${project.contact_person_email}`}
                  className="hover:underline text-blue-700"
                >
                  {project.contact_person_email || "-"}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {(fetching && fetchType == "getDocumentationTasks") || !isFetched ? (
        <Loading full={false} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-2xl shadow-lg p-6 flex flex-col gap-3 border-2 transition-all relative bg-gradient-to-br from-purple-50 to-white ${
                  isTaskApproved(task)
                    ? "border-green-400"
                    : isTaskRejected(task)
                    ? "border-red-400"
                    : "border-purple-200"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="text-purple-500" size={22} />
                  <span className="font-bold text-lg text-purple-900 flex-1 truncate">
                    {task.drawing_title}
                  </span>
                  <Badge
                    variant={
                      isTaskApproved(task)
                        ? "default"
                        : isTaskRejected(task)
                        ? "destructive"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {isTaskCompleted(task)
                      ? task.action_taken
                      : task.status}
                  </Badge>
                </div>
                {/* Main Info */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                  <div>
                    <span className="font-medium">Step:</span> {task.step_name}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {task.status}
                  </div>
                  <div>
                    <span className="font-medium capitalize">
                      Submitted By:
                    </span>{" "}
                    {task.assigned_by.name}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {new Date(task.created_at).toLocaleString()}
                  </div>
                </div>
                {/* Project Details Button */}
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-purple-400 text-purple-800 font-semibold"
                    onClick={() => setViewDetail(task)}
                    disabled={fetching}
                  >
                    View Document Details
                  </Button>
                </div>
                {/* Actions Section (unchanged) */}
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Actions
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                    {task.status === "not_started" && (
                      <Button
                        size="sm"
                        className=" text-white md:flex-1 shadow-sm"
                        onClick={() => handleMarkAsStarted(task)}
                        disabled={
                          fetching && fetchType == `DocMarkAsStarted${task.id}`
                        }
                        loading={
                          fetching && fetchType == `DocMarkAsStarted${task.id}`
                        }
                      >
                        Mark as Started
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white md:flex-1 shadow-sm"
                          onClick={() => handleApprove(task)}
                          disabled={
                            fetching &&
                            fetchType == `DocMarkAsApproved${task.id}`
                          }
                          loading={
                            fetching &&
                            fetchType == `DocMarkAsApproved${task.id}`
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white md:flex-1 shadow-sm"
                          onClick={() =>
                            setRejectModal({ open: true, task: task })
                          }
                          disabled={fetching}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {task.status === "completed" &&
                      task.action_taken === "rejected" &&
                      !task.is_sent && (
                        <Button
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white md:flex-1 shadow-sm"
                          onClick={() => {
                            setSentToSelectedFiles([]);
                            setCurrentSentToFiles([
                              ...task.incoming_files,
                              ...task.outgoing_files,
                            ]);
                            setBackToApprovalModal({ open: true, task });
                          }}
                          disabled={fetching}
                        >
                          Back to Approval
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!fetching && tasks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                No documentation tasks found.
              </div>
            </div>
          )}
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <Dialog
        open={rejectModal.open}
        onOpenChange={() => setRejectModal({ open: false, task: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Drawing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Enter rejection note..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <Input
              type="file"
              multiple
              onChange={(e) => {
                setRejectFiles(
                  Array.from(e.target.files || []).map((f) => ({
                    file: f,
                    label: "",
                    tempUrl: URL.createObjectURL(f),
                  }))
                );
              }}
            />
            {/* File label inputs for each uploaded file */}
            {rejectFiles.length > 0 && (
              <div className="space-y-2">
                {rejectFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="File label"
                      value={f.label}
                      onChange={(e) => {
                        const newFiles = [...rejectFiles];
                        newFiles[idx].label = e.target.value;
                        setRejectFiles(newFiles);
                      }}
                      className={f.label.trim() ? "" : "border-red-400"}
                    />
                    <span className="text-xs text-gray-500">{f.file.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setRejectModal({ open: false, task: null })}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={
                  fetching &&
                  (fetchType == "DocMarkAsRejected" ||
                    fetchType == "uploadFile")
                }
                loading={
                  fetching &&
                  (fetchType == "DocMarkAsRejected" ||
                    fetchType == "uploadFile")
                }
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Back to Approval Modal */}
      <Dialog
        open={backToApprovalModal.open}
        onOpenChange={() => {
          setSentToSelectedFiles([]);
          setCurrentSentToFiles([]);
          setBackToApprovalModal({ open: false, task: null });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Back to Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Enter notes for back to approval..."
              value={backToApprovalNotes}
              onChange={(e) => setBackToApprovalNotes(e.target.value)}
            />

            {currentSentToFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Select files to send :
                </div>
                {currentSentToFiles.map((file) => (
                  <label key={file.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sentToSelectedFiles.includes(file.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSentToSelectedFiles((prev) => [...prev, file.id]);
                        } else {
                          setSentToSelectedFiles((prev) =>
                            prev.filter((id) => id !== file.id)
                          );
                        }
                      }}
                    />
                    <span>{file.label}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setBackToApprovalModal({ open: false, task: null })
                }
              >
                Cancel
              </Button>
              <Button
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                onClick={handleBackToApproval}
                disabled={!backToApprovalNotes.trim() || fetching}
                loading={fetching && fetchType == "DocBackToApproval"}
              >
                Back to Approval
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Project Detail Modal (now only task-specific details) */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        {!!viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 relative overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="rounded-t-xl bg-gradient-to-r from-purple-600 to-purple-400 px-8 py-5 flex items-center gap-3 relative">
                <FileText size={28} className="text-white" />
                <h2 className="text-2xl font-bold text-white">
                  Documents Details
                </h2>
                <span className="ml-auto text-white/80 font-mono text-sm">
                  {viewDetail.project_code}
                </span>
                <button
                  className="fixed z-50 top-6 right-6 text-white/80 hover:text-white text-2xl font-bold bg-purple-700/80 rounded-full p-1 shadow-lg"
                  onClick={() => setViewDetail(null)}
                >
                  <X />
                </button>
              </div>
              {/* Info Grid (task-specific only) */}
              <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-4 text-base">
                <div>
                  <span className="font-semibold text-slate-700">Drawing:</span>
                  <br />
                  {viewDetail.drawing_title}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Submitted By:
                  </span>
                  <br />
                  {viewDetail.drawing_uploaded_by_user.name}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Submission Date:
                  </span>
                  <br />
                  {new Date(viewDetail.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold text-slate-700 capitalize">
                    Status:
                  </span>
                  <br />
                  {viewDetail.status}
                </div>
              </div>
              <hr className="mx-8" />
              {/* Notes Section */}
              <div className="mx-8 my-4 bg-slate-100 rounded p-3 text-slate-800 min-h-[40px]">
                {viewDetail.notes ? (
                  viewDetail.notes
                ) : (
                  <span className="text-slate-400">No notes</span>
                )}
              </div>
              {/* Uploaded Files Section */}
              <div className="mx-8 my-4">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <FileText size={18} className="text-purple-500" />
                  Incoming Files:
                </div>
                <ul className="list-disc ml-8 space-y-1">
                  {viewDetail.incoming_files &&
                    viewDetail.incoming_files.length === 0 && (
                      <li className="text-slate-400">No files uploaded</li>
                    )}
                  {viewDetail.incoming_files &&
                    viewDetail.incoming_files.map((f, i) => (
                      <li key={i}>
                        <ShowFile label={f.label} url={f.file} size="medium" />
                      </li>
                    ))}
                </ul>
              </div>
              <div className="mx-8 my-4">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <FileText size={18} className="text-purple-500" />
                  Outgoing Files:
                </div>
                <ul className="list-disc ml-8 space-y-1">
                  {viewDetail.outgoing_files &&
                    viewDetail.outgoing_files.length === 0 && (
                      <li className="text-slate-400">No files uploaded</li>
                    )}
                  {viewDetail.outgoing_files &&
                    viewDetail.outgoing_files.map((f, i) => (
                      <li key={i}>
                        <ShowFile label={f.label} url={f.file} size="medium" />
                      </li>
                    ))}
                </ul>
              </div>
              {viewDetail.status === "rejected" && viewDetail.reason && (
                <div className="mt-2 text-red-700 font-semibold">
                  Rejection Note: {viewDetail.reason}
                </div>
              )}
              {/* Project Related Documents Dropdown */}
              <div className="mx-8 my-4">
                <ProjectDocumentsDropdown
                  documents={viewDetail.drawing_files}
                  title="Drawing Related Documents"
                />
              </div>
              <div className="flex justify-end px-8 pb-6">
                <Button variant="outline" onClick={() => setViewDetail(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
