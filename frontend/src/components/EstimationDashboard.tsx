import { useEffect, useState } from "react";
import {
  Calculator,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  AlertCircle,
  User as UserIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  X,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  addDays,
  addMonths,
  addYears,
  format,
  parseISO,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  intervalToDuration,
} from "date-fns";
import { useConfirmDialog } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import Loading from "./atomic/Loading";
import type { IUser, ITeam, IEstimationProject } from "@/types/apiTypes";
import { formatRevenue, toReadableText } from "@/utils/utils";
import ShowFile from "./ShowFile";

const initialEstimators = [
  "Ahmed Al-Rashid",
  "Sarah Mohammed",
  "John Doe",
  "Jane Smith",
];
const initialPMs = ["PM Team 1", "PM Team 2", "Sarah PM", "Ahmed PM"];

export const EstimationDashboard = () => {
  const [projects, setProjects] = useState<IEstimationProject[]>([]);
  const [cards, setCards] = useState({
    active_estimation: 0,
    pending_estimations: 0,
    completed_estimations: 0,
    total_value:0
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [clarificationText, setClarificationText] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [estimators] = useState(initialEstimators);
  const [pms] = useState(initialPMs);
  const [rfcDetailsProject, setRfcDetailsProject] = useState(null);
  const [expectedDeadline, setExpectedDeadline] = useState("");
  const [sendToPM, setSendToPM] = useState(false);
  const [showReadyPrompt, setShowReadyPrompt] = useState(false);
  const [estimationFiles, setEstimationFiles] = useState([
    { label: "", file: null },
  ]);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    project: null,
    files: [{ label: "", file: null }],
    notes: "",
  });
  const [viewEstimationProject, setViewEstimationProject] = useState(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [forwardType, setForwardType] = useState<"user" | "team">("user");
  const [forwardId, setForwardId] = useState<string>("");

  // Add local state to track workflow step for each project
  const [workflowStep, setWorkflowStep] = useState({});
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const { authToken } = useAuth();
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    const getProjects = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_ESTIMATION_PROJECTS,
        {},
        "application/json",
        authToken,
        "getProjects"
      );
      if (response.status == 200) {
        setProjects(response.data.projects);
        setTotalPages(response.data.total_pages);
        setCards(response.data.cards)
      } else {
        toast.error("Failed to fetch projects");
      }
    };
    const getUsersAndTeams = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_USERS_AND_TEAMS,
        {},
        "application/json",
        authToken,
        "getUsersAndTeams"
      );
      if (response.status === 200) {
        setProjects(response.data.projects);
        setTotalPages(response.data.total_pages);
      }
    };
    getProjects();
  }, []);
  // Helper to advance workflow step for a project
  const advanceWorkflow = (projectId) => {
    setWorkflowStep((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || 0) + 1,
    }));
  };
  // Helper to reset workflow step for a project
  const resetWorkflow = (projectId) => {
    setWorkflowStep((prev) => ({
      ...prev,
      [projectId]: 0,
    }));
  };
  // Handler for status transitions
  const handleStatusTransition = async (project, nextStatus) => {
    if (nextStatus === "Rejected") {
      resetWorkflow(project.id);
    } else if (nextStatus === "Approved") {
      setSelectedProject(project);
      resetWorkflow(project.id);
    } else {
      await changeProjectStatus(project, nextStatus);
    }
  };

  // Handlers for project modal fields
  const handleFieldChange = (field, value) => {
    setSelectedProject((p) => ({ ...p, [field]: value }));
  };
  const handleFileChange = (field, e) => {
    setSelectedProject((p) => ({ ...p, [field]: e.target.files[0] }));
  };
  const addClarification = () => {
    if (clarificationText.trim()) {
      setSelectedProject((p) => ({
        ...p,
        clarificationLog: [
          {
            text: clarificationText,
            date: new Date().toISOString(),
            author: "Estimator",
          },
          ...(p.clarificationLog || []),
        ],
      }));
      setClarificationText("");
    }
  };
  const addUpdate = () => {
    if (updateText.trim()) {
      setSelectedProject((p) => ({
        ...p,
        updates: [
          {
            text: updateText,
            date: new Date().toISOString(),
            author: "Estimator",
          },
          ...(p.updates || []),
        ],
      }));
      setUpdateText("");
    }
  };
  const handleEstimationFileChange = (idx, e) => {
    const file = e.target.files[0] || null;
    setEstimationFiles((files) =>
      files.map((uf, i) => (i === idx ? { ...uf, file } : uf))
    );
  };
  const handleEstimationLabelChange = (idx, e) => {
    const label = e.target.value;
    setEstimationFiles((files) =>
      files.map((uf, i) => (i === idx ? { ...uf, label } : uf))
    );
  };
  const addEstimationFileInput = () => {
    setEstimationFiles((files) => [...files, { label: "", file: null }]);
  };
  const removeEstimationFileInput = (idx) => {
    setEstimationFiles((files) => files.filter((_, i) => i !== idx));
  };

  const markReadyForExecution = () => {
    setSelectedProject((p) => ({ ...p, status: "Ready for Execution" }));
  };

  const openRejectModal = (project) => {
    setRejectModal({
      open: true,
      project,
      files: [{ label: "", file: null }],
      notes: "",
    });
  };
  const closeRejectModal = () => {
    setRejectModal({
      open: false,
      project: null,
      files: [{ label: "", file: null }],
      notes: "",
    });
  };
  const handleRejectFileChange = (idx, e) => {
    const file = e.target.files[0] || null;
    setRejectModal((modal) => ({
      ...modal,
      files: modal.files.map((uf, i) => (i === idx ? { ...uf, file } : uf)),
    }));
  };
  const handleRejectLabelChange = (idx, e) => {
    const label = e.target.value;
    setRejectModal((modal) => ({
      ...modal,
      files: modal.files.map((uf, i) => (i === idx ? { ...uf, label } : uf)),
    }));
  };
  const addRejectFileInput = () => {
    setRejectModal((modal) => ({
      ...modal,
      files: [...modal.files, { label: "", file: null }],
    }));
  };
  const removeRejectFileInput = (idx) => {
    setRejectModal((modal) => ({
      ...modal,
      files: modal.files.filter((_, i) => i !== idx),
    }));
  };
  const changeProjectStatus = async (project, nextStatus) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_PROJECT(project.id),
      {
        estimation_status: nextStatus,
      },
      "application/json",
      authToken,
      `editProjectStatus${project.id}`
    );
    if (response.status == 200) {
      toast.success(response.detail);
      setProjects((prev) =>
        prev.map((item) => {
          if (item.id == project.id) {
            return {
              ...item,
              estimation_status: nextStatus,
            };
          }
          return item;
        })
      );
      // setCards({
      //   ...cards,
      //   active_projects: cards.active_projects + 1,
      //   read_for_estimation: cards.read_for_estimation - 1,
      // });
    } else {
      toast.error(`Failed to mark as ${toReadableText(nextStatus)}`);
    }
  };

  if (!isFetched || (fetching && fetchType == "getProjects")) {
    return <Loading full />;
  }
  // Helper to compute progress from estimation_status
  const getProgressFromStatus = (status?: string) => {
    switch (status) {
      case "not_started":
        return 0;
      case "under_review":
        return 33;
      case "sent_to_client":
        return 66;
      case "approved":
      case "rejected":
        return 100;
      default:
        return 0;
    }
  };
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Estimation Department
          </h1>
          <p className="text-slate-600 mt-1">
            Project cost estimation and analysis
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cards.active_estimation}</p>
                <p className="text-sm text-slate-600">Active Estimations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cards.completed_estimations}
                </p>
                <p className="text-sm text-slate-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cards.pending_estimations}
                </p>
                <p className="text-sm text-slate-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ₹{formatRevenue(cards.total_value)}
                </p>
                <p className="text-sm text-slate-600">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {project.project_id}
                  </CardTitle>
                  <p className="text-slate-600">{project.client_name}</p>
                </div>
                <Badge
                  variant={
                    project.estimation_status === "approved"
                      ? "secondary"
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {toReadableText(project.estimation_status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.estimation ? (
                  <>
                    <div>
                      <span className="text-slate-500">Estimator:</span>
                      <p className="font-medium">
                        {project.estimation.user_id || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Deadline:</span>
                      <p className="font-medium">
                        {project.estimation.deadline
                          ? new Date(
                              project.estimation.deadline
                            ).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Cost:</span>
                      <p className="font-medium">
                        {project.estimation.cost
                          ? `₹${project.estimation.cost}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <p className="font-medium">
                        {toReadableText(project.estimation.status)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500">Created By:</span>
                      <p className="font-medium capitalize">
                        {project.user?.name || project.user_id || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Received Date:</span>
                      <p className="font-medium">
                        {project.received_date
                          ? new Date(project.received_date).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Priority:</span>
                      <p className="font-medium capitalize">
                        {toReadableText(project.priority)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <p className="font-medium capitalize">
                        {toReadableText(project.status)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-500">Progress</span>
                  <span className="text-sm font-medium">
                    {getProgressFromStatus(project.estimation_status)}%
                  </span>
                </div>
                <Progress
                  value={getProgressFromStatus(project.estimation_status)}
                  className="h-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRfcDetailsProject(project)}
                >
                  View Details
                </Button>
                {project.estimation_status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setViewEstimationProject(project)}
                  >
                    View Estimation
                  </Button>
                )}
                {/* Status workflow buttons */}
                {project.estimation_status === "not_started" &&
                  (workflowStep[project.id] || 0) === 0 && (
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() =>
                        handleStatusTransition(project, "under_review")
                      }
                      disabled={fetching}
                      loading={
                        fetching &&
                        fetchType == `editProjectStatus${project.id}`
                      }
                    >
                      Mark as Under Review
                    </Button>
                  )}
                {project.estimation_status === "under_review" && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      handleStatusTransition(project, "sent_to_client")
                    }
                    disabled={fetching}
                    loading={
                      fetching && fetchType == `editProjectStatus${project.id}`
                    }
                  >
                    Mark as Sent to Client
                  </Button>
                )}
                {project.estimation_status === "sent_to_client" && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => openRejectModal(project)}
                    >
                      Rejected
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() =>
                        handleStatusTransition(project, "Approved")
                      }
                    >
                      Approved
                    </Button>
                  </>
                )}
                {/* Fallback: if not in workflow, show Continue Work as before */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative ">
            <button
              className="absolute top-2 right-2"
              onClick={() => setSelectedProject(null)}
            >
              <X />
            </button>
            <h2 className="text-xl font-bold mb-4">
              Estimation Workflow for {selectedProject.name}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <label className="block font-medium">Cost Estimate (₹)</label>
                <Input
                  type="number"
                  value={selectedProject.costEstimate}
                  onChange={(e) =>
                    handleFieldChange("costEstimate", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block font-medium">
                  Cost Breakdown File (Excel/PDF)
                </label>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange("costEstimateFile", e)}
                />
                {selectedProject.costEstimateFile && (
                  <span className="text-xs">
                    {selectedProject.costEstimateFile.name}
                  </span>
                )}
              </div>
              <div>
                <label className="block font-medium">
                  Estimation PDF Upload
                </label>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange("estimationPDF", e)}
                />
                {selectedProject.estimationPDF && (
                  <span className="text-xs">
                    {selectedProject.estimationPDF.name}
                  </span>
                )}
              </div>
              <div>
                <label className="block font-medium">Deadline</label>
                <Input
                  type="date"
                  value={
                    selectedProject.expectedDeadline || expectedDeadline || ""
                  }
                  onChange={(e) => {
                    handleFieldChange("expectedDeadline", e.target.value);
                    setExpectedDeadline(e.target.value);
                  }}
                  className="w-44"
                />
                {(selectedProject.expectedDeadline || expectedDeadline) &&
                  (selectedProject.expectedDeadline || expectedDeadline) !==
                    "" &&
                  (() => {
                    const deadlineDate = parseISO(
                      selectedProject.expectedDeadline || expectedDeadline
                    );
                    const now = new Date();
                    const duration = intervalToDuration({
                      start: now,
                      end: deadlineDate,
                    });
                    const parts = [];
                    if (duration.years)
                      parts.push(
                        `${duration.years} year${duration.years > 1 ? "s" : ""}`
                      );
                    if (duration.months)
                      parts.push(
                        `${duration.months} month${
                          duration.months > 1 ? "s" : ""
                        }`
                      );
                    if (duration.days)
                      parts.push(
                        `${duration.days} day${duration.days > 1 ? "s" : ""}`
                      );
                    return (
                      <div className="mt-2 text-blue-700 font-medium bg-blue-50 rounded px-3 py-2 inline-block">
                        {parts.length > 0
                          ? `Time until deadline: ${parts.join(", ")}`
                          : "Deadline is today!"}
                      </div>
                    );
                  })()}
              </div>
              <div>
                <label className="block font-medium">Approval Date</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={selectedProject.approvalDate}
                    onChange={(e) => {
                      handleFieldChange("approvalDate", e.target.value);
                    }}
                  />
                  {/* <Button
                    size="sm"
                    variant={
                      selectedProject.approvalDate ? "secondary" : "outline"
                    }
                    onClick={() =>
                      handleFieldChange(
                        "approvalDate",
                        format(new Date(), "yyyy-MM-dd")
                      )
                    }
                    disabled={!!selectedProject.approvalDate}
                  >
                    {selectedProject.approvalDate
                      ? "Approved"
                      : "Client Approved"}
                  </Button> */}
                </div>
              </div>
              {selectedProject.approvalDate && (
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    id="sendToPM"
                    checked={sendToPM}
                    onCheckedChange={setSendToPM}
                  />
                  <label htmlFor="sendToPM" className="text-sm">
                    Send to Project Management Team
                  </label>
                </div>
              )}
              <div>
                <label className="block font-medium">Forward To</label>
                <div className="flex gap-2 mb-2">
                  <Select
                    value={forwardType}
                    onValueChange={(v) => setForwardType(v as "user" | "team")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Individual</SelectItem>
                      <SelectItem value="team">PM Team</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={forwardId} onValueChange={setForwardId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          forwardType === "user" ? "Select User" : "Select Team"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {forwardType === "user"
                        ? users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))
                        : teams.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.title}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select
                  value={selectedProject.forwardedTo}
                  onValueChange={(v) => handleFieldChange("forwardedTo", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pms.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {pm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="block font-medium">Remarks / Notes</label>
                <Input
                  value={selectedProject.remarks}
                  onChange={(e) => handleFieldChange("remarks", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block font-medium">
                  Client Clarification Log
                </label>
                <div className="space-y-2 mb-2 max-h-24 overflow-y-auto">
                  {(selectedProject.clarificationLog || []).length === 0 && (
                    <div className="text-slate-400">No clarifications yet.</div>
                  )}
                  {(selectedProject.clarificationLog || []).map((u, i) => (
                    <div key={i} className="border rounded p-2 bg-slate-50">
                      <div className="text-xs text-slate-500 mb-1">
                        {u.author} • {new Date(u.date).toLocaleString()}
                      </div>
                      <div>{u.text}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add clarification..."
                    value={clarificationText}
                    onChange={(e) => setClarificationText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && clarificationText.trim()) {
                        addClarification();
                      }
                    }}
                  />
                  <Button
                    onClick={addClarification}
                    disabled={!clarificationText.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block font-medium mb-2">
                  Upload Additional Documents
                </label>
                {estimationFiles.map((uf, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={uf.label.startsWith("Other:") ? "Other" : uf.label}
                      onChange={(e) => {
                        if (e.target.value === "Other") {
                          handleEstimationLabelChange(idx, {
                            target: { value: "Other:" },
                          });
                        } else {
                          handleEstimationLabelChange(idx, {
                            target: { value: e.target.value },
                          });
                        }
                      }}
                    >
                      <option value="">Select Label</option>
                      <option value="BOQ">BOQ</option>
                      <option value="Layout">Layout</option>
                      <option value="RFQ">RFQ</option>
                      <option value="Spec">Spec</option>
                      <option value="Drawing">Drawing</option>
                      <option value="Other">Other</option>
                    </select>
                    {uf.label.startsWith("Other:") && (
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="Enter label"
                        value={uf.label.replace("Other:", "")}
                        onChange={(e) =>
                          handleEstimationLabelChange(idx, {
                            target: { value: "Other:" + e.target.value },
                          })
                        }
                        style={{ minWidth: 120 }}
                      />
                    )}
                    <input
                      type="file"
                      className="border rounded px-2 py-1 text-sm"
                      onChange={(e) => handleEstimationFileChange(idx, e)}
                    />
                    {estimationFiles.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeEstimationFileInput(idx)}
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addEstimationFileInput}
                  className="mt-1"
                >
                  + Add File
                </Button>
                <div className="mt-2">
                  <div className="font-medium text-slate-700 mb-1">
                    Uploaded Files:
                  </div>
                  <ul className="list-disc ml-8 space-y-1">
                    {estimationFiles.filter((f) => f.file).length === 0 && (
                      <li className="text-slate-400">No files uploaded</li>
                    )}
                    {estimationFiles
                      .filter((f) => f.file)
                      .map((f, i) => (
                        <li key={i}>
                          <span className="font-medium text-slate-700">
                            {f.label.startsWith("Other:")
                              ? f.label.replace("Other:", "")
                              : f.label
                              ? `${f.label}: `
                              : ""}
                          </span>
                          {f.file?.name}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                className={`bg-green-600 hover:bg-green-700 ${
                  selectedProject.approvalDate
                    ? ""
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={markReadyForExecution}
                disabled={!selectedProject.approvalDate}
              >
                Mark as Ready for Execution
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RFC Details Modal */}
      {rfcDetailsProject && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 relative ">
            <button
              className="absolute top-4 right-4"
              onClick={() => setRfcDetailsProject(null)}
            >
              <X size={22} />
            </button>
            <div className="rounded-t-xl bg-gradient-to-r from-blue-600 to-blue-400 px-8 py-5 flex items-center gap-3">
              <FileText size={28} className="text-white" />
              <h2 className="text-2xl font-bold text-white">RFQ Team Data</h2>
              <span className="ml-auto text-white/80 font-mono text-sm pr-3">
                {rfcDetailsProject.project_id}
              </span>
            </div>
            <div className="p-8 overflow-y-auto max-h-[90vh]">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-base">
                <div>
                  <span className="font-semibold text-slate-700">
                    Client Name:
                  </span>
                  <br />
                  {rfcDetailsProject.client_name}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Client Company:
                  </span>
                  <br />
                  {rfcDetailsProject.client_company}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Location:
                  </span>
                  <br />
                  {rfcDetailsProject.location}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Project Type:
                  </span>
                  <br />
                  {rfcDetailsProject.project_type}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Received Date:
                  </span>
                  <br />
                  {rfcDetailsProject.received_date}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Priority:
                  </span>
                  <br />
                  {rfcDetailsProject.priority}
                </div>
                {rfcDetailsProject.deadline && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Deadline:
                    </span>
                    <br />
                    {rfcDetailsProject.deadline}
                  </div>
                )}
              </div>
              <div className="my-6 border-t pt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-base">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    Contact Person:
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserIcon size={18} className="text-blue-500" />
                    {rfcDetailsProject.contact_person}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Phone:</span>
                  <a
                    href={`tel:${rfcDetailsProject.contact_phone}`}
                    className="inline-flex items-center gap-1 border border-blue-200 rounded px-2 py-1 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
                    style={{ textDecoration: "none" }}
                  >
                    <PhoneIcon size={18} className="text-green-500" />
                    {rfcDetailsProject.contact_phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Email:</span>
                  <a
                    href={`mailto:${rfcDetailsProject.contact_email}`}
                    className="inline-flex items-center gap-1 border border-blue-200 rounded px-2 py-1 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
                    style={{ textDecoration: "none" }}
                  >
                    <MailIcon size={18} className="text-rose-500" />
                    {rfcDetailsProject.contact_email}
                  </a>
                </div>
              </div>
              <div className="my-6 border-t pt-6">
                <div className="bg-slate-100 rounded p-3 text-slate-800 min-h-[40px]">
                  {rfcDetailsProject.notes || (
                    <span className="text-slate-400">No notes</span>
                  )}
                </div>
              </div>
              <div className="my-6 border-t pt-6">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />
                  Uploaded Files:
                </div>
                <ul className="list-disc ml-8 space-y-1">
                  {(rfcDetailsProject.uploaded_files || []).filter(
                    (f) => f.file
                  ).length === 0 && (
                    <li className="text-slate-400">No files uploaded</li>
                  )}
                  {(rfcDetailsProject.uploaded_files || [])
                    .filter((f) => f.file)
                    .map((f, i) => (
                      <li key={i}>
                        <span className="font-medium text-slate-700">
                          {f.label ? `${f.label}: ` : ""}
                        </span>
                        {f.file?.name}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="my-6 border-t pt-6">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <AlertCircle size={18} className="text-yellow-500" />
                  RFC Updates:
                </div>
                <div className="space-y-2">
                  {rfcDetailsProject.add_more_infos &&
                  rfcDetailsProject.add_more_infos.length > 0 ? (
                    <div className="space-y-4">
                      {rfcDetailsProject.add_more_infos.map((info, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-4 bg-slate-50"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <StickyNote size={16} />
                            <span className="font-medium">Note:</span>
                            <span>{info.note || "-"}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(info.uploaded_files || []).map((f, j) => (
                              <ShowFile
                                key={j}
                                label={f.label}
                                url={f.file}
                                size="small"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 ml-2">
                      No additional info yet.
                    </div>
                  )}
                </div>
              </div>
              {/* Rejection Section */}
              {rfcDetailsProject.project_rejection &&
                rfcDetailsProject.project_rejection.length > 0 && (
                  <div className="my-6 border-t pt-6">
                    <div className="font-semibold text-red-700 mb-1 flex items-center gap-2">
                      <AlertCircle size={18} className="text-red-500" />
                      Rejection Details:
                    </div>
                    {rfcDetailsProject.project_rejection.map((rej, idx) => (
                      <div key={idx} className="mb-4">
                        <div className="text-slate-700 mb-1">{rej.note}</div>
                        <ul className="list-disc ml-8 space-y-1">
                          {rej.uploaded_files &&
                          rej.uploaded_files.length > 0 ? (
                            rej.uploaded_files.map((f, i) => (
                              <li key={i}>
                                <span className="font-medium text-slate-700">
                                  {f.label ? `${f.label}: ` : ""}
                                </span>
                                {f.file}
                              </li>
                            ))
                          ) : (
                            <li className="text-slate-400">
                              No files uploaded
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              <div className="flex justify-end mt-8">
                <Button
                  variant="outline"
                  onClick={() => setRfcDetailsProject(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReadyPrompt && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white border border-green-400 rounded-lg shadow-lg p-8 max-w-md w-full flex flex-col items-center">
            <CheckCircle className="text-green-600 mb-2" size={40} />
            <div className="text-lg font-semibold mb-2 text-green-700">
              Client Approved!
            </div>
            <div className="mb-4 text-center text-slate-700">
              You have approved the client, but haven't forwarded the project to
              the Project Management Team.
              <br />
              Please click <b>Mark as Ready for Execution</b> to continue.
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowReadyPrompt(false)}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={closeRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Project</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <label className="block font-medium mb-2">Upload Files</label>
            {rejectModal.files.map((uf, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={uf.label}
                  onChange={(e) => handleRejectLabelChange(idx, e)}
                >
                  <option value="">Select Label</option>
                  <option value="BOQ">BOQ</option>
                  <option value="Layout">Layout</option>
                  <option value="RFQ">RFQ</option>
                  <option value="Spec">Spec</option>
                  <option value="Drawing">Drawing</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="file"
                  className="border rounded px-2 py-1 text-sm"
                  onChange={(e) => handleRejectFileChange(idx, e)}
                />
                {rejectModal.files.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRejectFileInput(idx)}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addRejectFileInput}
              className="mt-1"
            >
              + Add File
            </Button>
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Notes</label>
            <textarea
              className="border rounded w-full p-2 text-sm"
              rows={2}
              value={rejectModal.notes}
              onChange={(e) =>
                setRejectModal((modal) => ({ ...modal, notes: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {}}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Estimation Modal */}
      {viewEstimationProject && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 relative ">
            <button
              className="absolute top-4 right-4"
              onClick={() => setViewEstimationProject(null)}
            >
              <X size={22} />
            </button>
            <div className="rounded-t-xl bg-gradient-to-r from-green-600 to-green-400 px-8 py-5 flex items-center gap-3">
              <Calculator size={28} className="text-white" />
              <h2 className="text-2xl font-bold text-white">Estimation Data</h2>
              <span className="ml-auto text-white/80 font-mono text-sm pr-3">
                {viewEstimationProject.id}
              </span>
            </div>
            <div className="p-8 overflow-y-auto max-h-[90vh]">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-base">
                <div>
                  <span className="font-semibold text-slate-700">
                    Estimator:
                  </span>
                  <br />
                  {viewEstimationProject.assignedEstimator}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Estimation Status:
                  </span>
                  <br />
                  {viewEstimationProject.estimationStatus}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Cost Estimate:
                  </span>
                  <br />
                  {viewEstimationProject.costEstimate || (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Approval Date:
                  </span>
                  <br />
                  {viewEstimationProject.approvalDate || (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Forwarded To:
                  </span>
                  <br />
                  {viewEstimationProject.forwardedTo || (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Remarks / Notes:
                  </span>
                  <br />
                  {viewEstimationProject.remarks || (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
              </div>
              <div className="my-6 border-t pt-6">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <FileText size={18} className="text-green-500" />
                  Uploaded Files:
                </div>
                <ul className="list-disc ml-8 space-y-1">
                  {(viewEstimationProject.estimationUploadedFiles || []).filter(
                    (f) => f.file
                  ).length === 0 && (
                    <li className="text-slate-400">No files uploaded</li>
                  )}
                  {(viewEstimationProject.estimationUploadedFiles || [])
                    .filter((f) => f.file)
                    .map((f, i) => (
                      <li key={i}>
                        <span className="font-medium text-slate-700">
                          {f.label ? `${f.label}: ` : ""}
                        </span>
                        {f.file?.name}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="flex justify-end mt-8">
                <Button
                  variant="outline"
                  onClick={() => setViewEstimationProject(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
