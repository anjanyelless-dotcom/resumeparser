/**
 * External Search Service
 *
 * IMPORTANT SECURITY & COMPLIANCE NOTES:
 *
 * 1. This service ONLY uses official APIs:
 *    - Google Custom Search API (for LinkedIn X-Ray search)
 *    - GitHub REST API (for GitHub user search)
 *
 * 2. This service NEVER:
 *    - Scrapes LinkedIn pages directly
 *    - Scrapes GitHub pages directly
 *    - Stores scraped HTML content
 *    - Bypasses API rate limits or terms of service
 *
 * 3. API Keys:
 *    - GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID are read from environment variables
 *    - GITHUB_TOKEN is read from environment variables
 *    - These keys are NEVER committed to the repository
 *    - The .env file is gitignored
 *
 * 4. Data Handling:
 *    - Only returns metadata provided by the APIs (name, profile_url, snippet)
 *    - The frontend displays links for recruiters to click (we don't fetch the pages)
 *    - No personal data is scraped beyond what the APIs provide
 *
 * 5. Caching:
 *    - Results are cached in-memory with 1-hour TTL
 *    - This helps conserve API quota (Google CSE free tier: 100 queries/day)
 *
 * INTEGRATION:
 * - LinkedIn (via Google Custom Search X-Ray)
 * - GitHub (via GitHub REST API)
 */

import crypto from "crypto";

export interface ExternalCandidate {
  name: string;
  profile_url: string;
  snippet?: string;
  source: "linkedin_google" | "github";
  avatar_url?: string;
  location?: string;
}

interface SearchQuery {
  role?: string;
  skills?: string[];
  locations?: string[];
}

interface CacheEntry {
  data: ExternalCandidate[];
  timestamp: number;
}

// In-memory cache with TTL
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const externalSearchCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from search query
 */
function generateCacheKey(source: "linkedin" | "github", query: SearchQuery): string {
  const keyData = {
    source,
    role: query.role || "",
    skills: query.skills?.sort().join(",") || "",
    locations: query.locations?.sort().join(",") || "",
  };
  return crypto
    .createHash("md5")
    .update(JSON.stringify(keyData))
    .digest("hex");
}

/**
 * Get cached result if available and not expired
 */
function getCachedResult(cacheKey: string): ExternalCandidate[] | null {
  const entry = externalSearchCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    externalSearchCache.delete(cacheKey);
    return null;
  }

  console.log(`✅ Cache HIT for ${cacheKey}`);
  return entry.data;
}

/**
 * Set cached result
 */
function setCachedResult(cacheKey: string, data: ExternalCandidate[]): void {
  externalSearchCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  console.log(`💾 Cache SET for ${cacheKey}`);
}

/**
 * Clean up expired cache entries (run periodically)
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of externalSearchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      externalSearchCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
  }
}

/**
 * Search LinkedIn profiles using Google Custom Search X-Ray
 *
 * Builds a query like: site:linkedin.com/in "Frontend Developer" React TypeScript Hyderabad
 * and queries Google Custom Search API.
 *
 * @param query - Search parameters
 * @returns Array of external candidates from LinkedIn
 */
export async function searchGoogleXRay(
  query: SearchQuery
): Promise<ExternalCandidate[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.warn("⚠️  Google CSE API key or CSE ID not configured. Skipping LinkedIn search.");
    return [];
  }

  // Check cache first
  const cacheKey = generateCacheKey("linkedin", query);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`❌ Cache MISS for ${cacheKey}`);

  try {
    // Build X-Ray query
    const queryParts = ['site:linkedin.com/in'];

    // Add role in quotes for exact match
    if (query.role) {
      queryParts.push(`"${query.role}"`);
    }

    // Add skills
    if (query.skills && query.skills.length > 0) {
      queryParts.push(...query.skills);
    }

    // Add location
    if (query.locations && query.locations.length > 0) {
      queryParts.push(...query.locations);
    }

    const searchQuery = queryParts.join(" ");

    // Call Google Custom Search API
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(searchQuery)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️  Google CSE API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json() as any;

    // Parse results
    const candidates: ExternalCandidate[] = [];

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items as any[]) {
        // Extract name from title (LinkedIn profiles usually have format "Name - Title | LinkedIn")
        const titleMatch = item.title.match(/^([^-]+)/);
        const name = titleMatch ? titleMatch[1].trim() : item.title;

        candidates.push({
          name,
          profile_url: item.link,
          snippet: item.snippet,
          source: "linkedin_google",
        });
      }
    }

    console.log(`✅ Google X-Ray search found ${candidates.length} LinkedIn profiles`);

    // Cache the results
    setCachedResult(cacheKey, candidates);

    return candidates;
  } catch (error) {
    console.error("❌ Error in Google X-Ray search:", error);
    return [];
  }
}

/**
 * Search GitHub for candidates using GitHub REST API
 *
 * Builds a query using GitHub search syntax:
 * - language: for skills that map to programming languages
 * - location: for location filtering
 * - topic: for skills that map to GitHub topics
 *
 * @param query - Search parameters
 * @returns Array of external candidates from GitHub
 */
export async function searchGitHub(
  query: SearchQuery
): Promise<ExternalCandidate[]> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn("⚠️  GitHub token not configured. Skipping GitHub search.");
    return [];
  }

  // Check cache first
  const cacheKey = generateCacheKey("github", query);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`❌ Cache MISS for ${cacheKey}`);

  try {
    // Build GitHub search query
    const queryParts: string[] = [];

    // Add location filter
    if (query.locations && query.locations.length > 0) {
      queryParts.push(`location:${query.locations[0]}`); // GitHub search only supports one location
    }

    // Map skills to GitHub languages/topics
    if (query.skills && query.skills.length > 0) {
      const skills = query.skills.slice(0, 5); // Limit to 5 skills to avoid query length issues
      queryParts.push(skills.join(" OR "));
    }

    // Add role as a general search term
    if (query.role) {
      queryParts.push(`"${query.role}"`);
    }

    const searchQuery = queryParts.join(" ");

    // Call GitHub Search API (search users)
    const apiUrl = `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&per_page=10`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️  GitHub API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json() as any;

    // Parse results
    const candidates: ExternalCandidate[] = [];

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items as any[]) {
        // Fetch user details to get bio and location
        try {
          const userResponse = await fetch(item.url, {
            method: "GET",
            headers: {
              "Authorization": `token ${token}`,
              "Accept": "application/vnd.github.v3+json",
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json() as any;

            candidates.push({
              name: userData.name || userData.login,
              profile_url: item.html_url,
              snippet: userData.bio || undefined,
              source: "github",
              avatar_url: userData.avatar_url,
              location: userData.location || undefined,
            });
          }
        } catch (error) {
          // If we can't fetch user details, still add basic info
          candidates.push({
            name: item.login,
            profile_url: item.html_url,
            source: "github",
            avatar_url: item.avatar_url,
          });
        }
      }
    }

    console.log(`✅ GitHub search found ${candidates.length} users`);

    // Cache the results
    setCachedResult(cacheKey, candidates);

    return candidates;
  } catch (error) {
    console.error("❌ Error in GitHub search:", error);
    return [];
  }
}

/**
 * Search all external sources
 *
 * Combines results from both LinkedIn (Google X-Ray) and GitHub searches.
 *
 * @param query - Search parameters
 * @returns Array of external candidates from all sources
 */
export async function searchAllExternalSources(
  query: SearchQuery
): Promise<ExternalCandidate[]> {
  const [linkedinResults, githubResults] = await Promise.all([
    searchGoogleXRay(query),
    searchGitHub(query),
  ]);

  return [...linkedinResults, ...githubResults];
}