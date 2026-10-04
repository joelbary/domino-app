import { parsePhoneNumberFromString } from "libphonenumber-js";

// Phones are stored in international format (E.164), e.g. +13055550142 or +584141234567.
// Rules for what people type:
//   "+58 414…" or "0058 414…"     → international, used as is
//   10 digits, or 11 starting with 1 → US/Canada (+1)
//   11–15 digits not starting with 0 → already has a country code (Excel often drops the "+")
//   anything else (e.g. "0414…" with no country code) → rejected: ask for the country code
export function normalizePhone(input: string | number | null | undefined): string {
  let s = String(input ?? "").trim();
  if (!s) return "";
  if (s.startsWith("00")) s = "+" + s.slice(2);
  let candidate: string;
  if (s.startsWith("+")) {
    candidate = "+" + s.replace(/\D/g, "");
  } else {
    const d = s.replace(/\D/g, "");
    if (d.length === 10 || (d.length === 11 && d.startsWith("1"))) candidate = "+1" + d.slice(-10);
    else if (d.length >= 11 && d.length <= 15 && !d.startsWith("0")) candidate = "+" + d;
    else return "";
  }
  const p = parsePhoneNumberFromString(candidate);
  return p && p.isPossible() ? p.number : "";
}

export function isValidPhone(e164: string): boolean {
  return e164.startsWith("+") && e164.length >= 8;
}

// (305) 555-0142 for US/Canada, +58 414 1234567 for everyone else.
export function formatPhone(e164: string): string {
  const p = parsePhoneNumberFromString(e164);
  if (!p) return e164;
  return p.countryCallingCode === "1" ? p.formatNational() : p.formatInternational();
}

// Digits for WhatsApp links (wa.me/<digits>).
export function whatsappDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
