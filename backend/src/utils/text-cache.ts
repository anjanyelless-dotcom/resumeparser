import crypto from "crypto";

/**
 * In-memory cache for extracted resume text keyed by file content SHA-256.
 * Prevents re-reading / re-extracting the same file multiple times across
 * preview-sections and parse-sections calls.
 */
interface CacheEntry {
  text: string;
  sections: Record<string, string>;
  createdAt: number;
}

const MAX_ENTRIES = 500;
const TTL_MS = 1000 * 60 * 30; // 30 minutes

const textCache = new Map<string, CacheEntry>();

export function getFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function getCacheKey(fileHash: string, forceOcr: boolean): string {
  return `${fileHash}:${forceOcr ? "ocr" : "noocr"}`;
}

export function getCachedText(fileHash: string, forceOcr: boolean): CacheEntry | undefined {
  const key = getCacheKey(fileHash, forceOcr);
  const entry = textCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > TTL_MS) {
    textCache.delete(key);
    return undefined;
  }
  return entry;
}

export function setCachedText(
  fileHash: string,
  forceOcr: boolean,
  text: string,
  sections: Record<string, string> = {}
): void {
  // Evict oldest entries if cache is full
  if (textCache.size >= MAX_ENTRIES) {
    const oldestKey = textCache.keys().next().value;
    if (oldestKey) textCache.delete(oldestKey);
  }
  const key = getCacheKey(fileHash, forceOcr);
  textCache.set(key, { text, sections, createdAt: Date.now() });
}

export function clearTextCache(): void {
  textCache.clear();
}
