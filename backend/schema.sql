-- =====================
-- USERS
-- =====================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'rfq', 'estimation', 'pm', 'working', 'documentation')),
    password VARCHAR(128) NOT NULL
    is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================
-- TEAMS
-- =====================
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    users JSONB DEFAULT '[]',         
    active BOOLEAN DEFAULT TRUE,
    role TEXT DEFAULT ''
    leader_id INTEGER NOT NULL
);


CREATE TABLE teams_users (
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- =====================
-- UPLOADED FILES
-- =====================
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    label VARCHAR(100) NOT NULL,
    file VARCHAR(255) NOT NULL,
    uploaded_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'under_review' CHECK (status IN ('draft', 'under_review', 'approved', 'rejected'))
);

-- =====================
-- PROJECTS
-- =====================
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    project_id VARCHAR(50) UNIQUE NOT NULL,
    received_date DATE NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_company VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    project_type VARCHAR(50) NOT NULL ,
    priority VARCHAR(20) NOT NULL ,
    contact_person VARCHAR(100) NOT NULL,
    contact_person_phone VARCHAR(15),
    contact_person_email VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    estimation_status VARCHAR(30) DEFAULT 'draft',
    send_to_estimation BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE projects_uploaded_files (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, uploaded_file_id)
);

CREATE TABLE project_rejections (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL
);

CREATE TABLE project_rejection_uploaded_files (
    project_rejection_id INTEGER NOT NULL REFERENCES project_rejections(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (project_rejection_id, uploaded_file_id)
);
-- =====================
-- PROJECT MORE INFO
-- =====================
CREATE TABLE project_more_info (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    notes TEXT,
    enquiry TEXT
);

CREATE TABLE project_more_info_uploaded_files (
    project_more_info_id INTEGER NOT NULL REFERENCES project_more_info(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (project_more_info_id, uploaded_file_id)
);

-- =====================
-- ESTIMATIONS
-- =====================
CREATE TABLE estimations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'sent_to_client', 'estimation_approved', 'estimation_rejected')),
    log TEXT,
    cost NUMERIC(10, 2),
    deadline DATE,
    approval_date DATE,
    approved BOOLEAN DEFAULT FALSE NOT NULL,
    sent_to_pm BOOLEAN DEFAULT FALSE NOT NULL,
    notes TEXT,
    updates TEXT,
    forward_type VARCHAR(10) CHECK (forward_type IN ('user', 'team')),
    forward_id INTEGER
);

CREATE TABLE estimation_uploaded_files (
    estimation_id INTEGER NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (estimation_id, uploaded_file_id)
);

-- CREATE TABLE estimation_clarification_logs (
--     id SERIAL PRIMARY KEY,
--     created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--     estimation_id INTEGER NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
--     clarification TEXT NOT NULL
-- );
-- =====================
-- PROJECT TIMELINES 
-- =====================
CREATE TABLE project_timelines (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    completed BOOLEAN DEFAULT FALSE NOT NULL
);

-- =====================
-- DELIVERABLES SUBMISSIONS
-- =====================

CREATE TABLE deliverables_submissions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE deliverables_submissions_selected_files (
    deliverables_submission_id INTEGER NOT NULL REFERENCES deliverables_submissions(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (deliverables_submission_id, uploaded_file_id)
);

CREATE TABLE deliverables_submissions_uploaded_files (
    deliverables_submission_id INTEGER NOT NULL REFERENCES deliverables_submissions(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (deliverables_submission_id, uploaded_file_id)
);

-- =====================
-- DELIVERIES
-- =====================
CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('mechanical', 'electrical', 'civil', 'instrumentation', 'other')),
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('idc', 'idf', 'ifa', 'afc')),
    hours NUMERIC(10, 2),
    submission_id INTEGER REFERENCES deliverables_submissions(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed')),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'submitted', 'verified', 'rejected'))
);

CREATE TABLE deliveries_uploaded_files (
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (delivery_id, uploaded_file_id)
);

-- =====================
-- DELIVERY VERIFICATIONS
-- =====================
CREATE TABLE delivery_verifications (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('verified', 'rejected')),
    notes TEXT
);

CREATE TABLE delivery_verification_files (
    delivery_verification_id INTEGER NOT NULL REFERENCES delivery_verifications(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (delivery_verification_id, uploaded_file_id)
);

-- =====================
-- TASKS
-- =====================
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('to_do', 'in_progress', 'completed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    start_date DATE NOT NULL,
    due_date DATE,
    assigned_team_id INTEGER REFERENCES teams(id),
    assigned_individual_id INTEGER REFERENCES users(id),
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    hours NUMERIC(10, 2)
);

CREATE TABLE tasks_selected_files (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, uploaded_file_id)
);

CREATE TABLE tasks_uploaded_files (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, uploaded_file_id)
);

-- =====================
-- TASK ACTIVITY LOGS
-- =====================

CREATE TABLE task_activity_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT
);

CREATE TABLE task_activity_files (
    task_activity_log_id INTEGER NOT NULL REFERENCES task_activity_logs(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (task_activity_log_id, uploaded_file_id)
);

-- =====================
-- TASK CHATS
-- =====================
CREATE TABLE task_chats (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL
);

CREATE TABLE task_chat_files (
    task_chat_id INTEGER NOT NULL REFERENCES task_chats(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (task_chat_id, uploaded_file_id)
);
