import pool from "../config/db.js";

export default function getNextStage(currentStage) {
  console.log(currentStage);
  if (currentStage == "IDC") {
    return "IFR";
  }
  if (currentStage == "IFR") {
    return "IFA";
  }
  if (currentStage == "IFA") {
    return "AFC";
  }
  return null;
}
export async function getNewProgressOfProject(
  currentStage,
  projectId,
  projectProgress
) {
  console.log(currentStage, projectId, projectProgress);

  const result = await pool.query(
    "SELECT weight FROM stages WHERE project_id = $1 AND name = $2",
    [projectId, currentStage]
  );

  const weight = result.rows.length ? parseFloat(result.rows[0].weight) : 0;
  return parseFloat(projectProgress) + weight;
}

export function getNextRevision(current) {
  if (!current) return "A"; // Default fallback

  const letterMatch = current.match(/^([A-C])(\d*)$/);
  const numberMatch = current.match(/^(\d+)$/);

  if (letterMatch) {
    const letter = letterMatch[1];
    const version = letterMatch[2] ? parseInt(letterMatch[2]) + 1 : 1;
    return `${letter}${version}`;
  }

  if (numberMatch) {
    return `${parseInt(numberMatch[1]) + 1}`;
  }

  return current; // Fallback if unknown pattern
}
