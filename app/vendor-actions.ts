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
export async function launchProject(form:FormData){const id=String(form.get('projectId'));await (await import('./project-access')).accessibleProject(id);redirect('/projects/work?id='+encodeURIComponent(id));}
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
        eq(progress.ledgerLocked,0),
      ),
    )
    .returning();
  if (!result.length)
    throw Error("This report changed. Refresh and review the latest version.");
  redirect("/admin/reports?saved=1");
}
export async function saveBank(form:FormData){return storeBank(form);}
