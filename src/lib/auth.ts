import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSetting, setSetting } from "./settings";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "shoedesk_session";
const SESSION_DAYS = 14;

const envPassword = () => process.env.ADMIN_PASSWORD ?? "";

export function passwordFromEnv(): boolean {
  return envPassword() !== "";
}

async function sessionSecret(): Promise<string> {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  let stored = await getSetting("session_secret");
  if (!stored) {
    stored = randomBytes(32).toString("hex");
    await setSetting("session_secret", stored);
    stored = (await getSetting("session_secret")) ?? stored;
  }
  return stored;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyHash(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = await scrypt(password, Buffer.from(saltHex, "hex"), 32);
  return safeEqual(hash.toString("hex"), hashHex);
}

export async function needsSetup(): Promise<boolean> {
  if (passwordFromEnv()) return false;
  return (await getSetting("password_hash")) === null;
}

export async function checkPassword(password: string): Promise<boolean> {
  if (passwordFromEnv()) return safeEqual(password, envPassword());
  const stored = await getSetting("password_hash");
  return stored ? verifyHash(password, stored) : false;
}

export async function setStoredPassword(password: string): Promise<void> {
  await setSetting("password_hash", await hashPassword(password));
  await setSetting("session_secret", randomBytes(32).toString("hex"));
}

async function sign(exp: number): Promise<string> {
  const mac = createHmac("sha256", await sessionSecret()).update(String(exp)).digest("hex");
  return `${exp}.${mac}`;
}

export async function startSession(): Promise<void> {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const jar = await cookies();
  jar.set(COOKIE, await sign(exp), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expStr] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(value, await sign(exp));
}

export async function requireAdmin(): Promise<void> {
  if (await isAdmin()) return;
  if (await needsSetup()) redirect("/setup");
  redirect("/login");
}

export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not signed in");
}

const attempts = new Map<string, { n: number; first: number }>();

export function loginThrottled(key: string): boolean {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > 15 * 60_000) {
    attempts.delete(key);
    return false;
  }
  return rec.n >= 8;
}

export function recordLoginFailure(key: string): void {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > 15 * 60_000) attempts.set(key, { n: 1, first: Date.now() });
  else rec.n += 1;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
