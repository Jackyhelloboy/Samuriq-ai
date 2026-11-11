"use server";
import { getChatGPTUser } from "./chatgpt-auth";
import { getDb } from "../db";
import { applications, participants, pairClaims } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
export async function setPartner(form: FormData) {
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
  const partner = String(form.get("partner") || "")
      .trim()
      .slice(0, 100),
    partnerEmail = String(form.get("partnerEmail") || "")
      .trim()
      .toLowerCase(),
    communityHandle = String(form.get("communityHandle") || "")
      .trim()
      .slice(0, 100);
  if (
    !partner ||
    !communityHandle ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail) ||
    partnerEmail === user.email.toLowerCase()
  )
    throw Error("Check partner name, email and community handle");
  const result = await getDb()
    .update(applications)
    .set({
      partner,
      partnerEmail,
      communityHandle,
      status: "pending",
      communityVerified: 0,
    })
    .where(
      and(
        eq(applications.userId, user.userId),
        eq(applications.projectId, String(form.get("projectId"))),
        eq(applications.partnerConfirmed, 0),
      ),
    )
    .returning();
  if (!result.length)
    throw Error(
      "Your partner is already fixed. Contact your coordinator for exceptional changes.",
    );
  redirect("/workspace");
}
export async function confirmPartner(form: FormData) {
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
  if (form.get("consent") !== "yes")
    throw Error("Confirm your permanent pairing");
  const db = getDb(),
    projectId = String(form.get("projectId")),
    leadId = String(form.get("leadId"));
  const row = await db
    .select()
    .from(applications)
    .innerJoin(participants, eq(participants.id, applications.userId))
    .where(
      and(
        eq(applications.projectId, projectId),
        eq(applications.userId, leadId),
        eq(applications.partnerEmail, user.email.toLowerCase()),
        eq(applications.partnerConfirmed, 0),
      ),
    )
    .get();
  const profile = await db
    .select()
    .from(participants)
    .where(eq(participants.id, user.userId))
    .get();
  if (!row || !profile)
    throw Error("Complete your profile and check the pair invitation first");
  try {
    await db.batch([
      db.insert(pairClaims).values([
        { projectId, email: row.participants.email.toLowerCase(), leadId },
        { projectId, email: user.email.toLowerCase(), leadId },
      ]),
      db
        .update(applications)
        .set({ partnerConfirmed: 1 })
        .where(
          and(
            eq(applications.userId, leadId),
            eq(applications.projectId, projectId),
            eq(applications.partnerEmail, user.email.toLowerCase()),
          ),
        ),
    ]);
  } catch {
    throw Error(
      "One participant is already in a confirmed pair for this project. Contact your coordinator.",
    );
  }
  redirect("/workspace");
}
