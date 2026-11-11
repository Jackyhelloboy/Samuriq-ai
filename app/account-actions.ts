"use server";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { accounts,participants } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, randomHex, startSession } from "./account";
import { bot } from "./telegram-bot";
import { authLimit, safeReturn as safe } from "./auth-rate";
const back = (to: string, err: string) =>
  redirect("/login?error=" + err + "&return_to=" + encodeURIComponent(to));
export async function createAccount(form: FormData) {
  const to = safe(form.get("return_to")),
    email = String(form.get("email") || "")
      .trim()
      .toLowerCase(),
    name = String(form.get("name") || "")
      .trim()
      .slice(0, 100),
    pw = String(form.get("password") || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name)
    return back(to, "details");
  await authLimit(email);
  if (pw.length < 8 || pw.length > 128) return back(to, "short");
  const admin = bot().ADMIN_EMAIL?.toLowerCase();
  if (admin && email === admin) return back(to, "admin");
  const db = getDb();
  if (await db.select().from(accounts).where(eq(accounts.email, email)).get())
    return back(to, "exists");
  const id = "pw_" + crypto.randomUUID(),
    salt = randomHex(16);
  await db
    .insert(accounts)
    .values({
      id,
      email,
      name,
      salt,
      hash: await hashPassword(pw, salt),
      created: new Date().toISOString(),
    });
  await startSession(id);
  redirect(to);
}
export async function loginAccount(form: FormData) {
  const to = safe(form.get("return_to")),
    email = String(form.get("email") || "")
      .trim()
      .toLowerCase(),
    pw = String(form.get("password") || "");
  await authLimit(email);
  if (pw.length > 128) return back(to, "login");
  const a = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .get();
  const h = await hashPassword(pw, a?.salt || "00");
  if (!a || h !== a.hash) return back(to, "login");
  const p=await getDb().select().from(participants).where(eq(participants.id,a.id)).get();
  if(p?.suspended)return back(to,"restricted");
  await startSession(a.id);
  redirect(to);
}
