/**
 * Duplicate Detection Service
 *
 * Checks for existing candidates BEFORE inserting a new one.
 * Uses three checks (in priority order):
 *   1. Normalized email match (case-insensitive, trimmed)
 *   2. Normalized phone match (digits only)
 *   3. Name + email OR name + phone combined match
 *
 * Returns a DuplicateCheckResult describing the first duplicate found,
 * or null if no duplicate exists.
 *
 * Always scoped to the same tenant_id to allow multi-tenant setups.
 */

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  field: "email" | "phone" | "name+email" | "name+phone" | "linkedin_url" | "resume_hash" | "name";
  message: string;
  existingCandidateId: string;
  existingCandidateName: string | null;
  warning?: string;
}

/**
 * Normalize an email address for comparison:
 *   - Trim whitespace
 *   - Lowercase
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize a phone number for comparison:
 *   - Extract digits only (strips +, spaces, dashes, parens, etc.)
 *   - Take last 10 digits for comparison (handles country code variations)
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Use last 10 digits to normalize country codes (e.g., +91 9876543210 → 9876543210)
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Normalize a full name for comparison:
 *   - Trim whitespace
 *   - Lowercase
 *   - Collapse multiple spaces
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Check for duplicate candidate before insertion.
 *
 * @param client   - Active PG client (transaction or pool client)
 * @param params   - { email?, phone?, full_name?, tenant_id? }
 * @returns DuplicateCheckResult if a duplicate is found, otherwise null
 */
export async function checkDuplicateBeforeInsert(
  client: any,
  params: {
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
    linkedin_url?: string | null;
    resume_hash?: string | null;
    tenant_id?: string | null;
  }
): Promise<DuplicateCheckResult | null> {
  const { email, phone, full_name, linkedin_url, resume_hash } = params;

  // ── 1. Email check ────────────────────────────────────────────────────────
  if (email && email.trim()) {
    const normalizedEmail = normalizeEmail(email);
    const emailResult = await client.query(
      `SELECT id, full_name FROM candidates
       WHERE LOWER(TRIM(email)) = $1
         AND status != 'deleted'
       LIMIT 1`,
      [normalizedEmail]
    );

    if (emailResult.rows.length > 0) {
      const existing = emailResult.rows[0];
      return {
        isDuplicate: true,
        field: "email",
        message: `A candidate with this email already exists (${normalizedEmail})`,
        existingCandidateId: existing.id,
        existingCandidateName: existing.full_name || null,
      };
    }
  }

  // ── 2. Phone check ────────────────────────────────────────────────────────
  if (phone && phone.trim()) {
    const normalizedPhone = normalizePhone(phone);

    // Only check if we have at least 7 digits (meaningful phone number)
    if (normalizedPhone.length >= 7) {
      // Use RIGHT() to compare last N digits across different country code formats
      const phoneResult = await client.query(
        `SELECT id, full_name, phone FROM candidates
         WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE $1
           AND status != 'deleted'
         LIMIT 1`,
        [`%${normalizedPhone}`]
      );

      if (phoneResult.rows.length > 0) {
        const existing = phoneResult.rows[0];
        // Double-check by normalizing existing phone
        const existingNorm = normalizePhone(existing.phone || "");
        if (
          existingNorm.length >= 7 &&
          (existingNorm === normalizedPhone ||
            existingNorm.endsWith(normalizedPhone) ||
            normalizedPhone.endsWith(existingNorm))
        ) {
          return {
            isDuplicate: true,
            field: "phone",
            message: `A candidate with this phone number already exists (${phone.trim()})`,
            existingCandidateId: existing.id,
            existingCandidateName: existing.full_name || null,
          };
        }
      }
    }
  }

  // ── 3. LinkedIn check ─────────────────────────────────────────────────────
  if (linkedin_url && linkedin_url.trim()) {
    const normalizedLinkedin = linkedin_url.trim().toLowerCase().replace(/\/$/, ""); // remove trailing slash
    const linkedinResult = await client.query(
      `SELECT id, full_name FROM candidates
       WHERE LOWER(TRIM(TRIM(TRAILING '/' FROM linkedin_url))) = $1
         AND status != 'deleted'
       LIMIT 1`,
      [normalizedLinkedin]
    );

    if (linkedinResult.rows.length > 0) {
      const existing = linkedinResult.rows[0];
      return {
        isDuplicate: true,
        field: "linkedin_url",
        message: `A candidate with this LinkedIn profile already exists`,
        existingCandidateId: existing.id,
        existingCandidateName: existing.full_name || null,
      };
    }
  }

  // ── 4. Resume hash check ──────────────────────────────────────────────────
  if (resume_hash && resume_hash.trim()) {
    const hashResult = await client.query(
      `SELECT id, full_name FROM candidates
       WHERE resume_hash = $1
         AND status != 'deleted'
       LIMIT 1`,
      [resume_hash.trim()]
    );

    if (hashResult.rows.length > 0) {
      const existing = hashResult.rows[0];
      return {
        isDuplicate: true,
        field: "resume_hash",
        message: `A candidate with the exact same resume file already exists`,
        existingCandidateId: existing.id,
        existingCandidateName: existing.full_name || null,
      };
    }
  }

  // ── 5. Name + Email/Phone/None combined check ────────────────────────────
  if (full_name && full_name.trim()) {
    const normalizedName = normalizeName(full_name);

    if (phone && phone.trim()) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone.length >= 7) {
        const namePhoneResult = await client.query(
          `SELECT id, full_name FROM candidates
           WHERE LOWER(TRIM(full_name)) = $1
             AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE $2
             AND status != 'deleted'
           LIMIT 1`,
          [normalizedName, `%${normalizedPhone}`]
        );

        if (namePhoneResult.rows.length > 0) {
          const existing = namePhoneResult.rows[0];
          return {
            isDuplicate: true,
            field: "name+phone",
            message: `A candidate named "${existing.full_name || full_name}" with this phone number already exists`,
            existingCandidateId: existing.id,
            existingCandidateName: existing.full_name || null,
          };
        }
      }
    }

    if (email && email.trim()) {
      const normalizedEmail = normalizeEmail(email);
      const nameEmailResult = await client.query(
        `SELECT id, full_name FROM candidates
         WHERE LOWER(TRIM(full_name)) = $1
           AND LOWER(TRIM(email)) = $2
           AND status != 'deleted'
           LIMIT 1`,
        [normalizedName, normalizedEmail]
      );

      if (nameEmailResult.rows.length > 0) {
        const existing = nameEmailResult.rows[0];
        return {
          isDuplicate: true,
          field: "name+email",
          message: `A candidate named "${existing.full_name || full_name}" with this email already exists`,
          existingCandidateId: existing.id,
          existingCandidateName: existing.full_name || null,
        };
      }
    }

    // ── 6. Only Name check (Warning only) ──────────────────────────────────
    const nameOnlyResult = await client.query(
      `SELECT id, full_name FROM candidates
       WHERE LOWER(TRIM(full_name)) = $1
         AND status != 'deleted'
       LIMIT 1`,
      [normalizedName]
    );

    if (nameOnlyResult.rows.length > 0) {
      const existing = nameOnlyResult.rows[0];
      return {
        isDuplicate: false, // NOT blocking creation
        field: "name",
        message: `Possible duplicate`,
        warning: `A candidate named "${existing.full_name || full_name}" already exists`,
        existingCandidateId: existing.id,
        existingCandidateName: existing.full_name || null,
      };
    }
  }

  return null; // No duplicate found
}
