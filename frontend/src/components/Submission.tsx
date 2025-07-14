import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ShowFile from "@/components/ShowFile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STAGES = ["IDC", "IFR", "IFA", "AFC"];
const STAGE_COLORS = {
  approved: "bg-green-100 text-green-700 border-green-300",
  inProgress: "bg-orange-100 text-orange-700 border-orange-300",
  disabled: "bg-gray-100 text-gray-400 border-gray-200",
};

const WORKFLOW_STEPS = ["Drafting", "Checking", "Approval", "Transmission"];

// Mock data for stages
const mockStages = {
  IDC: { weight: 25, allocated_hours: 40, is_configured: true },
  IFR: { weight: 30, allocated_hours: 50, is_configured: true },
  IFA: { weight: 25, allocated_hours: 45, is_configured: false },
  AFC: { weight: 20, allocated_hours: 35, is_configured: false },
};

// Mock drawings data - one drawing per stage
const mockDrawings = [
  {
    id: 1,
    title: "P&ID Drawing - Main Process",
    drawing_type: "P&ID",
    revision: "A",
    drawing_weightage: 25,
    allocated_hours: 40,
    stage_id: "IDC",
    uploaded_by: 1,
    logs: [
      {
        id: 1,
        step_name: "Drafting",
        status: "completed",
        notes: "Initial draft completed",
        created_by: 2,
        forwarded_to: "user",
        forwarded_id: 3,
        created_at: "2024-01-15T10:00:00Z",
        files: [],
      },
      {
        id: 2,
        step_name: "Checking",
        status: "completed",
        notes: "Checked and verified",
        created_by: 3,
        forwarded_to: "team",
        forwarded_id: 4,
        created_at: "2024-01-16T14:30:00Z",
        files: [],
      },
      {
        id: 3,
        step_name: "Approval",
        status: "completed",
        notes: "Approved by PM",
        created_by: 1,
        forwarded_to: "user",
        forwarded_id: 4,
        created_at: "2024-01-17T16:00:00Z",
        files: [],
      },
      {
        id: 4,
        step_name: "Transmission",
        status: "completed",
        notes: "Transmitted to documentation team",
        created_by: 1,
        forwarded_to: "team",
        forwarded_id: 5,
        created_at: "2024-01-18T10:00:00Z",
        files: [],
      },
    ],
  },
  {
    id: 2,
    title: "IFR Drawing - Equipment Layout",
    drawing_type: "IFR",
    revision: "A0",
    drawing_weightage: 30,
    allocated_hours: 50,
    stage_id: "IFR",
    uploaded_by: 1,
    logs: [
      {
        id: 5,
        step_name: "Drafting",
        status: "completed",
        notes: "Initial IFR layout completed",
        created_by: 2,
        forwarded_to: "user",
        forwarded_id: 3,
        created_at: "2024-01-19T09:00:00Z",
        files: [],
      },
      {
        id: 6,
        step_name: "Checking",
        status: "completed",
        notes: "Checked IFR layout",
        created_by: 3,
        forwarded_to: "user",
        forwarded_id: 4,
        created_at: "2024-01-20T14:30:00Z",
        files: [],
      },
      {
        id: 7,
        step_name: "Approval",
        status: "rejected",
        notes: "Rejected - Equipment spacing issues need to be addressed",
        created_by: 4,
        forwarded_to: "user",
        forwarded_id: 3,
        created_at: "2024-01-21T11:00:00Z",
        files: [
          {
            label: "Review Comments",
            url: "https://example.com/ifr_review.pdf",
          },
        ],
      },
      {
        id: 8,
        step_name: "Checking",
        status: "rejected",
        notes:
          "Rejected - Major design changes needed, sending back to drafting",
        created_by: 3,
        forwarded_to: "user",
        forwarded_id: 2,
        created_at: "2024-01-22T10:30:00Z",
        files: [
          {
            label: "Design Issues",
            url: "https://example.com/design_issues.pdf",
          },
        ],
      },
      {
        id: 9,
        step_name: "Drafting",
        status: "completed",
        notes: "Redesigned layout with proper spacing",
        created_by: 2,
        forwarded_to: "user",
        forwarded_id: 3,
        created_at: "2024-01-23T14:20:00Z",
        files: [
          {
            label: "Redesigned IFR Layout",
            url: "https://example.com/ifr_redesigned.pdf",
          },
        ],
      },
      {
        id: 10,
        step_name: "Checking",
        status: "completed",
        notes: "Rechecked redesigned layout - all issues resolved",
        created_by: 3,
        forwarded_to: "user",
        forwarded_id: 4,
        created_at: "2024-01-24T16:45:00Z",
        files: [
          {
            label: "Final IFR Layout",
            url: "https://example.com/ifr_final.pdf",
          },
        ],
      },
      {
        id: 11,
        step_name: "Approval",
        status: "completed",
        notes: "Approved - All issues resolved",
        created_by: 4,
        forwarded_to: "user",
        forwarded_id: 1,
        created_at: "2024-01-25T10:15:00Z",
        files: [],
      },
      {
        id: 12,
        step_name: "Transmission",
        status: "rejected",
        notes:
          "Rejected by documentation team - Format not compliant (Revision A0)",
        created_by: 1,
        forwarded_to: "user",
        forwarded_id: 4,
        created_at: "2024-01-26T13:20:00Z",
        files: [
          {
            label: "Format Requirements",
            url: "https://example.com/format_guide.pdf",
          },
        ],
      },
      {
        id: 13,
        step_name: "Approval",
        status: "completed",
        notes: "Re-approved with correct format (Revision A1)",
        created_by: 4,
        forwarded_to: "user",
        forwarded_id: 1,
        created_at: "2024-01-27T09:30:00Z",
        files: [
          {
            label: "Formatted IFR Drawing",
            url: "https://example.com/ifr_formatted.pdf",
          },
        ],
      },
      {
        id: 14,
        step_name: "Transmission",
        status: "rejected",
        notes:
          "Rejected by documentation team - Missing specifications (Revision A1)",
        created_by: 1,
        forwarded_to: "user",
        forwarded_id: 4,
        created_at: "2024-01-28T13:20:00Z",
        files: [
          {
            label: "Missing Specs",
            url: "https://example.com/missing_specs.pdf",
          },
        ],
      },
      {
        id: 15,
        step_name: "Approval",
        status: "completed",
        notes: "Re-approved with specifications added (Revision A2)",
        created_by: 4,
        forwarded_to: "user",
        forwarded_id: 1,
        created_at: "2024-01-29T09:30:00Z",
        files: [
          {
            label: "Complete IFR Drawing",
            url: "https://example.com/ifr_complete.pdf",
          },
        ],
      },
      {
        id: 16,
        step_name: "Transmission",
        status: "in_progress",
        notes:
          "Currently being transmitted to documentation team (Revision A2)",
        created_by: 1,
        forwarded_to: "team",
        forwarded_id: 5,
        created_at: "2024-01-30T08:00:00Z",
        files: [],
      },
    ],
  },
];

type UploadFile = { file: File; label: string; tempUrl: string };

const Submission = ({ projectId }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // State for stages
  const [stages, setStages] = useState(mockStages);
  const [currentStage, setCurrentStage] = useState("IDC");
  const [showStageConfigDialog, setShowStageConfigDialog] = useState(false);
  const [stageConfig, setStageConfig] = useState({
    weight: 0,
    allocated_hours: 0,
  });

  // State for drawings
  const [drawings, setDrawings] = useState(mockDrawings);
  const [showDrawingDialog, setShowDrawingDialog] = useState(false);
  const [drawingForm, setDrawingForm] = useState({
    title: "",
    drawing_type: "",
    revision: "",
    drawing_weightage: 0,
    allocated_hours: 0,
  });

  // State for workflow actions
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [actionType, setActionType] = useState(""); // "complete", "reject", "forward"
  const [actionNote, setActionNote] = useState("");
  const [actionFiles, setActionFiles] = useState<UploadFile[]>([]);
  const [forwardType, setForwardType] = useState("user");
  const [forwardId, setForwardId] = useState("");

  // Mock users and teams for forwarding
  const mockUsers = [
    { id: 1, name: "John Doe", role: "PM" },
    { id: 2, name: "Jane Smith", role: "Draftsman" },
    { id: 3, name: "Mike Johnson", role: "Checker" },
    { id: 4, name: "Sarah Wilson", role: "Approver" },
  ];

  const mockTeams = [
    { id: 1, name: "Drafting Team A" },
    { id: 2, name: "Checking Team B" },
    { id: 3, name: "Approval Team C" },
  ];

  // Determine which stage is enabled
  const enabledStage =
    STAGES.find((stage) => {
      const stageData = stages[stage];
      if (!stageData.is_configured) return false;

      const stageDrawings = drawings.filter((d) => d.stage_id === stage);
      if (stageDrawings.length === 0) return true;

      // Check if the drawing in this stage is completed through transmission
      const drawing = stageDrawings[0]; // Only one drawing per stage
      const lastLog = drawing.logs[drawing.logs.length - 1];

      // Stage is enabled if drawing is not completed through transmission
      return (
        !lastLog ||
        lastLog.step_name !== "Transmission" ||
        lastLog.status !== "completed"
      );
    }) || "IDC";

  // Stage configuration handlers
  const handleStageConfigSubmit = () => {
    setStages((prev) => ({
      ...prev,
      [currentStage]: {
        ...prev[currentStage],
        ...stageConfig,
        is_configured: true,
      },
    }));
    setStageConfig({ weight: 0, allocated_hours: 0 });
    setShowStageConfigDialog(false);
  };

  // Drawing creation handlers
  const handleDrawingSubmit = () => {
    // Check if stage already has a drawing
    const existingDrawing = drawings.find((d) => d.stage_id === currentStage);
    if (existingDrawing) {
      alert(
        "This stage already has a drawing. Only one drawing per stage is allowed."
      );
      return;
    }

    const newDrawing = {
      id: Date.now(),
      title: drawingForm.title,
      drawing_type: drawingForm.drawing_type,
      revision: drawingForm.revision,
      drawing_weightage: drawingForm.drawing_weightage,
      allocated_hours: drawingForm.allocated_hours,
      stage_id: currentStage,
      uploaded_by: Number(user.id),
      logs: [],
    };
    setDrawings((prev) => [...prev, newDrawing]);
    setDrawingForm({
      title: "",
      drawing_type: "",
      revision: "",
      drawing_weightage: 0,
      allocated_hours: 0,
    });
    setShowDrawingDialog(false);
  };

  // Get current workflow step for a drawing
  const getCurrentStep = (drawing) => {
    const lastLog = drawing.logs[drawing.logs.length - 1];
    if (!lastLog) return "Drafting";

    // If last log was rejected, we need to go back to previous step
    if (lastLog.status === "rejected") {
      const currentIndex = WORKFLOW_STEPS.indexOf(lastLog.step_name);
      if (currentIndex > 0) {
        return WORKFLOW_STEPS[currentIndex - 1];
      }
    }

    // If last log was completed, move to next step
    if (lastLog.status === "completed") {
      const currentIndex = WORKFLOW_STEPS.indexOf(lastLog.step_name);
      return WORKFLOW_STEPS[currentIndex + 1] || "Transmission";
    }

    return lastLog.step_name;
  };

  // Get available actions for a drawing
  const getAvailableActions = (drawing) => {
    const currentStep = getCurrentStep(drawing);
    const lastLog = drawing.logs[drawing.logs.length - 1];

    // If no logs or last log was completed, can forward to next step
    if (!lastLog || lastLog.status === "completed") {
      return ["forward"];
    }

    // If last log was rejected, can forward to previous step
    if (lastLog.status === "rejected") {
      return ["forward"];
    }

    // If last log is in progress, can complete or reject
    if (lastLog.status === "in_progress") {
      return ["complete", "reject"];
    }

    return [];
  };

  // Get current revision for a drawing
  const getCurrentRevision = (drawing) => {
    const transmissionRejections = drawing.logs.filter(
      (log) => log.step_name === "Transmission" && log.status === "rejected"
    );
    const revisionNumber = transmissionRejections.length;
    return revisionNumber === 0 ? "A0" : `A${revisionNumber}`;
  };

  // Handle workflow actions
  const handleWorkflowAction = (drawing, action) => {
    setSelectedDrawing(drawing);
    setActionType(action);
    setActionNote("");
    setActionFiles([]);
    setShowActionDialog(true);
  };

  const handleActionSubmit = () => {
    if (!selectedDrawing) return;

    const currentStep = getCurrentStep(selectedDrawing);
    const lastLog = selectedDrawing.logs[selectedDrawing.logs.length - 1];

    let newLog;

    if (actionType === "reject") {
      // Update the current log with rejected status
      newLog = {
        ...lastLog,
        status: "rejected",
        notes: actionNote,
        files: [
          ...(lastLog.files || []),
          ...actionFiles.map((f) => ({ label: f.label, url: f.tempUrl })),
        ],
      };

      // Update the existing log instead of adding new one
      setDrawings((prev) =>
        prev.map((d) =>
          d.id === selectedDrawing.id
            ? {
                ...d,
                logs: d.logs.map((log, index) =>
                  index === d.logs.length - 1 ? newLog : log
                ),
              }
            : d
        )
      );
    } else {
      // Create new log instance for forward or complete
      newLog = {
        id: Date.now(),
        step_name: currentStep,
        status: actionType === "forward" ? "in_progress" : "completed",
        notes: actionNote,
        created_by: Number(user.id),
        forwarded_to: actionType === "forward" ? forwardType : null,
        forwarded_id: actionType === "forward" ? parseInt(forwardId) : null,
        created_at: new Date().toISOString(),
        files: actionFiles.map((f) => ({ label: f.label, url: f.tempUrl })),
      };

      setDrawings((prev) =>
        prev.map((d) =>
          d.id === selectedDrawing.id ? { ...d, logs: [...d.logs, newLog] } : d
        )
      );
    }

    setShowActionDialog(false);
    setSelectedDrawing(null);
    setActionType("");
    setActionNote("");
    setActionFiles([]);
  };

  // File input handlers
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setActionFiles((prev) => [
      ...prev,
      ...files
        .filter((file): file is File => file instanceof File)
        .map((file) => ({
          file,
          label: file.name,
          tempUrl: URL.createObjectURL(file),
        })),
    ]);
    e.target.value = "";
  };

  const handleFileLabel =
    (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setActionFiles((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, label: e.target.value } : f))
      );
    };

  const removeFile = (idx: number) => () => {
    setActionFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full mx-auto p-4 z-50">
      {/* Stage Selection */}
      <div className="flex gap-4 mb-8">
        {STAGES.map((stage, idx) => {
          const stageData = stages[stage];
          const stageDrawings = drawings.filter((d) => d.stage_id === stage);
          const drawing = stageDrawings[0];
          const lastLog = drawing?.logs[drawing.logs.length - 1];

          let status = "disabled";
          if (stageData.is_configured) {
            if (
              drawing &&
              lastLog &&
              lastLog.step_name === "Transmission" &&
              lastLog.status === "completed"
            ) {
              status = "approved";
            } else if (drawing && lastLog && lastLog.status === "in_progress") {
              status = "inProgress";
            } else if (drawing) {
              status = "inProgress";
            } else {
              status = "inProgress"; // Configured but no drawing yet
            }
          }

          return (
            <div
              key={stage}
              className={`flex-1 flex flex-col items-center p-2 rounded-lg border-2 transition cursor-pointer select-none ${
                STAGE_COLORS[status]
              } ${
                currentStage === stage
                  ? "ring-2 ring-blue-400"
                  : "hover:ring-2 hover:ring-blue-200"
              }`}
              onClick={() => setCurrentStage(stage)}
              style={{ opacity: status === "disabled" ? 0.6 : 1 }}
            >
              <div className="font-bold text-lg mb-1">{stage}</div>
              <div className="text-xs capitalize">
                {status === "approved"
                  ? "Completed"
                  : status === "inProgress"
                  ? "In Progress"
                  : "Not Configured"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Configuration */}
      {!stages[currentStage].is_configured && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">
            Configure {currentStage} Stage
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Set the weightage and allocated hours for this stage before creating
            drawings.
          </p>
          <Button onClick={() => setShowStageConfigDialog(true)}>
            Configure Stage
          </Button>
        </div>
      )}

      {/* Drawings Section */}
      {stages[currentStage].is_configured && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-blue-900 text-lg">
              Drawings for {currentStage}
            </h3>
            {!drawings.find((d) => d.stage_id === currentStage) && (
              <Button onClick={() => setShowDrawingDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Drawing
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {drawings
              .filter((d) => d.stage_id === currentStage)
              .map((drawing) => {
                const currentStep = getCurrentStep(drawing);
                const availableActions = getAvailableActions(drawing);
                const lastLog = drawing.logs[drawing.logs.length - 1];

                return (
                  <div
                    key={drawing.id}
                    className="bg-white rounded-lg border p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {drawing.title}
                        </h4>
                        <div className="text-sm text-gray-600">
                          Type: {drawing.drawing_type} | Revision:{" "}
                          {getCurrentRevision(drawing)} | Weight:{" "}
                          {drawing.drawing_weightage}% | Hours:{" "}
                          {drawing.allocated_hours}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            lastLog?.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : lastLog?.status === "in_progress"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {currentStep}
                        </span>
                      </div>
                    </div>

                    {/* Workflow Summary */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="font-medium text-sm text-gray-700">
                          Workflow Progress
                        </h6>
                        <span className="text-xs text-gray-500">
                          Revision: {getCurrentRevision(drawing)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {WORKFLOW_STEPS.map((step, idx) => {
                          const stepLogs = drawing.logs.filter(
                            (log) => log.step_name === step
                          );
                          const lastStepLog = stepLogs[stepLogs.length - 1];
                          const isCompleted =
                            lastStepLog?.status === "completed";
                          const isRejected = lastStepLog?.status === "rejected";
                          const isCurrent = step === currentStep;

                          return (
                            <div key={step} className="flex items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  isCompleted
                                    ? "bg-green-500 text-white"
                                    : isRejected
                                    ? "bg-red-500 text-white"
                                    : isCurrent
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : isRejected ? (
                                  <XCircle className="w-4 h-4" />
                                ) : (
                                  idx + 1
                                )}
                              </div>
                              <span className="ml-2 text-sm font-medium">
                                {step}
                              </span>
                              {idx < WORKFLOW_STEPS.length - 1 && (
                                <div className="w-8 h-1 bg-gray-200 mx-2"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total Actions: {drawing.logs.length} | Current Step:{" "}
                        {currentStep} | Status:{" "}
                        {lastLog?.status || "Not Started"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {availableActions.length > 0 && (
                      <div className="flex gap-2">
                        {availableActions.includes("complete") && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleWorkflowAction(drawing, "complete")
                            }
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {availableActions.includes("reject") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleWorkflowAction(drawing, "reject")
                            }
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        )}
                        {availableActions.includes("forward") && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleWorkflowAction(drawing, "forward")
                            }
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Send to {currentStep}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Complete Workflow Timeline */}
                    {drawing.logs.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium">
                            Complete Workflow History ({drawing.logs.length}{" "}
                            actions)
                          </h5>
                          <div className="text-xs text-gray-500">
                            Scroll to see all actions
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {drawing.logs.map((log, index) => (
                            <div
                              key={log.id}
                              className={`text-sm p-3 rounded border-l-4 ${
                                log.status === "completed"
                                  ? "bg-green-50 border-green-400"
                                  : log.status === "rejected"
                                  ? "bg-red-50 border-red-400"
                                  : log.status === "in_progress"
                                  ? "bg-blue-50 border-blue-400"
                                  : "bg-gray-50 border-gray-400"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-base">
                                  {log.step_name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      log.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : log.status === "rejected"
                                        ? "bg-red-100 text-red-700"
                                        : log.status === "in_progress"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {log.status.replace("_", " ")}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      log.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="text-gray-700 mb-2">
                                {log.notes}
                              </div>
                              {log.files && log.files.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {log.files.map((file, idx) => (
                                    <ShowFile
                                      key={idx}
                                      label={file.label}
                                      url={file.url}
                                      size="small"
                                    />
                                  ))}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-2">
                                {log.forwarded_to && (
                                  <span>
                                    Forwarded to:{" "}
                                    {log.forwarded_to === "user"
                                      ? "User"
                                      : "Team"}{" "}
                                    {log.forwarded_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Stage Configuration Dialog */}
      <Dialog
        open={showStageConfigDialog}
        onOpenChange={setShowStageConfigDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {currentStage} Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">Weightage (%)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                max="100"
                value={stageConfig.weight}
                onChange={(e) =>
                  setStageConfig((prev) => ({
                    ...prev,
                    weight: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="hours">Allocated Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                value={stageConfig.allocated_hours}
                onChange={(e) =>
                  setStageConfig((prev) => ({
                    ...prev,
                    allocated_hours: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStageConfigDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleStageConfigSubmit}>Configure</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawing Creation Dialog */}
      <Dialog open={showDrawingDialog} onOpenChange={setShowDrawingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Drawing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Drawing Title</Label>
              <Input
                id="title"
                value={drawingForm.title}
                onChange={(e) =>
                  setDrawingForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter drawing title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Drawing Type</Label>
                <Input
                  id="type"
                  value={drawingForm.drawing_type}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      drawing_type: e.target.value,
                    }))
                  }
                  placeholder="P&ID, Layout, etc."
                />
              </div>
              <div>
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  value={drawingForm.revision}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      revision: e.target.value,
                    }))
                  }
                  placeholder="A, B, C, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weightage">Weightage (%)</Label>
                <Input
                  id="weightage"
                  type="number"
                  min="0"
                  max="100"
                  value={drawingForm.drawing_weightage}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      drawing_weightage: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="hours">Allocated Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  value={drawingForm.allocated_hours}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      allocated_hours: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDrawingDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleDrawingSubmit}>Create Drawing</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "complete" && "Complete Step"}
              {actionType === "reject" && "Reject Drawing"}
              {actionType === "forward" &&
                `Send to ${getCurrentStep(selectedDrawing)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionType === "forward"
                    ? "Add notes (optional)"
                    : "Add notes (required)"
                }
              />
            </div>

            {actionType !== "forward" && (
              <div>
                <Label htmlFor="files">Upload Files</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileInput}
                />
                {actionFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 mt-1">
                    <Input
                      type="text"
                      value={f.label}
                      onChange={handleFileLabel(idx)}
                      className={f.label.trim() ? "" : "border-red-400"}
                    />
                    <span className="text-xs">{f.file && f.file.name}</span>
                    <Button size="sm" variant="ghost" onClick={removeFile(idx)}>
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {actionType === "forward" && (
              <>
                <div>
                  <Label htmlFor="forwardType">Forward To</Label>
                  <Select value={forwardType} onValueChange={setForwardType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="forwardId">
                    Select {forwardType === "user" ? "User" : "Team"}
                  </Label>
                  <Select value={forwardId} onValueChange={setForwardId}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${forwardType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {forwardType === "user"
                        ? mockUsers.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.name} ({user.role})
                            </SelectItem>
                          ))
                        : mockTeams.map((team) => (
                            <SelectItem
                              key={team.id}
                              value={team.id.toString()}
                            >
                              {team.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowActionDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleActionSubmit}>
                {actionType === "complete" && "Complete"}
                {actionType === "reject" && "Reject"}
                {actionType === "forward" && "Forward"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submission;
