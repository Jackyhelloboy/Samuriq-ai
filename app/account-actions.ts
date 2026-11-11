"use server";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, randomHex, startSession } from "./account";
import { bot } from "./telegram-bot";
const safe = (v: unknown) => { const s = String(v || "/workspace"); return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/login") ? s : "/workspace"; };
const back = (to: string, err: string) => redirect("/login?error=" + err + "&return_to=" + encodeURIComponent(to));
export async function createAccount(form: FormData) {
  const to = safe(form.get("return_to")), email = String(form.get("email") || "").trim().toLowerCase(), name = String(form.get("name") || "").trim().slice(0, 100), pw = String(form.get("password") || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) return back(to, "details");
  if (pw.length < 8) return back(to, "short");
  const admin = bot().ADMIN_EMAIL?.toLowerCase();
  if (admin && email === admin && String(form.get("setup") || "") !== ((bot() as unknown as Record<string, string>).ADMIN_SETUP_CODE || "\u0000")) return back(to, "admin");
  const db = getDb();
  if (await db.select().from(accounts).where(eq(accounts.email, email)).get()) return back(to, "exists");
  const id = "pw_" + crypto.randomUUID(), salt = randomHex(16);
  await db.insert(accounts).values({ id, email, name, salt, hash: await hashPassword(pw, salt), created: new Date().toISOString() });
  await startSession(id);
  redirect(to);
}
export async function loginAccount(form: FormData) {
  const to = safe(form.get("return_to")), email = String(form.get("email") || "").trim().toLowerCase(), pw = String(form.get("password") || "");
  const a = await getDb().select().from(accounts).where(eq(accounts.email, email)).get();
  const h = await hashPassword(pw, a?.salt || "00");
  if (!a || h !== a.hash) return back(to, "login");
  await startSession(a.id);
  redirect(to);
}
