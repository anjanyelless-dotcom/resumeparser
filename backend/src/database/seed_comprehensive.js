/**
 * COMPREHENSIVE ATS DATABASE SEED SCRIPT
 * 
 * This script seeds ALL tables in the ATS system with realistic data
 * including clients, submissions, interviews, placements, roles, permissions, etc.
 * 
 * Usage:
 *   node src/database/seed_comprehensive.js
 * 
 * Or via npm:
 *   npm run db:seed
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

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateIndianPhone() {
  return `+91-${randomInt(700, 999)}-${randomInt(10000000, 99999999)}`;
}

function generateEmail(firstName, lastName, domain = 'gmail.com') {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@${domain}`;
}

// ============================================
// REALISTIC DATA ARRAYS (INDIA FOCUSED)
// ============================================

const INDIAN_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Diya', 'Aadhya', 'Pari', 'Anika', 'Saanvi', 'Myra', 'Aarohi', 'Kavya', 'Anvi',
  'Rahul', 'Amit', 'Vikram', 'Rajesh', 'Suresh', 'Mahesh', 'Dinesh', 'Ramesh', 'Sandeep', 'Deepak',
  'Priya', 'Neha', 'Pooja', 'Sneha', 'Ruchi', 'Nisha', 'Ritu', 'Kavita', 'Sunita', 'Anita'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Malhotra', 'Kapoor', 'Sharma', 'Reddy',
  'Nair', 'Iyer', 'Pillai', 'Menon', 'Nambiar', 'Warrier', 'Pillai', 'Rao', 'Murthy', 'Iyengar',
  'Chopra', 'Mehta', 'Shah', 'Jain', 'Agarwal', 'Bansal', 'Goyal', 'Goel', 'Kumar', 'Saxena',
  'Das', 'Mukherjee', 'Chatterjee', 'Ghosh', 'Sengupta', 'Bose', 'Roy', 'Mitra', 'Sen', 'Dutta'
];

const INDIAN_COMPANIES = [
  'Tata Consultancy Services', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra',
  'Accenture India', 'Cognizant India', 'IBM India', 'Microsoft India', 'Google India',
  'Amazon India', 'Flipkart', 'Paytm', 'Zomato', 'OYO Rooms', 'BYJU\'S', 'Swiggy',
  'PhonePe', 'Razorpay', 'Zerodha', 'Freshworks', 'Zoho', 'Mindtree', 'L&T Infotech',
  'Mphasis', 'Hexaware', 'L&T Technology Services', 'Birlasoft', 'Oracle India'
];

const CLIENT_COMPANIES = [
  'Reliance Industries Limited', 'Tata Consultancy Services', 'Infosys Limited', 'HCL Technologies',
  'Wipro Limited', 'Tech Mahindra Limited', 'Larsen & Toubro Infotech', 'Mindtree Limited',
  'Mphasis Limited', 'Hexaware Technologies', 'Birlasoft Limited', 'Zensar Technologies',
  'Cyient Limited', 'L&T Technology Services', 'KPIT Technologies', 'Oracle Financial Services',
  'NIIT Technologies', 'CSS Corporation', 'Quest Global', 'Syntel Limited', 'UST Global'
];

const INDIAN_CITIES = [
  'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Noida', 'Gurgaon', 'Indore',
  'Coimbatore', 'Kochi', 'Mysore', 'Nagpur', 'Surat', 'Vadodara'
];

const JOB_TITLES = [
  'Senior Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Developer',
  'DevOps Engineer', 'Data Engineer', 'Machine Learning Engineer', 'Product Manager',
  'Technical Lead', 'Engineering Manager', 'Software Architect', 'Cloud Architect',
  'Security Engineer', 'QA Engineer', 'Site Reliability Engineer', 'Mobile Developer',
  'UI/UX Designer', 'Business Analyst', 'Data Scientist', 'Blockchain Developer'
];

const TECHNICAL_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby',
  'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible', 'Jenkins',
  'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Oracle', 'SQL Server', 'GraphQL', 'REST APIs',
  'Git', 'CI/CD', 'Linux', 'Unix', 'Shell Scripting', 'Agile', 'Scrum', 'Kanban'
];

const ALL_SKILLS = [...TECHNICAL_SKILLS];

const INDIAN_INSTITUTIONS = [
  'IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kharagpur', 'IIT Kanpur', 'IIT Roorkee',
  'IIT Guwahati', 'IIT Hyderabad', 'IIT Indore', 'IIT Ropar', 'IIT Bhubaneswar', 'IIT Gandhinagar',
  'IIT Patna', 'IIT Jodhpur', 'IIT Mandi', 'NIT Trichy', 'NIT Surathkal', 'NIT Warangal',
  'NIT Calicut', 'NIT Kurukshetra', 'NIT Rourkela', 'BITS Pilani', 'VIT Vellore', 'SRM University',
  'Delhi University', 'Anna University', 'Jadavpur University', 'University of Hyderabad',
  'Pune University', 'Mumbai University', 'Bangalore University', 'Calcutta University'
];

const DEGREES = [
  'B.Tech Computer Science', 'B.Tech Information Technology', 'B.Tech Electronics',
  'M.Tech Computer Science', 'M.Tech Software Engineering', 'M.Tech Artificial Intelligence',
  'B.Sc Computer Science', 'M.Sc Computer Science', 'BCA', 'MCA', 'PhD Computer Science'
];

const INDUSTRIES = [
  'Information Technology', 'Financial Services', 'Healthcare', 'E-commerce',
  'Manufacturing', 'Telecommunications', 'Automotive', 'Pharmaceuticals',
  'Retail', 'Logistics', 'Energy', 'Education', 'Media', 'Consulting'
];

const DEPARTMENTS = [
  'Engineering', 'Product', 'Data Science', 'DevOps', 'Mobile', 'QA',
  'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'
];

const SALARY_RANGES = [
  { min: 800000, max: 1200000 }, // 8-12 LPA
  { min: 1200000, max: 1800000 }, // 12-18 LPA
  { min: 1800000, max: 2500000 }, // 18-25 LPA
  { min: 2500000, max: 3500000 }, // 25-35 LPA
  { min: 3500000, max: 5000000 }, // 35-50 LPA
  { min: 5000000, max: 7000000 }, // 50-70 LPA
];

const RESUME_SUMMARIES = [
  'Results-driven software engineer with expertise in building scalable web applications. Proficient in modern JavaScript frameworks and cloud technologies.',
  'Passionate full-stack developer with 5+ years of experience in developing robust applications. Skilled in React, Node.js, and PostgreSQL.',
  'Innovative backend engineer specializing in microservices architecture. Expert in Python, Django, and AWS with proven track record.',
  'Detail-oriented DevOps engineer with extensive experience in CI/CD pipelines and containerization. Proficient in Kubernetes and Docker.',
  'Data-driven machine learning engineer with expertise in deep learning and natural language processing. Skilled in TensorFlow and PyTorch.',
  'Creative frontend developer with a passion for user experience. Expert in React, Angular, and modern CSS frameworks.',
  'Security-focused software engineer with expertise in application security and penetration testing. Certified CISSP professional.',
  'Mobile-first developer with expertise in React Native and Flutter. Experience in building cross-platform mobile applications.',
  'Product-minded engineer with experience in full-stack development and product management. Strong understanding of user needs.',
  'Performance optimization specialist with expertise in database tuning and application profiling. Experience in high-traffic systems.'
];

// ============================================
// SEED DATA STORAGE
// ============================================

const seedData = {
  users: [],
  roles: [],
  permissions: [],
  rolePermissions: [],
  skills: [],
  clients: [],
  clientContacts: [],
  candidates: [],
  jobDescriptions: [],
  candidateSkills: [],
  workHistory: [],
  education: [],
  certifications: [],
  jobSkills: [],
  jobRecruiterAssignments: [],
  submissions: [],
  interviews: [],
  placements: [],
  communications: [],
  activityLogs: [],
  auditLogs: []
};

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed() {
  console.log('🌱 Starting comprehensive ATS database seed...');
  
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    // ============================================
    // LEVEL 1: INDEPENDENT TABLES
    // ============================================
    
    // 1. ROLES
    console.log('📝 Seeding roles...');
    const roles = [
      { name: 'admin', description: 'System administrator with full access' },
      { name: 'recruiter', description: 'Recruiter who can submit and manage candidates' },
      { name: 'team_lead', description: 'Team lead who can manage recruiters and view team KPIs' },
      { name: 'client_manager', description: 'Client manager who manages client relationships' },
      { name: 'bdm', description: 'Business Development Manager for client acquisition' },
      { name: 'viewer', description: 'Read-only access to view data' }
    ];
    
    for (const role of roles) {
      const roleId = uuidv4();
      const result = await dbClient.query(
        `INSERT INTO roles (id, name, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO NOTHING 
         RETURNING id`,
        [roleId, role.name, role.description]
      );
      if (result.rows.length > 0) {
        seedData.roles.push({ ...role, id: result.rows[0].id });
      }
    }
    
    // If no new roles were inserted, fetch existing ones
    if (seedData.roles.length === 0) {
      const existingRoles = await dbClient.query(`SELECT id, name FROM roles`);
      seedData.roles = existingRoles.rows.map(row => ({
        id: row.id,
        name: row.name
      }));
    }
    console.log(`✅ Seeded ${seedData.roles.length} roles`);
    
    // 2. PERMISSIONS
    console.log('📝 Seeding permissions...');
    const permissions = [
      // Audit logs
      { module_name: 'audit_logs', action_name: 'view', description: 'View audit logs' },
      { module_name: 'audit_logs', action_name: 'create', description: 'Create audit log entries' },
      { module_name: 'audit_logs', action_name: 'delete', description: 'Delete audit logs' },
      // Candidates
      { module_name: 'candidates', action_name: 'view', description: 'View candidate list and details' },
      { module_name: 'candidates', action_name: 'create', description: 'Create new candidates' },
      { module_name: 'candidates', action_name: 'edit', description: 'Edit existing candidates' },
      { module_name: 'candidates', action_name: 'delete', description: 'Delete candidates' },
      { module_name: 'candidates', action_name: 'search', description: 'Search and view candidates' },
      // Clients
      { module_name: 'clients', action_name: 'view', description: 'View client list and details' },
      { module_name: 'clients', action_name: 'create', description: 'Create new clients' },
      { module_name: 'clients', action_name: 'edit', description: 'Edit existing clients' },
      { module_name: 'clients', action_name: 'delete', description: 'Delete clients' },
      { module_name: 'clients', action_name: 'view_own', description: 'View own clients' },
      { module_name: 'clients', action_name: 'manage_pipeline', description: 'Manage client pipeline stages' },
      // Communications
      { module_name: 'communications', action_name: 'log', description: 'Log communications with clients' },
      // Interviews
      { module_name: 'interviews', action_name: 'schedule', description: 'Schedule interviews' },
      { module_name: 'interviews', action_name: 'view_own', description: 'View own interviews' },
      { module_name: 'interviews', action_name: 'collect_feedback', description: 'Collect interview feedback' },
      // Reports
      { module_name: 'reports', action_name: 'view', description: 'View reports and analytics' },
      { module_name: 'reports', action_name: 'view_own', description: 'View own reports' },
      { module_name: 'reports', action_name: 'view_team', description: 'View team reports' },
      { module_name: 'reports', action_name: 'create', description: 'Create new reports' },
      // Requirements
      { module_name: 'requirements', action_name: 'view', description: 'View job requirements' },
      { module_name: 'requirements', action_name: 'create', description: 'Create new job requirements' },
      { module_name: 'requirements', action_name: 'edit', description: 'Edit existing requirements' },
      { module_name: 'requirements', action_name: 'delete', description: 'Delete job requirements' },
      { module_name: 'requirements', action_name: 'assign_recruiters', description: 'Assign recruiters to requirements' },
      { module_name: 'requirements', action_name: 'view_assigned', description: 'View assigned requirements' },
      // Submissions
      { module_name: 'submissions', action_name: 'view', description: 'View all submissions' },
      { module_name: 'submissions', action_name: 'create', description: 'Submit candidates to jobs' },
      { module_name: 'submissions', action_name: 'edit', description: 'Edit submission status' },
      { module_name: 'submissions', action_name: 'review', description: 'Review and approve/reject submissions' },
      { module_name: 'submissions', action_name: 'view_own', description: 'View own submissions' },
      // Team
      { module_name: 'team', action_name: 'view_kpis', description: 'View team performance KPIs' },
      // Upload
      { module_name: 'upload', action_name: 'view', description: 'View upload statistics' },
      { module_name: 'upload', action_name: 'create', description: 'Create new uploads' },
      // Users
      { module_name: 'users', action_name: 'view', description: 'View user list and details' },
      { module_name: 'users', action_name: 'create', description: 'Create new users' },
      { module_name: 'users', action_name: 'edit', description: 'Edit existing users' },
      { module_name: 'users', action_name: 'delete', description: 'Delete users' }
    ];
    
    for (const perm of permissions) {
      const permId = uuidv4();
      const result = await dbClient.query(
        `INSERT INTO permissions (id, module_name, action_name, description) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (module_name, action_name) DO NOTHING 
         RETURNING id`,
        [permId, perm.module_name, perm.action_name, perm.description]
      );
      if (result.rows.length > 0) {
        seedData.permissions.push({ ...perm, id: result.rows[0].id });
      }
    }
    
    // If no new permissions were inserted, fetch existing ones
    if (seedData.permissions.length === 0) {
      const existingPerms = await dbClient.query(`SELECT id, module_name, action_name FROM permissions`);
      seedData.permissions = existingPerms.rows.map(row => ({
        id: row.id,
        module_name: row.module_name,
        action_name: row.action_name
      }));
    }
    console.log(`✅ Seeded ${seedData.permissions.length} permissions`);
    
    // 3. ROLE PERMISSIONS
    console.log('📝 Seeding role permissions...');
    const adminRole = seedData.roles.find(r => r.name === 'admin');
    const recruiterRole = seedData.roles.find(r => r.name === 'recruiter');
    const teamLeadRole = seedData.roles.find(r => r.name === 'team_lead');
    const clientManagerRole = seedData.roles.find(r => r.name === 'client_manager');
    const bdmRole = seedData.roles.find(r => r.name === 'bdm');
    const viewerRole = seedData.roles.find(r => r.name === 'viewer');
    
    // Admin gets all permissions
    if (adminRole) {
      for (const perm of seedData.permissions) {
        await dbClient.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [adminRole.id, perm.id]
        );
      }
    }
    
    // Recruiter permissions
    if (recruiterRole) {
      const recruiterPerms = seedData.permissions.filter(p => 
        ['candidates', 'submissions', 'upload', 'requirements'].includes(p.module_name) ||
        p.action_name === 'view_own'
      );
      for (const perm of recruiterPerms) {
        await dbClient.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [recruiterRole.id, perm.id]
        );
      }
    }
    
    // Team Lead permissions
    if (teamLeadRole) {
      const teamLeadPerms = seedData.permissions.filter(p => 
        ['candidates', 'submissions', 'requirements', 'team', 'reports'].includes(p.module_name) ||
        p.action_name.includes('view_team')
      );
      for (const perm of teamLeadPerms) {
        await dbClient.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [teamLeadRole.id, perm.id]
        );
      }
    }
    
    // Client Manager permissions
    if (clientManagerRole) {
      const cmPerms = seedData.permissions.filter(p => 
        ['clients', 'communications', 'submissions', 'requirements', 'reports'].includes(p.module_name) ||
        p.action_name.includes('own')
      );
      for (const perm of cmPerms) {
        await dbClient.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [clientManagerRole.id, perm.id]
        );
      }
    }
    
    // BDM permissions
    if (bdmRole) {
      const bdmPerms = seedData.permissions.filter(p => 
        ['clients', 'reports', 'requirements'].includes(p.module_name) ||
        p.action_name.includes('own')
      );
      for (const perm of bdmPerms) {
        await dbClient.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [bdmRole.id, perm.id]
        );
      }
    }
    
    console.log('✅ Seeded role permissions');
    
    // 4. USERS
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
      { email: 'recruiter20@lakshya.com', role: 'recruiter', full_name: 'Amit Roy' },
      { email: 'viewer1@lakshya.com', role: 'viewer', full_name: 'Guest User' }
    ];
    
    for (const user of users) {
      const userId = uuidv4();
      const role = seedData.roles.find(r => r.name === user.role);
      const result = await dbClient.query(
        `INSERT INTO users (id, email, hashed_password, role, role_id) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        [userId, user.email, hashedPassword, user.role, role ? role.id : null]
      );
      if (result.rows.length > 0) {
        seedData.users.push({ ...user, id: result.rows[0].id, roleId: role ? role.id : null });
      }
    }
    
    // If no new users were inserted, fetch existing ones
    if (seedData.users.length === 0) {
      const existingUsers = await dbClient.query(
        `SELECT id, email, role, role_id FROM users LIMIT 25`
      );
      seedData.users = existingUsers.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        roleId: row.role_id
      }));
    }
    console.log(`✅ Seeded ${seedData.users.length} users`);
    
    // 5. SKILLS
    console.log('📝 Seeding skills catalog...');
    const skillCategories = {
      technical: TECHNICAL_SKILLS
    };
    
    for (const [category, skills] of Object.entries(skillCategories)) {
      for (const skillName of skills) {
        const skillId = uuidv4();
        const result = await dbClient.query(
          `INSERT INTO skills (id, name, normalized_name, category) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (name) DO NOTHING 
           RETURNING id`,
          [skillId, skillName, skillName.toLowerCase(), category]
        );
        if (result.rows.length > 0) {
          seedData.skills.push({
            id: result.rows[0].id,
            name: skillName,
            category
          });
        }
      }
    }
    
    // If no new skills were inserted, fetch existing ones
    if (seedData.skills.length === 0) {
      const existingSkills = await dbClient.query(
        `SELECT id, name, category FROM skills LIMIT 200`
      );
      seedData.skills = existingSkills.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category
      }));
    }
    console.log(`✅ Seeded ${seedData.skills.length} skills`);
    
    // 6. CLIENTS
    console.log('📝 Seeding clients...');
    const clientCount = 15;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < clientCount; i++) {
      const companyName = randomItem(CLIENT_COMPANIES);
      const industry = randomItem(INDUSTRIES);
      const city = randomItem(INDIAN_CITIES);
      const bdmUser = seedData.users.filter(u => u.role === 'bdm')[0];
      const cmUser = seedData.users.filter(u => u.role === 'client_manager')[i % 2];
      
      const clientId = uuidv4();
      await dbClient.query(
        `INSERT INTO clients (
          id, company_name, industry, address, city, country,
          owner_user_id, tenant_id, pipeline_stage, is_archived, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          clientId,
          companyName,
          industry.toLowerCase(),
          `${randomInt(1, 999)} ${randomItem(['Tech Park', 'Business Center', 'IT Hub', 'Corporate Plaza'])}, ${city}`,
          city,
          'India',
          bdmUser ? bdmUser.id : null,
          'default',
          randomItem(['prospect', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']),
          false,
          randomDate(ninetyDaysAgo, now)
        ]
      );
      
      seedData.clients.push({
        id: clientId,
        companyName,
        industry,
        city,
        ownerId: bdmUser ? bdmUser.id : null
      });
    }
    console.log(`✅ Seeded ${seedData.clients.length} clients`);
    
    // 7. CLIENT CONTACTS
    console.log('📝 Seeding client contacts...');
    for (const client of seedData.clients) {
      const contactCount = randomInt(1, 3);
      
      for (let j = 0; j < contactCount; j++) {
        const firstName = randomItem(INDIAN_FIRST_NAMES);
        const lastName = randomItem(INDIAN_LAST_NAMES);
        
        await dbClient.query(
          `INSERT INTO client_contacts (
            id, client_id, contact_name, email, phone,
            designation, is_primary, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            client.id,
            `${firstName} ${lastName}`,
            generateEmail(firstName, lastName, randomItem(['company.com', 'corp.in', 'tech.co'])),
            generateIndianPhone(),
            randomItem(['HR Manager', 'Technical Lead', 'Hiring Manager', 'CTO', 'VP Engineering']),
            j === 0,
            now
          ]
        );
      }
    }
    console.log('✅ Seeded client contacts');
    
    // ============================================
    // LEVEL 2: DEPENDS ON LEVEL 1
    // ============================================
    
    // 8. JOB DESCRIPTIONS
    console.log('📝 Seeding job descriptions...');
    const jobCount = 30;
    
    for (let i = 0; i < jobCount; i++) {
      const title = randomItem(JOB_TITLES);
      const location = randomItem(INDIAN_CITIES);
      const salaryRange = randomItem(SALARY_RANGES);
      const requiredSkills = randomSubset(ALL_SKILLS, 3, 6);
      const client = seedData.clients[i % seedData.clients.length];
      const cmUser = seedData.users.filter(u => u.role === 'client_manager')[i % 2];
      
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
      
      seedData.jobDescriptions.push({
        id: jobId,
        title,
        location,
        requiredSkills,
        clientId: client.id
      });
    }
    console.log(`✅ Seeded ${seedData.jobDescriptions.length} job descriptions`);
    
    // 9. JOB SKILLS
    console.log('📝 Seeding job skills...');
    for (const job of seedData.jobDescriptions) {
      for (const skillName of job.requiredSkills) {
        await dbClient.query(
          `INSERT INTO job_skills (job_id, skill_name, skill_type) 
           VALUES ($1, $2, $3) 
           ON CONFLICT DO NOTHING`,
          [job.id, skillName, 'required']
        );
      }
    }
    console.log('✅ Seeded job skills');
    
    // 10. JOB RECRUITER ASSIGNMENTS
    console.log('📝 Seeding job recruiter assignments...');
    const recruiters = seedData.users.filter(u => u.role === 'recruiter');
    const teamLeads = seedData.users.filter(u => u.role === 'team_lead');
    
    for (const job of seedData.jobDescriptions) {
      const assignmentCount = randomInt(1, 3);
      const assignedRecruiters = randomSubset(recruiters, 1, assignmentCount);
      const teamLead = randomItem(teamLeads);
      
      for (const recruiter of assignedRecruiters) {
        await dbClient.query(
          `INSERT INTO job_recruiter_assignments (
            id, job_id, recruiter_id, assigned_by, assigned_at, priority, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            job.id,
            recruiter.id,
            teamLead ? teamLead.id : null,
            randomDate(ninetyDaysAgo, now),
            randomItem(['high', 'normal', 'low']),
            randomItem(['active', 'active', 'active', 'completed', 'cancelled'])
          ]
        );
      }
    }
    console.log('✅ Seeded job recruiter assignments');
    
    // ============================================
    // LEVEL 3: CANDIDATES
    // ============================================
    
    // 11. CANDIDATES
    console.log('📝 Seeding candidates...');
    const candidateCount = 75;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < candidateCount; i++) {
      const firstName = randomItem(INDIAN_FIRST_NAMES);
      const lastName = randomItem(INDIAN_LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const email = generateEmail(firstName, lastName);
      const location = randomItem(INDIAN_CITIES);
      const createdDate = randomDate(thirtyDaysAgo, now);
      const yearsOfExperience = randomInt(0, 15);
      const recruiter = randomItem(recruiters);
      
      const candidateId = uuidv4();
      await dbClient.query(
        `INSERT INTO candidates (
          id, full_name, email, phone, location, linkedin_url, github_url,
          summary, years_experience, current_title, current_company,
          consent_given, tenant_id, review_status, status, match_score,
          resume_hash, created_by_user_id, created_at, updated_at,
          years_experience_confidence, deleted_at, file_path, projects, total_years_exp,
          email_hash, ssn, current_job_title, consent_date, review_assigned_to,
          review_notes, review_flagged_at, review_confidence, review_flags,
          review_approved_at, review_approved_by, review_rejected_at, review_rejected_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
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
          'pending',
          'success',
          randomFloat(0.0, 0.9, 2),
          uuidv4(),
          recruiter ? recruiter.id : null,
          createdDate,
          createdDate,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        ]
      );
      
      seedData.candidates.push({
        id: candidateId,
        fullName,
        email,
        location,
        yearsOfExperience,
        status: 'success',
        createdDate
      });
    }
    console.log(`✅ Seeded ${seedData.candidates.length} candidates`);
    
    // 12. CANDIDATE SKILLS
    console.log('📝 Seeding candidate skills...');
    for (const candidate of seedData.candidates) {
      const candidateSkills = randomSubset(ALL_SKILLS, 3, 8);
      
      for (const skillName of candidateSkills) {
        let skill = seedData.skills.find(s => s.name === skillName);
        
        if (!skill) {
          const skillResult = await dbClient.query(
            `SELECT id, name FROM skills WHERE name = $1 LIMIT 1`,
            [skillName]
          );
          if (skillResult.rows.length > 0) {
            skill = {
              id: skillResult.rows[0].id,
              name: skillResult.rows[0].name
            };
          }
        }
        
        if (skill) {
          await dbClient.query(
            `INSERT INTO candidate_skills (candidate_id, skill_id, proficiency_level, years_experience) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (candidate_id, skill_id) DO NOTHING`,
            [
              candidate.id,
              skill.id,
              randomItem(['beginner', 'intermediate', 'intermediate', 'advanced', 'expert']),
              randomInt(1, candidate.yearsOfExperience)
            ]
          );
        }
      }
    }
    console.log('✅ Seeded candidate skills');
    
    // 13. WORK HISTORY
    console.log('📝 Seeding work history...');
    for (const candidate of seedData.candidates) {
      const workHistoryCount = randomInt(1, 3);
      
      for (let j = 0; j < workHistoryCount; j++) {
        const isCurrent = j === 0;
        const startDate = randomDate(
          new Date(now.getTime() - (candidate.yearsOfExperience + 2) * 365 * 24 * 60 * 60 * 1000),
          isCurrent ? new Date(now.getTime() - randomInt(1, 5) * 365 * 24 * 60 * 60 * 1000) : now
        );
        const endDate = isCurrent ? null : randomDate(startDate, now);
        
        await dbClient.query(
          `INSERT INTO work_history (
            id, candidate_id, job_title, company_name, start_date, end_date,
            is_current, location, description, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            candidate.id,
            randomItem(JOB_TITLES),
            randomItem(INDIAN_COMPANIES),
            formatDate(startDate),
            endDate ? formatDate(endDate) : null,
            isCurrent,
            randomItem(INDIAN_CITIES),
            `Worked on ${randomItem(ALL_SKILLS)} projects and contributed to team success.`,
            j
          ]
        );
      }
    }
    console.log('✅ Seeded work history');
    
    // 14. EDUCATION
    console.log('📝 Seeding education...');
    for (const candidate of seedData.candidates) {
      const educationCount = randomInt(1, 2);
      
      for (let j = 0; j < educationCount; j++) {
        const startYear = now.getFullYear() - randomInt(4, 8);
        const endYear = startYear + randomInt(3, 5);
        
        await dbClient.query(
          `INSERT INTO education (
            id, candidate_id, institution, degree, field_of_study, start_date, end_date, gpa
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            candidate.id,
            randomItem(INDIAN_INSTITUTIONS),
            randomItem(DEGREES),
            'Computer Science',
            new Date(startYear, 7, 1),
            new Date(endYear, 5, 30),
            randomFloat(6.0, 9.5, 2)
          ]
        );
      }
    }
    console.log('✅ Seeded education');
    
    // ============================================
    // LEVEL 4: SUBMISSIONS, INTERVIEWS, PLACEMENTS
    // ============================================
    
    // 15. SUBMISSIONS
    console.log('📝 Seeding submissions...');
    const submissionCount = 120;
    const submissionStatuses = ['Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Interview Scheduled', 'Interview Completed', 'Offer Extended', 'Offer Accepted', 'On Hold'];
    
    for (let i = 0; i < submissionCount; i++) {
      const candidate = randomItem(seedData.candidates);
      const job = randomItem(jobCount > 0 ? seedData.jobDescriptions : []);
      const recruiter = randomItem(recruiters);
      
      if (!job) continue;
      
      const status = randomItem(submissionStatuses);
      const submittedDate = randomDate(thirtyDaysAgo, now);
      
      const submissionId = uuidv4();
      await dbClient.query(
        `INSERT INTO submissions (
          id, job_id, candidate_id, submitted_by, status, submitted_at,
          rejection_reason, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
      
      seedData.submissions.push({
        id: submissionId,
        jobId: job.id,
        candidateId: candidate.id,
        status,
        submittedAt: submittedDate
      });
    }
    console.log(`✅ Seeded ${seedData.submissions.length} submissions`);
    
    // 16. INTERVIEWS
    console.log('📝 Seeding interviews...');
    const interviewCount = 45;
    const interviewModes = ['phone', 'video', 'in-person'];
    const interviewStatuses = ['scheduled', 'completed', 'rescheduled', 'cancelled'];
    const roundNames = ['Technical Round', 'HR Round', 'Manager Round', 'Final Round', 'Cultural Fit'];
    
    for (let i = 0; i < interviewCount; i++) {
      const submission = randomItem(seedData.submissions.filter(s => 
        ['Interview Scheduled', 'Shortlisted', 'Under Review'].includes(s.status)
      ));
      
      if (!submission) continue;
      
      const scheduledDate = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const status = scheduledDate < now ? randomItem(['completed', 'completed', 'completed', 'cancelled']) : 'scheduled';
      
      await dbClient.query(
        `INSERT INTO interviews (
          id, submission_id, round_name, scheduled_at, mode, status, scheduled_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          submission.id,
          randomItem(roundNames),
          scheduledDate,
          randomItem(interviewModes),
          status,
          randomItem(recruiters)?.id
        ]
      );
    }
    console.log(`✅ Seeded ${interviewCount} interviews`);
    
    // 17. PLACEMENTS
    console.log('📝 Seeding placements...');
    const placementCount = 12;
    
    for (let i = 0; i < placementCount; i++) {
      const submission = randomItem(seedData.submissions.filter(s => s.status === 'Offer Accepted'));
      
      if (!submission) continue;
      
      const job = seedData.jobDescriptions.find(j => j.id === submission.jobId);
      const candidate = seedData.candidates.find(c => c.id === submission.candidateId);
      const recruiter = randomItem(recruiters);
      
      if (!job || !candidate) continue;
      
      const placedDate = randomDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), now);
      const salaryRange = randomItem(SALARY_RANGES);
      
      await dbClient.query(
        `INSERT INTO placements (
          id, candidate_id, job_id, client_id, recruiter_id, placed_at, billing_amount, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          candidate.id,
          job.id,
          job.clientId,
          recruiter ? recruiter.id : null,
          placedDate,
          randomFloat(salaryRange.min * 0.15, salaryRange.max * 0.20, 2), // 15-20% of annual salary
          placedDate
        ]
      );
    }
    console.log(`✅ Seeded ${placementCount} placements`);
    
    // 18. CLIENT COMMUNICATIONS
    console.log('📝 Seeding client communications...');
    const communicationTypes = ['call', 'email', 'meeting'];
    const clientManagers = seedData.users.filter(u => u.role === 'client_manager');
    
    for (const client of seedData.clients) {
      const commCount = randomInt(2, 8);
      const cm = randomItem(clientManagers);
      
      for (let i = 0; i < commCount; i++) {
        const commDate = randomDate(ninetyDaysAgo, now);
        
        await dbClient.query(
          `INSERT INTO client_communications (
            id, client_id, contact_id, logged_by, communication_type, subject, notes,
            follow_up_date, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            uuidv4(),
            client.id,
            null,
            cm ? cm.id : null,
            randomItem(communicationTypes),
            randomItem(['Requirement Discussion', 'Follow-up Call', 'Meeting Schedule', 'Proposal Review', 'Feedback Discussion']),
            randomItem(['Discussed new requirements', 'Followed up on pending submissions', 'Scheduled technical discussion', 'Reviewed candidate profiles', 'Provided feedback on interviews']),
            randomItem([null, randomDate(commDate, new Date(commDate.getTime() + 7 * 24 * 60 * 60 * 1000))]),
            commDate
          ]
        );
      }
    }
    console.log('✅ Seeded client communications');
    
    // 19. ACTIVITY LOGS
    console.log('📝 Seeding activity logs...');
    const activityTypes = ['call_made', 'candidate_sourced', 'candidate_submitted', 'interview_scheduled', 'candidate_created', 'recruiter_assigned', 'interview_feedback'];
    
    for (let i = 0; i < 200; i++) {
      const user = randomItem(seedData.users);
      const activityDate = randomDate(ninetyDaysAgo, now);
      
      await dbClient.query(
        `INSERT INTO activity_log (
          id, user_id, activity_type, related_id, created_at
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(),
          user.id,
          randomItem(activityTypes),
          uuidv4(),
          activityDate
        ]
      );
    }
    console.log('✅ Seeded activity logs');
    
    // 20. AUDIT LOGS
    console.log('📝 Seeding audit logs...');
    const auditActions = ['login', 'candidate_created', 'candidate_updated', 'job_created', 'job_updated', 'submission_created', 'interview_scheduled', 'placement_created', 'client_created'];
    
    for (let i = 0; i < 150; i++) {
      const user = randomItem(seedData.users);
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
    console.log('✅ Comprehensive database seed completed successfully!');
    
    // Summary
    console.log('\n📊 COMPREHENSIVE SEED SUMMARY:');
    console.log(`Roles: ${seedData.roles.length}`);
    console.log(`Permissions: ${seedData.permissions.length}`);
    console.log(`Users: ${seedData.users.length}`);
    console.log(`Skills: ${seedData.skills.length}`);
    console.log(`Clients: ${seedData.clients.length}`);
    console.log(`Job Descriptions: ${seedData.jobDescriptions.length}`);
    console.log(`Candidates: ${seedData.candidates.length}`);
    console.log(`Submissions: ${seedData.submissions.length}`);
    console.log(`Interviews: ${interviewCount}`);
    console.log(`Placements: ${placementCount}`);
    console.log(`Communications: Seeded`);
    console.log(`Activity Logs: 200`);
    console.log(`Audit Logs: 150`);
    console.log('✅ Comprehensive database seed completed successfully!');
    
    // Summary
    console.log('\n📊 COMPREHENSIVE SEED SUMMARY:');
    console.log(`Roles: ${seedData.roles.length}`);
    console.log(`Permissions: ${seedData.permissions.length}`);
    console.log(`Users: ${seedData.users.length}`);
    console.log(`Skills: ${seedData.skills.length}`);
    console.log(`Clients: ${seedData.clients.length}`);
    console.log(`Job Descriptions: ${seedData.jobDescriptions.length}`);
    console.log(`Candidates: ${seedData.candidates.length}`);
    console.log(`Submissions: ${seedData.submissions.length}`);
    console.log(`Interviews: ${interviewCount}`);
    console.log(`Placements: ${placementCount}`);
    console.log(`Communications: Seeded`);
    console.log(`Activity Logs: 200`);
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
    console.log('🎉 Comprehensive seed process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed process failed:', error);
    process.exit(1);
  });
