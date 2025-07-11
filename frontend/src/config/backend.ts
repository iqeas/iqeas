/* eslint-disable @typescript-eslint/no-explicit-any */
import { get } from "http";

export const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api/v1`;
export const API_ENDPOINT = {
  VERIFY_USER: `${API_URL}/auth/me `,
  LOGIN: `${API_URL}/auth/login`,
  ADD_NEW_USER: `${API_URL}/admin/create/create-user`,
  EDIT_USER_STATUS: (id: any) => `${API_URL}/admin/user/${id}/status`,
  CREATE_PROJECT: `${API_URL}/projects`,
  GET_ALL_USERS_AND_TEAMS: `${API_URL}/admin/get-users`,
  EDIT_USER: (id: any) => `${API_URL}/admin/users/${id}`,
  DELETE_USER: (id: any) => `${API_URL}/admin/users/${id}`,
  CREATE_TEAMS: `${API_URL}/teams`,
  EDIT_TEAMS: (id: any) => `${API_URL}/teams/${id}`,
  GET_ALL_RFQ_PROJECTS: `${API_URL}/projects/rfq`,
  UPLOAD_FILE: `${API_URL}/upload-file`,
  PROJECT_ADD_MORE_INFO: `${API_URL}/project-more-info`,
  EDIT_PROJECT: (id: any) => `${API_URL}/projects/${id}`,
  GET_TEAMS_BY_ROLE: (role: any) => `${API_URL}/teams/role/${role}`,
  GET_ALL_ESTIMATION_PROJECTS: `${API_URL}/projects/estimation`,
};
