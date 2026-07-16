import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getClient } from '../database/db';

interface Role {
  title: string;
  canonicalTitle: string;
  seniority: string;
  domain: string;
  aliases: string;
}

// Load and parse unified_roles.csv
let rolesCache: Role[] | null = null;
let rolesIndex: Map<string, Role[]> | null = null;

const loadRoles = async (): Promise<Role[]> => {
  if (rolesCache) return rolesCache;

  const allRoles: Role[] = [];

  // Load from CSV file
  try {
    const rolesPath = path.join(__dirname, '../../../ai-service/unified_roles.csv');
    const rolesData = fs.readFileSync(rolesPath, 'utf-8');
    const lines = rolesData.split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 1 && parts[0]) {
        const roleTitle = parts[0].trim();
        const canonicalTitle = parts[1]?.trim() || roleTitle;
        const seniority = parts[2]?.trim() || '';
        const domain = parts[3]?.trim() || '';
        const aliases = parts[4]?.trim() || '';
        
        if (roleTitle) {
          allRoles.push({
            title: roleTitle,
            canonicalTitle,
            seniority,
            domain,
            aliases
          });
        }
      }
    }
    console.log(`Loaded ${allRoles.length} roles from CSV file`);
  } catch (error) {
    console.error('Error loading roles from unified_roles.csv:', error);
  }

  // Load additional roles from database work_history
  try {
    const client = await getClient();
    const workHistoryResult = await client.query(
      "SELECT DISTINCT job_title FROM work_history WHERE job_title IS NOT NULL AND job_title != '' ORDER BY job_title"
    );
    
    workHistoryResult.rows.forEach((row: any) => {
      const title = row.job_title.trim();
      if (title && !allRoles.find(r => r.title.toLowerCase() === title.toLowerCase())) {
        allRoles.push({
          title,
          canonicalTitle: title,
          seniority: '',
          domain: '',
          aliases: ''
        });
      }
    });
    console.log(`Added ${workHistoryResult.rows.length} unique roles from work_history`);
    client.release();
  } catch (error) {
    console.error('Error loading roles from work_history:', error);
  }

  // Load additional roles from database job_descriptions
  try {
    const client = await getClient();
    const jobDescriptionsResult = await client.query(
      "SELECT DISTINCT title FROM job_descriptions WHERE title IS NOT NULL AND title != '' ORDER BY title"
    );
    
    jobDescriptionsResult.rows.forEach((row: any) => {
      const title = row.title.trim();
      if (title && !allRoles.find(r => r.title.toLowerCase() === title.toLowerCase())) {
        allRoles.push({
          title,
          canonicalTitle: title,
          seniority: '',
          domain: '',
          aliases: ''
        });
      }
    });
    console.log(`Added ${jobDescriptionsResult.rows.length} unique roles from job_descriptions`);
    client.release();
  } catch (error) {
    console.error('Error loading roles from job_descriptions:', error);
  }

  rolesCache = allRoles;
  return allRoles;
};

const buildRolesIndex = async (): Promise<Map<string, Role[]>> => {
  if (rolesIndex) return rolesIndex;

  const roles = await loadRoles();
  const index = new Map<string, Role[]>();

  roles.forEach((role) => {
    const titleLower = role.title.toLowerCase();
    const prefix = titleLower.substring(0, 2);
    
    if (!index.has(prefix)) {
      index.set(prefix, []);
    }
    index.get(prefix)!.push(role);
  });

  rolesIndex = index;
  return index;
};

// Enhanced fuzzy matching for roles
const fuzzyMatch = (query: string, roles: Role[]): Role[] => {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  const scored = roles.map((role) => {
    const titleLower = role.title.toLowerCase();
    const canonicalLower = role.canonicalTitle.toLowerCase();
    const titleWords = titleLower.split(/\s+/);
    const canonicalWords = canonicalLower.split(/\s+/);
    
    let score = 0;
    
    // Exact match in title
    if (titleLower === queryLower) score += 100;
    else if (titleLower.startsWith(queryLower)) score += 80;
    else if (titleLower.includes(queryLower)) score += 60;
    
    // Exact match in canonical title
    if (canonicalLower === queryLower) score += 100;
    else if (canonicalLower.startsWith(queryLower)) score += 80;
    else if (canonicalLower.includes(queryLower)) score += 60;
    
    // Partial word matching (for "fullstack" to match "Full Stack Developer")
    if (queryWords.length === 1) {
      const queryWord = queryWords[0];
      titleWords.forEach(titleWord => {
        if (titleWord.includes(queryWord) || queryWord.includes(titleWord)) {
          score += 40;
        }
      });
      canonicalWords.forEach(canonicalWord => {
        if (canonicalWord.includes(queryWord) || queryWord.includes(canonicalWord)) {
          score += 40;
        }
      });
    }
    
    // Multi-word matching
    if (queryWords.length > 1) {
      let matchedWords = 0;
      queryWords.forEach(queryWord => {
        if (titleWords.some(titleWord => 
            titleWord.includes(queryWord) || queryWord.includes(titleWord))) {
          matchedWords++;
        }
      });
      if (matchedWords > 0) {
        score += (matchedWords / queryWords.length) * 50;
      }
    }
    
    // Match in aliases
    if (role.aliases) {
      const aliasesLower = role.aliases.toLowerCase();
      if (aliasesLower.includes(queryLower)) score += 40;
      
      // Check aliases for partial word matching
      if (queryWords.length === 1) {
        const queryWord = queryWords[0];
        const aliasWords = aliasesLower.split(/\s+/);
        aliasWords.forEach(aliasWord => {
          if (aliasWord.includes(queryWord) || queryWord.includes(aliasWord)) {
            score += 20;
          }
        });
      }
    }
    
    return { role, score };
  });

  // Sort by score and return top 10
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.role);
};

export const searchRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    console.log(`🔍 Roles search query received: "${q}"`);

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      console.log(`❌ Invalid query: must be at least 2 characters`);
      res.json({
        success: true,
        roles: []
      });
      return;
    }

    const query = q.trim();
    console.log(`🔍 Processing search query: "${query}"`);
    
    const roles = await loadRoles();
    console.log(`📊 Loaded ${roles.length} total roles`);

    if (roles.length === 0) {
      console.log(`❌ No roles available`);
      res.json({
        success: true,
        roles: []
      });
      return;
    }

    // Use index-based search for better performance
    const index = await buildRolesIndex();
    const queryLower = query.toLowerCase();
    const prefix = queryLower.substring(0, 2);

    let candidateRoles: Role[] = [];
    if (index.has(prefix)) {
      candidateRoles = index.get(prefix)!;
      console.log(`🔍 Using index prefix "${prefix}" with ${candidateRoles.length} candidate roles`);
    } else {
      // Fallback to all roles if prefix not found
      candidateRoles = roles;
      console.log(`🔍 Prefix "${prefix}" not found in index, using all ${roles.length} roles`);
    }

    // Apply fuzzy matching
    const matchedRoles = fuzzyMatch(query, candidateRoles);
    console.log(`✅ Found ${matchedRoles.length} matching roles for query "${query}"`);

    res.json({
      success: true,
      roles: matchedRoles.map((role) => ({
        title: role.title,
        canonicalTitle: role.canonicalTitle,
        seniority: role.seniority,
        domain: role.domain
      }))
    });
  } catch (error) {
    console.error('Error searching roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search roles'
    });
  }
};

export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await loadRoles();
    console.log(`📊 Returning all ${roles.length} roles`);
    
    res.json({
      success: true,
      roles: roles.map((role) => ({
        title: role.title,
        canonicalTitle: role.canonicalTitle,
        seniority: role.seniority,
        domain: role.domain
      }))
    });
  } catch (error) {
    console.error('Error getting all roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get roles'
    });
  }
};
