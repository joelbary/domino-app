// Phone numbers are stored as digits only. US numbers drop a leading "1".
export function normalizePhone(input: string | number | null | undefined): string {
  let d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

export function isValidPhone(digits: string): boolean {
  return digits.length >= 7 && digits.length <= 15;
}

export function formatPhone(digits: string): string {
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits ? `+${digits}` : "";
}
