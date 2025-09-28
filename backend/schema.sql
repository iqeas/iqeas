
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    user_id VARCHAR(1024),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'rfq', 'estimation', 'pm', 'working', 'documentation')),
    password VARCHAR(128) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    base_salary DECIMAL DEFAULT 0   
);

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    users JSONB DEFAULT '[]',         
    active BOOLEAN DEFAULT TRUE,
    role TEXT DEFAULT '',
    leader_id INTEGER NOT NULL
);


CREATE TABLE teams_users (
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);






CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    label VARCHAR(100) NOT NULL,
    file VARCHAR(255) NOT NULL,
    uploaded_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'under_review' CHECK (status IN ('draft', 'under_review', 'approved', 'rejected'))
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    progress NUMERIC(5,2) DEFAULT 0,
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
    send_to_estimation BOOLEAN DEFAULT FALSE NOT NULL,
    public_share_token VARCHAR(20) UNIQUE
);

CREATE TABLE project_delivery_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, uploaded_file_id)
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

CREATE TABLE estimations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    cost NUMERIC(10, 2),
    deadline DATE,
    approval_date DATE,
    log TEXT,
    approved BOOLEAN DEFAULT FALSE NOT NULL,
    sent_to_pm BOOLEAN DEFAULT FALSE NOT NULL,
    notes TEXT,
    updates TEXT,
    forwarded_user_id INTEGER
);

CREATE TABLE estimation_corrections ( 
    id SERIAL PRIMARY KEY,
    estimation_id INTEGER NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
    correction TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE estimation_uploaded_files (
    estimation_id INTEGER NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (estimation_id, uploaded_file_id)
);



CREATE TABLE stages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(20) NOT NULL ,
    weight NUMERIC(5,2) NOT NULL,   
    allocated_hours INT NOT NULL,      
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revision VARCHAR(50)
);

CREATE TABLE drawings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    drawing_type VARCHAR(100),
    drawing_weightage NUMERIC(5,2),      
    allocated_hours INT,                  
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    uploaded_by INTEGER REFERENCES users(id),
    client_dwg_no VARCHAR(100),
    iqeas_dwg_no VARCHAR(100),
    revision VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE drawings_uploaded_files (
    drawing_id INTEGER NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (drawing_id, uploaded_file_id)
);


CREATE TABLE drawing_stage_logs (
    id SERIAL PRIMARY KEY,
    drawing_id INTEGER NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    step_name VARCHAR(20) NOT NULL ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' ,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    forwarded_user_id INTEGER,                                    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    is_sent BOOLEAN DEFAULT FALSE NOT NULL,
    action_taken VARCHAR(100),
    step_order INTEGER DEFAULT 1
);

CREATE TABLE drawing_stage_log_files (
    log_id INTEGER NOT NULL REFERENCES drawing_stage_logs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('incoming', 'outgoing')),
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    PRIMARY KEY (log_id, uploaded_file_id)
);


CREATE TABLE final_files (
    id SERIAL PRIMARY KEY,
    drawing_id INTEGER NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    uploaded_file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);




CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'leave')),
    note TEXT,
    UNIQUE (user_id, date) 
);
CREATE TABLE leaves (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'unpaid')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE salary_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salary_date VARCHAR(255) NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL,
    bonus NUMERIC(10,2) DEFAULT 0,
    deduction NUMERIC(10,2) DEFAULT 0,
    net_salary NUMERIC(10,2) GENERATED ALWAYS AS (base_salary + bonus - deduction) STORED,
    paid_on TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, salary_date)
);