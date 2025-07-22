export function defineProjectProgress(projectData) {
  const d = projectData;
  if (d.status == "estimating" && d.send_to_estimation) {
    if (d.estimation_status == "under_review") {
      return 30;
    } else if (d.estimation_status == "sent_to_client") {
      return 40;
    } else if(d.estimation_status == 'created'){
      return 60
    }else if (d.estimation_status == "edited") {
      return 75;
    } else if (d.estimation_status == "sent_to_admin") {
      return 80;
    } else if (d.estimation_status == "back_to_you") {
      return 70;
    } else if (
      d.estimation_status == "approved" ||
      d.estimation_status == "rejected"
    ) {
      return 100;
    }
  }
  return 0;
}
