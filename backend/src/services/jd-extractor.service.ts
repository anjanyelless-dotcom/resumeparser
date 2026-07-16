/**
 * JD Extractor Service
 *
 * Extracts and normalizes technical skills, experience years, role keywords,
 * education requirements, and certification keywords from a raw Job Description text.
 *
 * NO external AI APIs are used — everything runs locally in TypeScript.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Alias normalization map  (raw variant → canonical name)
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_ALIASES: Record<string, string> = {
  // JavaScript ecosystem
  "js": "JavaScript",
  "javascript": "JavaScript",
  "es6": "JavaScript",
  "es2015": "JavaScript",
  "ecmascript": "JavaScript",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "node js": "Node.js",
  "node": "Node.js",
  "reactjs": "React",
  "react.js": "React",
  "react js": "React",
  "react": "React",
  "vuejs": "Vue.js",
  "vue.js": "Vue.js",
  "vue js": "Vue.js",
  "vue": "Vue.js",
  "angularjs": "Angular",
  "angular.js": "Angular",
  "angular js": "Angular",
  "angular": "Angular",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "nuxtjs": "Nuxt.js",
  "nuxt.js": "Nuxt.js",

  // Java ecosystem
  "java": "Java",
  "springboot": "Spring Boot",
  "spring-boot": "Spring Boot",
  "spring boot": "Spring Boot",
  "spring": "Spring",
  "hibernate": "Hibernate",
  "jpa": "JPA",
  "maven": "Maven",
  "gradle": "Gradle",
  "junit": "JUnit",

  // Python ecosystem
  "python": "Python",
  "django": "Django",
  "flask": "Flask",
  "fastapi": "FastAPI",
  "pandas": "Pandas",
  "numpy": "NumPy",
  "scikit-learn": "Scikit-Learn",
  "sklearn": "Scikit-Learn",
  "tensorflow": "TensorFlow",
  "pytorch": "PyTorch",
  "keras": "Keras",

  // Databases
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "mysql": "MySQL",
  "mssql": "SQL Server",
  "sqlserver": "SQL Server",
  "sql server": "SQL Server",
  "sqlite": "SQLite",
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "redis": "Redis",
  "elasticsearch": "Elasticsearch",
  "cassandra": "Cassandra",
  "dynamodb": "DynamoDB",
  "firebase": "Firebase",
  "sql": "SQL",
  "nosql": "NoSQL",

  // Cloud
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "GCP",
  "google cloud": "GCP",
  "azure": "Azure",
  "microsoft azure": "Azure",

  // DevOps / Infrastructure
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  "helm": "Helm",
  "terraform": "Terraform",
  "ansible": "Ansible",
  "jenkins": "Jenkins",
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",

  // APIs & Architecture
  "rest": "REST API",
  "restful": "REST API",
  "restful api": "REST API",
  "rest api": "REST API",
  "graphql": "GraphQL",
  "grpc": "gRPC",
  "microservices": "Microservices",
  "micro services": "Microservices",
  "soap": "SOAP",

  // Version control
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "bitbucket": "Bitbucket",

  // Other languages
  "golang": "Go",
  "go lang": "Go",
  "c#": "C#",
  "csharp": "C#",
  "c++": "C++",
  "cpp": "C++",
  "rust": "Rust",
  "swift": "Swift",
  "kotlin": "Kotlin",
  "scala": "Scala",
  "ruby": "Ruby",
  "php": "PHP",

  // Mobile
  "react native": "React Native",
  "flutter": "Flutter",
  "android": "Android",
  "ios": "iOS",
  "xcode": "Xcode",

  // Data / ML
  "machine learning": "Machine Learning",
  "ml": "Machine Learning",
  "deep learning": "Deep Learning",
  "dl": "Deep Learning",
  "nlp": "NLP",
  "natural language processing": "NLP",
  "computer vision": "Computer Vision",
  "data science": "Data Science",
  "big data": "Big Data",
  "spark": "Apache Spark",
  "apache spark": "Apache Spark",
  "hadoop": "Hadoop",
  "kafka": "Apache Kafka",
  "apache kafka": "Apache Kafka",

  // Testing
  "jest": "Jest",
  "mocha": "Mocha",
  "cypress": "Cypress",
  "selenium": "Selenium",
  "pytest": "Pytest",

  // Other tools
  "linux": "Linux",
  "unix": "Unix",
  "bash": "Bash",
  "shell scripting": "Shell Scripting",
  "nginx": "Nginx",
  "apache": "Apache",
  "jira": "Jira",
  "confluence": "Confluence",
  "agile": "Agile",
  "scrum": "Scrum",
  "kanban": "Kanban",
};

// Skills that are multi-word and need special phrase matching
const MULTI_WORD_SKILLS = [
  "machine learning", "deep learning", "natural language processing",
  "computer vision", "data science", "big data", "react native",
  "spring boot", "spring framework", "rest api", "restful api",
  "github actions", "gitlab ci", "node.js", "next.js", "vue.js",
  "sql server", "amazon web services", "google cloud", "microsoft azure",
  "apache spark", "apache kafka", "shell scripting", "ci/cd",
];

// Education keywords
const EDUCATION_KEYWORDS: Record<string, string> = {
  "b.tech": "B.Tech",
  "btech": "B.Tech",
  "b.e": "B.E",
  "be": "B.E",
  "bachelor": "Bachelor's",
  "bachelors": "Bachelor's",
  "b.sc": "B.Sc",
  "bsc": "B.Sc",
  "m.tech": "M.Tech",
  "mtech": "M.Tech",
  "m.e": "M.E",
  "me ": "M.E",
  "master": "Master's",
  "masters": "Master's",
  "m.sc": "M.Sc",
  "msc": "M.Sc",
  "mba": "MBA",
  "phd": "PhD",
  "ph.d": "PhD",
  "doctorate": "PhD",
  "computer science": "Computer Science",
  "information technology": "IT",
  "software engineering": "Software Engineering",
  "electrical engineering": "Electrical Engineering",
  "electronics": "Electronics",
  "mathematics": "Mathematics",
  "statistics": "Statistics",
};

// Certification keywords
const CERTIFICATION_KEYWORDS: string[] = [
  "aws certified", "aws associate", "aws professional", "aws developer",
  "azure certified", "azure administrator", "azure developer",
  "google certified", "gcp certified",
  "pmp", "prince2",
  "cka", "ckad", "kubernetes certified",
  "cisco", "ccna", "ccnp",
  "comptia", "security+",
  "scrum master", "csm", "safe", "psm",
  "oracle certified", "ocp", "ocjp",
  "certified developer",
  "data science certification",
  "machine learning certification",
];

// Role/seniority keywords
const ROLE_KEYWORDS: string[] = [
  "senior", "sr.", "sr ", "lead", "principal", "staff", "architect",
  "junior", "jr.", "jr ", "associate", "entry level",
  "manager", "director", "head", "vp", "vice president",
  "engineer", "developer", "programmer", "analyst", "consultant",
  "devops", "sre", "site reliability", "data scientist", "data engineer",
  "ml engineer", "ai engineer", "full stack", "fullstack", "backend", "frontend",
  "front-end", "back-end", "full-stack",
  "mobile developer", "ios developer", "android developer",
  "cloud architect", "solutions architect", "software architect",
  "tech lead", "technical lead", "team lead",
];

// ─────────────────────────────────────────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────────────────────────────────────────
export interface ExtractedJD {
  skills: string[];            // normalized canonical skills
  rawSkills: string[];         // original extracted skill tokens
  experienceYears: number;     // 0 if not found
  experienceMin: number | null; // min boundary
  experienceMax: number | null; // max boundary
  experienceText: string;      // raw matched text like "5+ years"
  educationKeywords: string[]; // e.g. ["B.Tech", "Computer Science"]
  roleKeywords: string[];      // e.g. ["senior", "full stack", "backend"]
  certificationKeywords: string[];
  allKeywords: string[];       // full bag of normalized lowercase words for text-matching
  locationKeywords?: string[]; // optional: e.g. ["Hyderabad", "Bangalore"]
  employmentType?: string;     // optional: e.g. "full_time", "contract"
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[•·▪▸➔►→\-–—]/g, " ")
    .replace(/[()[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function normalizeSkill(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return SKILL_ALIASES[lower] || raw.trim();
}

function extractExperienceRules(rawText: string): { min: number | null; max: number | null; text: string; fallbackYears: number } {
  const t = rawText.toLowerCase();

  // 1. Range Rule (e.g. 3-5 years, 3 to 5 years)
  const rangeMatch = t.match(/(\d+)\s*(?:-|–|to|and maximum)\s*(\d+)\s*years?/i) 
    || t.match(/minimum\s+(\d+)\s*years?\s+and\s+maximum\s+(\d+)\s*years?/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return { min, max, text: rangeMatch[0], fallbackYears: min };
  }

  // 2. Plus Rule (e.g. 5+ years, 5 years and above)
  const plusMatch = t.match(/(\d+)\s*\+\s*years?/i)
    || t.match(/(\d+)\s*years?\s+(?:and\s+)?above/i)
    || t.match(/(?:minimum|at\s+least|min)\s*(?:of\s*)?(\d+)\s*years?/i)
    || t.match(/(\d+)\s*(?:or\s+)?more\s*years?/i);
  if (plusMatch) {
    const min = parseInt(plusMatch[1], 10);
    return { min, max: null, text: plusMatch[0], fallbackYears: min };
  }

  // 3. Single Number Rule (e.g. 2 Years -> 1 to 2 Years)
  // Look for a number followed by 'years' or 'year'
  const singleMatch = t.match(/(?:^|\s|[^0-9a-zA-Z])(\d+)\s*years?(?:\s+experience|\s+of\s+experience)?(?:$|\s|[^0-9a-zA-Z])/i);
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10);
    const min = Math.max(0, n - 1);
    const max = n;
    return { min, max, text: singleMatch[0].trim(), fallbackYears: n };
  }

  return { min: null, max: null, text: "", fallbackYears: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extraction function
// ─────────────────────────────────────────────────────────────────────────────
export function extractJD(rawJDText: string): ExtractedJD {
  const normalized = normalizeText(rawJDText);

  // 1. Experience years (pass raw text to preserve hyphens for ranges)
  const expResult = extractExperienceRules(rawJDText);

  // 2. Multi-word skills first (before tokenization loses them)
  const foundSkills: Set<string> = new Set<string>();
  const rawSkillTokens: string[] = [];

  for (const phrase of MULTI_WORD_SKILLS) {
    if (normalized.includes(phrase)) {
      const canonical = normalizeSkill(phrase);
      foundSkills.add(canonical);
      rawSkillTokens.push(phrase);
    }
  }

  // 3. Tokenize and match single-word skills
  const tokens = normalized.split(/[\s,;:|/\\]+/).filter((t) => t.length > 1);
  for (const token of tokens) {
    const clean = token.replace(/[^a-z0-9#+.\-]/g, "").trim();
    if (!clean || clean.length < 2) continue;
    const canonical = SKILL_ALIASES[clean];
    if (canonical) {
      foundSkills.add(canonical);
      rawSkillTokens.push(clean);
    }
  }

  // 4. Education keywords
  const educationFound: string[] = [];
  for (const [pattern, label] of Object.entries(EDUCATION_KEYWORDS)) {
    if (normalized.includes(pattern.toLowerCase())) {
      if (!educationFound.includes(label)) {
        educationFound.push(label);
      }
    }
  }

  // 5. Role keywords
  const roleFound: string[] = [];
  for (const role of ROLE_KEYWORDS) {
    if (normalized.includes(role.toLowerCase())) {
      if (!roleFound.includes(role)) {
        roleFound.push(role);
      }
    }
  }

  // 6. Certification keywords
  const certFound: string[] = [];
  for (const cert of CERTIFICATION_KEYWORDS) {
    if (normalized.includes(cert.toLowerCase())) {
      if (!certFound.includes(cert)) {
        certFound.push(cert);
      }
    }
  }

  // 7. Build full keyword bag (for text search fallback)
  const allKeywords = [
    ...Array.from(foundSkills).map((s) => s.toLowerCase()),
    ...educationFound.map((e) => e.toLowerCase()),
    ...roleFound.map((r) => r.toLowerCase()),
  ];

  return {
    skills: Array.from(foundSkills),
    rawSkills: [...new Set(rawSkillTokens)],
    experienceYears: expResult.fallbackYears,
    experienceMin: expResult.min,
    experienceMax: expResult.max,
    experienceText: expResult.text,
    educationKeywords: educationFound,
    roleKeywords: roleFound,
    certificationKeywords: certFound,
    allKeywords: [...new Set(allKeywords)],
  };
}
