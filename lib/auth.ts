import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Signed cookies: "<base64 payload>.<hmac>". The secret lives in Render env (SESSION_SECRET).
function secret(): string {
  return process.env.SESSION_SECRET || "dev-only-secret-change-me";
}

function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify<T extends { exp: number }>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const ADMIN_COOKIE = "dt_admin";
const MPL_COOKIE = "dt_mpl";
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

type AdminSession = { role: "owner"; exp: number };

export async function getAdmin(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verify<AdminSession>(jar.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdmin();
  if (!s) redirect("/admin/login");
  return s;
}

export async function startAdminSession() {
  const jar = await cookies();
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days
  jar.set(ADMIN_COOKIE, sign({ role: "owner", exp }), { ...cookieOpts, maxAge: 60 * 60 * 24 * 14 });
}

export async function endAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(MPL_COOKIE);
}

// MPL unlock lasts 20 minutes.
export async function isMplUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return !!verify<{ mpl: true; exp: number }>(jar.get(MPL_COOKIE)?.value);
}

export async function unlockMpl() {
  const jar = await cookies();
  jar.set(MPL_COOKIE, sign({ mpl: true, exp: Date.now() + 1000 * 60 * 20 }), { ...cookieOpts, maxAge: 60 * 20 });
}

export async function lockMpl() {
  const jar = await cookies();
  jar.delete(MPL_COOKIE);
}

// Simple in-memory lockout for PIN / password guessing (resets on restart).
const attempts = new Map<string, { count: number; until: number }>();
export function isLockedOut(key: string): number {
  const a = attempts.get(key);
  if (a && a.until > Date.now()) return Math.ceil((a.until - Date.now()) / 60000);
  return 0;
}
export function recordFailure(key: string, max = 5, minutes = 15) {
  const a = attempts.get(key) ?? { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= max) {
    a.until = Date.now() + minutes * 60000;
    a.count = 0;
  }
  attempts.set(key, a);
}
export function clearFailures(key: string) {
  attempts.delete(key);
}
