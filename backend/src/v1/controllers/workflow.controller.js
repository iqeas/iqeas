import * as WorkflowService from "../services/workflow.service.js";

export async function createStage(req, res) {
  try {
    const result = await WorkflowService.createStage(req.body);
    res.status(201).json({ message: "Stage created", data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function uploadStageFiles(req, res) {
  try {
    const result = await WorkflowService.uploadStageFiles(
      req.params.id,
      req.files
    );
    res.status(200).json({ message: "Files uploaded", data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createDrawing(req, res) {
  try {
    const userId = req.user.id;
    const result = await WorkflowService.createDrawing(req.body, userId);
    res.status(201).json({ message: "Drawing created", data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addDrawingStageLog(req, res) {
  try {
    const userId = req.user.id;
    const { step_name, status, notes, forwarded_to, forwarded_id } = req.body;

    const result = await WorkflowService.addDrawingStageLog(
      req.params.id,
      step_name,
      status,
      notes,
      userId,
      req.files,
      forwarded_to,
      forwarded_id
    );

    res.status(201).json({ message: "Stage log added", data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDrawingLogs(req, res) {
  try {
    const logs = await WorkflowService.getDrawingLogs(req.params.id);
    res.status(200).json({ data: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
