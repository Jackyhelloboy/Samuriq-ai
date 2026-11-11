"use server";
import { getChatGPTUser } from "./chatgpt-auth";
import { requireOperator } from "./access";
import { getDb } from "../db";
import {
  projects,
  onboarding,
  participants,
  clientClaims,
  operationAudit,
} from "../db/schema";
import { and, eq } from "drizzle-orm";
import { onboardingVersion, videoMode } from "./onboarding-state";
import { redirect } from "next/navigation";
async function context(id: string) {
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
  const db = getDb(),
    j = await db.select().from(projects).where(eq(projects.id, id)).get(),
    p = await db
      .select()
      .from(participants)
      .where(eq(participants.id, user.userId))
      .get();
  if (!j || !p) throw Error("Complete your profile first");
  return { user, db, j, version: await onboardingVersion(j) };
}
export async function startTutorial(id: string) {
  const { user, db, j, version } = await context(id);
  if (!(j.tutorialUrl || j.registerUrl))
    throw Error("Your coordinator has not added this tutorial yet");
  const row = await db
    .select()
    .from(onboarding)
    .where(
      and(eq(onboarding.userId, user.userId), eq(onboarding.projectId, id)),
    )
    .get();
  if (row?.version === version)
    return { nonce: row.nonce, watched: row.watched };
  const nonce = crypto.randomUUID();
  await db
    .insert(onboarding)
    .values({
      userId: user.userId,
      projectId: id,
      version,
      nonce,
      lastTick: Date.now(),
    })
    .onConflictDoUpdate({
      target: [onboarding.userId, onboarding.projectId],
      set: {
        version,
        nonce,
        lastTick: Date.now(),
        watched: 0,
        position: 0,
        verified: 0,
        acceptedAt: "",
        clientEmail: "",
        clientUsername: "",
      },
    });
  return { nonce, watched: 0 };
}
export async function recordPlayback(
  id: string,
  nonce: string,
  position: number,
) {
  const { user, db, j, version } = await context(id);
  if (videoMode(j.tutorialUrl || j.registerUrl) === "manual")
    throw Error("This provider needs coordinator verification");
  const row = await db
    .select()
    .from(onboarding)
    .where(
      and(eq(onboarding.userId, user.userId), eq(onboarding.projectId, id)),
    )
    .get();
  if (!row || row.version !== version || row.nonce !== nonce)
    throw Error("Restart tutorial");
  const now = Date.now(),
    elapsed = (now - row.lastTick) / 1000,
    next = Math.floor(position);
  if (!Number.isFinite(next) || next < 0 || elapsed < 4)
    return { watched: row.watched };
  const advance = next - row.position,
    credit =
      advance >= 0 && advance <= elapsed + 3
        ? Math.min(advance, Math.floor(elapsed), 12)
        : 0;
  const watched = Math.min(
    j.tutorialSeconds,
    row.watched + Math.max(0, credit),
  );
  await db
    .update(onboarding)
    .set({
      watched,
      position: credit > 0 ? Math.max(row.position, next) : row.position,
      lastTick: now,
    })
    .where(
      and(
        eq(onboarding.userId, user.userId),
        eq(onboarding.projectId, id),
        eq(onboarding.lastTick, row.lastTick),
        eq(onboarding.nonce, nonce),
      ),
    );
  return { watched };
}
export async function acceptOnboarding(form: FormData) {
  const id = String(form.get("projectId")),
    { user, db, j, version } = await context(id);
  const r = await db
    .select()
    .from(onboarding)
    .where(
      and(eq(onboarding.userId, user.userId), eq(onboarding.projectId, id)),
    )
    .get();
  if (
    !r ||
    r.version !== version ||
    (!r.verified && r.watched < j.tutorialSeconds)
  )
    throw Error("Finish the tutorial or wait for coordinator verification");
  const clientEmail = String(form.get("clientEmail") || "")
      .trim()
      .toLowerCase(),
    clientUsername = String(form.get("clientUsername") || "").trim();
  if (
    clientEmail !== user.email.toLowerCase() ||
    !clientUsername ||
    clientUsername.length > 100 ||
    form.get("terms") !== "yes"
  )
    throw Error(
      "Use your account email, provide your intended client username and accept the project terms",
    );
  if (
    r.acceptedAt &&
    (r.clientUsername !== clientUsername || r.clientEmail !== clientEmail)
  )
    throw Error(
      "Contact the coordinator to correct an accepted client identity",
    );
  const existing = await db
    .select()
    .from(clientClaims)
    .where(
      and(
        eq(clientClaims.projectId, id),
        eq(clientClaims.username, clientUsername.toLowerCase()),
      ),
    )
    .get();
  if (existing && existing.userId !== user.userId)
    throw Error("That client username is already registered for this project");
  const acceptedAt = new Date().toISOString();
  await db.batch([
    existing
      ? db
          .update(clientClaims)
          .set({ userId: user.userId })
          .where(
            and(
              eq(clientClaims.projectId, id),
              eq(clientClaims.username, clientUsername.toLowerCase()),
              eq(clientClaims.userId, user.userId),
            ),
          )
      : db.insert(clientClaims).values({
          projectId: id,
          username: clientUsername.toLowerCase(),
          userId: user.userId,
        }),
    db
      .update(onboarding)
      .set({ clientEmail, clientUsername, acceptedAt })
      .where(
        and(
          eq(onboarding.userId, user.userId),
          eq(onboarding.projectId, id),
          eq(onboarding.version, version),
        ),
      ),
    db.insert(operationAudit).values({
      id: crypto.randomUUID(),
      actor: user.userId,
      action: "terms-accepted",
      target: id,
      detail: JSON.stringify({
        version,
        terms: j.terms,
        clientEmail,
        clientUsername,
      }),
      created: acceptedAt,
    }),
  ]);
  redirect("/projects/detail?id=" + encodeURIComponent(id) + "&onboarded=1");
}
export async function verifyTutorial(form: FormData) {
  const staff = await requireOperator(),
    db = getDb(),
    userId = String(form.get("userId")),
    id = String(form.get("projectId")),
    note = String(form.get("note") || "")
      .trim()
      .slice(0, 1000);
  if (note.length < 10)
    throw Error("Record how you verified tutorial completion");
  const j = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!j) throw Error("Project not found");
  const version = await onboardingVersion(j);
  const r = await db
    .update(onboarding)
    .set({ verified: 1 })
    .where(
      and(
        eq(onboarding.userId, userId),
        eq(onboarding.projectId, id),
        eq(onboarding.version, version),
      ),
    )
    .returning();
  if (!r.length)
    throw Error("Contributor must open the current tutorial first");
  await db.insert(operationAudit).values({
    id: crypto.randomUUID(),
    actor: staff.user.userId,
    action: "tutorial-verified",
    target: userId + ":" + id,
    detail: note,
    created: new Date().toISOString(),
  });
  redirect("/admin/onboarding?saved=1");
}
