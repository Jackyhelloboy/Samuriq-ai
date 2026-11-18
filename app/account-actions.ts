"use server";
import {acceptedEmail} from "./verify-email/verification";
import {db as directory,digest} from "./recruitment/data";
import {readSignupDetails} from "./signup-details";
import {workspaceHome} from "./workspace-context";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { accounts,participants,reviewAccountExpiry } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, randomHex, startSession } from "./account";
import { bot } from "./telegram-bot";
import { AuthRateLimitError,authLimit, safeReturn as safe } from "./auth-rate";
const back = (to: string, err: string) =>
  redirect("/login?error=" + err + "&return_to=" + encodeURIComponent(to));
export async function submitSignup(form: FormData) {
  const to = safe(form.get("return_to")),
    email = String(form.get("email") || "")
      .trim()
      .toLowerCase(),
    name = String(form.get("name") || "")
      .trim()
      .slice(0, 100),
    pw = String(form.get("password") || "");
  if (!acceptedEmail(email) || !name) return "details";
  try{await authLimit(email)}catch(e){if(e instanceof AuthRateLimitError)return "rate";throw e;}
  if (pw.length < 8 || pw.length > 128) return "short";
  const admin = bot().ADMIN_EMAIL?.toLowerCase();
  if (admin && email === admin) return "admin";
  const db = getDb();
  if (await db.select().from(accounts).where(eq(accounts.email, email)).get())
    return "exists";
  const details = readSignupDetails(form);
  if (!details) return "profile";
  const code=String(form.get("code")||"").trim().toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(code)) return "verification";
  const id="pw_"+crypto.randomUUID(), salt=randomHex(16), now=Date.now();
  const sql=directory(), proof=await digest(email+"|"+code);
  const {age,address,city,phone,device,mobile_os,os_version}=details;
  let created;
  try {
    [created]=await sql.batch([
      sql.prepare("INSERT INTO accounts(id,email,name,salt,hash,created) SELECT ?,?,?,?,?,? FROM email_challenges WHERE email=? AND digest=? AND expires>?")
        .bind(id,email,name,salt,await hashPassword(pw,salt),new Date(now).toISOString(),email,proof,now),
      sql.prepare("INSERT INTO signup_details SELECT id,?,?,?,?,?,?,? FROM accounts WHERE id=?")
        .bind(age,address,city,phone,device,mobile_os,os_version,id),
      sql.prepare("INSERT OR REPLACE INTO verified_mailboxes SELECT email,? FROM accounts WHERE id=?").bind(now,id),
      sql.prepare("DELETE FROM email_challenges WHERE email=? AND digest=? AND EXISTS(SELECT 1 FROM accounts WHERE id=?)").bind(email,proof,id)
    ]);
  } catch(error) {
    if (/account_email_in_use|UNIQUE constraint failed: accounts.email/i.test(String(error))) return "exists";
    throw error;
  }
  if (!created.meta.changes) return "verification";
  await startSession(id);
  return to;
}
export async function createAccount(form:FormData) {
  const error=await submitSignup(form);
  if(error.startsWith("/")) redirect(error);
  redirect("/login?error="+error+"&return_to="+encodeURIComponent(safe(form.get("return_to")))+"#create-account");
}
export async function loginAccount(form: FormData) {
  const to = safe(form.get("return_to")),
    email = String(form.get("email") || "")
      .trim()
      .toLowerCase(),
    pw = String(form.get("password") || "");
  if(email.length>254)return back(to,"details");
  try{await authLimit(email)}catch(e){if(e instanceof AuthRateLimitError)return back(to,"rate");throw e;}
  if (pw.length > 128) return back(to, "login");
  const a = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .get();
  const h = await hashPassword(pw, a?.salt || "00");
  if (!a || h !== a.hash) return back(to, "login");
  const review=await getDb().select().from(reviewAccountExpiry).where(eq(reviewAccountExpiry.userId,a.id)).get();
  if(review&&review.expires<Date.now())return back(to,"expired");
  const p=await getDb().select().from(participants).where(eq(participants.id,a.id)).get();
  if(p?.suspended)return back(to,"restricted");
  await startSession(a.id);
  redirect(String(form.get("return_to")||"").trim()?to:await workspaceHome());
}
