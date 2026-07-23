BEGIN;

DO $$
DECLARE
    v_tenant_id VARCHAR := 'default';
    v_admin_id UUID;
    v_recruiter_id UUID;
    v_job1_id UUID;
    v_job2_id UUID;
    v_candidate1_id UUID;
    v_candidate2_id UUID;
    v_client1_id UUID := gen_random_uuid();
    v_client2_id UUID := gen_random_uuid();
    v_sub1_id UUID := gen_random_uuid();
    v_sub2_id UUID := gen_random_uuid();
BEGIN
    -- Get some users
    SELECT id INTO v_admin_id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin') LIMIT 1;
    SELECT id INTO v_recruiter_id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'recruiter') LIMIT 1;
    
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM users LIMIT 1;
    END IF;

    -- Get some jobs and candidates
    SELECT id INTO v_job1_id FROM job_descriptions ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_job2_id FROM job_descriptions ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO v_candidate1_id FROM candidates ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_candidate2_id FROM candidates ORDER BY created_at ASC LIMIT 1;

    -- Seed Clients
    IF NOT EXISTS (SELECT 1 FROM clients) THEN
        INSERT INTO clients (id, company_name, industry, city, country, pipeline_stage, owner_user_id, tenant_id, created_at)
        VALUES 
        (v_client1_id, 'TechCorp Global', 'Technology', 'San Francisco', 'USA', 'qualified', v_admin_id, v_tenant_id, NOW() - interval '10 days'),
        (v_client2_id, 'HealthPlus Inc', 'Healthcare', 'New York', 'USA', 'negotiation', v_admin_id, v_tenant_id, NOW() - interval '5 days');
        RAISE NOTICE 'Seeded clients';
    ELSE
        SELECT id INTO v_client1_id FROM clients LIMIT 1;
        SELECT id INTO v_client2_id FROM clients ORDER BY created_at DESC LIMIT 1;
    END IF;

    -- Update jobs to belong to clients if they don't
    IF v_job1_id IS NOT NULL THEN
        UPDATE job_descriptions SET client_id = v_client1_id WHERE id = v_job1_id AND client_id IS NULL;
    END IF;
    IF v_job2_id IS NOT NULL THEN
        UPDATE job_descriptions SET client_id = v_client2_id WHERE id = v_job2_id AND client_id IS NULL;
    END IF;

    -- Seed Submissions
    IF NOT EXISTS (SELECT 1 FROM submissions) AND v_job1_id IS NOT NULL AND v_candidate1_id IS NOT NULL THEN
        INSERT INTO submissions (id, job_id, candidate_id, submitted_by, status, submitted_at, updated_at)
        VALUES 
        (v_sub1_id, v_job1_id, v_candidate1_id, COALESCE(v_recruiter_id, v_admin_id), 'Submitted', NOW() - interval '3 days', NOW() - interval '3 days'),
        (v_sub2_id, v_job2_id, v_candidate2_id, COALESCE(v_recruiter_id, v_admin_id), 'Interview Scheduled', NOW() - interval '2 days', NOW() - interval '1 days');
        RAISE NOTICE 'Seeded submissions';
    ELSE
        SELECT id INTO v_sub1_id FROM submissions LIMIT 1;
        SELECT id INTO v_sub2_id FROM submissions ORDER BY submitted_at DESC LIMIT 1;
    END IF;

    -- Seed Interviews
    IF NOT EXISTS (SELECT 1 FROM interviews) AND v_sub2_id IS NOT NULL THEN
        INSERT INTO interviews (id, submission_id, scheduled_by, round_name, status, mode, scheduled_at, created_at, updated_at)
        VALUES 
        (gen_random_uuid(), v_sub2_id, COALESCE(v_recruiter_id, v_admin_id), 'Technical Round 1', 'scheduled', 'video', NOW() + interval '2 days', NOW(), NOW()),
        (gen_random_uuid(), v_sub2_id, COALESCE(v_recruiter_id, v_admin_id), 'HR Round', 'completed', 'phone', NOW() - interval '1 days', NOW() - interval '2 days', NOW() - interval '1 days');
        RAISE NOTICE 'Seeded interviews';
    END IF;

END $$;

COMMIT;
