-- ============================================================
-- RESUME PARSER - COMPREHENSIVE SEED DATA
-- seed_data.sql
-- ============================================================
--
-- This file contains realistic seed data for the resume parser database.
-- Includes data for all major tables with proper relationships.
--
-- Usage (psql):
--   psql -U postgres -d resume_parser -f seed_data.sql
--
-- ============================================================

-- ============================================================
-- STEP 1: Update users table to support additional roles
-- ============================================================

-- Drop and recreate users table with updated role constraint
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    role            VARCHAR(50)  NOT NULL DEFAULT 'recruiter'
                        CHECK (role IN ('admin', 'recruiter', 'viewer', 'team_lead', 'client_manager', 'bdm')),
    tenant_id       VARCHAR(100) NOT NULL DEFAULT 'default',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- ============================================================
-- STEP 2: Insert Users
-- ============================================================

INSERT INTO users (id, email, hashed_password, is_active, role, tenant_id, created_at) VALUES
-- Admin
('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'admin', 'default', '2024-01-01 00:00:00+00'),

-- Recruiters
('550e8400-e29b-41d4-a716-446655440002', 'john.recruiter@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'recruiter', 'default', '2024-01-15 00:00:00+00'),
('550e8400-e29b-41d4-a716-446655440003', 'sarah.recruiter@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'recruiter', 'default', '2024-02-01 00:00:00+00'),
('550e8400-e29b-41d4-a716-446655440004', 'emma.recruiter@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'recruiter', 'default', '2024-03-01 00:00:00+00'),

-- Team Lead
('550e8400-e29b-41d4-a716-446655440005', 'mike.teamlead@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'team_lead', 'default', '2024-02-15 00:00:00+00'),

-- Client Manager
('550e8400-e29b-41d4-a716-446655440006', 'lisa.clientmanager@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'client_manager', 'default', '2024-03-15 00:00:00+00'),

-- BDM
('550e8400-e29b-41d4-a716-446655440007', 'robert.bdm@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'bdm', 'default', '2024-04-01 00:00:00+00'),

-- Viewer
('550e8400-e29b-41d4-a716-446655440008', 'david.viewer@company.com', '$2a$12$IPTrDUAUUw32eCJYNeDu2OS7eBTo/XRINOnMggTArGNeAe1SbkJTq', true, 'viewer', 'default', '2024-04-15 00:00:00+00');

-- ============================================================
-- STEP 3: Insert Skills (Global catalog)
-- ============================================================

INSERT INTO skills (id, name, normalized_name, category) VALUES
-- Technical Skills
('660e8400-e29b-41d4-a716-446655440001', 'JavaScript', 'javascript', 'technical'),
('660e8400-e29b-41d4-a716-446655440002', 'Python', 'python', 'technical'),
('660e8400-e29b-41d4-a716-446655440003', 'React', 'react', 'technical'),
('660e8400-e29b-41d4-a716-446655440004', 'Node.js', 'nodejs', 'technical'),
('660e8400-e29b-41d4-a716-446655440005', 'Java', 'java', 'technical'),
('660e8400-e29b-41d4-a716-446655440006', 'Spring Boot', 'springboot', 'technical'),
('660e8400-e29b-41d4-a716-446655440007', 'SQL', 'sql', 'technical'),
('660e8400-e29b-41d4-a716-446655440008', 'PostgreSQL', 'postgresql', 'technical'),
('660e8400-e29b-41d4-a716-446655440009', 'MongoDB', 'mongodb', 'technical'),
('660e8400-e29b-41d4-a716-446655440010', 'MySQL', 'mysql', 'technical'),
('660e8400-e29b-41d4-a716-446655440011', 'AWS', 'aws', 'technical'),
('660e8400-e29b-41d4-a716-446655440012', 'Azure', 'azure', 'technical'),
('660e8400-e29b-41d4-a716-446655440013', 'Docker', 'docker', 'technical'),
('660e8400-e29b-41d4-a716-446655440014', 'Kubernetes', 'kubernetes', 'technical'),
('660e8400-e29b-41d4-a716-446655440015', 'TypeScript', 'typescript', 'technical'),
('660e8400-e29b-41d4-a716-446655440016', 'Git', 'git', 'technical'),
('660e8400-e29b-41d4-a716-446655440017', 'REST APIs', 'restapis', 'technical'),
('660e8400-e29b-41d4-a716-446655440018', 'GraphQL', 'graphql', 'technical'),
('660e8400-e29b-41d4-a716-446655440019', 'Machine Learning', 'machinelearning', 'technical'),
('660e8400-e29b-41d4-a716-446655440020', 'Data Analysis', 'dataanalysis', 'technical'),

-- Soft Skills
('660e8400-e29b-41d4-a716-446655440021', 'Communication', 'communication', 'soft'),
('660e8400-e29b-41d4-a716-446655440022', 'Leadership', 'leadership', 'soft'),
('660e8400-e29b-41d4-a716-446655440023', 'Team Management', 'teammanagement', 'soft'),
('660e8400-e29b-41d4-a716-446655440024', 'Problem Solving', 'problemsolving', 'soft'),
('660e8400-e29b-41d4-a716-446655440025', 'Project Management', 'projectmanagement', 'soft');

-- ============================================================
-- STEP 4: Insert Clients
-- ============================================================

INSERT INTO clients (id, company_name, industry, address, city, country, owner_user_id, is_archived, tenant_id, created_at) VALUES
('770e8400-e29b-41d4-a716-446655440100', 'TechCorp Industries', 'Technology', '123 Tech Street', 'San Francisco', 'USA', '550e8400-e29b-41d4-a716-446655440006', false, 'default', '2024-01-10 00:00:00+00'),
('770e8400-e29b-41d4-a716-446655440101', 'DataFlow Systems', 'Data Analytics', '456 Data Ave', 'New York', 'USA', '550e8400-e29b-41d4-a716-446655440006', false, 'default', '2024-01-15 00:00:00+00'),
('770e8400-e29b-41d4-a716-446655440102', 'CloudScale Solutions', 'Cloud Computing', '789 Cloud Blvd', 'Seattle', 'USA', '550e8400-e29b-41d4-a716-446655440006', false, 'default', '2024-02-01 00:00:00+00'),
('770e8400-e29b-41d4-a716-446655440103', 'FinanceHub Inc', 'Finance', '321 Money Lane', 'Chicago', 'USA', '550e8400-e29b-41d4-a716-446655440006', false, 'default', '2024-02-15 00:00:00+00'),
('770e8400-e29b-41d4-a716-446655440104', 'HealthTech Solutions', 'Healthcare', '654 Medical Dr', 'Boston', 'USA', '550e8400-e29b-41d4-a716-446655440006', false, 'default', '2024-03-01 00:00:00+00');

-- ============================================================
-- STEP 5: Insert Client Contacts
-- ============================================================

INSERT INTO client_contacts (id, client_id, contact_name, designation, email, phone, is_primary, created_at) VALUES
('880e8400-e29b-41d4-a716-446655440100', '770e8400-e29b-41d4-a716-446655440100', 'John Smith', 'Hiring Manager', 'john.smith@techcorp.com', '+1-555-1001', true, '2024-01-10 00:00:00+00'),
('880e8400-e29b-41d4-a716-446655440101', '770e8400-e29b-41d4-a716-446655440100', 'Jane Doe', 'HR Manager', 'jane.doe@techcorp.com', '+1-555-1002', false, '2024-01-10 00:00:00+00'),
('880e8400-e29b-41d4-a716-446655440102', '770e8400-e29b-41d4-a716-446655440101', 'Mike Johnson', 'Technical Lead', 'mike.johnson@dataflow.com', '+1-555-2001', true, '2024-01-15 00:00:00+00'),
('880e8400-e29b-41d4-a716-446655440103', '770e8400-e29b-41d4-a716-446655440102', 'Sarah Williams', 'CTO', 'sarah.williams@cloudscale.com', '+1-555-3001', true, '2024-02-01 00:00:00+00'),
('880e8400-e29b-41d4-a716-446655440104', '770e8400-e29b-41d4-a716-446655440103', 'Robert Brown', 'Director', 'robert.brown@financehub.com', '+1-555-4001', true, '2024-02-15 00:00:00+00');

-- ============================================================
-- STEP 6: Insert Candidates
-- ============================================================

INSERT INTO candidates (id, email, email_hash, full_name, phone, location, linkedin_url, github_url, summary, file_path, file_type, resume_hash, years_experience, current_title, current_company, match_score, expected_salary_min, expected_salary_max, projects, companies, job_titles, education_degrees, universities, status, review_status, consent_given, consent_date, tenant_id, created_at, updated_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'alex.johnson@email.com', 'abc123hash1', 'Alex Johnson', '+1-555-0101', 'San Francisco, CA', 'https://linkedin.com/in/alexjohnson', 'https://github.com/alexjohnson', 'Senior Full Stack Developer with 8+ years of experience building scalable web applications. Expert in React, Node.js, and cloud technologies.', '/resumes/alex_johnson.pdf', 'pdf', 'hash123alex', 8, 'Senior Full Stack Developer', 'TechCorp Inc.', 0.85, 150000, 180000, '[{"name": "E-commerce Platform", "description": "Built a full-stack e-commerce platform"}]'::jsonb, '["TechCorp Inc.", "StartupXYZ"]'::jsonb, '["Senior Full Stack Developer", "Full Stack Developer"]'::jsonb, '[{"degree": "BS Computer Science", "year": 2014}]'::jsonb, '["Stanford University"]'::jsonb, 'success', 'approved', true, '2024-01-10 00:00:00+00', 'default', '2024-01-10 00:00:00+00', '2024-01-10 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440002', 'sarah.miller@email.com', 'abc123hash2', 'Sarah Miller', '+1-555-0102', 'New York, NY', 'https://linkedin.com/in/sarahmiller', 'https://github.com/sarahmiller', 'Backend Engineer specializing in Python and distributed systems. 6 years of experience with microservices architecture.', '/resumes/sarah_miller.pdf', 'pdf', 'hash123sarah', 6, 'Backend Engineer', 'DataFlow Systems', 0.78, 140000, 165000, '[{"name": "Data Pipeline", "description": "Built real-time data processing pipeline"}]'::jsonb, '["DataFlow Systems", "CloudTech"]'::jsonb, '["Backend Engineer", "Software Engineer"]'::jsonb, '[{"degree": "MS Computer Science", "year": 2016}]'::jsonb, '["MIT"]'::jsonb, 'success', 'approved', true, '2024-01-12 00:00:00+00', 'default', '2024-01-12 00:00:00+00', '2024-01-12 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440003', 'michael.chen@email.com', 'abc123hash3', 'Michael Chen', '+1-555-0103', 'Seattle, WA', 'https://linkedin.com/in/michaelchen', 'https://github.com/michaelchen', 'DevOps Engineer with 5 years experience in AWS, Kubernetes, and infrastructure automation. CI/CD specialist.', '/resumes/michael_chen.pdf', 'pdf', 'hash123michael', 5, 'DevOps Engineer', 'CloudScale Inc.', 0.82, 145000, 170000, '[{"name": "CI/CD Pipeline", "description": "Implemented automated deployment pipeline"}]'::jsonb, '["CloudScale Inc.", "DevOps Co"]'::jsonb, '["DevOps Engineer", "Site Reliability Engineer"]'::jsonb, '[{"degree": "BS Information Technology", "year": 2017}]'::jsonb, '["University of Washington"]'::jsonb, 'success', 'approved', true, '2024-01-15 00:00:00+00', 'default', '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440004', 'emily.davis@email.com', 'abc123hash4', 'Emily Davis', '+1-555-0104', 'Austin, TX', 'https://linkedin.com/in/emilydavis', 'https://github.com/emilydavis', 'Frontend Developer passionate about React and UI/UX. 4 years of experience creating responsive web applications.', '/resumes/emily_davis.pdf', 'pdf', 'hash123emily', 4, 'Frontend Developer', 'WebDesign Pro', 0.75, 120000, 145000, '[{"name": "React Dashboard", "description": "Created analytics dashboard"}]'::jsonb, '["WebDesign Pro", "Creative Agency"]'::jsonb, '["Frontend Developer", "UI Developer"]'::jsonb, '[{"degree": "BS Graphic Design", "year": 2018}]'::jsonb, '["University of Texas"]'::jsonb, 'success', 'approved', true, '2024-01-18 00:00:00+00', 'default', '2024-01-18 00:00:00+00', '2024-01-18 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440005', 'james.wilson@email.com', 'abc123hash5', 'James Wilson', '+1-555-0105', 'Chicago, IL', 'https://linkedin.com/in/jameswilson', 'https://github.com/jameswilson', 'Data Scientist with expertise in machine learning and Python. 7 years experience in predictive analytics.', '/resumes/james_wilson.pdf', 'pdf', 'hash123james', 7, 'Data Scientist', 'Analytics Hub', 0.88, 155000, 185000, '[{"name": "ML Model", "description": "Built customer churn prediction model"}]'::jsonb, '["Analytics Hub", "Data Corp"]'::jsonb, '["Data Scientist", "Machine Learning Engineer"]'::jsonb, '[{"degree": "PhD Statistics", "year": 2015}]'::jsonb, '["University of Chicago"]'::jsonb, 'success', 'approved', true, '2024-01-20 00:00:00+00', 'default', '2024-01-20 00:00:00+00', '2024-01-20 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440006', 'lisa.anderson@email.com', 'abc123hash6', 'Lisa Anderson', '+1-555-0106', 'Boston, MA', 'https://linkedin.com/in/lisaanderson', 'https://github.com/lisaanderson', 'Java Backend Developer with 9 years experience in enterprise applications. Spring Boot expert.', '/resumes/lisa_anderson.pdf', 'pdf', 'hash123lisa', 9, 'Senior Java Developer', 'Enterprise Solutions', 0.80, 160000, 190000, '[{"name": "Enterprise API", "description": "Built REST API for enterprise system"}]'::jsonb, '["Enterprise Solutions", "BigBank"]'::jsonb, '["Senior Java Developer", "Java Developer"]'::jsonb, '[{"degree": "MS Software Engineering", "year": 2013}]'::jsonb, '["Boston University"]'::jsonb, 'success', 'approved', true, '2024-01-22 00:00:00+00', 'default', '2024-01-22 00:00:00+00', '2024-01-22 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440007', 'robert.taylor@email.com', 'abc123hash7', 'Robert Taylor', '+1-555-0107', 'Denver, CO', 'https://linkedin.com/in/roberttaylor', 'https://github.com/roberttaylor', 'Full Stack Developer with 3 years experience. Proficient in MERN stack and eager to learn new technologies.', '/resumes/robert_taylor.pdf', 'pdf', 'hash123robert', 3, 'Full Stack Developer', 'Tech Startup', 0.70, 95000, 115000, '[{"name": "Web Application", "description": "Built full-stack web application"}]'::jsonb, '["Tech Startup", "Freelance"]'::jsonb, '["Full Stack Developer", "Junior Developer"]'::jsonb, '[{"degree": "BS Computer Science", "year": 2019}]'::jsonb, '["Colorado State University"]'::jsonb, 'success', 'approved', true, '2024-01-25 00:00:00+00', 'default', '2024-01-25 00:00:00+00', '2024-01-25 00:00:00+00'),

('990e8400-e29b-41d4-a716-446655440008', 'jennifer.white@email.com', 'abc123hash8', 'Jennifer White', '+1-555-0108', 'Phoenix, AZ', 'https://linkedin.com/in/jenniferwhite', 'https://github.com/jenniferwhite', 'Mobile Developer with 5 years experience in iOS and Android development. React Native specialist.', '/resumes/jennifer_white.pdf', 'pdf', 'hash123jennifer', 5, 'Mobile Developer', 'AppWorks Inc.', 0.77, 130000, 155000, '[{"name": "Mobile App", "description": "Built cross-platform mobile app"}]'::jsonb, '["AppWorks Inc.", "MobileFirst"]'::jsonb, '["Mobile Developer", "React Native Developer"]'::jsonb, '[{"degree": "BS Computer Engineering", "year": 2017}]'::jsonb, '["Arizona State University"]'::jsonb, 'success', 'approved', true, '2024-01-28 00:00:00+00', 'default', '2024-01-28 00:00:00+00', '2024-01-28 00:00:00+00');

-- ============================================================
-- STEP 7: Insert Job Descriptions
-- ============================================================

INSERT INTO job_descriptions (id, title, department, description, required_skills, experience_years, created_at, created_by_user_id) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'Senior Full Stack Developer', 'Engineering', 'We are looking for a Senior Full Stack Developer to join our growing team. You will be responsible for building scalable web applications using React, Node.js, and cloud technologies.', '["React", "Node.js", "TypeScript", "PostgreSQL"]'::jsonb, 5, '2024-01-15 00:00:00+00', '550e8400-e29b-41d4-a716-446655440007'),
('aa0e8400-e29b-41d4-a716-446655440002', 'Python Backend Engineer', 'Engineering', 'Join our team as a Python Backend Engineer. You will work on building scalable microservices and data pipelines using Python, FastAPI, and cloud technologies.', '["Python", "FastAPI", "PostgreSQL", "Redis"]'::jsonb, 4, '2024-01-20 00:00:00+00', '550e8400-e29b-41d4-a716-446655440007'),
('aa0e8400-e29b-41d4-a716-446655440003', 'DevOps Engineer', 'Engineering', 'We are seeking a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. Experience with AWS, Kubernetes, and infrastructure automation is required.', '["AWS", "Kubernetes", "Docker", "Terraform"]'::jsonb, 3, '2024-02-01 00:00:00+00', '550e8400-e29b-41d4-a716-446655440007'),
('aa0e8400-e29b-41d4-a716-446655440004', 'Data Scientist', 'Data Science', 'Looking for a Data Scientist to build machine learning models and analyze large datasets. Experience with Python, TensorFlow, and statistical analysis is required.', '["Python", "TensorFlow", "SQL", "Statistics"]'::jsonb, 5, '2024-02-10 00:00:00+00', '550e8400-e29b-41d4-a716-446655440007'),
('aa0e8400-e29b-41d4-a716-446655440005', 'Senior Java Developer', 'Engineering', 'Join our team as a Senior Java Developer. You will work on enterprise applications using Spring Boot, microservices, and cloud technologies.', '["Java", "Spring Boot", "Microservices", "PostgreSQL"]'::jsonb, 6, '2024-02-15 00:00:00+00', '550e8400-e29b-41d4-a716-446655440007');

-- ============================================================
-- STEP 8: Insert Work History for Candidates
-- ============================================================

INSERT INTO work_history (id, candidate_id, company_name, job_title, start_date, end_date, is_current, location, description, display_order, client_name) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'TechCorp Inc.', 'Senior Full Stack Developer', '2021-06-01', NULL, true, 'San Francisco, CA', 'Leading development of scalable web applications', 1, NULL),
('bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'StartupXYZ', 'Full Stack Developer', '2018-05-01', '2021-05-31', false, 'Austin, TX', 'Built MVP and early-stage features', 2, NULL),
('bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', 'DataFlow Systems', 'Backend Engineer', '2020-03-01', NULL, true, 'New York, NY', 'Building data pipelines and microservices', 1, NULL),
('bb0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440002', 'CloudTech', 'Software Engineer', '2017-07-01', '2020-02-28', false, 'Seattle, WA', 'Developed cloud-native applications', 2, NULL),
('bb0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440003', 'CloudScale Inc.', 'DevOps Engineer', '2022-01-01', NULL, true, 'Denver, CO', 'Managing cloud infrastructure and CI/CD', 1, NULL),
('bb0e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440003', 'DevOps Co', 'Site Reliability Engineer', '2019-04-01', '2021-12-31', false, 'Portland, OR', 'Implemented monitoring and alerting systems', 2, NULL),
('bb0e8400-e29b-41d4-a716-446655440007', '990e8400-e29b-41d4-a716-446655440005', 'Analytics Hub', 'Data Scientist', '2021-08-01', NULL, true, 'Chicago, IL', 'Building ML models for business analytics', 1, NULL),
('bb0e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440005', 'Data Corp', 'Machine Learning Engineer', '2017-09-01', '2021-07-31', false, 'Boston, MA', 'Developed predictive models for customer analytics', 2, NULL);

-- ============================================================
-- STEP 9: Insert Education for Candidates
-- ============================================================

INSERT INTO education (id, candidate_id, institution, degree, field_of_study, start_date, end_date, gpa, description) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'Stanford University', 'BS Computer Science', 'Computer Science', '2010-09-01', '2014-05-31', 3.8, 'Bachelor of Science in Computer Science'),
('cc0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', 'MIT', 'MS Computer Science', 'Computer Science', '2014-09-01', '2016-05-31', 3.9, 'Master of Science in Computer Science'),
('cc0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', 'University of Washington', 'BS Information Technology', 'Information Technology', '2013-09-01', '2017-05-31', 3.7, 'Bachelor of Science in Information Technology'),
('cc0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440004', 'University of Texas', 'BS Graphic Design', 'Graphic Design', '2014-09-01', '2018-05-31', 3.6, 'Bachelor of Science in Graphic Design'),
('cc0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440005', 'University of Chicago', 'PhD Statistics', 'Statistics', '2010-09-01', '2015-05-31', 3.95, 'Doctor of Philosophy in Statistics'),
('cc0e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440006', 'Boston University', 'MS Software Engineering', 'Software Engineering', '2011-09-01', '2013-05-31', 3.85, 'Master of Science in Software Engineering'),
('cc0e8400-e29b-41d4-a716-446655440007', '990e8400-e29b-41d4-a716-446655440007', 'Colorado State University', 'BS Computer Science', 'Computer Science', '2015-09-01', '2019-05-31', 3.5, 'Bachelor of Science in Computer Science'),
('cc0e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440008', 'Arizona State University', 'BS Computer Engineering', 'Computer Engineering', '2013-09-01', '2017-05-31', 3.65, 'Bachelor of Science in Computer Engineering');

-- ============================================================
-- STEP 10: Insert Candidate Skills
-- ============================================================

INSERT INTO candidate_skills (candidate_id, skill_id, proficiency_level, years_experience) VALUES
-- Alex Johnson
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'expert', 8),
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', 'expert', 8),
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'expert', 6),
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440015', 'expert', 8),
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440011', 'advanced', 5),
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440021', 'advanced', 8),

-- Sarah Miller
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'expert', 6),
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440009', 'expert', 6),
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440007', 'advanced', 5),
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440011', 'advanced', 3),

-- Michael Chen
('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440011', 'expert', 5),
('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440013', 'expert', 5),
('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440014', 'expert', 4),
('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440016', 'expert', 5),

-- James Wilson
('990e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'expert', 7),
('990e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440019', 'expert', 6),
('990e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440007', 'advanced', 5),
('990e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440020', 'expert', 7),

-- Lisa Anderson
('990e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440005', 'expert', 9),
('990e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440006', 'expert', 9),
('990e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440011', 'advanced', 6),
('990e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440021', 'advanced', 9);

-- ============================================================
-- STEP 11: Insert Submissions
-- ============================================================

INSERT INTO submissions (id, job_id, candidate_id, submitted_by, status, rejection_reason, submitted_at, updated_at) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Submitted', NULL, '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'),
('dd0e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Under Review', NULL, '2024-02-05 00:00:00+00', '2024-02-10 00:00:00+00'),
('dd0e8400-e29b-41d4-a716-446655440003', 'aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Shortlisted', NULL, '2024-02-10 00:00:00+00', '2024-02-15 00:00:00+00'),
('dd0e8400-e29b-41d4-a716-446655440004', 'aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'Interview Scheduled', NULL, '2024-02-15 00:00:00+00', '2024-02-20 00:00:00+00'),
('dd0e8400-e29b-41d4-a716-446655440005', 'aa0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Submitted', NULL, '2024-02-20 00:00:00+00', '2024-02-20 00:00:00+00');

-- ============================================================
-- STEP 12: Insert Job Recruiter Assignments
-- ============================================================

INSERT INTO job_recruiter_assignments (job_id, recruiter_id, assigned_by, priority, assigned_at, updated_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'normal', '2024-01-20 00:00:00+00', '2024-01-20 00:00:00+00'),
('aa0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'normal', '2024-01-25 00:00:00+00', '2024-01-25 00:00:00+00'),
('aa0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'high', '2024-02-05 00:00:00+00', '2024-02-05 00:00:00+00'),
('aa0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'normal', '2024-02-10 00:00:00+00', '2024-02-10 00:00:00+00'),
('aa0e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'normal', '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00');

-- ============================================================
-- STEP 13: Insert Client Communications
-- ============================================================

INSERT INTO client_communications (client_id, contact_id, logged_by, communication_type, subject, notes, follow_up_date, tenant_id, created_at) VALUES
('770e8400-e29b-41d4-a716-446655440100', '880e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440006', 'email', 'Candidate Submissions Update', 'We have submitted 3 candidates for the Senior Full Stack Developer position', '2024-02-10', 'default', '2024-02-05 00:00:00+00'),
('770e8400-e29b-41d4-a716-446655440101', '880e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440006', 'call', 'Pipeline Discussion', 'Discussed hiring pipeline and candidate requirements', '2024-02-15', 'default', '2024-02-10 00:00:00+00');

-- ============================================================
-- DONE
-- ============================================================

-- Display summary
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE '   Users: 8';
    RAISE NOTICE '   Skills: 25';
    RAISE NOTICE '   Clients: 5';
    RAISE NOTICE '   Client Contacts: 5';
    RAISE NOTICE '   Candidates: 8';
    RAISE NOTICE '   Job Descriptions: 5';
    RAISE NOTICE '   Work History: 8';
    RAISE NOTICE '   Education: 8';
    RAISE NOTICE '   Candidate Skills: 18';
    RAISE NOTICE '   Submissions: 5';
    RAISE NOTICE '   Job Recruiter Assignments: 3';
    RAISE NOTICE '   Client Communications: 2';
END $$;