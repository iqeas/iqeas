import React, { useState, useEffect } from "react";
import {
  Folder,
  Mail,
  Phone,
  X,
  FileText,
  User,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import ProjectDocumentsDropdown, {
  ProjectDocument,
} from "./ProjectDocumentsDropdown";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useAPICall } from "@/hooks/useApiCall";
import { useAuth } from "@/contexts/AuthContext";
import { API_ENDPOINT } from "@/config/backend";
import type { DocumentationTask } from "@/types/apiTypes";
import Loading from "./atomic/Loading";
import toast from "react-hot-toast";

export const DocumentationDashboard = () => {
  const { makeApiCall, fetching, fetchType, isFetched } = useAPICall();
  const { authToken } = useAuth();
  const [tasks, setTasks] = useState<DocumentationTask[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [viewDetail, setViewDetail] = useState<DocumentationTask | null>(null);
  // Action modals
  const [startLoadingId, setStartLoadingId] = useState<number | null>(null);
  const [approveLoadingId, setApproveLoadingId] = useState<number | null>(null);
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
  }, [search, page, filter]);
  const fetchTasks = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_WORKER_TASKS(search, page, 20, filter),
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
  const filteredTasks = tasks.filter((d) => {
    const matchesStage = stageFilter === "All" || d.step_name === stageFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      d.client_company?.toLowerCase().includes(searchLower) ||
      d.project_code?.toLowerCase().includes(searchLower) ||
      d.drawing_title?.toLowerCase().includes(searchLower);
    return matchesStage && (!search || matchesSearch);
  });

  return (
    <div className="p-6 mx-auto">
      <h2 className="text-2xl font-bold text-blue-900 mb-6">
        Documentation Team Dashboard
      </h2>
      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="flex-1 flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 w-full"
            type="text"
            placeholder="Search by client, project ID, or deliverable..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSearch(searchInput)}
            className="px-2"
            aria-label="Search"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                d="M21 21l-4.35-4.35"
              />
            </svg>
          </Button>
        </div>
      </div>
      {(fetching && fetchType == "getDocumentationTasks") || !isFetched ? (
        <Loading full={false} />
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map((task) => (
          <Card
                key={task.id}
            className="hover:shadow-lg transition-shadow border-blue-100"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                      <CardTitle className="text-lg">
                        {task.project_code}
                      </CardTitle>
                      <p className="text-slate-600">{task.client_company}</p>
                </div>
                <Badge
                  variant={
                        task.status === "rejected"
                      ? "destructive"
                          : task.status === "approved"
                      ? "default"
                      : "secondary"
                  }
                      className="capitalize"
                >
                      {task.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Stage:</span>
                      <p className="font-medium">{task.step_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Deliverable:</span>
                      <p className="font-medium">{task.drawing_title}</p>
                </div>
                <div>
                  <span className="text-slate-500">Submitted By:</span>
                      <p className="font-medium">{task.assigned_by.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date:</span>
                      <p className="font-medium">
                        {new Date(task.created_at).toLocaleString()}
                      </p>
                </div>
              </div>
              {/* Actions Section */}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Actions
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="md:flex-1"
                        onClick={() => setViewDetail(task)}
                        disabled={fetching}
                  >
                    View Project Detail
                  </Button>
                      {task.status === "not_started" && (
                        <Button
                          size="sm"
                          className=" text-white md:flex-1 shadow-sm"
                          onClick={() => handleMarkAsStarted(task)}
                          disabled={
                            fetching &&
                            fetchType == `DocMarkAsStarted${task.id}`
                          }
                          loading={
                            fetching &&
                            fetchType == `DocMarkAsStarted${task.id}`
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
                </CardContent>
              </Card>
            ))}
                </div>
          {!fetching && filteredTasks.length === 0 && (
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

      {/* View Project Detail Modal */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        {!!viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 relative overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="rounded-t-xl bg-gradient-to-r from-blue-600 to-blue-400 px-8 py-5 flex items-center gap-3 relative">
                <FileText size={28} className="text-white" />
                <h2 className="text-2xl font-bold text-white">
                  Project/Deliverable Details
                </h2>
                <span className="ml-auto text-white/80 font-mono text-sm">
                  {viewDetail.project_code}
                </span>
                <button
                  className="fixed z-50 top-6 right-6 text-white/80 hover:text-white text-2xl font-bold bg-blue-700/80 rounded-full p-1 shadow-lg"
                  onClick={() => setViewDetail(null)}
                >
                  <X />
                </button>
              </div>
              {/* Info Grid */}
              <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-4 text-base">
                <div>
                  <span className="font-semibold text-slate-700">
                    Client Name:
                  </span>
                  <br />
                  {viewDetail.client_company}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Project Code:
                  </span>
                  <br />
                  {viewDetail.project_code}
                </div>
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
                  <span className="font-semibold text-slate-700">Status:</span>
                  <br />
                  {viewDetail.status}
                </div>
              </div>
              <hr className="mx-8" />
              {/* Contact Section */}
              <div className="px-8 py-4 flex gap-8 items-start flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    Contact Person:
                  </span>
                  <User size={18} className="text-blue-500" />
                  <span className="text-slate-700">
                    {viewDetail.contact_person}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Phone:</span>
                  <a
                    href={`tel:${viewDetail.contact_person_phone}`}
                    className="inline-flex items-center gap-1 border border-blue-200 rounded px-2 py-1 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <Phone className="text-green-500" />
                    {/* {viewDetail.client_phone} */}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Email:</span>
                  <a
                    href={`mailto:${viewDetail.contact_person_email}`}
                    className="inline-flex items-center gap-1 border border-blue-200 rounded px-2 py-1 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <Mail className="text-rose-500" />
                    {viewDetail.contact_person_email}
                  </a>
                </div>
              </div>
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
                  <FileText size={18} className="text-blue-500" />
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
                  <FileText size={18} className="text-blue-500" />
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
                  documents={viewDetail.drawing_files} // No mock documents for now, as they are not part of the task
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
