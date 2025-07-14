/* eslint-disable @typescript-eslint/no-explicit-any */
interface IUser {
  id: string;
  name: string;
  email: string;
  phonenumber: string;
  role: string;
  active: boolean;
}

interface IUserList {
  id: string;
  name: string;
}

export interface ITeam {
  id: number;
  title: string;
  active: boolean;
  users: IUserList[];
  leader: IUserList;
  leader_id: number;
  role: string;
}

export interface IRFCProjectUser {
  id: number;
  name: string;
  email: string;
  phonenumber: string;
}

export interface IRFCProject {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  name: string;
  project_id: string;
  received_date: string;
  client_name: string;
  client_company: string;
  location: string;
  project_type: string;
  priority: string;
  contact_person: string;
  contact_person_phone: string;
  contact_person_email: string;
  notes: string;
  status: string;
  send_to_estimation: boolean;
  user: IRFCProjectUser;
  uploaded_files: { label: string; id: number; file: string }[];
  add_more_infos: {
    note: string;
    uploaded_files: { label: string; id: number; file: string }[];
  }[];
}

export interface IRFCProject {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  name: string;
  project_id: string;
  received_date: string;
  client_name: string;
  client_company: string;
  location: string;
  project_type: string;
  priority: string;
  contact_person: string;
  contact_person_phone: string;
  contact_person_email: string;
  notes: string;
  status: string;
  send_to_estimation: boolean;
  user: IRFCProjectUser;
  uploaded_files: { label: string; id: number; file: string }[];
  add_more_infos: {
    note: string;
    uploaded_files: { label: string; id: number; file: string }[];
  }[];
  estimation_status: string;
}

export interface IEstimation {
  id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  user_id: number;
  user: { name: string; id: number };
  log?: string;
  cost?: number;
  deadline?: string;
  approval_date?: string;
  approved: boolean;
  sent_to_pm: boolean;
  forward_type?: "user" | "team";
  forward_id?: number;
  notes?: string;
  updates?: string;
  uploaded_files: { label: string; id: number; file: string }[];
  forward_to: {
    type: string;
    id: number;
    labe: string;
    users: any[];
  };
}

export interface IEstimationProject extends IRFCProject {
  estimation?: IEstimation;
  project_rejection?: {
    note: string;
    uploaded_files: { label: string; id: number; file: string }[];
  }[];
  // uploaded_files: same as IRFCProject.uploaded_files
}

export type { IUser };

// Document Center API types
export interface IDocumentFile {
  id: number;
  created_at: string;
  updated_at: string;
  label: string;
  file: string;
  uploaded_by_id: number;
  uploaded_by: {
    id: number;
    name: string;
  };
}

export interface IDocumentFileListResponse {
  files: IDocumentFile[];
  pagination: {
    total: number;
    totalPages: number;
  };
}

// Project/Estimation types for dashboard
export type UploadedFile = {
  id: number;
  label: string;
  url: string;
};

export type DrawingStageLog = {
  id: number;
  step_name: string;
  status: string;
  notes: string;
  reason?: string;
  created_at: string;
  incoming_files: UploadedFile[];
  outgoing_files: UploadedFile[];
};

export type Drawing = {
  id: number;
  title: string;
  drawing_type: string;
  revision: string;
  drawing_weightage: string;
  allocated_hours: number;
  project_id: number;
  stage_id: number;
  uploaded_by: number;
  created_at: string;
  client_dwg_no: string;
  iqeas_dwg_no: string;
  uploaded_files: UploadedFile[];
  drawing_stage_logs: DrawingStageLog[];
};

export interface AddMoreInfo {
  id: number;
  notes: string;
  enquiry: string;
  uploaded_files: UploadedFile[];
}

export interface EstimationUser {
  id: number;
  name: string;
  email: string;
}

export interface Estimation {
  id: number;
  status: string;
  cost: number;
  deadline: string;
  approval_date: string;
  approved: boolean;
  sent_to_pm: boolean;
  notes: string;
  updates: string | null;
  log: string;
  user: EstimationUser;
  forwarded_to: any;
  uploaded_files: UploadedFile[];
}

export interface Project {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  name: string;
  project_id: string;
  received_date: string;
  client_name: string;
  client_company: string;
  location: string;
  project_type: string;
  priority: string;
  contact_person: string;
  contact_person_phone: string;
  contact_person_email: string;
  notes: string;
  status: string;
  send_to_estimation: boolean;
  estimation_status: string;
  user: EstimationUser;
  uploaded_files: UploadedFile[];
  add_more_infos: AddMoreInfo[];
  estimation: Estimation | null;
  project_rejection: any;
}

export interface ProjectListResponse {
  total_pages: number;
  projects: Project[];
  cards: {
    active_estimation: number;
    pending_estimations: number;
    completed_estimations: number;
    total_value: number;
  };
}

// Worker Dashboard Types
export type WorkerTaskFile = {
  id: number;
  label: string;
  file: string;
};

export type WorkerTaskTimeline = {
  action: string;
  files: WorkerTaskFile[];
  notes: string;
  time: string | number;
};

export type WorkerTask = {
  id: number;
  project_uploaded_by: number;
  drawing_title: string;
  drawing_id: number;
  step_name: string;
  status: string;
  notes: string;
  reason?: string;
  created_at: string;
  updated_at: string;
  assigned_by: {
    name: string;
    email: string;
    id: number;
  };
  project_id: number;
  project_code: string;
  client_company: string;
  estimation_due_date: string;
  estimation_priority: string;
  incoming_files: WorkerTaskFile[];
  outgoing_files: WorkerTaskFile[];
  total_count: string;
  is_sent: boolean;
  sent_to?: {
    name: string;
    role: string;
    datetime: string;
  };
  action_taken: string;
  step_order: number;
};
