import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface Skill {
  name: string;
  category?: string;
}

// Load and parse unified_skills.json
let skillsCache: Skill[] | null = null;
let skillsIndex: Map<string, Skill[]> | null = null;

const loadSkills = (): Skill[] => {
  if (skillsCache) return skillsCache;

  try {
    const skillsPath = path.join(__dirname, '../../../ai-service/unified_skills.json');
    const skillsData = fs.readFileSync(skillsPath, 'utf-8');
    const skillsJson = JSON.parse(skillsData);

    // Flatten and deduplicate skills from all categories
    const allSkills: Skill[] = [];
    const skillSet = new Set<string>();

    if (typeof skillsJson === 'object') {
      // Handle the "domains" wrapper structure
      const dataToProcess = skillsJson.domains || skillsJson;
      
      // Handle nested structure where category might have subcategories
      const processSkills = (data: any, categoryName: string) => {
        if (Array.isArray(data)) {
          data.forEach((skill: string) => {
            if (typeof skill === 'string' && !skillSet.has(skill.trim())) {
              skillSet.add(skill.trim());
              allSkills.push({
                name: skill.trim(),
                category: categoryName
              });
            }
          });
        } else if (typeof data === 'object' && data !== null) {
          Object.keys(data).forEach((subKey) => {
            processSkills(data[subKey], categoryName);
          });
        }
      };

      Object.keys(dataToProcess).forEach((category) => {
        const categoryData = dataToProcess[category];
        processSkills(categoryData, category);
      });
    }

    skillsCache = allSkills;
    return allSkills;
  } catch (error) {
    console.error('Error loading skills from unified_skills.json:', error);
    return [];
  }
};

// Build search index for fuzzy matching
const buildSkillsIndex = (): Map<string, Skill[]> => {
  if (skillsIndex) return skillsIndex;

  const skills = loadSkills();
  const index = new Map<string, Skill[]>();

  skills.forEach((skill) => {
    const name = skill.name.toLowerCase();
    // Index by first 2 characters for prefix matching
    for (let i = 0; i <= name.length - 2; i++) {
      const prefix = name.substring(i, i + 2);
      if (!index.has(prefix)) {
        index.set(prefix, []);
      }
      index.get(prefix)!.push(skill);
    }
  });

  skillsIndex = index;
  return index;
};

// Simple fuzzy matching function
const fuzzyMatch = (query: string, skills: Skill[]): Skill[] => {
  const queryLower = query.toLowerCase();
  const queryLength = queryLower.length;

  if (queryLength < 2) return [];

  const scored = skills.map((skill) => {
    const nameLower = skill.name.toLowerCase();
    let score = 0;

    // Exact match
    if (nameLower === queryLower) {
      score = 100;
    }
    // Starts with query
    else if (nameLower.startsWith(queryLower)) {
      score = 80 + (queryLength / nameLower.length) * 20;
    }
    // Contains query
    else if (nameLower.includes(queryLower)) {
      score = 60 + (queryLength / nameLower.length) * 20;
    }
    // Character by character matching
    else {
      let queryIndex = 0;
      let matchCount = 0;
      for (let i = 0; i < nameLower.length && queryIndex < queryLength; i++) {
        if (nameLower[i] === queryLower[queryIndex]) {
          matchCount++;
          queryIndex++;
        }
      }
      if (matchCount > 0) {
        score = (matchCount / queryLength) * 50;
      }
    }

    return { skill, score };
  });

  // Sort by score and return top 10
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.skill);
};

export const searchSkills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({
        success: true,
        skills: []
      });
      return;
    }

    const query = q.trim();
    const skills = loadSkills();

    if (skills.length === 0) {
      res.json({
        success: true,
        skills: []
      });
      return;
    }

    // Use index-based search for better performance
    const index = buildSkillsIndex();
    const queryLower = query.toLowerCase();
    const prefix = queryLower.substring(0, 2);

    let candidateSkills: Skill[] = [];
    if (index.has(prefix)) {
      candidateSkills = index.get(prefix)!;
    } else {
      // Fallback to all skills if prefix not found
      candidateSkills = skills;
    }

    // Apply fuzzy matching
    const matchedSkills = fuzzyMatch(query, candidateSkills);

    res.json({
      success: true,
      skills: matchedSkills.map((skill) => ({
        name: skill.name,
        category: skill.category || 'General'
      }))
    });
  } catch (error) {
    console.error('Error searching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search skills'
    });
  }
};

export const getAllSkills = async (req: Request, res: Response): Promise<void> => {
  try {
    // Debug: Test file path
    const skillsPath = path.join(__dirname, '../../../ai-service/unified_skills.json');
    const fileExists = fs.existsSync(skillsPath);
    
    if (!fileExists) {
      console.error('Skills file not found at:', skillsPath);
      res.status(500).json({
        success: false,
        error: 'Skills file not found',
        path: skillsPath
      });
      return;
    }

    const skills = loadSkills();
    console.log('Skills loaded count:', skills.length);
    
    res.json({
      success: true,
      skills: skills.map((skill) => ({
        name: skill.name,
        category: skill.category || 'General'
      }))
    });
  } catch (error) {
    console.error('Error getting all skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get skills'
    });
  }
};
