// src/lib/validation.js

export function validateRequiredFields(form, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    if (
      !form[field] ||
      (typeof form[field] === "string" && form[field].trim() === "")
    ) {
      missing.push(field);
    }
  }
  return missing;
}

export function validateProjectForm(form) {
  const requiredFields = [
    "name",
    "clientName",
    "clientCompany",
    "location",
    "projectType",
    "received_date",
    "contactPerson",
    "contactPhone",
    "contactEmail",
    "priority",
  ];
  return validateRequiredFields(form, requiredFields);
}

export function validateProjectAddMoreForm(form) {
  const requiredFields = [
    "name",
    "clientName",
    "clientCompany",
    "location",
    "projectType",
    "received_date",
    "contactPerson",
    "contactPhone",
    "contactEmail",
    "priority",
  ];
  return validateRequiredFields(form, requiredFields);
}
