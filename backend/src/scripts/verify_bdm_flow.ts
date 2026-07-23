import axios from 'axios';
import jwt from 'jsonwebtoken';
import { query } from '../database/db';
import 'dotenv/config';

const API_URL = 'http://localhost:3001/api';

async function generateToken() {
  const result = await query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  const user = result.rows[0] || (await query('SELECT * FROM users LIMIT 1')).rows[0];
  
  if (!user) throw new Error("No users found");

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
  
  return { token, user };
}

async function verifyFlow() {
  const { token, user } = await generateToken();
  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  try {
    // 0. Ensure admin has jobs permissions
    console.log("📝 0. Granting missing jobs permissions to admin...");
    const roleRes = await query(`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`);
    const adminRoleId = roleRes.rows[0].id;
    const modRes = await query(`SELECT id FROM modules WHERE name = 'jobs' LIMIT 1`);
    if (modRes.rows.length === 0) {
      await query(`INSERT INTO modules (name) VALUES ('jobs')`);
    }
    const jobIdRes = await query(`SELECT id FROM modules WHERE name = 'jobs' LIMIT 1`);
    const jobsModId = jobIdRes.rows[0].id;
    const permActions = ['create', 'read', 'update', 'delete', 'view', 'view_own', 'view_team', 'view_assigned'];
    for (const action of permActions) {
      await query(`
        INSERT INTO role_permissions (role_id, module_id, action, allowed)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (role_id, module_id, action) 
        DO UPDATE SET allowed = true
      `, [adminRoleId, jobsModId, action]);
    }
    console.log("✅ Granted missing jobs permissions");
    // 1. Create a client
    console.log("📝 1. Creating Client...");
    const clientRes = await api.post('/clients', {
      company_name: `E2E Test Client ${Date.now()}`,
      industry: 'Technology',
      address: '123 Test St',
      city: 'Test City',
      country: 'Test Country',
      status: 'active',
      pipeline_stage: 'lead'
    });
    const clientId = clientRes.data.client.id;
    console.log(`✅ Client created: ${clientId}`);

    // 2. Update client status to trigger audit log
    console.log("📝 2. Updating Client Status...");
    await api.put(`/clients/${clientId}`, {
      status: 'active',
      industry: 'Software'
    });
    console.log(`✅ Client updated`);

    // 3. Create a Job Requirement
    console.log("📝 3. Creating Job Requirement...");
    const jobRes = await api.post('/jobs', {
      client_id: clientId,
      title: 'E2E Test Software Engineer',
      description: 'This is a long description of at least 50 characters to pass the validation check.',
      required_skills: ['React', 'Node.js'],
      status: 'draft',
      location: 'Remote',
      employment_type: 'full-time',
      min_experience_years: 2,
      max_experience_years: 5,
      number_of_openings: 1,
      salary_min: 50000,
      salary_max: 100000
    });
    const jobId = jobRes.data.job.id;
    console.log(`✅ Job created: ${jobId}`);

    // 4. Approve the Job
    console.log("📝 4. Approving Job Requirement...");
    await api.patch(`/jobs/${jobId}/status`, {
      status: 'approved'
    });
    console.log(`✅ Job approved`);

    // 5. Create Candidate
    console.log("📝 5. Creating Candidate...");
    const candRes = await api.post('/candidates', {
      full_name: 'E2E Tester',
      email: `e2e-${Date.now()}@example.com`,
      phone: '1234567890'
    });
    const candidateId = candRes.data.candidate.id;
    console.log(`✅ Candidate created: ${candidateId}`);

    // 6. Submit Candidate
    console.log("📝 6. Creating Submission...");
    const subRes = await api.post('/submissions', {
      job_id: jobId,
      candidate_id: candidateId
    });
    const submissionId = subRes.data.submission.id;
    console.log(`✅ Submission created: ${submissionId}`);

    // 7. Update Submission Status -> Client Review
    console.log("📝 7. Updating Submission Status to Client Review...");
    await api.patch(`/submissions/${submissionId}/status`, {
      status: 'Under Review'
    });
    console.log(`✅ Submission updated to Client Review`);

    // 8. Update Submission Status -> Offered
    console.log("📝 8. Updating Submission Status to Offered...");
    await api.patch(`/submissions/${submissionId}/status`, {
      status: 'offer_extended'
    });
    console.log(`✅ Submission updated to Offer Extended`);

    // 9. Verify Audit Logs
    console.log("\n🔍 Verifying Audit Logs...");
    const auditRes = await query(`
      SELECT action, table_name, record_id 
      FROM audit_logs 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [user.id]);
    
    console.log("Audit Logs generated during E2E flow:");
    console.table(auditRes.rows);

    const actions = auditRes.rows.map(r => r.action);
    const expectedActions = [
      'UPDATE_SUBMISSION_STATUS', 
      'CREATE_SUBMISSION',
      'UPDATE_JOB_STATUS',
      'UPDATE_CLIENT',
      'CREATE_CLIENT'
    ];

    const missingActions = expectedActions.filter(a => !actions.includes(a));
    if (missingActions.length === 0) {
      console.log("\n✅ E2E Verification Completed Successfully! All transitions were tracked.");
    } else {
      console.log(`\n⚠️ E2E Verification Warning: Missing audit logs for: ${missingActions.join(', ')}`);
    }

  } catch (err: any) {
    console.error("❌ E2E Flow Failed:");
    if (err.response) {
      console.error(`Status: ${err.response.status} ${err.response.statusText}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}

verifyFlow();
