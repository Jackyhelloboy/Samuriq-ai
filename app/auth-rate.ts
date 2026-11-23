import { headers } from "next/headers";
import { getDb } from "../db";
import { authLimits } from "../db/schema";
import { sql } from "drizzle-orm";
export class AuthRateLimitError extends Error {constructor(){super("Too many sign-in attempts. Please wait 15 minutes before trying again.");}}
export async function authLimit(email: string) {
  const h = await headers(),
    ip = h.get("cf-connecting-ip") || "unknown",
    window = Math.floor(Date.now() / 900000),
    key = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(ip + "|" + email + "|" + window),
        ),
      ),
      (v) => v.toString(16).padStart(2, "0"),
    ).join("");
  const db=getDb();
  for(const [label,value,maximum] of [['pair',key,12],['ip',ip,60],['email',email.toLowerCase().slice(0,254),30]] as const){
    const bucket=label+':'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(label+'|'+value+'|'+window))),v=>v.toString(16).padStart(2,'0')).join('');
    const rows=await db.insert(authLimits).values({key:bucket,attempts:1,expires:(window+1)*900000}).onConflictDoUpdate({target:authLimits.key,set:{attempts:sql`${authLimits.attempts}+1`}}).returning();
    if(rows[0].attempts>maximum)throw new AuthRateLimitError();
  }
  await db.run(sql`DELETE FROM auth_limits WHERE key IN (SELECT key FROM auth_limits WHERE expires < ${Date.now()} LIMIT 50)`);
}
export function safeReturn(v: unknown) {
  const raw = String(v || "/workspace");
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/workspace";
  try {
    const u = new URL(raw, "https://samuriq.local");
    if (
      u.origin !== "https://samuriq.local" ||
      ["/login", "/signout"].includes(u.pathname)
    )
      return "/workspace";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/workspace";
  }
}
