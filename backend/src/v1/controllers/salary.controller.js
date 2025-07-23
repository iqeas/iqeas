
import { createOrUpdateSalary, getSalaryList } from "../services/salary.service.js";
import { formatResponse } from "../utils/response.js";
export async function getSalariesController(req, res) {
  try {
    const { search = "", page = 1, size = 10, date } = req.query;

    const result = await getSalaryList({
      search,
      page: parseInt(page),
      size: parseInt(size),
      date,
    });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Attendance successfully fetched",
        data: { ...result },
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

export async function upsertSalaryController(req, res) {
  try {
    const { user_id, salary_date, base_salary, bonus, deduction, paid_on } =
      req.body;

    const record = await createOrUpdateSalary({
      user_id,
      salary_date,
      base_salary,
      bonus,
      deduction,
      paid_on,
    });

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "successfully marked as paid",
        data: record,
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
