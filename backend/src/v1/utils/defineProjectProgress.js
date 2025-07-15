export function defineProjectProgress(projectData) {
  const d = projectData;
  if (d.status == "estimating" && d.send_to_estimation) {
    if (d.estimation_status == "under_review") {
      return 33;
    } else if (d.estimation_status == "sent_to_client") {
      return 66;
    } else if (
      d.estimation_status == "approved" ||
      d.estimation_status == "rejected"
    ) {
      return 100;
    }
  }
  return 0;
}
