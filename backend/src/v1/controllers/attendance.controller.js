import { createAttendance, deleteAttendance, getAttendanceList, updateAttendance } from "../services/attendance.service.js";
import { formatResponse } from "../utils/response.js";


// GET: List attendance
export async function getAttendanceController(req, res) {
  try {
    const { page, size, search, date } = req.query;
    console.log(page, size,search,date);

    const records = await getAttendanceList({
      page: Number(page) || 1,
      size: Number(size) || 10,
      search: search || "",
      date: date || null,
    });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Attendance successfully fetched",
        data: {...records},
      })
    );
  } catch (error) {
    console.error("Error fetch attendance:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
}

// POST: Create attendance
export async function createAttendanceController(req, res) {
  try {
    const { user_id, date, status, note } = req.body;
    const created = await createAttendance({
      user_id,
      date,
      status,
      note,
    });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Attendance created successfully",
        data: created,
      })
    );
  } catch (error) {
    console.error("Error mark attendance:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
}

// PATCH: Update attendance
export async function updateAttendanceController(req, res) {
  try {
    const { id } = req.params;
    const updated = await updateAttendance(id, req.body);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Attendance updated successfully",
        data: updated,
      })
    );
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update attendance", details: err.message });
  }
}

// DELETE: Remove attendance
export async function deleteAttendanceController(req, res) {
  try {
    const { id } = req.params;
    await deleteAttendance(id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete attendance", details: err.message });
  }
}