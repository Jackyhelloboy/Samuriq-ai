import { randomHex } from "../account";
import { db, digest } from "../recruitment/data";

export const normalizeEmail = (v: unknown) => String(v || "").trim().toLowerCase();
export function acceptedEmail(email: string) {
  return email.length <= 254 && /^[a-z0-9._%+-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+com$/.test(email);
}
export async function issueCode(email: string) {
  const code = randomHex(6).toUpperCase();
  const result = await db().prepare("UPDATE email_challenges SET digest=?,expires=? WHERE email=? AND requested>?")
    .bind(await digest(email+"|"+code), Date.now()+30*60000, email, Date.now()-86400000).run();
  if (!result.meta.changes) throw Error("Ask the contributor to request a fresh code.");
  return code;
}
export async function consumeCode(email: string, value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(code)) return false;
  const proof = await db().prepare("DELETE FROM email_challenges WHERE email=? AND digest=? AND expires>? RETURNING email")
    .bind(email, await digest(email+"|"+code), Date.now()).first();
  return !!proof;
}
export async function markVerified(email: string) {
  await db().prepare("INSERT OR REPLACE INTO verified_mailboxes VALUES(?,?)").bind(email,Date.now()).run();
}
