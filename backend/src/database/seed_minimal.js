/**
 * MINIMAL ATS DATABASE SEED SCRIPT
 * 
 * This script seeds essential tables with realistic data
 * using only the required columns to avoid schema mismatches.
 * 
 * Usage:
 *   node src/database/seed_minimal.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'resume_parser',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr, min = 1, max = arr.length) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateIndianPhone() {
  return `+91-${randomInt(700, 999)}-${randomInt(10000000, 99999999)}`;
}

// Realistic data
const INDIAN_FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Aadhya', 'Pari', 'Anika', 'Saanvi', 'Myra', 'Aarohi', 'Kavya', 'Anvi', 'Rahul', 'Amit', 'Vikram', 'Rajesh', 'Suresh', 'Mahesh', 'Dinesh', 'Ramesh', 'Sandeep', 'Deepak', 'Priya', 'Neha', 'Pooja', 'Sneha', 'Ruchi', 'Nisha', 'Ritu', 'Kavita', 'Sunita', 'Anita'];
const INDIAN_LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Malhotra', 'Kapoor', 'Sharma', 'Reddy', 'Nair', 'Iyer', 'Pillai', 'Menon', 'Nambiar', 'Warrier', 'Pillai', 'Rao', 'Murthy', 'Iyengar', 'Chopra', 'Mehta', 'Shah', 'Jain', 'Agarwal', 'Bansal', 'Goyal', 'Goel', 'Kumar', 'Saxena', 'Das', 'Mukherjee', 'Chatterjee', 'Ghosh', 'Sengupta', 'Bose', 'Roy', 'Mitra', 'Sen', 'Dutta'];
const INDIAN_COMPANIES = ['Tata Consultancy Services', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'Accenture India', 'Cognizant India', 'IBM India', 'Microsoft India', 'Google India', 'Amazon India', 'Flipkart', 'Paytm', 'Zomato', 'OYO Rooms', 'BYJU\'S', 'Swiggy', 'PhonePe', 'Razorpay', 'Zerodha', 'Freshworks', 'Zoho', 'Mindtree', 'L&T Infotech', 'Mphasis', 'Hexaware', 'L&T Technology Services', 'Birlasoft', 'Oracle India'];
const CLIENT_COMPANIES = ['Reliance Industries Limited', 'Tata Consultancy Services', 'Infosys Limited', 'HCL Technologies', 'Wipro Limited', 'Tech Mahindra Limited', 'Larsen & Toubro Infotech', 'Mindtree Limited', 'Mphasis Limited', 'Hexaware Technologies', 'Birlasoft Limited', 'Zensar Technologies', 'Cyient Limited', 'L&T Technology Services', 'KPIT Technologies', 'Oracle Financial Services', 'NIIT Technologies', 'CSS Corporation', 'Quest Global', 'Syntel Limited', 'UST Global'];
const INDIAN_CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Noida', 'Gurgaon', 'Indore', 'Coimbatore', 'Kochi', 'Mysore', 'Nagpur', 'Surat', 'Vadodara'];
const JOB_TITLES = ['Senior Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Developer', 'DevOps Engineer', 'Data Engineer', 'Machine Learning Engineer', 'Product Manager', 'Technical Lead', 'Engineering Manager', 'Software Architect', 'Cloud Architect', 'Security Engineer', 'QA Engineer', 'Site Reliability Engineer', 'Mobile Developer', 'UI/UX Designer', 'Business Analyst', 'Data Scientist', 'Blockchain Developer'];
const TECHNICAL_SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby', 'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible', 'Jenkins', 'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Oracle', 'SQL Server', 'GraphQL', 'REST APIs', 'Git', 'CI/CD', 'Linux', 'Unix', 'Shell Scripting', 'Agile', 'Scrum', 'Kanban'];
const ALL_SKILLS = [...TECHNICAL_SKILLS];
const DEPARTMENTS = ['Engineering', 'Product', 'Data Science', 'DevOps', 'Mobile', 'QA', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
const SALARY_RANGES = [{ min: 800000, max: 1200000 }, { min: 1200000, max: 1800000 }, { min: 1800000, max: 2500000 }, { min: 2500000, max: 3500000 }, { min: 3500000, max: 5000000 }, { min: 5000000, max: 7000000 }];
const RESUME_SUMMARIES = ['Results-driven software engineer with expertise in building scalable web applications. Proficient in modern JavaScript frameworks and cloud technologies.', 'Passionate full-stack developer with 5+ years of experience in developing robust applications. Skilled in React, Node.js, and PostgreSQL.', 'Innovative backend engineer specializing in microservices architecture. Expert in Python, Django, and AWS with proven track record.', 'Detail-oriented DevOps engineer with extensive experience in CI/CD pipelines and containerization. Proficient in Kubernetes and Docker.', 'Data-driven machine learning engineer with expertise in deep learning and natural language processing. Skilled in TensorFlow and PyTorch.', 'Creative frontend developer with a passion for user experience. Expert in React, Angular, and modern CSS frameworks.', 'Security-focused software engineer with expertise in application security and penetration testing. Certified CISSP professional.', 'Mobile-first developer with expertise in React Native and Flutter. Experience in building cross-platform mobile applications.', 'Product-minded engineer with experience in full-stack development and product management. Strong understanding of user needs.', 'Performance optimization specialist with expertise in database tuning and application profiling. Experience in high-traffic systems.'];

async function seed() {
  console.log('🌱 Starting minimal ATS database seed...');
  
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    // 1. USERS
    console.log('📝 Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      { email: 'admin@lakshya.com', role: 'admin', full_name: 'System Administrator' },
      { email: 'recruiter1@lakshya.com', role: 'recruiter', full_name: 'Priya Sharma' },
      { email: 'recruiter2@lakshya.com', role: 'recruiter', full_name: 'Rahul Verma' },
      { email: 'recruiter3@lakshya.com', role: 'recruiter', full_name: 'Anjali Mehta' },
      { email: 'recruiter4@lakshya.com', role: 'recruiter', full_name: 'Vikram Singh' },
      { email: 'recruiter5@lakshya.com', role: 'recruiter', full_name: 'Sneha Patel' },
      { email: 'teamlead1@lakshya.com', role: 'team_lead', full_name: 'Amit Kumar' },
      { email: 'teamlead2@lakshya.com', role: 'team_lead', full_name: 'Neha Gupta' },
      { email: 'clientmanager1@lakshya.com', role: 'client_manager', full_name: 'Rajesh Nair' },
      { email: 'clientmanager2@lakshya.com', role: 'client_manager', full_name: 'Kavita Reddy' },
      { email: 'bdm1@lakshya.com', role: 'bdm', full_name: 'Suresh Iyer' },
      { email: 'bdm2@lakshya.com', role: 'bdm', full_name: 'Pooja Chopra' },
      { email: 'recruiter6@lakshya.com', role: 'recruiter', full_name: 'Deepak Malhotra' },
      { email: 'recruiter7@lakshya.com', role: 'recruiter', full_name: 'Ruchi Kapoor' },
      { email: 'recruiter8@lakshya.com', role: 'recruiter', full_name: 'Mahesh Joshi' },
      { email: 'recruiter9@lakshya.com', role: 'recruiter', full_name: 'Sunita Das' },
      { email: 'recruiter10@lakshya.com', role: 'recruiter', full_name: 'Dinesh Mukherjee' },
      { email: 'recruiter11@lakshya.com', role: 'recruiter', full_name: 'Anita Sen' },
      { email: 'recruiter12@lakshya.com', role: 'recruiter', full_name: 'Ramesh Bose' },
      { email: 'recruiter13@lakshya.com', role: 'recruiter', full_name: 'Kavita Sengupta' },
      { email: 'recruiter14@lakshya.com', role: 'recruiter', full_name: 'Sandeep Roy' },
      { email: 'recruiter15@lakshya.com', role: 'recruiter', full_name: 'Priya Das' },
      { email: 'recruiter16@lakshya.com', role: 'recruiter', full_name: 'Rahul Ghosh' },
      { email: 'recruiter17@lakshya.com', role: 'recruiter', full_name: 'Anjali Mitra' },
      { email: 'recruiter18@lakshya.com', role: 'recruiter', full_name: 'Vikram Sen' },
      { email: 'recruiter19@lakshya.com', role: 'recruiter', full_name: 'Sneha Dutta' },
      { email: 'recruiter20@lakshya.com', role: 'recruiter', full_name: 'Amit Roy' }
    ];
    
    const seededUsers = [];
    for (const user of users) {
      const userId = uuidv4();
      const result = await dbClient.query(
        `INSERT INTO users (id, email, hashed_password, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        [userId, user.email, hashedPassword, user.role]
      );
      if (result.rows.length > 0) {
        seededUsers.push({ ...user, id: result.rows[0].id });
      }
    }
    
    if (seededUsers.length === 0) {
      const existingUsers = await dbClient.query(`SELECT id, email, role FROM users LIMIT 25`);
      seededUsers = existingUsers.rows.map(row => ({ id: row.id, email: row.email, role: row.role }));
    }
    console.log(`✅ Seeded ${seededUsers.length} users`);
    
    // 2. CLIENTS
    console.log('📝 Seeding clients...');
    const clientCount = 15;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const bdmUsers = seededUsers.filter(u => u.role === 'bdm');
    
    const seededClients = [];
    for (let i = 0; i < clientCount; i++) {
      const companyName = randomItem(CLIENT_COMPANIES);
      const city = randomItem(INDIAN_CITIES);
      const bdmUser = bdmUsers[i % bdmUsers.length];
      
      const clientId = uuidv4();
      await dbClient.query(
        `INSERT INTO clients (id, company_name, city, country, owner_user_id, tenant_id, pipeline_stage, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          clientId,
          companyName,
          city,
          'India',
          bdmUser ? bdmUser.id : null,
          'default',
          randomItem(['prospect', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']),
          randomDate(ninetyDaysAgo, now)
        ]
      );
      
      seededClients.push({ id: clientId, companyName, city });
    }
    console.log(`✅ Seeded ${seededClients.length} clients`);
    
    // 3. JOB DESCRIPTIONS
    console.log('📝 Seeding job descriptions...');
    const jobCount = 30;
    const cmUsers = seededUsers.filter(u => u.role === 'client_manager');
    
    const seededJobs = [];
    for (let i = 0; i < jobCount; i++) {
      const title = randomItem(JOB_TITLES);
      const location = randomItem(INDIAN_CITIES);
      const salaryRange = randomItem(SALARY_RANGES);
      const requiredSkills = randomSubset(ALL_SKILLS, 3, 6);
      const client = seededClients[i % seededClients.length];
      const cmUser = cmUsers[i % cmUsers.length];
      
      const jobId = uuidv4();
      await dbClient.query(
        `INSERT INTO job_descriptions (
          id, title, description, required_skills, department, location,
          employment_type, min_experience_years, max_experience_years, education_level,
          salary_min, salary_max, is_active, created_by, status, client_id,
          created_by_user_id, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          jobId,
          title,
          `We are looking for a talented ${title} to join our growing team in ${location}. The ideal candidate will have strong technical skills and experience with ${requiredSkills.slice(0, 2).join(', ')}.`,
          requiredSkills,
          randomItem(DEPARTMENTS),
          location,
          randomItem(['full-time', 'full-time', 'full-time', 'contract', 'remote']),
          randomInt(2, 5),
          randomInt(6, 12),
          randomItem(['B.Tech', 'M.Tech', 'B.Sc', 'M.Sc', 'PhD', 'Any']),
          salaryRange.min,
          salaryRange.max,
          true,
          cmUser ? cmUser.id : null,
          randomItem(['active', 'active', 'active', 'closed', 'on-hold']),
          client.id,
          cmUser ? cmUser.id : null,
          'default',
          randomDate(ninetyDaysAgo, now),
          now
        ]
      );
      
      seededJobs.push({ id: jobId, title, location, requiredSkills, clientId: client.id });
    }
    console.log(`✅ Seeded ${seededJobs.length} job descriptions`);
    
    // 4. CANDIDATES
    console.log('📝 Seeding candidates...');
    const candidateCount = 75;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recruiters = seededUsers.filter(u => u.role === 'recruiter');
    
    const seededCandidates = [];
    for (let i = 0; i < candidateCount; i++) {
      const firstName = randomItem(INDIAN_FIRST_NAMES);
      const lastName = randomItem(INDIAN_LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@gmail.com`;
      const location = randomItem(INDIAN_CITIES);
      const createdDate = randomDate(thirtyDaysAgo, now);
      const yearsOfExperience = randomInt(0, 15);
      const recruiter = randomItem(recruiters);
      
      const candidateId = uuidv4();
      await dbClient.query(
        `INSERT INTO candidates (
          id, full_name, email, phone, location, linkedin_url, github_url,
          summary, years_experience, current_title, current_company,
          consent_given, tenant_id, status, created_at, updated_at,
          created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          candidateId,
          fullName,
          email,
          generateIndianPhone(),
          location,
          `https://linkedin.com/in/${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}`,
          `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}${randomInt(1, 999)}`,
          randomItem(RESUME_SUMMARIES),
          yearsOfExperience,
          randomItem(JOB_TITLES),
          randomItem(INDIAN_COMPANIES),
          randomItem([true, true, true, false]),
          'default',
          'success',
          createdDate,
          createdDate,
          recruiter ? recruiter.id : null
        ]
      );
      
      seededCandidates.push({
        id: candidateId,
        fullName,
        email,
        location,
        yearsOfExperience
      });
    }
    console.log(`✅ Seeded ${seededCandidates.length} candidates`);
    
    // 5. SUBMISSIONS
    console.log('📝 Seeding submissions...');
    const submissionCount = 120;
    const submissionStatuses = ['Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Interview Scheduled', 'Interview Completed', 'Offer Extended', 'Offer Accepted', 'On Hold'];
    
    const seededSubmissions = [];
    const usedCombinations = new Set();
    
    for (let i = 0; i < submissionCount; i++) {
      const candidate = randomItem(seededCandidates);
      const job = randomItem(seededJobs);
      const recruiter = randomItem(recruiters.length > 0 ? recruiters : seededUsers);
      
      // Check if this combination is already used
      const combinationKey = `${job.id}-${candidate.id}`;
      if (usedCombinations.has(combinationKey)) {
        continue;
      }
      usedCombinations.add(combinationKey);
      
      const status = randomItem(submissionStatuses);
      const submittedDate = randomDate(thirtyDaysAgo, now);
      
      const submissionId = uuidv4();
      await dbClient.query(
        `INSERT INTO submissions (id, job_id, candidate_id, submitted_by, status, submitted_at, rejection_reason, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          submissionId,
          job.id,
          candidate.id,
          recruiter ? recruiter.id : null,
          status,
          submittedDate,
          status === 'Rejected' ? randomItem(['Not qualified', 'Experience mismatch', 'Salary expectation too high']) : null,
          now
        ]
      );
      
      seededSubmissions.push({
        id: submissionId,
        jobId: job.id,
        candidateId: candidate.id,
        status
      });
    }
    console.log(`✅ Seeded ${seededSubmissions.length} submissions`);
    
    // 6. INTERVIEWS
    console.log('📝 Seeding interviews...');
    const interviewCount = 45;
    const interviewModes = ['phone', 'video', 'in-person'];
    const interviewStatuses = ['scheduled', 'completed', 'rescheduled', 'cancelled'];
    const roundNames = ['Technical Round', 'HR Round', 'Manager Round', 'Final Round', 'Cultural Fit'];
    const usedInterviewCombinations = new Set();
    
    for (let i = 0; i < interviewCount; i++) {
      const submission = randomItem(seededSubmissions.filter(s => 
        ['Interview Scheduled', 'Shortlisted', 'Under Review'].includes(s.status)
      ));
      
      if (!submission) continue;
      
      const roundName = randomItem(roundNames);
      const combinationKey = `${submission.id}-${roundName}`;
      
      if (usedInterviewCombinations.has(combinationKey)) {
        continue;
      }
      usedInterviewCombinations.add(combinationKey);
      
      const scheduledDate = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const status = scheduledDate < now ? randomItem(['completed', 'completed', 'completed', 'cancelled']) : 'scheduled';
      const scheduler = randomItem(recruiters.length > 0 ? recruiters : seededUsers);
      
      await dbClient.query(
        `INSERT INTO interviews (id, submission_id, round_name, scheduled_at, mode, status, scheduled_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          submission.id,
          roundName,
          scheduledDate,
          randomItem(interviewModes),
          status,
          scheduler ? scheduler.id : null
        ]
      );
    }
    console.log(`✅ Seeded ${interviewCount} interviews`);
    
    // 7. PLACEMENTS
    console.log('📝 Seeding placements...');
    const placementCount = 12;
    
    for (let i = 0; i < placementCount; i++) {
      const submission = randomItem(seededSubmissions.filter(s => s.status === 'Offer Accepted'));
      
      if (!submission) continue;
      
      const job = seededJobs.find(j => j.id === submission.jobId);
      const candidate = seededCandidates.find(c => c.id === submission.candidateId);
      const recruiter = randomItem(recruiters.length > 0 ? recruiters : seededUsers);
      
      if (!job || !candidate) continue;
      
      const placedDate = randomDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), now);
      const salaryRange = randomItem(SALARY_RANGES);
      
      await dbClient.query(
        `INSERT INTO placements (id, candidate_id, job_id, client_id, recruiter_id, placed_at, billing_amount, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          candidate.id,
          job.id,
          job.clientId,
          recruiter ? recruiter.id : null,
          placedDate,
          randomFloat(salaryRange.min * 0.15, salaryRange.max * 0.20, 2),
          placedDate
        ]
      );
    }
    console.log(`✅ Seeded ${placementCount} placements`);
    
    // 8. AUDIT LOGS
    console.log('📝 Seeding audit logs...');
    const auditActions = ['login', 'candidate_created', 'candidate_updated', 'job_created', 'job_updated', 'submission_created', 'interview_scheduled', 'placement_created', 'client_created'];
    
    for (let i = 0; i < 150; i++) {
      const user = randomItem(seededUsers.length > 0 ? seededUsers : [{ id: uuidv4() }]);
      const auditDate = randomDate(ninetyDaysAgo, now);
      
      await dbClient.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          user.id,
          randomItem(auditActions),
          randomItem(['candidate', 'job', 'user', 'system', 'submission', 'interview', 'placement', 'client']),
          uuidv4(),
          `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
          JSON.stringify({
            timestamp: auditDate.toISOString(),
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            additional_info: randomItem(['Success', 'Failed', 'Partial success'])
          }),
          auditDate
        ]
      );
    }
    console.log('✅ Seeded audit logs');
    
    await dbClient.query('COMMIT');
    console.log('✅ Minimal database seed completed successfully!');
    
    // Summary
    console.log('\n📊 SEED SUMMARY:');
    console.log(`Users: ${seededUsers.length}`);
    console.log(`Clients: ${seededClients.length}`);
    console.log(`Job Descriptions: ${seededJobs.length}`);
    console.log(`Candidates: ${seededCandidates.length}`);
    console.log(`Submissions: ${seededSubmissions.length}`);
    console.log(`Interviews: ${interviewCount}`);
    console.log(`Placements: ${placementCount}`);
    console.log(`Audit Logs: 150`);
    
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    dbClient.release();
  }
}

// Run seed
seed()
  .then(() => {
    console.log('🎉 Seed process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed process failed:', error);
    process.exit(1);
  });
