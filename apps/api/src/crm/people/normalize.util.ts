export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  // Strip whitespace, dashes, parens, dots; keep + and digits.
  const cleaned = input.replace(/[\s\-().]/g, '');
  return cleaned.length === 0 ? null : cleaned;
}

export interface NameInput {
  isCompany?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
}

export function computeFullName(input: NameInput): string {
  if (input.isCompany && input.companyName) return input.companyName.trim();
  const parts = [input.firstName, input.lastName].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(' ').trim();
  if (input.companyName) return input.companyName.trim();
  if (input.email) return input.email.trim();
  return '(no name)';
}
