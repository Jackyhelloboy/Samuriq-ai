"use server";
import {projectState} from "./project-state";
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
import { and, eq, or } from "drizzle-orm";
import { onboardingVersion, videoMode, tutorialEntries, lessonKey, allLessonsComplete } from "./onboarding-state";
import { redirect } from "next/navigation";
async function context(id: string) {
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
  const pieces=id.split("::lesson:"),actualId=pieces[0],index=pieces.length===2?Number(pieces[1]):0;if(!Number.isInteger(index)||index<0||index>2||pieces.length>2)throw Error("Invalid tutorial lesson");
  const db = getDb(),
    original = await db.select().from(projects).where(eq(projects.id, actualId)).get(),
    p = await db
      .select()
      .from(participants)
      .where(eq(participants.id, user.userId))
      .get();
  if (!original || !p) throw Error("Complete your profile first");
  const entries=tutorialEntries(original);if(index>=entries.length)throw Error("Tutorial unavailable");const j={...original,tutorialUrl:entries[index],registerUrl:""};
  if(projectState(j)!=="online")throw Error("This project is closed");
  return { user, db, j, original, version: await onboardingVersion(original) };
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
        requiredSeconds:0,
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
    Math.max(j.tutorialSeconds,row.requiredSeconds),
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
    { user, db, j, original, version } = await context(id);
  if(id!==j.id)throw Error("Accept terms only from the main project onboarding page");
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
    !(await allLessonsComplete(user.userId,original)) ||
    (!r.verified && r.watched < Math.max(j.tutorialSeconds,r.requiredSeconds))
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
  if(j.inviteCode&&String(form.get("inviteCode")||"").trim()!==j.inviteCode)throw Error("Enter the mandatory client task invitation code exactly as shown");
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
  const lessonIds=tutorialEntries(j).map((_,i)=>lessonKey(id,i));
  const current=await db.select().from(onboarding).where(and(eq(onboarding.userId,userId),or(...lessonIds.map(key=>eq(onboarding.projectId,key))),eq(onboarding.version,version)));
  if(current.length!==lessonIds.length)throw Error("The contributor must open every required video before completion can be verified");
  const r = await db
    .update(onboarding)
    .set({ verified: 1 })
    .where(
      and(
        eq(onboarding.userId, userId),
        or(...lessonIds.map(key=>eq(onboarding.projectId,key))),
        eq(onboarding.version, version),
      ),
    )
    .returning();
  if (!r.length)
    throw Error("Contributor must open every required tutorial first");
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

export async function setVideoDuration(id:string,nonce:string,seconds:number){const {user,db,j,version}=await context(id);const duration=Math.ceil(seconds);if(!Number.isFinite(duration)||duration<1||duration>14400)throw Error("Video duration unavailable or unsupported");const row=await db.select().from(onboarding).where(and(eq(onboarding.userId,user.userId),eq(onboarding.projectId,id),eq(onboarding.version,version),eq(onboarding.nonce,nonce))).get();if(!row)throw Error("Restart the tutorial");const requiredSeconds=Math.max(j.tutorialSeconds,row.requiredSeconds,duration);await db.update(onboarding).set({requiredSeconds,...(requiredSeconds>Math.max(j.tutorialSeconds,row.requiredSeconds)?{acceptedAt:''}:{})}).where(and(eq(onboarding.userId,user.userId),eq(onboarding.projectId,id),eq(onboarding.nonce,nonce)));return {requiredSeconds};}
