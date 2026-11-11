import { getDb } from "../db";
import { onboarding } from "../db/schema";
import { and, eq } from "drizzle-orm";
export type OnboardingProject = {
  id: string;
  onboardingRequired: number;
  tutorialUrl: string;
  registerUrl: string;
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
            j.tutorialUrl || j.registerUrl,
            j.terms,
            j.tutorialSeconds,
          ]),
        ),
      ),
    ),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function requireOnboarding(userId: string, j: OnboardingProject) {
  if (!j.onboardingRequired) return;
  const row = await getDb()
    .select()
    .from(onboarding)
    .where(and(eq(onboarding.userId, userId), eq(onboarding.projectId, j.id)))
    .get();
  if (!row || row.version !== (await onboardingVersion(j)) || !row.acceptedAt)
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
