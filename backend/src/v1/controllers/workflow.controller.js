import * as WorkflowService from "../services/workflow.service.js";
import { formatResponse } from "../utils/response.js";

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
    
    const current_log_id = req.body.log_id;
    await WorkflowService.updateLogStatus(current_log_id, true);
    const logData = await WorkflowService.getUserAssignedTaskByLogId(
      current_log_id
    );
    res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Drawing stage log added",
        data: logData,
      })
    );
  } catch (err) {
    console.log(err);
    if(result) {
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
    const { page = 1, size = 10, filter = "all", query = "" } = req.query;
    const result = await WorkflowService.getUserAssignedTasks(
      userId,
      query,
      page,
      size,
      filter
    );
    const cards = await WorkflowService.getUserTaskStats(userId);

    res.json({
      status_code: 200,
      detail: "Success",
      data: { ...result, cards },
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
    const { status, uploaded_files_ids, action_taken,reason } = req.body;

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