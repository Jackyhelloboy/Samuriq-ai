import { cookies } from "next/headers";
import { getDb } from "../db";
import { accounts, sessions, reviewAccountExpiry } from "../db/schema";
import { eq } from "drizzle-orm";
export const COOKIE = "sq_session";
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b as ArrayBuffer), (x) => x.toString(16).padStart(2, "0")).join("");
export async function hashPassword(pw: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
export const randomHex = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export async function startSession(accountId: string) {
  (await cookies()).delete("sq_workspace");
  (await cookies()).delete("sq_auth_signed_out");
  const token = randomHex(32), maxAge = 60 * 60 * 24 * 30;
  await getDb().insert(sessions).values({ tokenHash: await sha(token), accountId, expires: Date.now() + maxAge * 1000 });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
}
export async function endSession() {
  const jar = await cookies(), t = jar.get(COOKIE)?.value;
  if (t) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha(t)));
  jar.delete(COOKIE);
  jar.delete("sq_workspace");
  jar.set("sq_auth_signed_out","1",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:60*60*24*30});
}
export async function sessionUser() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const db = getDb(), s = await db.select().from(sessions).where(eq(sessions.tokenHash, await sha(t))).get();
  if (!s || s.expires < Date.now()) return null;
  const a = await db.select().from(accounts).where(eq(accounts.id, s.accountId)).get();
  if(a){const review=await db.select().from(reviewAccountExpiry).where(eq(reviewAccountExpiry.userId,a.id)).get();if(review&&review.expires<Date.now())return null;}
  return a ? { userId: a.id, email: a.email, displayName: a.name || a.email, fullName: a.name } : null;
}

