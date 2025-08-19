import {
  getWorkerProjectDetail,
  updateProjectPartial,
} from "../services/projects.service.js";
import * as WorkflowService from "../services/workflow.service.js";
import getNextStage, {
  getNewProgressOfProject,
  getNextRevision,
} from "../utils/getNextStage.js";
import { formatResponse } from "../utils/response.js";
import pool from "../config/db.js";

export async function createStage(req, res) {
  try {
    const project_id = req.params.project_id;
    const result = await WorkflowService.createStage(project_id, req.body);
    res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Stage created",
        data: result,
      })
    );
  } catch (err) {
    console.log(err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to create stage",
        data: err.message,
      })
    );
  }
}

export async function uploadStageFiles(req, res) {
  try {
    const result = await WorkflowService.uploadStageFiles(
      req.params.id,
      req.files
    );
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Files uploaded successfully",
        data: result,
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to upload stage files",
        data: err.message,
      })
    );
  }
}

export async function createDrawing(req, res) {
  try {
    const userId = req.user.id;

    const result = await WorkflowService.createDrawing(req.body, userId);
    const drawingId = result.id;
    const drawingData = await WorkflowService.getDrawingsWithLogsById(
      drawingId
    );
    res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Drawing created successfully",
        data: drawingData,
      })
    );
  } catch (err) {
    console.log(err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to create drawing",
        data: err.message,
      })
    );
  }
}

export async function addDrawingStageLog(req, res) {
  let result;
  try {
    result = await WorkflowService.addDrawingStageLog({
      drawingId: req.params.id,
      userId: req.user.id,
      ...req.body,
    });
    let logData;
    const current_log_id = req.body.log_id;
    if (current_log_id) {
      await WorkflowService.updateLogStatus(current_log_id, true);
      logData = await WorkflowService.getUserAssignedTaskByLogId(
        current_log_id
      );
    } else {
      const current_log_id = result.id;
      logData = await WorkflowService.getUserAssignedTaskByLogId(
        current_log_id
      );
    }
    res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Drawing stage log added",
        data: logData,
      })
    );
  } catch (err) {
    console.log(err);
    if (result) {
      await WorkflowService.deleteDrawingLog(result.id);
    }
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to add drawing stage log",
        data: err.message,
      })
    );
  }
}

export async function getDrawingLogs(req, res) {
  try {
    const logs = await WorkflowService.getDrawingLogs(req.params.id);
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Drawing logs fetched",
        data: logs,
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to fetch drawing logs",
        data: err.message,
      })
    );
  }
}

export async function getStagesByProjectIdController(req, res) {
  try {
    const projectId = req.params.project_id;
    const stages = await WorkflowService.getStagesByProjectId(projectId);
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Stages fetched successfully",
        data: stages,
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to fetch stages",
        data: err.message,
      })
    );
  }
}

export async function getStageDrawingsController(req, res) {
  try {
    const { project_id, stage_id } = req.params;
    console.log(
      `Fetching drawings for project: ${project_id}, stage: ${stage_id}`
    );
    const drawings = await WorkflowService.getDrawingsWithLogs(
      project_id,
      stage_id
    );
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Drawings with logs fetched successfully",
        data: drawings,
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to fetch drawings with logs",
        data: err.message,
      })
    );
  }
}

export async function getAssignedTasksController(req, res) {
  try {
    const userId = req.user.id;
    const projectId = req.params.project_id;
    const { page = 1, size = 10 } = req.query;
    const result = await WorkflowService.getUserAssignedTasksForProject(
      userId,
      projectId,
      page,
      size
    );
    const projectData = await getWorkerProjectDetail(userId, projectId);
    res.json({
      status_code: 200,
      detail: "Success",
      data: { ...result, project: projectData },
    });
  } catch (error) {
    console.error("Worker task error:", error);
    res.status(500).json({
      status_code: 500,
      detail: "Internal Server Error",
      data: error.message,
    });
  }
}

export async function EditDrawingLogsController(req, res) {
  try {
    const { id } = req.params;
    const { status, uploaded_files_ids, action_taken, reason, is_sent } =
      req.body;

    console.log("Request Params ID:", id);
    console.log("Request Body:", {
      status,
      uploaded_files_ids,
      action_taken,
      reason,
      is_sent,
    });

    await WorkflowService.updateDrawingLog(
      id,
      status,
      action_taken ?? null,
      reason ?? null,
      is_sent ?? false,
      uploaded_files_ids ?? null
    );
    console.log("Drawing log updated in DB");

    const logData = await WorkflowService.getUserAssignedTaskByLogId(id);
    console.log("Fetched log data:", logData);

    if (
      status === "completed" &&
      action_taken === "approved" &&
      logData.step_name === "documentation"
    ) {
      console.log("Completed + Approved + Documentation flow triggered");

      await WorkflowService.partialUpdateStage(logData.stage_id, {
        status: "completed",
      });
      console.log("Stage marked as completed:", logData.stage_id);

      const nextStage = getNextStage(logData.stage_name);
      console.log("Next stage:", nextStage);

      if (nextStage) {
        const nextStageId = await WorkflowService.getStageIdByProjectAndName(
          logData.project_id,
          nextStage
        );
        console.log("Next stage ID:", nextStageId);

        if (nextStageId) {
          await WorkflowService.partialUpdateStage(nextStageId, {
            status: "pending",
          });
          console.log("Next stage marked as pending");
        }
      }

      const newProgress = await getNewProgressOfProject(
        logData.stage_name,
        logData.project_id,
        logData.project_progress
      );
      console.log("New project progress:", newProgress);

      const projectUpdateData = { progress: newProgress };
      if (logData.stage_name === "AFC") {
        projectUpdateData["status"] = "completed";
      }
      console.log("New projectUpdateData", projectUpdateData);
      await updateProjectPartial(logData.project_id, projectUpdateData);
      console.log("Project progress/status updated:", projectUpdateData);

      const incomingFIlesIds = Array.isArray(logData.incoming_files)
        ? logData.incoming_files.map((item) => item.id)
        : [];
      console.log("Incoming file IDs:", incomingFIlesIds);

      if (incomingFIlesIds.length) {
        await WorkflowService.addFinalFiles(
          logData.drawing_id,
          incomingFIlesIds
        );
        console.log("Final files added to drawing");
      }
    }

    if (
      status === "completed" &&
      action_taken === "rejected" &&
      logData.step_name === "documentation"
    ) {
      console.log("Completed + Rejected + Documentation flow triggered");

      const stage = await WorkflowService.getStageById(logData.stage_id);
      const currentRevision = stage.revision;
      console.log("Current revision:", currentRevision);

      const newRevision = getNextRevision(currentRevision);
      console.log("New revision calculated:", newRevision);

      await WorkflowService.partialUpdateStage(logData.stage_id, {
        revision: newRevision,
      });
      console.log("Stage revision updated:", newRevision);
    }

    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Drawing log updated successfully",
        data: logData,
      })
    );
  } catch (err) {
    console.error("Error updating drawing log:", err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to update drawing log",
        data: err.message,
      })
    );
  }
}

export async function getDrawingLogByIdController(req, res) {
  try {
    const logId = req.params.id;
    const logData = await WorkflowService.getDrawingLogById(logId);
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Drawing log fetched successfully",
        data: logData,
      })
    );
  } catch (err) {
    console.error("Error fetching drawing log:", err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to fetch drawing log",
        data: err.message,
      })
    );
  }
}

export async function createDrawingFinalFile(req, res) {
  try {
    const { id } = req.params;
    const { status, uploaded_files_ids, action_taken, reason } = req.body;

    await WorkflowService.updateDrawingLog(
      id,
      status,
      action_taken,
      reason,
      uploaded_files_ids
    );
    const logData = await WorkflowService.getUserAssignedTaskByLogId(id);
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Drawing log updated successfully",
        data: logData,
      })
    );
  } catch (err) {
    console.error("Error updating drawing log:", err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Failed to update drawing log",
        data: err.message,
      })
    );
  }
}

export async function getStageFinalFiles(req, res) {
  const projectId = parseInt(req.params.id, 10);

  if (isNaN(projectId)) {
    return res.status(400).json(
      formatResponse({
        statusCode: 400,
        detail: "Invalid project ID",
      })
    );
  }

  try {
    const files = await WorkflowService.getFinalFilesByProjectId(projectId);
    console.log(files);
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Final files fetched successfully",
        data: files,
      })
    );
  } catch (err) {
    console.error("Error fetching final files:", err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Internal server error",
        data: err.message,
      })
    );
  }
}
