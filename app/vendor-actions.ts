"use server";
import {storeBank} from "./payment-actions";
import { requireFeature } from "./features";
import { getChatGPTUser } from "./chatgpt-auth";
import { requireOnboarding } from "./onboarding-state";
import { requireOperator } from "./access";
import { requireOwner } from "./access";
import { getDb } from "../db";
import {
  projects,
  applications,
  launches,
  progress,
  bankDetails,
  bankAudit,
  participants,
} from "../db/schema";
import { and, eq, or, gte, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { encryptBank } from "./bank-crypto";
import { projectState, missedInfo } from "./project-state";
export async function launchProject(form: FormData) {
  await requireFeature("client_access");
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
  const id = String(form.get("projectId")),
    db = getDb();
  const row = await db
    .select()
    .from(applications)
    .innerJoin(projects, eq(projects.id, applications.projectId))
    .where(
      and(
        or(
          eq(applications.userId, user.userId),
          eq(applications.partnerEmail, user.email.toLowerCase()),
        ),
        eq(applications.projectId, id),
      ),
    )
    .get();
  if (
    row?.applications.status !== "approved" ||
    !row.projects.clientUrl ||
    !row.applications.communityVerified ||
    (row.projects.pair && !row.applications.partnerConfirmed)
  )
    throw Error("Project access is not approved");
  await requireOnboarding(user.userId, row.projects);
  if (projectState(row.projects) !== "online")
    throw Error("This project is not online right now");
  const last = await db
    .select()
    .from(progress)
    .where(
      and(
        eq(progress.userId, row.applications.userId),
        eq(progress.projectId, id),
      ),
    )
    .orderBy(desc(progress.day))
    .get();
  if (missedInfo(last?.day, row.applications.created, row.projects).blocked)
    throw Error(
      "Access paused: you missed daily updates. Submit today's update in your workspace to restore access.",
    );
  const target = new URL(row.projects.clientUrl);
  if (target.protocol !== "https:" || target.username || target.password)
    throw Error("Invalid project destination");
  await db.insert(launches).values({
    id: crypto.randomUUID(),
    userId: user.userId,
    projectId: id,
    created: new Date().toISOString(),
  });
  redirect(target.href);
}
export async function reviewReport(form: FormData) {
  const operator = await requireOperator();
  const review = String(form.get("review")),
    reviewNote = String(form.get("reviewNote") || "")
      .trim()
      .slice(0, 1000);
  if (
    ![
      "pending",
      "proof-reviewed",
      "client-approved",
      "needs-correction",
    ].includes(review)
  )
    throw Error("Invalid review status");
  if (review !== "pending" && !reviewNote)
    throw Error("Add a review note or client QC reference");
  if (operator.role !== "owner" && review === "client-approved")
    throw Error("Client QC approval is owner-only");
  if (operator.role !== "owner") {
    const existing = await getDb()
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, String(form.get("userId"))),
          eq(progress.projectId, String(form.get("projectId"))),
          eq(progress.day, String(form.get("day"))),
        ),
      )
      .get();
    if (existing?.review === "client-approved")
      throw Error("Only the owner may change a client-approved report");
  }
  const approvedMinutes =
    review === "client-approved" ? Number(form.get("approvedMinutes")) : 0;
  if (
    !Number.isInteger(approvedMinutes) ||
    approvedMinutes < 0 ||
    approvedMinutes > 1440
  )
    throw Error("Enter valid QC-approved recording minutes");
  const result = await getDb()
    .update(progress)
    .set({ review, reviewNote, approvedMinutes })
    .where(
      and(
        eq(progress.userId, String(form.get("userId"))),
        eq(progress.projectId, String(form.get("projectId"))),
        eq(progress.day, String(form.get("day"))),
        eq(progress.updated, String(form.get("version"))),
        gte(progress.minutes, approvedMinutes),
      ),
    )
    .returning();
  if (!result.length)
    throw Error("This report changed. Refresh and review the latest version.");
  redirect("/admin/reports?saved=1");
}
export async function saveBank(form:FormData){return storeBank(form);}
