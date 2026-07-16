/**
 * RESUME PARSER - PRODUCTION-QUALITY DATABASE SEED SCRIPT
 * 
 * This script seeds realistic ATS (Applicant Tracking System) test data
 * maintaining full referential integrity and using realistic recruitment data.
 * 
 * Schema: 22 tables with proper relationships and constraints
 * 
 * Usage:
 *   node src/database/seed.js
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
  password: process.env.DB_PASSWORD || '',
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

const FRAMEWORK_SKILLS = [
  'React.js', 'Angular', 'Vue.js', 'Next.js', 'Nuxt.js', 'Express.js', 'NestJS', 'FastAPI',
  'Django', 'Flask', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET Core', 'Svelte'
];

const DATABASE_SKILLS = [
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'Firebase',
  'SQL Server', 'Oracle', 'SQLite', 'MariaDB', 'Neo4j', 'InfluxDB', 'TimescaleDB'
];

const CLOUD_SKILLS = [
  'AWS', 'Azure', 'GCP', 'DigitalOcean', 'Heroku', 'Vercel', 'Netlify', 'Cloudflare',
  'Kubernetes', 'Docker', 'Terraform', 'Ansible', 'Puppet', 'Chef', 'SaltStack'
];

const DEVOPS_SKILLS = [
  'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'Travis CI', 'Docker', 'Kubernetes',
  'Prometheus', 'Grafana', 'ELK Stack', 'Splunk', 'Nagios', 'New Relic', 'Datadog'
];

const ML_SKILLS = [
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter', 'Apache Spark',
  'Hadoop', 'Natural Language Processing', 'Computer Vision', 'Deep Learning', 'Machine Learning',
  'Data Science', 'Statistics', 'R', 'MATLAB', 'SAS'
];

const MOBILE_SKILLS = [
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS', 'Xamarin', 'Ionic',
  'NativeScript', 'Cordova', 'PhoneGap', 'Mobile Development', 'App Development'
];

const ALL_SKILLS = [
  ...TECHNICAL_SKILLS, ...FRAMEWORK_SKILLS, ...DATABASE_SKILLS, ...CLOUD_SKILLS,
  ...DEVOPS_SKILLS, ...ML_SKILLS, ...MOBILE_SKILLS
];

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

const CERTIFICATIONS = [
  'AWS Solutions Architect', 'AWS Developer', 'AWS SysOps', 'Google Cloud Professional',
  'Azure Administrator', 'Azure Developer', 'Kubernetes Administrator (CKA)',
  'Kubernetes Application Developer (CKAD)', 'Docker Certified Associate',
  'Certified Kubernetes Security Specialist (CKS)', 'Scrum Master (CSM)', 'PMP',
  'CISSP', 'CEH', 'CompTIA Security+', 'CCNA', 'CCNP', 'VMware Certified Professional',
  'Red Hat Certified Engineer (RHCE)', 'Oracle Certified Professional',
  'Salesforce Administrator', 'SAP Certified', 'ISTQB Foundation', 'Six Sigma Green Belt'
];

const SALARY_RANGES = [
  { min: 800000, max: 1200000 }, // 8-12 LPA
  { min: 1200000, max: 1800000 }, // 12-18 LPA
  { min: 1800000, max: 2500000 }, // 18-25 LPA
  { min: 2500000, max: 3500000 }, // 25-35 LPA
  { min: 3500000, max: 5000000 }, // 35-50 LPA
  { min: 5000000, max: 7000000 }, // 50-70 LPA
];

const NOTICE_PERIODS = ['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days', '3 months'];

const RESUME_SUMMARIES = [
  'Results-driven software engineer with expertise in building scalable web applications. Proficient in modern JavaScript frameworks and cloud technologies. Strong problem-solving skills with experience in agile methodologies.',
  'Passionate full-stack developer with 5+ years of experience in developing robust applications. Skilled in React, Node.js, and PostgreSQL. Excellent communication skills and team collaboration abilities.',
  'Innovative backend engineer specializing in microservices architecture. Expert in Python, Django, and AWS. Proven track record of optimizing system performance and reducing latency.',
  'Detail-oriented DevOps engineer with extensive experience in CI/CD pipelines and containerization. Proficient in Kubernetes, Docker, and Terraform. Strong focus on automation and infrastructure as code.',
  'Data-driven machine learning engineer with expertise in deep learning and natural language processing. Skilled in TensorFlow, PyTorch, and big data technologies. Published researcher with strong analytical skills.',
  'Creative frontend developer with a passion for user experience. Expert in React, Angular, and modern CSS. Experience in building responsive and accessible web applications.',
  'Security-focused software engineer with expertise in application security and penetration testing. Certified CISSP with experience in implementing security best practices.',
  'Mobile-first developer with expertise in React Native and Flutter. Experience in building cross-platform mobile applications with millions of users.',
  'Product-minded engineer with experience in full-stack development and product management. Strong understanding of user needs and business requirements.',
  'Performance optimization specialist with expertise in database tuning and application profiling. Experience in handling high-traffic systems and reducing response times.'
];

// ============================================
// SEED DATA STORAGE
// ============================================

const seedData = {
  users: [],
  skills: [],
  candidates: [],
  jobDescriptions: [],
  candidateSkills: [],
  workHistory: [],
  education: [],
  certifications: [],
  parsingJobs: [],
  jobSkills: [],
  matchScores: [],
  duplicateCandidates: [],
  labeledData: [],
  auditLogs: []
};

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed() {
  console.log('🌱 Starting production-quality database seed...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // ============================================
    // LEVEL 1: INDEPENDENT TABLES
    // ============================================
    
    // 1. USERS
    console.log('📝 Seeding users...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const users = [
      { email: 'admin@lakshya.com', role: 'admin', full_name: 'System Administrator' },
      { email: 'recruiter1@lakshya.com', role: 'recruiter', full_name: 'Priya Sharma' },
      { email: 'recruiter2@lakshya.com', role: 'recruiter', full_name: 'Rahul Verma' },
      { email: 'recruiter3@lakshya.com', role: 'recruiter', full_name: 'Anjali Mehta' },
      { email: 'recruiter4@lakshya.com', role: 'recruiter', full_name: 'Vikram Singh' },
      { email: 'recruiter5@lakshya.com', role: 'recruiter', full_name: 'Sneha Patel' },
      { email: 'recruiter6@lakshya.com', role: 'recruiter', full_name: 'Amit Kumar' },
      { email: 'recruiter7@lakshya.com', role: 'recruiter', full_name: 'Neha Gupta' },
      { email: 'recruiter8@lakshya.com', role: 'recruiter', full_name: 'Rajesh Nair' },
      { email: 'recruiter9@lakshya.com', role: 'recruiter', full_name: 'Kavita Reddy' },
      { email: 'recruiter10@lakshya.com', role: 'recruiter', full_name: 'Suresh Iyer' },
      { email: 'recruiter11@lakshya.com', role: 'recruiter', full_name: 'Pooja Chopra' },
      { email: 'recruiter12@lakshya.com', role: 'recruiter', full_name: 'Deepak Malhotra' },
      { email: 'recruiter13@lakshya.com', role: 'recruiter', full_name: 'Ruchi Kapoor' },
      { email: 'recruiter14@lakshya.com', role: 'recruiter', full_name: 'Mahesh Joshi' },
      { email: 'recruiter15@lakshya.com', role: 'recruiter', full_name: 'Sunita Das' },
      { email: 'recruiter16@lakshya.com', role: 'recruiter', full_name: 'Dinesh Mukherjee' },
      { email: 'recruiter17@lakshya.com', role: 'recruiter', full_name: 'Anita Sen' },
      { email: 'recruiter18@lakshya.com', role: 'recruiter', full_name: 'Ramesh Bose' },
      { email: 'recruiter19@lakshya.com', role: 'recruiter', full_name: 'Kavita Sengupta' },
      { email: 'recruiter20@lakshya.com', role: 'recruiter', full_name: 'Sandeep Roy' },
      { email: 'viewer1@lakshya.com', role: 'viewer', full_name: 'Guest User' }
    ];
    
    for (const user of users) {
      const userId = uuidv4();
      const result = await client.query(
        `INSERT INTO users (id, email, hashed_password, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        [userId, user.email, hashedPassword, user.role]
      );
      if (result.rows.length > 0) {
        seedData.users.push({ ...user, id: result.rows[0].id });
      }
    }
    
    // If no new users were inserted, fetch existing ones
    if (seedData.users.length === 0) {
      const existingUsers = await client.query(
        `SELECT id, email, role FROM users WHERE role IN ('admin', 'recruiter') LIMIT 25`
      );
      seedData.users = existingUsers.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role
      }));
    }
    console.log(`✅ Seeded ${seedData.users.length} users`);
    
    // 2. SYSTEM SETTINGS
    console.log('📝 Seeding system settings...');
    const settings = [
      { key: 'max_file_size_mb', value: { value: 10 } },
      { key: 'allowed_file_types', value: { types: ['pdf', 'docx', 'txt', 'image'] } },
      { key: 'ai_confidence_threshold', value: { threshold: 0.75 } },
      { key: 'default_review_status', value: { status: 'pending' } },
      { key: 'enable_duplicate_detection', value: { enabled: true } },
      { key: 'auto_approve_threshold', value: { threshold: 0.9 } },
      { key: 'skill_normalization_enabled', value: { enabled: true } },
      { key: 'max_resume_file_size', value: { size: 5242880 } }, // 5MB
      { key: 'supported_languages', value: { languages: ['en', 'hi'] } },
      { key: 'ocr_enabled', value: { enabled: true } }
    ];
    
    for (const setting of settings) {
      await client.query(
        `INSERT INTO system_settings (key, value) 
         VALUES ($1, $2) 
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [setting.key, setting.value]
      );
    }
    console.log('✅ Seeded system settings');
    
    // 3. SKILLS (Global catalog)
    console.log('📝 Seeding skills catalog...');
    const skillCategories = {
      technical: TECHNICAL_SKILLS,
      framework: FRAMEWORK_SKILLS,
      database: DATABASE_SKILLS,
      cloud: CLOUD_SKILLS,
      devops: DEVOPS_SKILLS,
      ml: ML_SKILLS,
      mobile: MOBILE_SKILLS
    };
    
    for (const [category, skills] of Object.entries(skillCategories)) {
      for (const skillName of skills) {
        const skillId = uuidv4();
        const result = await client.query(
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
      const existingSkills = await client.query(
        `SELECT id, name, category FROM skills LIMIT 200`
      );
      seedData.skills = existingSkills.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category
      }));
    }
    console.log(`✅ Seeded ${seedData.skills.length} skills`);
    
    // 4. JOB DESCRIPTIONS
    console.log('📝 Seeding job descriptions...');
    const jobCount = 50;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < jobCount; i++) {
      const title = randomItem(JOB_TITLES);
      const location = randomItem(INDIAN_CITIES);
      const salaryRange = randomItem(SALARY_RANGES);
      const requiredSkills = randomSubset(ALL_SKILLS, 3, 6);
      const jobId = uuidv4();
      
      await client.query(
        `INSERT INTO job_descriptions (
          id, title, description, required_skills, department, location,
          employment_type, min_experience_years, max_experience_years, education_level,
          salary_min, salary_max, is_active, created_by, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          jobId,
          title,
          `We are looking for a talented ${title} to join our growing team in ${location}. The ideal candidate will have strong technical skills and experience with ${requiredSkills.slice(0, 2).join(', ')}.`,
          requiredSkills,
          randomItem(['Engineering', 'Product', 'Data Science', 'DevOps', 'Mobile', 'QA']),
          location,
          randomItem(['full-time', 'full-time', 'full-time', 'contract', 'remote']),
          randomInt(2, 5),
          randomInt(6, 12),
          randomItem(['B.Tech', 'M.Tech', 'B.Sc', 'M.Sc', 'PhD', 'Any']),
          salaryRange.min,
          salaryRange.max,
          true,
          seedData.users.length > 0 ? randomItem(seedData.users).id : null,
          randomItem(['active', 'active', 'active', 'closed', 'on-hold']),
          randomDate(ninetyDaysAgo, now),
          now
        ]
      );
      
      seedData.jobDescriptions.push({
        id: jobId,
        title,
        location,
        requiredSkills
      });
    }
    console.log(`✅ Seeded ${seedData.jobDescriptions.length} job descriptions`);
    
    // ============================================
    // LEVEL 2: DEPENDS ON LEVEL 1
    // ============================================
    
    // 5. JOB SKILLS
    console.log('📝 Seeding job skills...');
    for (const job of seedData.jobDescriptions) {
      // Required skills
      for (const skillName of job.requiredSkills) {
        await client.query(
          `INSERT INTO job_skills (job_id, skill_name, skill_type) 
           VALUES ($1, $2, $3) 
           ON CONFLICT DO NOTHING`,
          [job.id, skillName, 'required']
        );
      }
      
      // Add some preferred skills
      const preferredSkills = randomSubset(ALL_SKILLS.filter(s => !job.requiredSkills.includes(s)), 2, 4);
      for (const skillName of preferredSkills) {
        await client.query(
          `INSERT INTO job_skills (job_id, skill_name, skill_type) 
           VALUES ($1, $2, $3) 
           ON CONFLICT DO NOTHING`,
          [job.id, skillName, 'preferred']
        );
      }
    }
    console.log('✅ Seeded job skills');
    
    // ============================================
    // LEVEL 3: CANDIDATES
    // ============================================
    
    // 6. CANDIDATES
    console.log('📝 Seeding candidates...');
    const candidateCount = 100;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < candidateCount; i++) {
      const firstName = randomItem(INDIAN_FIRST_NAMES);
      const lastName = randomItem(INDIAN_LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const email = generateEmail(firstName, lastName, randomItem(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']));
      const location = randomItem(INDIAN_CITIES);
      const createdDate = randomDate(thirtyDaysAgo, now);
      const salaryRange = randomItem(SALARY_RANGES);
      const yearsOfExperience = randomInt(0, 15);
      
      const status = randomItem(['success', 'success', 'success', 'success', 'success', 'pending', 'processing', 'failed']);
      const reviewStatus = randomItem(['pending', 'pending', 'pending', 'in_review', 'approved', 'approved', 'rejected']);
      
      const currentCompany = randomItem(INDIAN_COMPANIES);
      const currentTitle = randomItem(JOB_TITLES);
      
      const candidateId = uuidv4();
      await client.query(
        `INSERT INTO candidates (
          id, full_name, email, phone, location, linkedin_url, github_url,
          summary, years_experience, current_title, current_company,
          consent_given, tenant_id, review_status, status, match_score,
          resume_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
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
          currentTitle,
          currentCompany,
          randomItem([true, true, true, false]),
          'default',
          reviewStatus,
          status,
          randomFloat(0.0, 0.9, 2),
          uuidv4(),
          createdDate,
          createdDate
        ]
      );
      
      seedData.candidates.push({
        id: candidateId,
        fullName,
        email,
        location,
        yearsOfExperience,
        currentCompany,
        currentTitle,
        status,
        reviewStatus,
        createdDate
      });
    }
    console.log(`✅ Seeded ${seedData.candidates.length} candidates`);
    
    // ============================================
    // LEVEL 4: DEPENDS ON CANDIDATES
    // ============================================
    
    // 7. CANDIDATE SKILLS
    console.log('📝 Seeding candidate skills...');
    for (const candidate of seedData.candidates) {
      const candidateSkills = randomSubset(ALL_SKILLS, 3, 8);
      
      for (const skillName of candidateSkills) {
        let skill = seedData.skills.find(s => s.name === skillName);
        
        // If skill not found in seedData, try to get it from database
        if (!skill) {
          const skillResult = await client.query(
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
          await client.query(
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
          
          seedData.candidateSkills.push({
            candidateId: candidate.id,
            skillId: skill.id,
            skillName: skill.name
          });
        }
      }
    }
    console.log(`✅ Seeded ${seedData.candidateSkills.length} candidate skills`);
    
    // 8. WORK HISTORY
    console.log('📝 Seeding work history...');
    for (const candidate of seedData.candidates) {
      const workHistoryCount = randomInt(1, 4);
      
      for (let j = 0; j < workHistoryCount; j++) {
        const isCurrent = j === 0;
        const startDate = randomDate(
          new Date(now.getTime() - (candidate.yearsOfExperience + 2) * 365 * 24 * 60 * 60 * 1000),
          isCurrent ? new Date(now.getTime() - randomInt(1, 5) * 365 * 24 * 60 * 60 * 1000) : now
        );
        const endDate = isCurrent ? null : randomDate(startDate, now);
        
        await client.query(
          `INSERT INTO work_history (
            id, candidate_id, job_title, company_name, start_date, end_date,
            is_current, location, description, display_order, client_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            uuidv4(),
            candidate.id,
            randomItem(JOB_TITLES),
            randomItem(INDIAN_COMPANIES),
            formatDate(startDate),
            endDate ? formatDate(endDate) : null,
            isCurrent,
            randomItem(INDIAN_CITIES),
            `Worked on ${randomItem(ALL_SKILLS)} projects and contributed to team success. ${randomItem(['Led team of 5 developers', 'Improved system performance by 40%', 'Implemented CI/CD pipelines', 'Developed microservices architecture', 'Mentored junior developers'])}.`,
            j,
            randomItem([null, randomItem(INDIAN_COMPANIES)])
          ]
        );
      }
    }
    console.log('✅ Seeded work history');
    
    // 9. EDUCATION
    console.log('📝 Seeding education...');
    for (const candidate of seedData.candidates) {
      const educationCount = randomInt(1, 3);
      
      for (let j = 0; j < educationCount; j++) {
        const startYear = now.getFullYear() - randomInt(4, 8);
        const endYear = startYear + randomInt(3, 5);
        
        await client.query(
          `INSERT INTO education (
            id, candidate_id, institution, degree, field_of_study, start_date, end_date, gpa, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            uuidv4(),
            candidate.id,
            randomItem(INDIAN_INSTITUTIONS),
            randomItem(DEGREES),
            randomItem(['Computer Science', 'Information Technology', 'Software Engineering', 'Electronics', 'Data Science', 'Artificial Intelligence']),
            new Date(startYear, 7, 1),
            new Date(endYear, 5, 30),
            randomFloat(6.0, 9.5, 2),
            `Graduated with ${randomItem(['distinction', 'first class', 'merit'])}. ${randomItem(['Active in technical clubs', 'Published research papers', 'Participated in hackathons', 'Led student projects'])}.`
          ]
        );
      }
    }
    console.log('✅ Seeded education');
    
    // 10. CERTIFICATIONS
    console.log('📝 Seeding certifications...');
    for (const candidate of seedData.candidates) {
      if (Math.random() > 0.3) { // 70% of candidates have certifications
        const certCount = randomInt(1, 4);
        
        for (let j = 0; j < certCount; j++) {
          const issueYear = now.getFullYear() - randomInt(1, 5);
          
          await client.query(
            `INSERT INTO certifications (
              id, candidate_id, name, issuing_organization, issue_date, expiry_date, credential_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              candidate.id,
              randomItem(CERTIFICATIONS),
              randomItem(['AWS', 'Google Cloud', 'Microsoft', 'Oracle', 'Cisco', 'Scrum Alliance', 'PMI', 'ISC2', 'CompTIA']),
              new Date(issueYear, randomInt(0, 11), randomInt(1, 28)),
              new Date(issueYear + 3, randomInt(0, 11), randomInt(1, 28)),
              `${randomItem(['AWS', 'GCP', 'AZURE', 'CKA', 'CKAD', 'PMP', 'CSM'])}-${randomInt(100000, 999999)}`
            ]
          );
        }
      }
    }
    console.log('✅ Seeded certifications');
    
    // 11. PARSING JOBS
    console.log('📝 Seeding parsing jobs...');
    for (const candidate of seedData.candidates) {
      if (candidate.status === 'success' || candidate.status === 'processing') {
        const startedAt = randomDate(candidate.createdDate, now);
        const completedAt = candidate.status === 'success' ? randomDate(startedAt, now) : null;
        
        await client.query(
          `INSERT INTO parsing_jobs (
            id, candidate_id, filename, file_path, status, task_id,
            raw_text, parsed_data, confidence_score, ocr_confidence, error_message,
            started_at, completed_at, original_file_copy_path, extracted_text_path, parsed_json_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            uuidv4(),
            candidate.id,
            `${candidate.fullName.replace(/\s+/g, '_')}_resume.pdf`,
            `/uploads/resumes/${uuidv4()}.pdf`,
            candidate.status,
            uuidv4(),
            `Extracted resume text for ${candidate.fullName}`,
            JSON.stringify({
              name: candidate.fullName,
              email: candidate.email,
              skills: randomSubset(ALL_SKILLS, 3, 5),
              experience: candidate.yearsOfExperience,
              education: randomItem(DEGREES)
            }),
            candidate.status === 'success' ? randomFloat(0.8, 0.98, 4) : null,
            candidate.status === 'success' ? randomFloat(0.85, 0.99, 4) : null,
            candidate.status === 'failed' ? 'Parsing timeout' : null,
            startedAt,
            completedAt,
            `/uploads/resumes/${uuidv4()}.pdf`,
            `/uploads/text/${uuidv4()}.txt`,
            `/uploads/json/${uuidv4()}.json`
          ]
        );
        
        seedData.parsingJobs.push({
          candidateId: candidate.id,
          status: candidate.status
        });
      }
    }
    console.log(`✅ Seeded ${seedData.parsingJobs.length} parsing jobs`);
    
    // 12. CANDIDATE ACHIEVEMENTS
    console.log('📝 Seeding candidate achievements...');
    for (const candidate of seedData.candidates) {
      if (Math.random() > 0.6) { // 40% of candidates have achievements
        const achievementCount = randomInt(1, 3);
        
        for (let j = 0; j < achievementCount; j++) {
          await client.query(
            `INSERT INTO candidate_achievements (id, candidate_id, title, year, confidence) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
              uuidv4(),
              candidate.id,
              randomItem([
                'Employee of the Year', 'Best Performer', 'Innovation Award',
                'Team Excellence Award', 'Client Appreciation', 'Technical Excellence',
                'Leadership Award', 'Quality Champion', 'Process Improvement Award'
              ]),
              now.getFullYear() - randomInt(0, 5),
              randomFloat(0.8, 0.95, 2)
            ]
          );
        }
      }
    }
    console.log('✅ Seeded candidate achievements');
    
    // 13. CORRECTIONS
    console.log('📝 Seeding corrections...');
    for (const candidate of seedData.candidates) {
      if (Math.random() > 0.8) { // 20% of candidates have corrections
        const correctionCount = randomInt(1, 3);
        
        for (let j = 0; j < correctionCount; j++) {
          await client.query(
            `INSERT INTO corrections (id, candidate_id, field_name, original_value, corrected_value, corrected_by) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              uuidv4(),
              candidate.id,
              randomItem(['email', 'phone', 'location', 'current_company', 'current_job_title']),
              randomItem(['old-value@example.com', '+91-9876543210', 'Old Location', 'Old Company', 'Old Title']),
              randomItem(['new-value@example.com', '+91-9876543211', 'New Location', 'New Company', 'New Title']),
              seedData.users.length > 0 ? randomItem(seedData.users).email : 'system@lakshya.com'
            ]
          );
        }
      }
    }
    console.log('✅ Seeded corrections');
    
    // 14. DUPLICATE CANDIDATES
    console.log('📝 Seeding duplicate candidates...');
    const duplicateCount = 15;
    for (let i = 0; i < duplicateCount; i++) {
      const candidate1 = randomItem(seedData.candidates);
      let candidate2 = randomItem(seedData.candidates);
      
      // Ensure different candidates
      while (candidate2.id === candidate1.id) {
        candidate2 = randomItem(seedData.candidates);
      }
      
      await client.query(
        `INSERT INTO duplicate_candidates (id, candidate_id_1, candidate_id_2, similarity_score, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(),
          candidate1.id,
          candidate2.id,
          randomFloat(0.85, 0.98, 2),
          randomItem(['pending', 'pending', 'pending', 'merged', 'ignored'])
        ]
      );
    }
    console.log(`✅ Seeded ${duplicateCount} duplicate candidates`);
    
    // 15. LABELED DATA
    console.log('📝 Seeding labeled data...');
    for (const candidate of seedData.candidates) {
      if (Math.random() > 0.7) { // 30% of candidates have labeled data
        await client.query(
          `INSERT INTO labeled_data (id, candidate_id, corrected_fields, labeled_by, action, version, model_version) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            candidate.id,
            JSON.stringify({
              email: { original: 'old@example.com', corrected: candidate.email },
              skills: { original: ['old-skill'], corrected: randomSubset(ALL_SKILLS, 2, 4) }
            }),
            seedData.users.length > 0 ? randomItem(seedData.users).id : uuidv4(),
            randomItem(['approved', 'rejected', 'modified']),
            randomInt(1, 3),
            `v${randomInt(1, 5)}.0.0`
          ]
        );
      }
    }
    console.log('✅ Seeded labeled data');
    
    // ============================================
    // LEVEL 5: DEPENDS ON CANDIDATES + JOBS
    // ============================================
    
    // 16. MATCH SCORES
    console.log('📝 Seeding match scores...');
    const matchCount = 200;
    
    for (let i = 0; i < matchCount; i++) {
      const candidate = randomItem(seedData.candidates);
      const job = randomItem(seedData.jobDescriptions);
      
      const candidateSkills = seedData.candidateSkills
        .filter(cs => cs.candidateId === candidate.id)
        .map(cs => cs.skillName);
      
      const jobRequiredSkills = job.requiredSkills;
      const matchedSkills = candidateSkills.filter(skill => jobRequiredSkills.includes(skill));
      const missingSkills = jobRequiredSkills.filter(skill => !candidateSkills.includes(skill));
      
      const skillScore = (matchedSkills.length / Math.max(jobRequiredSkills.length, 1)) * 100;
      const experienceScore = Math.min(100, (candidate.yearsOfExperience / Math.max(3, 1)) * 100);
      const overallScore = (skillScore * 0.6) + (experienceScore * 0.4);
      
      let recommendation = 'Low Match';
      if (overallScore >= 80) recommendation = 'Strong Match';
      else if (overallScore >= 70) recommendation = 'Good Match';
      else if (overallScore >= 60) recommendation = 'Average Match';
      
      await client.query(
        `INSERT INTO match_scores (
          id, candidate_id, job_id, overall_score, skill_score, experience_score,
          education_score, role_score, project_score, certification_score,
          matching_skills, missing_skills, extra_skills, experience_gap_years,
          recommendation, reason, match_label, jd_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (candidate_id, job_id) DO NOTHING`,
        [
          uuidv4(),
          candidate.id,
          job.id,
          overallScore,
          skillScore,
          experienceScore,
          randomFloat(60, 95, 2),
          randomFloat(50, 90, 2),
          randomFloat(40, 85, 2),
          randomFloat(30, 80, 2),
          matchedSkills,
          missingSkills,
          candidateSkills.filter(skill => !jobRequiredSkills.includes(skill)),
          Math.max(0, 3 - candidate.yearsOfExperience),
          recommendation,
          `Candidate has ${matchedSkills.length} of ${jobRequiredSkills.length} required skills and ${candidate.yearsOfExperience} years of experience.`,
          recommendation,
          uuidv4()
        ]
      );
    }
    console.log(`✅ Seeded ${matchCount} match scores`);
    
    // 17. AUDIT LOGS
    console.log('📝 Seeding audit logs...');
    const actions = ['login', 'candidate_created', 'candidate_updated', 'candidate_deleted', 'job_created', 'job_updated', 'match_generated', 'export_data'];
    
    for (let i = 0; i < 150; i++) {
      const user = randomItem(seedData.users);
      
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          user.email,
          randomItem(actions),
          randomItem(['candidate', 'job', 'user', 'system', 'match']),
          uuidv4(),
          `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            additional_info: randomItem(['Success', 'Failed', 'Partial success'])
          })
        ]
      );
    }
    console.log('✅ Seeded audit logs');
    
    await client.query('COMMIT');
    console.log('✅ Database seed completed successfully!');
    
    // Summary
    console.log('\n📊 SEED SUMMARY:');
    console.log(`Users: ${seedData.users.length}`);
    console.log(`Skills: ${seedData.skills.length}`);
    console.log(`Candidates: ${seedData.candidates.length}`);
    console.log(`Job Descriptions: ${seedData.jobDescriptions.length}`);
    console.log(`Candidate Skills: ${seedData.candidateSkills.length}`);
    console.log(`Match Scores: ${matchCount}`);
    console.log(`Parsing Jobs: ${seedData.parsingJobs.length}`);
    console.log(`Duplicate Candidates: ${duplicateCount}`);
    console.log(`Audit Logs: 150`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
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