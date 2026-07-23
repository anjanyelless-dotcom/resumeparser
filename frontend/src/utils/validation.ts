export const validateEmail = (val: string): string | undefined => {
  const trimmed = val.trim();

  if (trimmed.length === 0) return "Email is required.";
  if (trimmed.length > 254) return "Email cannot exceed 254 characters.";
  if (/\s/.test(val)) return "Email cannot contain spaces.";

  const parts = trimmed.split("@");
  if (parts.length !== 2) return "Email must contain exactly one '@' symbol.";

  const [local, domain] = parts;
  if (!local || !domain) return "Invalid email format.";

  if (local.length > 64) return "Local part cannot exceed 64 characters.";

  if (!/^[a-zA-Z0-9._\-+]+$/.test(local)) return "Local part contains invalid characters.";
  if (local.startsWith(".") || local.endsWith(".")) return "Local part cannot start or end with a dot.";
  if (local.includes("..")) return "Local part cannot contain consecutive dots.";

  if (!/^[a-zA-Z0-9.\-]+$/.test(domain)) return "Domain contains invalid characters.";
  if (domain.startsWith(".") || domain.startsWith("-")) return "Domain cannot start with a dot or hyphen.";
  if (domain.endsWith(".") || domain.endsWith("-")) return "Domain cannot end with a dot or hyphen.";
  if (domain.includes("..")) return "Domain cannot contain consecutive dots.";
  if (!domain.includes(".")) return "Domain must contain at least one dot.";

  const domainLabels = domain.split(".");
  for (const label of domainLabels) {
    if (label.startsWith("-") || label.endsWith("-")) {
      return "Domain labels cannot start or end with a hyphen.";
    }
  }

  const tld = domainLabels[domainLabels.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return "Top-level domain must contain at least 2 alphabetic characters.";

  return undefined;
};
