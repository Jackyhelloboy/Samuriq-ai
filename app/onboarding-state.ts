import { getDb } from "../db";
import { onboarding } from "../db/schema";
import { and, eq } from "drizzle-orm";
export type OnboardingProject = {
  id: string;
  onboardingRequired: number;
  telegramRequired?:number;
  tutorialUrl: string;
  registerUrl: string;
  introUrl?:string;
  inviteCode?:string;
  terms: string;
  tutorialSeconds: number;
};
export async function onboardingVersion(j: OnboardingProject) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify([
            tutorialEntries(j),
            j.inviteCode||"",
            j.terms,
            j.tutorialSeconds,
          ]),
        ),
      ),
    ),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
export function tutorialEntries(j:OnboardingProject){return [...new Set([j.tutorialUrl||j.registerUrl,j.registerUrl,j.introUrl||""].filter(Boolean))];}
export function lessonKey(id:string,index:number){return index===0?id:id+"::lesson:"+index;}
export async function allLessonsComplete(userId:string,j:OnboardingProject){const version=await onboardingVersion(j),entries=tutorialEntries(j);if(!entries.length)return false;const rows=await Promise.all(entries.map((_,i)=>getDb().select().from(onboarding).where(and(eq(onboarding.userId,userId),eq(onboarding.projectId,lessonKey(j.id,i)),eq(onboarding.version,version))).get()));return rows.every(r=>r&&(r.verified||r.watched>=Math.max(j.tutorialSeconds,r.requiredSeconds)));}
export async function requireOnboarding(userId: string, j: OnboardingProject) {
  await (await import("./telegram-identity")).requireTelegramIdentity(userId,j);
  if (!j.onboardingRequired) return;
  const row = await getDb()
    .select()
    .from(onboarding)
    .where(and(eq(onboarding.userId, userId), eq(onboarding.projectId, j.id)))
    .get();
  if (!row || row.version !== (await onboardingVersion(j)) || !row.acceptedAt || !(await allLessonsComplete(userId,j)))
    throw Error(
      "Complete this project’s tutorial and terms before continuing.",
    );
}
export function videoMode(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return "manual";
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return "direct";
    if (
      ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(
        u.hostname,
      )
    )
      return "youtube";
  } catch {}
  return "manual";
}
