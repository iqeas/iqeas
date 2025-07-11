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
  status:
    | "draft"
    | "under_review"
    | "sent_to_client"
    | "estimation_approved"
    | "estimation_rejected";
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
