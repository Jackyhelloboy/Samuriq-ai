"use server";
import { getChatGPTUser } from "./chatgpt-auth";
import { settings } from "./telegram";
import { getDb } from "../db";
import { participants, reports } from "../db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function register(form: FormData) {
  const user = await getChatGPTUser();
  if (!user) redirect("/signin-with-chatgpt?return_to=/workspace");
  const name = String(form.get("name") || "")
      .trim()
      .slice(0, 100),
    telegram = String(form.get("telegram") || "").trim();
  const language = String(form.get("language")),
    project = String(form.get("project"));
  if (
    !name ||
    (telegram !== "" && !/^@?[A-Za-z0-9_]{5,32}$/.test(telegram)) ||
    !language.trim() ||
    language.length > 80 ||
    !["speech", "motion", "annotation", "evaluation", "general"].includes(
      project,
    ) ||
    form.get("consent") !== "yes"
  )
    throw Error("Check the required registration fields.");
  const source = String(form.get("source") || "direct").slice(0, 100);
  const skills = String(form.get("skills") || "").slice(0, 1500),
    location = String(form.get("location") || "").slice(0, 100),
    device = String(form.get("device") || "").slice(0, 100);
  await getDb()
    .insert(participants)
    .values({
      id: user.userId,
      name,
      email: user.email,
      telegram,
      language,
      project,
      source,
      skills,
      location,
      device,
      created: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: participants.id,
      set: { name, telegram, language, project, skills, location, device },
    });
  const next=String(form.get("next")||"");
  redirect(next?"/projects/onboarding?id="+encodeURIComponent(next):"/workspace");
}
export async function report(form: FormData) {
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first.");
  const db = getDb();
  const member = await db
    .select()
    .from(participants)
    .where(eq(participants.id, user.userId))
    .get();
  if (!member?.approved) throw Error("Project approval is required.");
  const status = String(form.get("status")),
    minutes = Number(form.get("minutes"));
  if (
    !["started", "completed", "not-started", "need-help"].includes(status) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 1440
  )
    throw Error("Check status and minutes.");
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const values = {
    userId: user.userId,
    day,
    status,
    minutes,
    notes: String(form.get("notes") || "").slice(0, 1500),
    updated: new Date().toISOString(),
  };
  await db
    .insert(reports)
    .values(values)
    .onConflictDoUpdate({ target: [reports.userId, reports.day], set: values });
  redirect("/workspace?updated=1");
}
export async function review(form: FormData) {
  const user = await getChatGPTUser();
  if (
    !user ||
    user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
  )
    throw Error("Owner access required.");
  const id = String(form.get("id")),
    approved = form.get("approved") === "1" ? 1 : 0;
  await getDb()
    .update(participants)
    .set({ approved })
    .where(eq(participants.id, id));
  redirect("/admin");
}
