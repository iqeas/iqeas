/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import type { WorkerTask } from "@/types/apiTypes";
import { Clock, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ShowFile from "./ShowFile";
import { useAPICall } from "@/hooks/useApiCall";
import { useAuth } from "@/contexts/AuthContext";
import { API_ENDPOINT } from "@/config/backend";
import toast from "react-hot-toast";
import Loading from "./atomic/Loading";
import type { IUser } from "@/types/apiTypes";
import { useLocation, useParams } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

export const WorkerTasks = () => {
  const location = useLocation();
  const { projectId } = useParams();
  const [project, setProject] = useState<any>();
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const { makeApiCall, fetchType, fetching, isFetched } = useAPICall();
  const { authToken, user } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [completeModal, setCompleteModal] = useState<{
    open: boolean;
    taskId: number | null;
    type: string;
  }>({ open: false, taskId: null, type: "" });
  const [completeFiles, setCompleteFiles] = useState<
    { file: File; label: string; tempUrl: string }[]
  >([]);

  // Details modal state
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    task: WorkerTask | null;
  }>({ open: false, task: null });
  console.log(detailsModal);
  const [checkingUser, setCheckingUser] = useState<string>("");
  const [checkingNotes, setCheckingNotes] = useState("");

  const [workingUsers, setWorkingUsers] = useState<IUser[]>([]);

  // Reject and Back to Drafting modals/hooks (move to top level)
  const [rejectModal, setRejectModal] = useState({ open: false, taskId: null });
  const [rejectFiles, setRejectFiles] = useState([]);
  const [rejectNotes, setRejectNotes] = useState("");
  const [backToDraftingModal, setBackToDraftingModal] = useState({
    open: false,
    taskId: null,
  });
  const [sentToSelectedFiles, setSentToSelectedFiles] = useState([]);
  const [currentSentToFiles, setCurrentSentToFiles] = useState([]);
  const [backToDraftingNotes, setBackToDraftingNotes] = useState("");

  useEffect(() => {
    fetchTasks();
  }, [page]);
  const fetchTasks = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_WORKER_TASKS(projectId, page, pageSize),
      {},
      "application/json",
      authToken,
      "getTasks"
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
      setTasks([]);
      toast.error("Failed to fetch tasks");
    }
  };

  if ((fetching && fetchType == "getTasks") || !isFetched) {
    return <Loading />;
  }

  const handleMarkAsStarted = async (task: WorkerTask) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(task.id),
      { status: "in_progress" },
      "application/json",
      authToken,
      "EditMarkAsStarted"
    );
    if (response.status == 200) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: "in_progress" } : t
        )
      );
      toast.success("Marked as started successfully");
    } else {
      toast.error("Failed to mark as started");
    }
  };
  const handleMarkAsComplete = async () => {
    if (completeFiles.find((item) => !item.label)) {
      toast.error("Give label to all the uploaded files");
      return;
    }
    let uploadedFileIds = [];
    if (completeFiles.length > 0) {
      try {
        const uploadResults = await Promise.all(
          completeFiles.map((f) => uploadFile(f.file, f.label))
        );
        uploadedFileIds = uploadResults.map((res) => res.id);
      } catch (err) {
        toast.error("File upload failed. Please try again.");
        return;
      }
    } else {
      toast.error("Please upload at least one media");
    }

    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(completeModal.taskId),
      { status: "completed", uploaded_files_ids: uploadedFileIds },
      "application/json",
      authToken,
      "EditMarkAsCompleted"
    );
    if (response.status == 200) {
      setTasks((prev) =>
        prev.map((t) => (t.id === completeModal.taskId ? response.data : t))
      );
      setCompleteFiles([]);
      setCompleteModal({
        open: false,
        taskId: null,
        type: "",
      });
      toast.success("Successfully marked as completed ");
    } else {
      toast.error("Failed to complete task");
    }
  };
  const handleSentToChecking = async () => {
    if (sentToSelectedFiles.length == 0) {
      toast.success("Choose at least one file to sent");
      return;
    }

    const task = tasks.find((item) => item.id == completeModal.taskId);

    const data = {
      uploaded_files_ids: [...sentToSelectedFiles],
      notes: checkingNotes,
      forwarded_user_id: checkingUser,
      status: "not_started",
      step_name: "checking",
      log_id: task.id,
    };
    const drawing_id = task.drawing_id;
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(drawing_id),
      data,
      "application/json",
      authToken,
      "editSentToChecking"
    );
    if (response.status == 201) {
      toast.success("successfully sent to checking");
      setCompleteModal({
        open: false,
        taskId: null,
        type: "",
      });
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return response.data;
          }
          return item;
        })
      );
    } else {
      toast.error("Failed to sent to checking");
    }
  };
  const handleSentToApproval = async () => {
    const task = tasks.find((item) => item.id == completeModal.taskId);
    // if (sentToSelectedFiles.length == 0) {
    //   toast.success("Choose at least one file to sent");
    //   return;
    // }

    const data = {
      uploaded_files_ids: [...sentToSelectedFiles],
      notes: checkingNotes,
      status: "not_started",
      step_name: "approval",
      log_id: task.id,
    };
    const drawing_id = task.drawing_id;
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(drawing_id),
      data,
      "application/json",
      authToken,
      "CreateSentToApproval"
    );
    if (response.status == 201) {
      toast.success("successfully sent to checking");
      setCompleteModal({
        open: false,
        taskId: null,
        type: "",
      });
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return response.data;
          }
          return item;
        })
      );
    } else {
      toast.error("Failed to sent to checking");
    }
  };
  const handleOpenSentToChecking = async (openConfig) => {
    if (Array.isArray(workingUsers) && workingUsers.length !== 0) {
      setCompleteModal(openConfig);
      return;
    }
    try {
      const res = await makeApiCall(
        "get",
        API_ENDPOINT.GET_USERS_BY_ROLE("working"),
        {},
        "application/json",
        authToken,
        "getWorkingUsers"
      );
      if (res.status === 200 && Array.isArray(res.data)) {
        setWorkingUsers(res.data);
        setCompleteModal(openConfig);
      } else {
        toast.error("Failed to fetch drafting users");
      }
    } catch (err) {
      toast.error("Failed to fetch drafting users");
    }
  };
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
  const handleMarkAsApproved = async (task) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(task.id),
      { action_taken: "approved", status: "completed" },
      "application/json",
      authToken,
      `EditMarkAsApproved${task.id}`
    );
    if (response.status == 200) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, action_taken: "approved", status: "completed" }
            : t
        )
      );
      toast.success("Marked as approved successfully");
    } else {
      toast.error("Failed to mark as approved");
    }
  };
  // 2. Add handler for Mark as Rejected with files
  const handleMarkAsRejectedWithFiles = async () => {
    if (rejectFiles.find((item) => !item.label)) {
      toast.error("Give label to all the uploaded files");
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
        toast.error("File upload failed. Please try again.");
        return;
      }
    }
    const task = tasks.find((item) => item.id == rejectModal.taskId);
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
      "EditMarkAsRejectedWithFiles"
    );
    if (response.status == 200) {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id == task.id) {
            return response.data;
          }
          return item;
        })
      );
      setRejectModal({ open: false, taskId: null });
      setRejectFiles([]);
      setRejectNotes("");
      toast.success("Marked as rejected successfully");
    } else {
      toast.error("Failed to mark as rejected");
    }
  };
  // 3. Add handler for Back to Drafting with notes only
  const handleBackToDraftingWithNotes = async () => {
    const task = tasks.find((item) => item.id == backToDraftingModal.taskId);
    if (sentToSelectedFiles.length == 0) {
      toast.success("Choose at least one file to sent");
      return;
    }

    const data = {
      uploaded_files_ids: [...sentToSelectedFiles],
      status: "not_started",
      step_name: "drafting",
      notes: backToDraftingNotes,
      log_id: task.id,
    };
    const drawing_id = task.drawing_id;
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(drawing_id),
      data,
      "application/json",
      authToken,
      "createBackToDrafting"
    );
    if (response.status == 201) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: "not_started", step_name: "drafting" }
            : t
        )
      );
      setBackToDraftingModal({ open: false, taskId: null });
      setBackToDraftingNotes("");
      toast.success("Sent back to drafting");
      fetchTasks();
    } else {
      toast.error("Failed to send back to drafting");
    }
  };
  const getAllFilesWithoutDuplicate = (tasks = [],stage_id=1) => {
    const fileMap = new Map();

    tasks.forEach((task) => {
      if (task.stage_id != stage_id){
        return
      }
      const allFileGroups = [...task.incoming_files, ...task.outgoing_files];

      allFileGroups.forEach((file) => {
        if (!fileMap.has(file.id)) {
          fileMap.set(file.id, file);
        }
      });
    });

    return Array.from(fileMap.values());
  };

  return (
    <div className="p-6">
      {/* Project Details Card at Top */}
      {project && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-lg font-bold text-blue-900">
              {project.project_name}
            </div>
            <div className="text-slate-700 text-sm">{project.company_name}</div>
            <div className="text-xs text-slate-500">
              Project ID: {project.project_code}
            </div>
            <div className="text-xs text-slate-500">
              Created:{" "}
              {project.created_at
                ? new Date(project.created_at).toLocaleString()
                : "-"}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Worker Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Track your assigned tasks and project work
          </p>
        </div>
      </div>

      {/* Task List - Card Style, no table, no filter/search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 py-6">
            No tasks assigned.
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted =
              task.is_sent === true && task.status === "completed";
            return (
              <div
                key={task.id}
                className={`rounded-xl shadow p-5 flex flex-col gap-2 border-2 transition-all ${
                  isCompleted
                    ? "border-green-400 bg-green-50"
                    : "border-yellow-400 bg-yellow-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCompleted ? (
                    <CheckCircle2 className="text-green-600" size={22} />
                  ) : (
                    <Clock className="text-yellow-600" size={22} />
                  )}
                  <span className="font-semibold text-lg text-blue-900 flex-1 truncate">
                    {task.drawing_title}
                  </span>
                  <Badge
                    variant={isCompleted ? "default" : "destructive"}
                    className={
                      isCompleted
                        ? "bg-green-600 text-white"
                        : "bg-yellow-500 text-white"
                    }
                  >
                    {isCompleted ? "Completed" : "Pending"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                  <div className="capitalize">
                    <span className="font-medium">Step:</span> {task.step_name}
                  </div>
                  <div className="capitalize">
                    <span className="font-medium">Status:</span> {task.status}
                  </div>
                </div>
                {/* Actions and details (keep all logic unchanged) */}
                <div className="mt-3">
                  {/* Place the same action buttons and details modal logic here as before */}
                  {/* ...existing action buttons and modals for each task... */}
                  {/* For brevity, keep the rest of the task action UI unchanged */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailsModal({ open: true, task })}
                    >
                      View Details
                    </Button>
                    {!task.is_sent ? (
                      <div className="flex gap-2">
                        {/* Action Buttons */}
                        {task.status === "not_started" && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsStarted(task)}
                            loading={
                              fetching && fetchType == "EditMarkAsStarted"
                            }
                          >
                            Mark as Started
                          </Button>
                        )}
                        {task.status === "in_progress" &&
                          task.step_name === "drafting" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCompleteModal({
                                  open: true,
                                  taskId: task.id,
                                  type: "complete",
                                });
                              }}
                              loading={
                                fetching && fetchType == "EditMarkAsCompleted"
                              }
                            >
                              Complete Task
                            </Button>
                          )}
                        {task.status === "in_progress" &&
                          task.step_name === "checking" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  handleMarkAsApproved(task);
                                }}
                                loading={
                                  fetching &&
                                  fetchType == `EditMarkAsApproved${task.id}`
                                }
                                disabled={
                                  fetching &&
                                  fetchType == `EditMarkAsApproved${task.id}`
                                }
                              >
                                Move Forward
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => {
                                  setRejectModal({
                                    open: true,
                                    taskId: task.id,
                                  });
                                }}
                              >
                                Go Back
                              </Button>
                            </>
                          )}
                        {task.status === "completed" &&
                          task.step_name === "drafting" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSentToSelectedFiles([]);
                                setCurrentSentToFiles([
                                  ...task.incoming_files,
                                  ...task.outgoing_files,
                                ]);
                                handleOpenSentToChecking({
                                  open: true,
                                  type: "sent_to_checking",
                                  taskId: task.id,
                                });
                              }}
                            >
                              Send to Checking
                            </Button>
                          )}
                        {task.status === "completed" &&
                          task.step_name === "checking" &&
                          task.action_taken === "approved" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSentToSelectedFiles([]);
                                setCurrentSentToFiles(
                                  getAllFilesWithoutDuplicate(tasks,task.stage_id)
                                );
                                setCompleteModal({
                                  open: true,
                                  taskId: task.id,
                                  type: "sent_to_approval",
                                });
                              }}
                            >
                              Send to Approval
                            </Button>
                          )}
                        {task.status === "completed" &&
                          task.step_name === "checking" &&
                          task.action_taken === "rejected" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSentToSelectedFiles([]);
                                setCurrentSentToFiles(
                                  getAllFilesWithoutDuplicate(tasks,task.stage_id),
                                );

                                setBackToDraftingModal({
                                  open: true,
                                  taskId: task.id,
                                });
                              }}
                              loading={
                                fetching && fetchType == "createBackToDrafting"
                              }
                              disabled={
                                fetching && fetchType == "createBackToDrafting"
                              }
                            >
                              Back to Drafting
                            </Button>
                          )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Pagination at the bottom */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <PaginationItem key={idx}>
                  <PaginationLink
                    isActive={page === idx + 1}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(idx + 1);
                    }}
                  >
                    {idx + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Complete Task Modal */}
      {completeModal.open && completeModal.type == "complete" && (
        <Dialog
          open={true}
          onOpenChange={() => {
            setSentToSelectedFiles([]);
            setCurrentSentToFiles([]);
            setCompleteModal({ open: false, taskId: null, type: "" });
          }}
        >
          <DialogContent>
            <DialogHeader className="px-6 py-4">
              <DialogTitle>Complete Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 p-6">
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setCompleteFiles((prev) => [
                    ...prev,
                    ...files.map((file) => ({
                      file,
                      label: "",
                      tempUrl: URL.createObjectURL(file),
                    })),
                  ]);
                  e.target.value = "";
                }}
              />
              {completeFiles.map((uf, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1">
                  <Input
                    type="text"
                    placeholder="Label"
                    value={uf.label}
                    onChange={(e) =>
                      setCompleteFiles((prev) =>
                        prev.map((u, i) =>
                          i === idx ? { ...u, label: e.target.value } : u
                        )
                      )
                    }
                    className={uf.label.trim() ? "" : "border-red-400"}
                  />
                  <span className="text-xs">{uf.file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCompleteFiles((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                  >
                    &times;
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCompleteModal({ open: false, taskId: null, type: "" })
                  }
                  disabled={
                    fetching &&
                    (fetchType == "EditMarkAsCompleted" ||
                      fetchType == "uploadFile")
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkAsComplete}
                  loading={
                    fetching &&
                    (fetchType == "EditMarkAsCompleted" ||
                      fetchType == "uploadFile")
                  }
                  disabled={
                    fetching &&
                    (fetchType == "EditMarkAsCompleted" ||
                      fetchType == "uploadFile")
                  }
                >
                  Save & Complete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Send to Checking/Approval/Back to Drafting Modal */}
      <Dialog
        open={
          completeModal.open &&
          ["sent_to_checking", "sent_to_approval", "back_to_drafting"].find(
            (item) => item == completeModal.type
          ) != null
        }
        onOpenChange={() => {
          setSentToSelectedFiles([]);
          setCurrentSentToFiles([]);
          setCompleteModal({ open: false, taskId: null, type: "" });
        }}
      >
        <DialogContent>
          <DialogHeader className="px-6 py-4">
            <DialogTitle>
              {completeModal.type === "sent_to_checking" && "Send to Checking"}
              {completeModal.type === "sent_to_approval" && "Send to Approval"}
              {completeModal.type === "back_to_drafting" && "Back to Drafting"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            <div className="mb-2 text-xs text-gray-600">
              {completeModal.type === "sent_to_checking" &&
                "Forward this drawing to a checker. Please add notes and upload any files if needed."}
              {completeModal.type === "sent_to_approval" &&
                "Forward this drawing to approval. Please add notes if needed."}
              {completeModal.type === "back_to_drafting" &&
                "Send this drawing back to drafting. Please add notes if needed."}
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Notes</label>
              <Textarea
                value={checkingNotes}
                onChange={(e) => setCheckingNotes(e.target.value)}
                placeholder="Add notes..."
              />
            </div>
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
            {completeModal.type == "sent_to_checking" && (
              <div className="mb-4">
                <label className="block font-medium mb-1">Forward To</label>
                <Select value={checkingUser} onValueChange={setCheckingUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    {workingUsers
                      .filter((item) => item.id !== user.id)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setCompleteModal({ open: false, taskId: null, type: "" })
                }
                disabled={
                  fetching &&
                  (fetchType == "editSentToChecking" ||
                    fetchType == "CreateSentToApproval")
                }
              >
                Cancel
              </Button>
              {(() => {
                const task = tasks.find(
                  (item) => item.id == completeModal.taskId
                );
                if (completeModal.type === "sent_to_checking") {
                  return (
                    <Button
                      onClick={() => handleSentToChecking()}
                      loading={
                        fetching &&
                        (fetchType == "editSentToChecking" ||
                          fetchType == "uploadFile")
                      }
                      disabled={
                        fetching &&
                        (fetchType == "editSentToChecking" ||
                          fetchType == "uploadFile")
                      }
                    >
                      Send to Checking
                    </Button>
                  );
                }
                if (completeModal.type === "sent_to_approval") {
                  return (
                    <Button
                      onClick={() => handleSentToApproval()}
                      loading={fetching && fetchType == "CreateSentToApproval"}
                      disabled={fetching && fetchType == "CreateSentToApproval"}
                    >
                      Send to Approval
                    </Button>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal (rich UI) */}
      {detailsModal.open && (
        <Dialog
          open={true}
          onOpenChange={() => setDetailsModal({ open: false, task: null })}
        >
          <DialogContent>
            {/* Header */}
            <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-400 px-6 py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-white" />
                <span className="text-white text-lg font-bold">
                  Task Details
                </span>
              </div>
            </DialogHeader>
            {/* Main Info - Improved Spacing and Layout */}
            <div className="p-6">
              <div className="px-6 pt-6 pb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                  <div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Drawing Title
                      </span>
                      <span className="text-base text-blue-900 font-bold  capitalize">
                        {detailsModal.task.drawing_title}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Step
                      </span>
                      <span className="text-base !capitalize">
                        {detailsModal.task.step_name}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Status
                      </span>
                      <span className="text-base capitalize">
                        {detailsModal.task.status}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Client DWG No
                      </span>
                      <span className="text-base capitalize">
                        {detailsModal.task.client_dwg_no}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        IQEAS DWG No
                      </span>
                      <span className="text-base capitalize">
                        {detailsModal.task.iqeas_dwg_no}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Allocated Hours
                      </span>
                      <span className="text-base capitalize">
                        {detailsModal.task.allocated_hours}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Project Code
                      </span>
                      <span className="text-base capitalize">
                        {project.project_code}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Client Company
                      </span>
                      <span className="text-base capitalize">
                        {project.company_name}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Assigned By
                      </span>
                      <span className="text-base capitalize">
                        {detailsModal.task.assigned_by?.name}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="block text-xs text-slate-500 font-semibold">
                        Drawing ID
                      </span>
                      <span className="text-base capitalize">
                        {detailsModal.task.drawing_id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Divider */}
              <div className="border-t border-slate-200 my-3"></div>
              {/* Incoming Files Section */}
              <div className="px-6 py-2">
                <div className="font-semibold mb-1 text-blue-700 flex items-center gap-2">
                  <FileText size={16} /> Incoming Files
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailsModal.task.incoming_files?.length > 0 ? (
                    detailsModal.task.incoming_files.map((file, idx) => (
                      <ShowFile
                        key={"in-" + idx}
                        label={file.label}
                        url={file.file ? `/uploads/${file.file}` : ""}
                        size="medium"
                      />
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      No incoming files.
                    </span>
                  )}
                </div>
              </div>
              {/* Outgoing Files Section */}
              <div className="px-6 py-2">
                <div className="font-semibold mb-1 text-green-700 flex items-center gap-2">
                  <FileText size={16} /> Outgoing Files
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailsModal.task.outgoing_files?.length > 0 ? (
                    detailsModal.task.outgoing_files.map((file, idx) => (
                      <ShowFile
                        key={"out-" + idx}
                        label={file.label}
                        url={file.file ? `/uploads/${file.file}` : ""}
                        size="medium"
                      />
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      No outgoing files.
                    </span>
                  )}
                </div>
              </div>
              {/* Notes */}
              <div className="px-6 py-2">
                <div className="font-semibold mb-1">Notes</div>
                <div className="bg-slate-50 rounded p-2 text-sm min-h-[32px]">
                  {detailsModal.task.notes || "No notes."}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Task Modal */}
      <Dialog
        open={rejectModal.open}
        onOpenChange={() => setRejectModal({ open: false, taskId: null })}
      >
        <DialogContent>
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Reject Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-6 pt-0">
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setRejectFiles((prev) => [
                  ...prev,
                  ...files.map((file) => ({
                    file,
                    label: "",
                    tempUrl: URL.createObjectURL(file),
                  })),
                ]);
                e.target.value = "";
              }}
            />
            {rejectFiles.map((uf, idx) => (
              <div key={idx} className="flex items-center gap-2 mt-1">
                <Input
                  type="text"
                  placeholder="Label"
                  value={uf.label}
                  onChange={(e) =>
                    setRejectFiles((prev) =>
                      prev.map((u, i) =>
                        i === idx ? { ...u, label: e.target.value } : u
                      )
                    )
                  }
                  className={uf.label.trim() ? "" : "border-red-400"}
                />
                <span className="text-xs">{uf.file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setRejectFiles((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  &times;
                </Button>
              </div>
            ))}
            <label className="block font-medium mb-1">Personal Noting</label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Add personal noting..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setRejectModal({ open: false, taskId: null })}
              >
                Cancel
              </Button>
              <Button
                loading={
                  fetching &&
                  (fetchType == "EditMarkAsRejectedWithFiles" ||
                    fetchType == "uploadFile")
                }
                disabled={
                  fetching &&
                  (fetchType == "EditMarkAsRejectedWithFiles" ||
                    fetchType == "uploadFile")
                }
                onClick={handleMarkAsRejectedWithFiles}
              >
                Save & Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Back to Drafting Modal */}
      <Dialog
        open={backToDraftingModal.open}
        onOpenChange={() => {
          setSentToSelectedFiles([]);
          setCurrentSentToFiles([]);
          setBackToDraftingModal({ open: false, taskId: null });
        }}
      >
        <DialogContent>
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Back to Drafting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-6 ">
            <Textarea
              value={backToDraftingNotes}
              onChange={(e) => setBackToDraftingNotes(e.target.value)}
              placeholder="Add notes..."
            />

            {/* File selection list */}
            {currentSentToFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Select files to send back:
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
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setBackToDraftingModal({ open: false, taskId: null })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleBackToDraftingWithNotes}
                loading={fetching && fetchType == "createBackToDrafting"}
                disabled={fetching && fetchType == "createBackToDrafting"}
              >
                Save & Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
