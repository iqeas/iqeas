/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
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
import { FileText, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import toast from "react-hot-toast";
import Loading from "./atomic/Loading";
import { validateRequiredFields } from "@/utils/validation";
import { Drawing, IUser, DrawingStageLog } from "@/types/apiTypes";

const STAGES = ["IDC", "IFR", "IFA", "AFC"];

const WORKFLOW_STEPS = ["drafting", "checking", "approval", "documentation"];

type UploadFile = { file: File; label: string; tempUrl: string };

type StageBlock = {
  stage: any;
  drawing: Drawing | null;
  drawingLogs: Drawing["drawing_stage_logs"] | null;
};

const Submission = ({ projectId }) => {
  const { user, authToken } = useAuth();
  const isAdmin = user.role == "admin";
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const [selectedStage, setSelectedStage] = useState<string|null>(null);
  const [stageData, setStageData] = useState<Record<string, StageBlock | null>>(
    {}
  );
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [showStageConfigDialog, setShowStageConfigDialog] = useState(false);
  const [showDrawingDialog, setShowDrawingDialog] = useState(false);
  const [drawingForm, setDrawingForm] = useState({
    title: "",
    drawing_type: "",
    client_dwg_no: "",
    iqeas_dwg_no: "",
    drawing_weightage: 0,
    allocated_hours: 0,
  });

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<any>(null);
  const [actionType, setActionType] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionFiles, setActionFiles] = useState<UploadFile[]>([]);
  const [forwardId, setForwardId] = useState("");
  // Add state for all stage configs (for the form only)
  const [allStageConfigs, setAllStageConfigs] = useState(
    STAGES.map((stage) => ({
      name: stage,
      weight: 0,
      allocated_hours: 0,
    }))
  );
  const [sentToForm, setSentTOForm] = useState({
    notes: "",
    uploaded_files: [],
    selected_user: null,
  });

  // Add state for extra files in send to drafting dialog
  const [extraDraftingFiles, setExtraDraftingFiles] = useState<UploadFile[]>(
    []
  );
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSendDocModal, setShowSendDocModal] = useState(false);
  const [showBackToCheckingModal, setShowBackToCheckingModal] = useState(false);
  const [rejectFiles, setRejectFiles] = useState<UploadFile[]>([]);
  const [sendDocNotes, setSendDocNotes] = useState("");
  const [sendDocUser, setSendDocUser] = useState("");
  const [backToCheckingNotes, setBackToCheckingNotes] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendDialogType, setSendDialogType] = useState<
    "drafting" | "documentation" | null
  >(null);
  const [workingUsers, setWorkingUsers] = useState<IUser[]>([]);
  const [documentingUsers, setDocumentingUsers] = useState<IUser[]>([]);
  const [userSelectedStage, setUserSelectedStage] = useState(false);
  const [sentToSelectedFiles, setSentToSelectedFiles] = useState([]);
  const [currentSentToFiles, setCurrentSentToFiles] = useState([]);
  const isFetchedStageData  = useRef(false)
  const [isGetDrawing,setIsSetDrawing] =useState(false)

  // Add a function to fetch all stages (getAllStage)
  const getAllStages = async () => {
    const r = await makeApiCall(
      "get",
      API_ENDPOINT.GET_STAGES(projectId),
      {},
      "application/json",
      authToken,
      "getAllStages"
    );
    if (r.status == 200) {
      const stageMap: Record<string, StageBlock | null> = {};
      r.data.forEach((stage: any) => {
        stageMap[stage.name] = {
          stage,
          drawing: null, // set to null initially
          drawingLogs: null, // set to null initially
        };
      });
      setStageData(stageMap);
    } else {
      setStageData({});
    }
  };
  useEffect(() => {
    getAllStages();
  }, [projectId]);

  useEffect(() => {
    setUserSelectedStage(false);
  }, [projectId]);
  useEffect(() => {
    const stageId = stageData[selectedStage]?.stage?.id;
    if (selectedStage && stageId) {
      fetchStageDrawings(stageId);
    }

  }, [selectedStage]);

  useEffect(() => {
    if (userSelectedStage) return; // Don't auto-select if user has chosen
    if (!stageData || Object.keys(stageData).length === 0) return;
    let foundPending = false;
    for (let i = 0; i < STAGES.length; i++) {
      const stageName = STAGES[i];
      const block = stageData[stageName];
      if (block && block.stage && block.stage.status === "pending") {
        setSelectedStage(stageName);
        foundPending = true;
        break;
      }
    }
    if (!foundPending) {
      setSelectedStage(STAGES[STAGES.length - 1]);
    }
  }, [stageData, userSelectedStage]);

  // Helper to get status and color for a stage
  const getStageStatus = (stage: any) => {
    if (!stage)
      return {
        status: "In Progress",
        color: "bg-gray-200 text-gray-600 border-gray-300",
      };
    if (stage.status === "completed")
      return {
        status: "Approved",
        color: "bg-green-100 text-green-700 border-green-300",
      };
    if (stage.status === "pending")
      return {
        status: "Pending",
        color: "bg-orange-100 text-orange-700 border-orange-300",
      };
    return {
      status: "Not Started",
      color: "bg-gray-200 text-gray-600 border-gray-300",
    };
  };

  const fetchStageDrawings = async (id: any) => {
    const r = await makeApiCall(
      "get",
      API_ENDPOINT.GET_PROJECT_STAGE(projectId, id),
      {},
      "application/json",
      authToken,
      "getStageDrawing"
    );
    if (r.status === 200) {
      setStageData((prev) => ({
        ...prev,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawing: r.data,
          drawingLogs: (r.data?.drawing_stage_logs || []).reverse(),
        },
      }));
    } else {
      // No drawing exists for this stage
      setStageData((prev) => ({
        ...prev,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawing: null,
          drawingLogs: null,
        },
      }));
      
    }
    setIsSetDrawing(true)
  };

  // Get current workflow step for a drawing
  const getCurrentStep = (drawingLogs: unknown[]) => {
    if (!drawingLogs || drawingLogs.length === 0) return "drafting";
    const lastLog = drawingLogs[0] as any;
    if ((lastLog as any).status === "rejected") {
      const currentIndex = WORKFLOW_STEPS.indexOf((lastLog as any).step_name);
      if (currentIndex > 0) {
        return WORKFLOW_STEPS[currentIndex - 1];
      }
    }
    if ((lastLog as any).status === "completed") {
      const currentIndex = WORKFLOW_STEPS.indexOf((lastLog as any).step_name);
      return WORKFLOW_STEPS[currentIndex + 1] || "Transmission";
    }
    return (lastLog as any).step_name;
  };

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

  // Handle workflow action submit (complete, reject, forward)
  const handleActionSubmit = async () => {
    if (!selectedDrawing) return;
    if (actionType === "forward") {
      if (extraDraftingFiles.some((f) => !f.label || f.label.trim() === "")) {
        toast.error("All extra uploaded files must have a label.");
        return;
      }
    }
    const drawingId = (selectedDrawing as any).id;
    const drawingLogs = (stageData[selectedStage]?.drawingLogs as any[]) || [];
    const currentStep = getCurrentStep(drawingLogs);
    const payload = {
      drawing_id: drawingId,
      step_name: currentStep,
      status:
        actionType === "forward"
          ? "in_progress"
          : actionType === "complete"
          ? "completed"
          : "rejected",
      notes: actionNote,
      created_by: user.id,
      reason: actionType === "reject" ? actionNote : undefined,
      // TODO: handle file uploads
    };
    // Call backend to update logs
    await makeApiCall(
      "post",
      `/api/drawing/${drawingId}/log`,
      payload,
      "application/json",
      authToken,
      "addDrawingLog"
    );
    setShowActionDialog(false);
    setSelectedDrawing(null);
    setActionType("");
    setActionNote("");
    setActionFiles([]);
    setExtraDraftingFiles([]);
    if (stageData[selectedStage]?.stage?.id) {
      fetchStageDrawings(stageData[selectedStage].stage.id);
    }
  };

  // Drawing creation handlers
  const handleDrawingSubmit = async () => {
    // Validation
    const requiredFields = [
      "title",
      "drawing_type",
      "client_dwg_no",
      "iqeas_dwg_no",
      "drawing_weightage",
      "allocated_hours",
    ];
    const missingFields = validateRequiredFields(drawingForm, requiredFields);
    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields[0]}`);
      return;
    }
    // Check all files have a defined, non-empty label
    if (actionFiles.some((f) => !f.label || f.label.trim() === "")) {
      toast.error("All uploaded files must have a label.");
      return;
    }

    // Upload all files and collect their IDs
    let uploadedFileIds = [];
    if (actionFiles.length > 0) {
      try {
        const uploadResults = await Promise.all(
          actionFiles.map((f) => uploadFile(f.file, f.label))
        );
        uploadedFileIds = uploadResults.map((res) => res.id);
      } catch (err) {
        toast.error("File upload failed. Please try again.");
        return;
      }
    }
    const revision =
      selectedStage == "IDC"
        ? "A"
        : selectedStage == "IFC"
        ? "B"
        : selectedStage == "IFA"
        ? "C"
        : "1";
    // Prepare payload
    const payload = {
      title: drawingForm.title,
      drawing_type: drawingForm.drawing_type,
      client_dwg_no: drawingForm.client_dwg_no,
      iqeas_dwg_no: drawingForm.iqeas_dwg_no,
      drawing_weightage: drawingForm.drawing_weightage,
      allocated_hours: drawingForm.allocated_hours,
      uploaded_files_ids: uploadedFileIds,
      project_id: projectId,
      revision: revision,
      stage_id: stageData[selectedStage].stage.id,
    };

    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_STAGE_DRAWING,
      payload,
      "application/json",
      authToken,
      "createDrawing"
    );

    if (response.status == 201) {
      setDrawingForm({
        title: "",
        drawing_type: "",
        client_dwg_no: "",
        iqeas_dwg_no: "",
        drawing_weightage: 0,
        allocated_hours: 0,
      });
      setActionFiles([]);
      setShowDrawingDialog(false);
      setStageData({
        ...stageData,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawing: response.data,
          drawingLogs: response.data.drawing_stage_logs,
        },
      });
      toast.success("Drawing created Successfully");
    } else {
      toast.error("Failed to create drawing");
    }
  };

  const handleCreateStages = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Validation: all fields filled, total weight = 100, all hours > 0
    if (!validateConfigForm()) {
      return;
    }
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_STAGE(projectId),
      allStageConfigs,
      "application/json",
      authToken,
      "createStages"
    );
    if (response.status == 201) {
      setStageData(response.data);
      setShowStageConfigDialog(false);
      toast.success(response.detail);
    } else {
      toast.error(response.detail);
    }
  };
  const validateConfigForm = () => {
    const allFilled = allStageConfigs.every(
      (cfg) => cfg.weight > 0 && cfg.allocated_hours > 0
    );
    const totalWeight = allStageConfigs.reduce(
      (sum, cfg) => sum + Number(cfg.weight),
      0
    );
    if (!allFilled) {
      toast.error(
        "Please enter weightage (>0) and allocated hours (>0) for all stages."
      );
      return false;
    }
    if (totalWeight !== 100) {
      toast.error("Total weightage for all stages must be exactly 100%.");
      return false;
    }
    return true;
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
  const handleOpenDrafting = async () => {
    console.log("enter");
    setCurrentSentToFiles(stageData[selectedStage].drawing.uploaded_files);
    if (Array.isArray(workingUsers) && workingUsers.length !== 0) {
      setShowSendDialog(true);
      setSendDialogType("drafting");
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
        setShowSendDialog(true);
        setSendDialogType("drafting");
      } else {
        toast.error("Failed to fetch drafting users");
      }
    } catch (err) {
      toast.error("Failed to fetch drafting users");
    }
  };
  const handleSentToDraft = async () => {
    if (sentToForm.selected_user == null) {
      toast.error("Choose drafting user");
      return;
    }
    if (sentToSelectedFiles.length == 0) {
      toast.success("Choose at least one file to sent");
      return;
    }
    const data = {
      uploaded_files_ids: [...sentToSelectedFiles],
      notes: sentToForm.notes,
      forwarded_user_id: sentToForm.selected_user,
      status: "not_started",
      step_name: "drafting",
      action_taken: "not_yet",
      step_order: 1,
    };
    const drawing_id = stageData[selectedStage].drawing.id;
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(drawing_id),
      data,
      "application/json",
      authToken,
      "createDrawingLog"
    );
    if (response.status == 201) {
      setStageData({
        ...stageData,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawingLogs: [response.data, ...stageData[selectedStage].drawingLogs],
        },
      });
      setShowSendDialog(false);
      toast.success("Successfully sent to drafting");
    } else {
      toast.error("Failed to sent to drafting");
    }
  };
  if (
    (fetching && fetchType == "getAllStages") ||
    !isFetched ||
    (Object.keys(stageData).length !=0 && !isGetDrawing)
  ) {
    return <Loading full={false} />;
  }
  // [1] Add new state for modals and forms

  // [3] Add handlers for new actions
  const handleMarkAsStarted = async (log) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(log.id),
      { status: "in_progress" },
      "application/json",
      authToken,
      "EditMarkAsStarted"
    );
    if (response.status == 200) {
      setStageData({
        ...stageData,

        [selectedStage]: {
          ...stageData[selectedStage],
          drawingLogs: stageData[selectedStage].drawingLogs.map((item) => {
            if (item.id == log.id) {
              return { ...item, status: "in_progress" };
            } else {
              return item;
            }
          }),
        },
      });
      toast.success("Marked as started successfully");
    } else {
      toast.error("Failed to mark as started");
    }
  };
  const handleMarkAsApproved = async (log) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(log.id),
      { action_taken: "approved", status: "completed" },
      "application/json",
      authToken,
      "EditMarkAsApproved"
    );
    if (response.status == 200) {
      setStageData({
        ...stageData,

        [selectedStage]: {
          ...stageData[selectedStage],
          drawingLogs: stageData[selectedStage].drawingLogs.map((item) => {
            if (item.id == log.id) {
              return { ...item, action_taken: "approved", status: "completed" };
            } else {
              return item;
            }
          }),
        },
      });
      toast.success("Marked as approved successfully");
    } else {
      toast.error("Failed to mark as approved");
    }
  };
  const handleReject = async () => {
    const task = stageData[selectedStage].drawingLogs[0];
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
    }
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_DRAWING_LOG(task.id),
      {
        status: "completed",
        action_taken: "rejected",
        uploaded_files_ids: uploadedFileIds,
      },
      "application/json",
      authToken,
      "EditMarkAsRejected"
    );
    if (response.status == 200) {
      setStageData({
        ...stageData,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawingLogs: stageData[selectedStage].drawingLogs.map((t) =>
            t.id === task.id ? response.data : t
          ),
        },
      });
      //
      setRejectFiles([]);
      setShowRejectModal(false);
      toast.success("Successfully rejected ");
    } else {
      toast.error("Failed to reject the drawing");
    }
  };
  const handleSendToDocumentation = async () => {
    const task = stageData[selectedStage].drawingLogs[0];
    if (sentToSelectedFiles.length == 0) {
      toast.success("Choose at least one file to sent");
      return;
    }
    const data = {
      uploaded_files_ids: [...sentToSelectedFiles],
      notes: sendDocNotes,
      forwarded_user_id: sendDocUser,
      status: "not_started",
      step_name: "documentation",
      log_id: task.id,
    };
    const drawing_id = stageData[selectedStage].drawing.id;
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(drawing_id),
      data,
      "application/json",
      authToken,
      "editSentToDocumentation"
    );
    if (response.status == 201) {
      setShowSendDocModal(false);
      setSendDocUser(null);

      let newDrawings = stageData[selectedStage].drawingLogs.map((item) => {
        if (item.id == task.id) {
          return response.data;
        } else {
          return item;
        }
      }) as any[];
      newDrawings = [
        {
          id: null,
          step_name: "documentation",
          status: "not_started",
          notes: sendDocNotes,
          is_sent: false,
          action_taken: "not_yet",
          step_order: task.step_order + 1,
          incoming_files: task.incoming_files,
          created_at: new Date(),
        },
        ...newDrawings,
      ];
      setStageData({
        ...stageData,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawingLogs: newDrawings,
        },
      });
      setSendDocNotes("");
      toast.success("successfully sent to checking");
    } else {
      toast.error("Failed to sent to checking");
    }
  };
  const handleBackToChecking = async () => {
    const task = stageData[selectedStage].drawingLogs[0];
    if (sentToSelectedFiles.length == 0) {
      toast.success("Choose at least one file to sent");
      return;
    }
    const data = {
      uploaded_files_ids: [...sentToSelectedFiles],
      status: "not_started",
      step_name: "checking",
      notes: backToCheckingNotes,
      log_id: task.id,
    };
    const drawing_id = stageData[selectedStage].drawing.id;
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_DRAWING_LOGS(drawing_id),
      data,
      "application/json",
      authToken,
      "createBackToChecking"
    );
    if (response.status == 201) {
      let newDrawings = stageData[selectedStage].drawingLogs.map((item) => {
        if (item.id == task.id) {
          return response.data;
        } else {
          return item;
        }
      }) as any[];
      newDrawings = [
        {
          id: null,
          step_name: "checking",
          status: "not_started",
          notes: backToCheckingNotes,
          is_sent: false,
          action_taken: "not_yet",
          step_order: task.step_order + 1,
          incoming_files: task.outgoing_files,
          created_at: new Date(),
        },
        ...newDrawings,
      ];
      setStageData({
        ...stageData,
        [selectedStage]: {
          ...stageData[selectedStage],
          drawingLogs: newDrawings,
        },
      });
      setShowBackToCheckingModal(false);
      setBackToCheckingNotes("");
      toast.success("successfully sent back to checking");
    } else {
      toast.error("Failed to send back to drafting");
    }
  };
  const handleOpenDocModal = async () => {
    if (Array.isArray(documentingUsers) && documentingUsers.length !== 0) {
      setShowSendDocModal(true);
      return;
    }
    try {
      const res = await makeApiCall(
        "get",
        API_ENDPOINT.GET_USERS_BY_ROLE("documentation"),
        {},
        "application/json",
        authToken,
        "getDocumentingUsers"
      );
      if (res.status === 200 && Array.isArray(res.data)) {
        setDocumentingUsers(res.data);
        setShowSendDocModal(true);
      } else {
        toast.error("Failed to fetch drafting users");
      }
    } catch (err) {
      toast.error("Failed to fetch drafting users");
    }
  };
  return (
    <div className="w-full mx-auto p-4 z-50">

      {/* If no stages exist, show set weightage button/form */}
      {Object.keys(stageData).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 text-lg font-semibold text-gray-700">
            No stages configured yet. Start the stage process:
          </div>
          {!isAdmin && (
            <Button onClick={() => setShowStageConfigDialog(true)}>
              Set Weightage & Allocated Hours
            </Button>
          )}
          {/* Stage Configuration Dialog for all stages (UI only, no backend logic) */}
        </div>
      ) : (
        <>
          
          <div className="flex gap-4 mb-8">
            {STAGES.map((stage) => {
              const block = stageData[stage];
              const statusInfo = getStageStatus(block?.stage);
              const isNotStarted = block?.stage?.status === "not_started";
              return (
                <button
                  key={stage}
                  className={`px-4 py-2 rounded font-bold border-2 transition-all ${
                    selectedStage === stage
                      ? statusInfo.color + " border-8 border-blue-700"
                      : statusInfo.color
                  }`}
                  onClick={() => {
                    setSelectedStage(stage);
                    setUserSelectedStage(true);
                  }}
                  disabled={!block || isNotStarted}
                >
                  {stage}
                  <span className="ml-2 text-xs capitalize">
                    {statusInfo.status}
                  </span>
                </button>
              );
            })}
          </div>
          {loadingStage ? (
            <Loading full={false} />
          ) : stageData[selectedStage] === undefined ||
            stageData[selectedStage] === null ? (
            // No drawing: show send to drafting button for PM
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 text-lg font-semibold text-gray-700">
                No drawing exists for this stage. Send to drafting to start the
                work.
              </div>
              <Button
                onClick={() => {
                  handleOpenDrafting();
                }}
                loading={fetching && fetchType == "getWorkingUsers"}
              >
                {"Send to Drafting"}
              </Button>
              {/* Send to Drafting Dialog */}
            </div>
          ) : stageData[selectedStage].drawing === null ? (
            // No drawing: show create drawing button
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 text-lg font-semibold text-gray-700">
                No drawing exists for this stage. Create one to start workflow.
              </div>
              {!isAdmin && (
                <Button onClick={() => setShowDrawingDialog(true)}>
                  Create Drawing
                </Button>
              )}
              {/* Drawing Creation Dialog (already exists) */}
            </div>
          ) : (
            // Drawing and logs exist: show workflow UI
            <>
              <div className="mb-4">
                <h4 className="font-semibold text-lg">
                  {(stageData[selectedStage]?.drawing as any)?.title}
                </h4>
                <div className="text-sm text-gray-600">
                  Type:{" "}
                  {(stageData[selectedStage]?.drawing as any)?.drawing_type} |
                  Revision: {stageData[selectedStage].stage.revision} | Weight:{" "}
                  {
                    (stageData[selectedStage]?.drawing as any)
                      ?.drawing_weightage
                  }
                  % | Hours:{" "}
                  {(stageData[selectedStage]?.drawing as any)?.allocated_hours}
                </div>
              </div>
              {/* Workflow Summary */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h6 className="font-medium text-sm text-gray-700">
                    Workflow Progress
                  </h6>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {WORKFLOW_STEPS.map((step, sidx) => {
                    const stepLogs = (
                      stageData[selectedStage]?.drawingLogs as any[]
                    ).filter((log) => (log as any).step_name === step);
                    const lastStepLog = stepLogs[stepLogs.length - 1];
                    const isCompleted = lastStepLog?.status === "completed";
                    const isRejected = lastStepLog?.status === "rejected";
                    const isCurrent =
                      step ===
                      getCurrentStep(
                        stageData[selectedStage]?.drawingLogs as any[]
                      );
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
                            sidx + 1
                          )}
                        </div>
                        <span className="ml-2 text-sm font-medium">{step}</span>
                        {sidx < WORKFLOW_STEPS.length - 1 && (
                          <div className="w-8 h-1 bg-gray-200 mx-2"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  Total Actions:{" "}
                  {(stageData[selectedStage]?.drawingLogs as any[]).length} |
                  Current Step:{" "}
                  {getCurrentStep(
                    stageData[selectedStage]?.drawingLogs as any[]
                  )}{" "}
                  | Status:{" "}
                  {((stageData[selectedStage]?.drawingLogs as any[])[0] as any)
                    ?.status || "Not Started"}
                </div>
                {/* Show Final Files if stage is completed */}
                {stageData[selectedStage]?.stage?.status === "completed" &&
                  stageData[selectedStage]?.drawing?.final_files &&
                  stageData[selectedStage].drawing.final_files.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <FileText size={18} className="text-green-500" />
                        Final Files:
                      </div>
                      <div className="flex flex-wrap gap-2 ml-2">
                        {stageData[selectedStage].drawing.final_files.map(
                          (f, i) => {
                            if (typeof f === "string") {
                              return (
                                <ShowFile
                                  key={i}
                                  label={""}
                                  url={f}
                                  size="medium"
                                />
                              );
                            }
                            // Use optional chaining and fallback
                            const url =
                              (f as any)?.file ?? (f as any)?.url ?? "";
                            const label = (f as any)?.label ?? "";
                            return (
                              <ShowFile
                                key={i}
                                label={label}
                                url={url}
                                size="medium"
                              />
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
              </div>
              {/* Complete Workflow Timeline */}
              {(stageData[selectedStage]?.drawingLogs as any[]).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium">
                      Complete Workflow History{" "}
                      {(stageData[selectedStage]?.drawingLogs as any[]).length}{" "}
                      actions
                    </h5>
                    <div className="text-xs text-gray-500">
                      Scroll to see all actions
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {(
                      stageData[selectedStage]?.drawingLogs as DrawingStageLog[]
                    ).map((log, index) => {
                      // Determine log type and color
                      const isDone =
                        log.status === "completed" &&
                        log.action_taken === "not_yet";
                      let borderColor = "border-gray-400";
                      let bgColor = "bg-gray-50";
                      let statusLabel = (log.status || "not_started").replace(
                        "_",
                        " "
                      );
                      let statusBadge = "bg-gray-200 text-gray-600";
                      if (isDone) {
                        borderColor = "border-green-400";
                        bgColor = "bg-green-50";
                        statusLabel = "Completed";
                        statusBadge = "bg-green-100 text-green-700";
                      } else if (
                        log.status === "completed" &&
                        log.action_taken === "approved"
                      ) {
                        borderColor = "border-green-400";
                        bgColor = "bg-green-50";
                        statusLabel = "Approved";
                        statusBadge = "bg-green-100 text-green-700";
                      } else if (
                        log.status === "completed" &&
                        log.action_taken === "rejected"
                      ) {
                        borderColor = "border-red-400";
                        bgColor = "bg-red-50";
                        statusLabel = "Rejected";
                        statusBadge = "bg-red-100 text-red-700";
                      } else if (log.status === "in_progress") {
                        borderColor = "border-blue-400";
                        bgColor = "bg-blue-50";
                        statusLabel = "In Progress";
                        statusBadge = "bg-blue-100 text-blue-700";
                      } else if (log.status === "not_started") {
                        borderColor = "border-gray-400";
                        bgColor = "bg-gray-100";
                        statusLabel = "Not Started";
                        statusBadge = "bg-gray-200 text-gray-600";
                      } else if (log.is_sent) {
                        borderColor = "border-yellow-400";
                        bgColor = "bg-yellow-50";
                        statusLabel = "Sent";
                        statusBadge = "bg-yellow-100 text-yellow-700";
                      }
                      return (
                        <div
                          key={log.id}
                          className={`text-sm p-3 rounded border-l-4 ${bgColor} ${borderColor} ${
                            isDone ? "opacity-80" : ""
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-base">
                              {log.step_name}
                              {log.status === "rejected" && log.reason && (
                                <div className="text-xs text-red-700 mb-2">
                                  Reason: {log.reason}
                                </div>
                              )}
                              <div className="text-gray-700 mb-2">
                                Notes: {log.notes}
                              </div>
                            </div>
                            <div className="flex flex-col justify-end items-end">
                              <div className="flex gap-2 items-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusBadge}`}
                                >
                                  {statusLabel}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    log.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              {/* Only show action buttons for actionable logs, not for 'Done' */}
                              <div className="flex-1 pt-2">
                                {!isAdmin &&
                                  index === 0 &&
                                  log.step_name === "approval" &&
                                  !isDone &&
                                  (() => {
                                    const lastApprovalLog = log;
                                    if (
                                      lastApprovalLog.status === "not_started"
                                    ) {
                                      return (
                                        <Button
                                          onClick={() =>
                                            handleMarkAsStarted(log)
                                          }
                                          loading={
                                            fetching &&
                                            fetchType === "EditMarkAsStarted"
                                          }
                                          disabled={
                                            fetching &&
                                            fetchType === "EditMarkAsStarted"
                                          }
                                        >
                                          Mark as Started
                                        </Button>
                                      );
                                    }
                                    if (
                                      lastApprovalLog.status === "in_progress"
                                    ) {
                                      return (
                                        <div className="flex gap-2 mt-4 ">
                                          <Button
                                            onClick={() =>
                                              handleMarkAsApproved(log)
                                            }
                                            className="bg-green-500 hover:bg-green-600"
                                            loading={
                                              fetching &&
                                              fetchType === "EditMarkAsApproved"
                                            }
                                            disabled={
                                              fetching &&
                                              fetchType === "EditMarkAsApproved"
                                            }
                                          >
                                            Move Forward
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() =>
                                              setShowRejectModal(true)
                                            }
                                          >
                                            Go Back
                                          </Button>
                                        </div>
                                      );
                                    }
                                    if (
                                      lastApprovalLog.status === "completed" &&
                                      lastApprovalLog.action_taken ===
                                        "approved" &&
                                      !lastApprovalLog.is_sent
                                    ) {
                                      return (
                                        <Button
                                          onClick={() => {
                                            setSentToSelectedFiles([]);
                                            setCurrentSentToFiles([
                                              ...log.incoming_files,
                                              ...log.outgoing_files,
                                            ]);
                                            handleOpenDocModal();
                                          }}
                                          loading={
                                            fetching &&
                                            fetchType === "getDocumentingUsers"
                                          }
                                          disabled={
                                            fetching &&
                                            fetchType === "getDocumentingUsers"
                                          }
                                        >
                                          Send to Documentation
                                        </Button>
                                      );
                                    }
                                    if (
                                      lastApprovalLog.status === "completed" &&
                                      lastApprovalLog.action_taken ===
                                        "rejected" &&
                                      !lastApprovalLog.is_sent
                                    ) {
                                      return (
                                        <Button
                                          onClick={() => {
                                            setSentToSelectedFiles([]);
                                            setCurrentSentToFiles([
                                              ...log.incoming_files,
                                              ...log.outgoing_files,
                                            ]);
                                            setShowBackToCheckingModal(true);
                                          }}
                                          loading={
                                            fetching &&
                                            fetchType ===
                                              "approvalBackToChecking"
                                          }
                                          disabled={
                                            fetching &&
                                            fetchType ===
                                              "approvalBackToChecking"
                                          }
                                        >
                                          Back to Checking
                                        </Button>
                                      );
                                    }
                                    return null;
                                  })()}
                              </div>
                            </div>
                          </div>
                          {/* Incoming Files */}
                          {log.incoming_files &&
                            log.incoming_files.length > 0 && (
                              <div className="mb-2">
                                <div className="font-semibold text-xs text-gray-600 mb-1">
                                  Incoming Files:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {log.incoming_files.map((file, idx) => (
                                    <ShowFile
                                      key={idx}
                                      label={file.label}
                                      url={file.file}
                                      size="small"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          {/* Outgoing Files */}
                          {log.outgoing_files &&
                            log.outgoing_files.length > 0 && (
                              <div className="mb-2">
                                <div className="font-semibold text-xs text-gray-600 mb-1">
                                  Outgoing Files:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {log.outgoing_files.map((file, idx) => (
                                    <ShowFile
                                      key={idx}
                                      label={file.label}
                                      url={file.file}
                                      size="small"
                                    />
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

              {!isAdmin && stageData[selectedStage].drawingLogs.length == 0 ? (
                <Button
                  onClick={handleOpenDrafting}
                  loading={fetching && fetchType == "getWorkingUsers"}
                >
                  <FileText /> Send to Drafting
                </Button>
              ) : (
                <></>
              )}
              {/* [4] In the workflow UI, after the timeline, add approval step logic */}
              {}
            </>
          )}
        </>
      )}
      <Dialog
        open={showStageConfigDialog}
        onOpenChange={setShowStageConfigDialog}
      >
        <DialogContent className="max-w-xl" overlayClassName="bg-black/40">
          <DialogHeader>
            <DialogTitle>Configure All Stages</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 w-full">
            {allStageConfigs.map((config, idx) => (
              <div key={config.name} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor={`weight-${config.name}`}>
                    {config.name} Weightage (%)
                  </Label>
                  <Input
                    id={`weight-${config.name}`}
                    type="number"
                    min="0"
                    max="100"
                    value={config.weight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setAllStageConfigs((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, weight: val } : c
                        )
                      );
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`hours-${config.name}`}>
                    {config.name} Allocated Hours
                  </Label>
                  <Input
                    id={`hours-${config.name}`}
                    type="number"
                    min="0"
                    value={config.allocated_hours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setAllStageConfigs((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, allocated_hours: val } : c
                        )
                      );
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                onClick={handleCreateStages}
                loading={fetching && fetchType == "createStages"}
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showDrawingDialog} onOpenChange={setShowDrawingDialog}>
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
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
                  setDrawingForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
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
                <Label htmlFor="client_dwg_no">Client Drawing No.</Label>
                <Input
                  id="client_dwg_no"
                  value={drawingForm.client_dwg_no}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      client_dwg_no: e.target.value,
                    }))
                  }
                  placeholder="Client Drawing Number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="iqeas_dwg_no">IQEAS Drawing No.</Label>
                <Input
                  id="iqeas_dwg_no"
                  value={drawingForm.iqeas_dwg_no}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      iqeas_dwg_no: e.target.value,
                    }))
                  }
                  placeholder="IQEAS Drawing Number"
                />
              </div>
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
                  {!isAdmin && (
                    <Button size="sm" variant="ghost" onClick={removeFile(idx)}>
                      &times;
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDrawingDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDrawingSubmit()}
                loading={
                  fetch &&
                  (fetchType == "createDrawing" || fetchType == "uploadFile")
                }
              >
                Create Drawing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showSendDialog && sendDialogType === "drafting"}
        onOpenChange={() => {
          setSentToSelectedFiles([]);
          setCurrentSentToFiles([]);
          setShowSendDialog(false);
        }}
      >
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
          <DialogHeader>
            <DialogTitle>Send to Drafting</DialogTitle>
          </DialogHeader>
          <div className="mb-2 text-xs text-gray-600">
            All the drawing files will be forwarded to drafting.
          </div>
          <div className="mb-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={sentToForm.notes}
              onChange={(e) =>
                setSentTOForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add any notes for drafting..."
            />
          </div>
          <div>
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
          </div>
          <div className="mt-4">
            <Label htmlFor="forwardId">Select User</Label>
            <Select
              value={
                sentToForm.selected_user
                  ? sentToForm.selected_user.toString()
                  : ""
              }
              onValueChange={(val) =>
                setSentTOForm((prev) => ({ ...prev, selected_user: val }))
              }
            >
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
          <div className="flex justify-end gap-2 mt-4">
            {!isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              loading={
                fetching &&
                (fetchType == "createDrawingLog" || fetchType == "uploadFile")
              }
              onClick={handleSentToDraft}
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showDrawingDialog} onOpenChange={setShowDrawingDialog}>
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
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
                  setDrawingForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
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
                <Label htmlFor="client_dwg_no">Client Drawing No.</Label>
                <Input
                  id="client_dwg_no"
                  value={drawingForm.client_dwg_no}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      client_dwg_no: e.target.value,
                    }))
                  }
                  placeholder="Client Drawing Number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="iqeas_dwg_no">IQEAS Drawing No.</Label>
                <Input
                  id="iqeas_dwg_no"
                  value={drawingForm.iqeas_dwg_no}
                  onChange={(e) =>
                    setDrawingForm((prev) => ({
                      ...prev,
                      iqeas_dwg_no: e.target.value,
                    }))
                  }
                  placeholder="IQEAS Drawing Number"
                />
              </div>
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
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDrawingDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDrawingSubmit()}
                loading={
                  fetch &&
                  (fetchType == "createDrawing" || fetchType == "uploadFile")
                }
              >
                Create Drawing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Workflow Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
          <DialogHeader>
            <DialogTitle>
              {actionType === "complete" && "Complete Step"}
              {actionType === "reject" && "Reject Drawing"}
              {actionType === "forward" &&
                `Send to ${getCurrentStep(
                  stageData[selectedStage]?.drawingLogs as any[]
                )}`}
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
                <div className="mb-2 text-xs text-gray-600">
                  All the drawing files will be forwarded to drafting.
                </div>
                <div>
                  <Label htmlFor="extra-files">Extra File Uploading</Label>
                  <Input
                    id="extra-files"
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setExtraDraftingFiles((prev) => [
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
                    }}
                  />
                  {extraDraftingFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          setExtraDraftingFiles((prev) =>
                            prev.map((file, i) =>
                              i === idx
                                ? { ...file, label: e.target.value }
                                : file
                            )
                          );
                        }}
                        className={f.label.trim() ? "" : "border-red-400"}
                      />
                      <span className="text-xs">{f.file && f.file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExtraDraftingFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <Label htmlFor="forwardId">Select User</Label>
                  <Select value={forwardId} onValueChange={setForwardId}>
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
      {/* [5] Add modals for reject, send to documentation, back to checking */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
          <DialogHeader>
            <DialogTitle>Reject Drawing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-files">Upload Files</Label>
              <Input
                id="reject-files"
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setRejectFiles((prev) => [
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
                }}
              />
              {rejectFiles.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1">
                  <Input
                    type="text"
                    value={f.label}
                    onChange={(e) => {
                      setRejectFiles((prev) =>
                        prev.map((file, i) =>
                          i === idx ? { ...file, label: e.target.value } : file
                        )
                      );
                    }}
                    className={f.label.trim() ? "" : "border-red-400"}
                  />
                  <span className="text-xs">{f.file && f.file.name}</span>
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
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                loading={
                  fetching &&
                  (fetchType === "EditMarkAsRejected" ||
                    fetchType == "uploadFile")
                }
                disabled={
                  fetching &&
                  (fetchType === "EditMarkAsRejected" ||
                    fetchType == "uploadFile")
                }
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSendDocModal} onOpenChange={setShowSendDocModal}>
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
          <DialogHeader>
            <DialogTitle>Send to Documentation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="send-doc-notes">Notes</Label>
              <Textarea
                id="send-doc-notes"
                value={sendDocNotes}
                onChange={(e) => setSendDocNotes(e.target.value)}
                placeholder="Add notes for documentation..."
              />
            </div>
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
            <div>
              <Label htmlFor="send-doc-user">Forward to User</Label>
              <Select value={sendDocUser} onValueChange={setSendDocUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {documentingUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSendDocModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendToDocumentation}
                loading={fetching && fetchType === "editSentToDocumentation"}
                disabled={fetching && fetchType === "editSentToDocumentation"}
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showBackToCheckingModal}
        onOpenChange={setShowBackToCheckingModal}
      >
        <DialogContent className="max-w-lg" overlayClassName="bg-black/40">
          <DialogHeader>
            <DialogTitle>Back to Checking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="back-to-checking-notes">Notes</Label>
              <Textarea
                id="back-to-checking-notes"
                value={backToCheckingNotes}
                onChange={(e) => setBackToCheckingNotes(e.target.value)}
                placeholder="Add notes for checking..."
              />
            </div>
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
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBackToCheckingModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBackToChecking}
                loading={fetching && fetchType === "createBackToChecking"}
                disabled={fetching && fetchType === "createBackToChecking"}
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submission;
