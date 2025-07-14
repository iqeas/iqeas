/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import type { WorkerTask } from "@/types/apiTypes";
import {
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
import { toReadableText } from "@/utils/utils";
import type { IUser } from "@/types/apiTypes";

export const WorkerDashboard = () => {
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { makeApiCall, fetchType, fetching, isFetched } = useAPICall();
  const { authToken } = useAuth();
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
  const [completeNotes, setCompleteNotes] = useState("");

  // Details modal state
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    task: WorkerTask | null;
  }>({ open: false, task: null });

  // Modal state for Send to Checking
  const [showSendToChecking, setShowSendToChecking] = useState(false);
  const [sendToCheckingTask, setSendToCheckingTask] =
    useState<WorkerTask | null>(null);
  const [checkingUsers, setCheckingUsers] = useState<IUser[]>([]);
  const [checkingUser, setCheckingUser] = useState<string>("");
  const [checkingNotes, setCheckingNotes] = useState("");
  const [checkingFiles, setCheckingFiles] = useState<
    { file: File; label: string; tempUrl: string }[]
  >([]);
  const [fetchingCheckingUsers, setFetchingCheckingUsers] = useState(false);
  const [cards, setCards] = useState({
    total: 25,
    completed: 10,
    pending: 8,
    rejected: 2,
    not_started: 5,
  });
  const [workingUsers, setWorkingUsers] = useState<IUser[]>([]);

  // Reject and Back to Drafting modals/hooks (move to top level)
  const [rejectModal, setRejectModal] = useState({ open: false, taskId: null });
  const [rejectFiles, setRejectFiles] = useState([]);
  const [rejectNotes, setRejectNotes] = useState("");
  const [backToDraftingModal, setBackToDraftingModal] = useState({
    open: false,
    taskId: null,
  });
  const [backToDraftingNotes, setBackToDraftingNotes] = useState("");

  useEffect(() => {
    fetchTasks();
  }, [searchTerm, page, filter]);
  const fetchTasks = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_WORKER_TASKS(searchTerm, page, pageSize, filter),
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
      setCards(response.data.cards);
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
        prev.map((t) =>
          t.id === completeModal.taskId
            ? { ...t, status: "completed", outgoing_files: response.data }
            : t
        )
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
    if (completeFiles.find((item) => !item.label)) {
      toast.error("Give label to all the uploaded files");
      return;
    }
    // let uploadedFileIds = [];
    // if (completeFiles.length > 0) {
    //   try {
    //     const uploadResults = await Promise.all(
    //       completeFiles.map((f) => uploadFile(f.file, f.label))
    //     );
    //     uploadedFileIds = uploadResults.map((res) => res.id);
    //   } catch (err) {
    //     toast.error("File upload failed. Please try again.");
    //     return;
    //   }
    // } else {
    //   toast.error("Please upload at least one media");
    // }
    const task = tasks.find((item) => item.id == completeModal.taskId);
    const completed_files_ids = task.outgoing_files.map((item) => item.id);
    const data = {
      uploaded_files_ids: [...completed_files_ids],
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
  const handleSentToDrafting = async () => {
    const task = tasks.find((item) => item.id == completeModal.taskId);
    const completed_files_ids = task.outgoing_files.map((item) => item.id);
    const data = {
      uploaded_files_ids: [...completed_files_ids],
      notes: checkingNotes,
      forwarded_user_id: task.assigned_by.id,
      status: "not_started",
      step_name: "drafting",
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
    const completed_files_ids = task.incoming_files.map((item) => item.id);
    const data = {
      uploaded_files_ids: [...completed_files_ids],
      notes: checkingNotes,
      forwarded_user_id: task.project_uploaded_by,
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
      "EditMarkAsApproved"
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
    } else {
      toast.error("Please upload at least one media");
      return;
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
    const completed_files_ids = task.outgoing_files.map((item) => item.id);
    const data = {
      uploaded_files_ids: [...completed_files_ids],
      status: "not_started",
      step_name: "drafting",
      notes: backToDraftingNotes,
      log_id: task.id,
      forwarded_user_id: task.assigned_by.id,
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
  return (
    <div className="p-6">
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wrench size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{cards.not_started}</p>
            <p className="text-sm text-slate-600">Not Started</p>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{cards.completed}</p>
            <p className="text-sm text-slate-600">Completed</p>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{cards.pending}</p>
            <p className="text-sm text-slate-600">Pending</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{cards.rejected}</p>
            <p className="text-sm text-slate-600">Rejected</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Calendar size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{cards.total}</p>
            <p className="text-sm text-slate-600">Total</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Tasks & Assignments Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-blue-800 text-xl font-bold tracking-tight">
            Tasks & Assignments
          </h2>
          <span className="text-slate-500 text-sm">
            (Only your assigned tasks are shown)
          </span>
        </div>
        <hr className="mb-4 border-blue-100" />
        <div className="overflow-x-auto rounded-xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50 text-blue-900">
                <TableHead className="px-4 py-3 text-left font-semibold">
                  Task
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold">
                  Project
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold">
                  Assigned By
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold">
                  Type
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold">
                  Priority
                </TableHead>
                <TableHead className="px-4 py-3 text-left font-semibold">
                  Status
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  View
                </TableHead>
                <TableHead className="px-4 py-3 text-center font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-slate-400 py-6"
                  >
                    No tasks assigned.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task, idx) => (
                  <TableRow
                    key={task.id}
                    className={idx % 2 === 0 ? "bg-blue-50/40" : "bg-white"}
                  >
                    <TableCell className="px-4 py-3 font-medium text-slate-800">
                      {task.drawing_title}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {task.project_code} - {task.client_company}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {task.assigned_by?.name}
                    </TableCell>
                    <TableCell className="px-4 py-3 capitalize">
                      {task.step_name}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant={
                          task.estimation_priority === "high"
                            ? "destructive"
                            : task.estimation_priority === "medium"
                            ? "default"
                            : "outline"
                        }
                      >
                        {task.estimation_priority?.charAt(0).toUpperCase() +
                          task.estimation_priority?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 capitalize">
                      <div className="flex flex-col justify-center gap-1">
                        <Badge
                          variant={
                            task.status === "in_progress"
                              ? "default"
                              : task.status === "completed"
                              ? "outline"
                              : "secondary"
                          }
                          className="w-fit"
                        >
                          {toReadableText(task.status)}
                        </Badge>

                        {task.step_name === "checking" && task.action_taken && (
                          <Badge
                            variant={
                              task.action_taken === "approved"
                                ? "default"
                                : task.action_taken === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                            className="capitalize mt-1 w-[80px] "
                          >
                            {task.action_taken}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailsModal({ open: true, task })}
                        >
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      {!task.is_sent ? (
                        <div className="flex gap-2 justify-center">
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
                                    fetchType == "EditMarkAsApproved"
                                  }
                                  disabled={
                                    fetching &&
                                    fetchType == "EditMarkAsApproved"
                                  }
                                >
                                  Mark as Approved
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
                                  loading={
                                    fetching &&
                                    (fetchType ==
                                      "EditMarkAsRejectedWithFiles" ||
                                      fetchType == "uploadFile")
                                  }
                                  disabled={
                                    fetching &&
                                    (fetchType ==
                                      "EditMarkAsRejectedWithFiles" ||
                                      fetchType == "uploadFile")
                                  }
                                >
                                  Mark as Rejected
                                </Button>
                              </>
                            )}
                          {task.status === "completed" &&
                            task.step_name === "drafting" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleOpenSentToChecking({
                                    open: true,
                                    type: "sent_to_checking",
                                    taskId: task.id,
                                  })
                                }
                                loading={
                                  fetching && fetchType == "getWorkingUsers"
                                }
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
                                  setBackToDraftingModal({
                                    open: true,
                                    taskId: task.id,
                                  });
                                }}
                                loading={
                                  fetching &&
                                  fetchType == "createBackToDrafting"
                                }
                                disabled={
                                  fetching &&
                                  fetchType == "createBackToDrafting"
                                }
                              >
                                Back to Drafting
                              </Button>
                            )}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Complete Task Modal */}
      {completeModal.open && completeModal.type == "complete" && (
        <Dialog
          open={true}
          onOpenChange={() =>
            setCompleteModal({ open: false, taskId: null, type: "" })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
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
          setCompleteModal({ open: false, taskId: null, type: "" });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {completeModal.type === "sent_to_checking" && "Send to Checking"}
              {completeModal.type === "sent_to_approval" && "Send to Approval"}
              {completeModal.type === "back_to_drafting" && "Back to Drafting"}
            </DialogTitle>
          </DialogHeader>
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
          {completeModal.type == "back_to_drafting" && (
            <div className="mb-4">
              <label className="block font-medium mb-1">Upload Files</label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setCheckingFiles((prev) => [
                    ...prev,
                    ...files.map((file) => ({
                      file,
                      label: file.name,
                      tempUrl: URL.createObjectURL(file),
                    })),
                  ]);
                  e.target.value = "";
                }}
              />
              {checkingFiles.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1">
                  <Input
                    type="text"
                    value={f.label}
                    onChange={(e) =>
                      setCheckingFiles((prev) =>
                        prev.map((file, i) =>
                          i === idx ? { ...file, label: e.target.value } : file
                        )
                      )
                    }
                    className={f.label.trim() ? "" : "border-red-400"}
                  />
                  <span className="text-xs">{f.file && f.file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCheckingFiles((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                  >
                    &times;
                  </Button>
                </div>
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
                  {workingUsers.map((user) => (
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
              if (completeModal.type === "back_to_drafting") {
                return (
                  <Button
                    onClick={() => handleSentToDrafting()}
                    loading={
                      fetching &&
                      (fetchType == "createBackToDrafting" ||
                        fetchType == "uploadFile")
                    }
                    disabled={
                      fetching &&
                      (fetchType == "createBackToDrafting" ||
                        fetchType == "uploadFile")
                    }
                  >
                    Back to Drafting
                  </Button>
                );
              }
              return null;
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal (rich UI) */}
      <Dialog
        open={detailsModal.open}
        onOpenChange={() => setDetailsModal({ open: false, task: null })}
      >
        <DialogContent className="max-w-xl p-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {detailsModal.task && (
            <div className="bg-white rounded-lg shadow divide-y divide-slate-100 max-h-[80vh] overflow-y-auto">
              {/* Task Info */}
              <div className="p-6 flex flex-col gap-2">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xl font-bold text-blue-900 capitalize mb-3">
                      {detailsModal.task.step_name}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">
                        Project:
                      </span>{" "}
                      {detailsModal.task.project_code} -{" "}
                      {detailsModal.task.client_company}
                    </div>
                  </div>
                  {/* Status/Action Section */}
                  <div className="flex flex-col items-end gap-1 min-w-[120px]">
                    {/* Always show status */}
                    <span className="text-xs font-semibold text-slate-500 mb-1">
                      Status
                    </span>
                    <span>
                      <Badge
                        variant={
                          detailsModal.task.status === "completed"
                            ? "default"
                            : detailsModal.task.status === "in_progress"
                            ? "outline"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {detailsModal.task.status}
                      </Badge>
                    </span>
                    {/* Only show action_taken if step_name is 'checking' */}
                    {detailsModal.task.step_name === "checking" && (
                      <>
                        <span className="text-xs font-semibold text-slate-500 mt-2">
                          Action
                        </span>
                        <span>
                          {detailsModal.task.action_taken ? (
                            <Badge
                              variant={
                                detailsModal.task.action_taken === "approved"
                                  ? "default"
                                  : detailsModal.task.action_taken ===
                                    "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {detailsModal.task.action_taken}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-4 mt-2">
                  <div>
                    <span className="font-semibold text-slate-700">
                      Project:
                    </span>{" "}
                    {detailsModal.task.project_code} -{" "}
                    {detailsModal.task.client_company}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">
                      Assigned By:
                    </span>{" "}
                    {detailsModal.task.assigned_by?.name}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">
                      Priority:
                    </span>{" "}
                    {detailsModal.task.estimation_priority
                      ?.charAt(0)
                      .toUpperCase() +
                      detailsModal.task.estimation_priority?.slice(1)}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-semibold text-slate-700">Notes:</span>{" "}
                  {detailsModal.task.notes || "N/A"}
                </div>
                {detailsModal.task.action_taken === "rejected" &&
                  detailsModal.task.reason && (
                    <div className="mt-2 text-xs text-red-700">
                      <span className="font-semibold">Personal Noting:</span>{" "}
                      {detailsModal.task.reason}
                    </div>
                  )}
                {/* Files Section */}
                <div className="mt-4">
                  <div className="font-semibold text-slate-700 mb-1">Files</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Incoming Files */}
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">
                        Incoming Files
                      </div>
                      {detailsModal.task.incoming_files &&
                      detailsModal.task.incoming_files.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detailsModal.task.incoming_files.map((file, idx) => (
                            <ShowFile
                              key={idx}
                              label={file.label}
                              url={file.file ? `/uploads/${file.file}` : ""}
                              size="medium"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">None</div>
                      )}
                    </div>
                    {/* Outgoing Files */}
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">
                        Outgoing Files
                      </div>
                      {detailsModal.task.outgoing_files &&
                      detailsModal.task.outgoing_files.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detailsModal.task.outgoing_files.map((file, idx) => (
                            <ShowFile
                              key={idx}
                              label={file.label}
                              url={file.file ? `/uploads/${file.file}` : ""}
                              size="medium"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">None</div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Sent To Info */}
                {detailsModal.task.sent_to && (
                  <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-100">
                    <div className="font-semibold text-blue-900 mb-1">
                      Sent To
                    </div>
                    <div className="text-sm text-blue-800">
                      <span className="font-semibold">Name:</span>{" "}
                      {detailsModal.task.sent_to.name}
                      <br />
                      <span className="font-semibold">Role:</span>{" "}
                      {detailsModal.task.sent_to.role}
                      <br />
                      <span className="font-semibold">Datetime:</span>{" "}
                      {detailsModal.task.sent_to.datetime
                        ? new Date(
                            detailsModal.task.sent_to.datetime
                          ).toLocaleString()
                        : "-"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Task Modal */}
      <Dialog
        open={rejectModal.open}
        onOpenChange={() => setRejectModal({ open: false, taskId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
        onOpenChange={() =>
          setBackToDraftingModal({ open: false, taskId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Back to Drafting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={backToDraftingNotes}
              onChange={(e) => setBackToDraftingNotes(e.target.value)}
              placeholder="Add notes..."
            />
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
