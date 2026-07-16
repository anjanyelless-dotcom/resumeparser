/**
 * Role-to-Skill Mapping Service
 *
 * Provides mapping between job roles and their required/preferred skills.
 * This enables the system to infer skills when a recruiter searches by role only.
 */

export interface RoleSkillMapping {
  role: string;
  requiredSkills: string[];
  preferredSkills: string[];
  synonyms: string[];
}

/**
 * Comprehensive role-skill mappings for common job roles
 */
const ROLE_SKILL_MAPPINGS: RoleSkillMapping[] = [
  {
    role: "Frontend Developer",
    requiredSkills: ["HTML", "CSS", "JavaScript"],
    preferredSkills: ["React", "TypeScript", "Redux", "Vue.js", "Angular", "Next.js", "Webpack"],
    synonyms: ["Frontend Engineer", "UI Developer", "Frontend Developer", "React Developer", "UI Engineer", "Web Developer"],
  },
  {
    role: "Backend Developer",
    requiredSkills: ["JavaScript", "Node.js", "API"],
    preferredSkills: ["Python", "Java", "Go", "SQL", "MongoDB", "Redis", "Express", "Docker", "Kubernetes"],
    synonyms: ["Backend Engineer", "Server-Side Developer", "Backend Developer", "API Developer", "Server Engineer"],
  },
  {
    role: "Full Stack Developer",
    requiredSkills: ["JavaScript", "HTML", "CSS", "Node.js"],
    preferredSkills: ["React", "TypeScript", "SQL", "MongoDB", "Express", "Python", "Docker", "REST API"],
    synonyms: ["Full Stack Engineer", "Full Stack Developer", "Full-Stack Developer", "MEAN Stack Developer", "MERN Stack Developer"],
  },
  {
    role: "Data Engineer",
    requiredSkills: ["SQL", "Python", "ETL"],
    preferredSkills: ["Apache Spark", "Hadoop", "Airflow", "Kafka", "AWS", "Azure", "Data Warehousing", "Snowflake"],
    synonyms: ["Data Engineer", "Data Engineering", "ETL Developer", "Data Pipeline Engineer"],
  },
  {
    role: "Data Scientist",
    requiredSkills: ["Python", "Machine Learning", "Statistics"],
    preferredSkills: ["TensorFlow", "PyTorch", "Scikit-learn", "R", "SQL", "Deep Learning", "NLP"],
    synonyms: ["Data Scientist", "ML Engineer", "Machine Learning Engineer", "AI Engineer"],
  },
  {
    role: "DevOps Engineer",
    requiredSkills: ["Linux", "CI/CD", "Docker"],
    preferredSkills: ["Kubernetes", "AWS", "Azure", "Terraform", "Ansible", "Jenkins", "Git", "Monitoring"],
    synonyms: ["DevOps Engineer", "Site Reliability Engineer", "SRE", "DevOps Specialist"],
  },
  {
    role: "Mobile Developer",
    requiredSkills: ["Mobile Development", "Swift", "Kotlin"],
    preferredSkills: ["React Native", "Flutter", "iOS", "Android", "Xcode", "Android Studio", "Mobile UI"],
    synonyms: ["Mobile Developer", "iOS Developer", "Android Developer", "Mobile App Developer"],
  },
  {
    role: "QA Engineer",
    requiredSkills: ["Testing", "Quality Assurance", "Test Cases"],
    preferredSkills: ["Selenium", "Jira", "Automated Testing", "Manual Testing", "API Testing", "Performance Testing"],
    synonyms: ["QA Engineer", "Quality Assurance Engineer", "Test Engineer", "Software Tester", "SDET"],
  },
  {
    role: "Product Manager",
    requiredSkills: ["Product Management", "Agile", "Scrum"],
    preferredSkills: ["Jira", "Roadmapping", "User Stories", "Stakeholder Management", "Analytics", "A/B Testing"],
    synonyms: ["Product Manager", "PM", "Product Owner", "Technical Product Manager"],
  },
  {
    role: "Cloud Architect",
    requiredSkills: ["Cloud Computing", "AWS", "Architecture"],
    preferredSkills: ["Azure", "GCP", "Terraform", "Kubernetes", "Microservices", "Serverless", "Security"],
    synonyms: ["Cloud Architect", "Cloud Solutions Architect", "AWS Architect", "Azure Architect"],
  },
  {
    role: "Security Engineer",
    requiredSkills: ["Cybersecurity", "Network Security", "Penetration Testing"],
    preferredSkills: ["OWASP", "Security Audits", "Incident Response", "Compliance", "Encryption", "SIEM"],
    synonyms: ["Security Engineer", "Cybersecurity Engineer", "InfoSec Engineer", "Security Analyst"],
  },
  {
    role: "UI/UX Designer",
    requiredSkills: ["UI Design", "UX Design", "Figma"],
    preferredSkills: ["Sketch", "Adobe XD", "Prototyping", "User Research", "Wireframing", "Design Systems"],
    synonyms: ["UI/UX Designer", "UX Designer", "UI Designer", "Product Designer", "Interaction Designer"],
  },
];

/**
 * Get skills for a given role
 * @param role - The job role to look up
 * @returns Array of required and preferred skills for the role
 */
export function getSkillsForRole(role: string): string[] {
  if (!role) return [];

  const normalizedRole = role.toLowerCase().trim();

  // First, check for exact match
  const exactMatch = ROLE_SKILL_MAPPINGS.find(m =>
    m.role.toLowerCase() === normalizedRole
  );

  if (exactMatch) {
    return [...exactMatch.requiredSkills, ...exactMatch.preferredSkills];
  }

  // Second, check if role is a synonym
  for (const mapping of ROLE_SKILL_MAPPINGS) {
    if (mapping.synonyms.some(s => s.toLowerCase() === normalizedRole)) {
      return [...mapping.requiredSkills, ...mapping.preferredSkills];
    }
  }

  // Third, check for partial match (contains)
  for (const mapping of ROLE_SKILL_MAPPINGS) {
    if (normalizedRole.includes(mapping.role.toLowerCase()) ||
        mapping.role.toLowerCase().includes(normalizedRole)) {
      return [...mapping.requiredSkills, ...mapping.preferredSkills];
    }
  }

  // No match found, return empty array
  return [];
}

/**
 * Get all role synonyms for a given role
 * @param role - The job role to look up
 * @returns Array of role synonyms including the original role
 */
export function getRoleSynonyms(role: string): string[] {
  if (!role) return [role];

  const normalizedRole = role.toLowerCase().trim();

  // Check for exact match
  const exactMatch = ROLE_SKILL_MAPPINGS.find(m =>
    m.role.toLowerCase() === normalizedRole
  );

  if (exactMatch) {
    return exactMatch.synonyms;
  }

  // Check if role is a synonym
  for (const mapping of ROLE_SKILL_MAPPINGS) {
    if (mapping.synonyms.some(s => s.toLowerCase() === normalizedRole)) {
      return mapping.synonyms;
    }
  }

  // No match found, return original role
  return [role];
}

/**
 * Get all available roles
 * @returns Array of all role names
 */
export function getAllRoles(): string[] {
  return ROLE_SKILL_MAPPINGS.map(m => m.role);
}

/**
 * Get role skill mapping for a given role
 * @param role - The job role to look up
 * @returns RoleSkillMapping object or null if not found
 */
export function getRoleMapping(role: string): RoleSkillMapping | null {
  if (!role) return null;

  const normalizedRole = role.toLowerCase().trim();

  // Check for exact match
  const exactMatch = ROLE_SKILL_MAPPINGS.find(m =>
    m.role.toLowerCase() === normalizedRole
  );

  if (exactMatch) {
    return exactMatch;
  }

  // Check if role is a synonym
  for (const mapping of ROLE_SKILL_MAPPINGS) {
    if (mapping.synonyms.some(s => s.toLowerCase() === normalizedRole)) {
      return mapping;
    }
  }

  return null;
}