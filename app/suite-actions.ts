"use server";
import { requireFeature } from "./features";
import { requireOwner } from "./access";
import { getChatGPTUser } from "./chatgpt-auth";
import { getDb } from "../db";
import { progress, applications, integrations, notices, projects } from "../db/schema";
import { projectState } from "./project-state";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
export async function saveProgress(form: FormData) {
  await requireFeature("reporting");
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in to continue");
  const projectId = String(form.get("projectId"));
  const application = await getDb()
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.userId, user.userId),
        eq(applications.projectId, projectId),
      ),
    )
    .get();
  if (application?.status !== "approved" || !application.communityVerified)
    throw Error("Project approval required");
  const proj = await getDb().select().from(projects).where(eq(projects.id, projectId)).get();
  if (proj && projectState(proj) !== "online") throw Error("This project is paused. The deadline has passed.");
  const status = String(form.get("status")),
    minutes = Number(form.get("minutes")),
    units = Number(form.get("units"));
  if (
    !["started", "completed", "not-started", "need-help"].includes(status) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 1440 ||
    !Number.isInteger(units) ||
    units < 0 ||
    units > 100000
  )
    throw Error("Check your work totals");
  const proofUrl = String(form.get("proofUrl") || "").trim();
  if (proofUrl) {
    const url = new URL(proofUrl);
    if (
      url.protocol !== "https:" ||
      !["drive.google.com", "docs.google.com"].includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw Error("Use a Google Drive file or folder link");
  }
  if (status === "completed" && !proofUrl)
    throw Error("Add a Drive evidence link before completing the report");
  const row = {
    userId: user.userId,
    projectId,
    day: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
      new Date(),
    ),
    status,
    minutes,
    units,
    approvedMinutes: 0,
    notes: String(form.get("notes") || "").slice(0, 1500),
    proofUrl,
    clientId: String(form.get("clientId") || "")
      .trim()
      .slice(0, 150),
    review: "pending",
    reviewNote: "",
    updated: new Date().toISOString(),
  };
  const result=await getDb()
    .insert(progress)
    .values(row)
    .onConflictDoUpdate({
      target: [progress.userId, progress.projectId, progress.day],
      set: row,
      setWhere:eq(progress.ledgerLocked,0),
    }).returning();
  if(!result.length)throw Error("This report is locked in the earnings ledger. Contact the owner for a payment adjustment.");
  redirect("/workspace?saved=1#progress");
}
export async function saveIntegration(form: FormData) {
  await requireOwner();
  const id = String(form.get("id")),
    raw = String(form.get("url") || "").trim();
  const hosts: Record<string, string[]> = {
    telegram: ["t.me"],
    discord: ["discord.gg", "discord.com"],
    instagram: ["instagram.com", "www.instagram.com"],
  };
  if (!hosts[id]) throw Error("Unsupported service");
  if (raw) {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      !hosts[id].includes(u.hostname) ||
      u.username ||
      u.password
    )
      throw Error("Use the official service URL");
  }
  await getDb()
    .insert(integrations)
    .values({ id, url: raw, updated: new Date().toISOString() })
    .onConflictDoUpdate({
      target: integrations.id,
      set: { url: raw, updated: new Date().toISOString() },
    });
  redirect("/admin/integrations?saved=1");
}
export async function announce(form: FormData) {
  await requireOwner();
  const title = String(form.get("title") || "")
      .trim()
      .slice(0, 120),
    body = String(form.get("body") || "")
      .trim()
      .slice(0, 3000);
  if (!title || !body) throw Error("Title and message required");
  await getDb().insert(notices).values({
    id: crypto.randomUUID(),
    title,
    body,
    created: new Date().toISOString(),
  });
  redirect("/admin/announcements?saved=1");
}

