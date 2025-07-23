import * as LeaveService from "../services/leave.service.js";
import { formatResponse } from "../utils/response.js";

export async function getLeavesController(req, res) {
  try {
    const { page = 1, size = 10, search = "", filter = "all" } = req.query;
    const data = await LeaveService.getLeaves({ page, size, search, filter });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: `Successfully fetched leaves`,
        data: data,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Failed to fetch leaves" })
      );
  }
}

export async function createLeaveController(req, res) {
  try {
    const data = await LeaveService.createLeave(req.body);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: `Successfully created leave`,
        data: data,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Failed to create leave" })
      );
  }
}

export async function updateLeaveController(req, res) {
  try {
    const { id } = req.params;
    const data = await LeaveService.updateLeave(id, req.body);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: `Successfully updated leave`,
        data: data,
      })
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Failed to update leave" })
      );
  }
}

export async function deleteLeaveController(req, res) {
  try {
    const { id } = req.params;
    await LeaveService.deleteLeave(id);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: `Successfully delete leave`,
        data: null,
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Failed to delete leave" })
      );
  }
}
