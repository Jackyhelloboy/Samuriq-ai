"use server";
import {safeReturn} from "./auth-rate";
import { getChatGPTUser } from "./chatgpt-auth";
import { settings } from "./telegram";
import { getDb } from "../db";
import { participants, reports } from "../db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function register(form: FormData) {
  const fail=(code:string)=>redirect("/workspace?edit=1&error="+code+"&next="+encodeURIComponent(String(form.get("next")||"").slice(0,100)));
  const user = await getChatGPTUser();
  if (!user) redirect("/login?return_to=/workspace");
  const username=String(form.get('username')||'').trim().toLowerCase();if(username&&!/^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/.test(username))return fail('username');const existingProfile=await getDb().select().from(participants).where(eq(participants.id,user.userId)).get();const handle=username||existingProfile?.username||'member_'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.userId))),v=>v.toString(16).padStart(2,'0')).join('').slice(0,20);const handleOwner=await getDb().select().from(participants).where(eq(participants.username,handle)).get();if(handleOwner&&handleOwner.id!==user.userId)return fail('taken');
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
    language.length > 1000 ||
    !["speech", "motion", "annotation", "evaluation", "general"].includes(
      project,
    ) ||
    form.get("consent") !== "yes"
  )
    return fail("details");
  const phone=String(form.get("phone")||"").replace(/[\s()-]/g,"");
  if(phone&&!/^\+?[0-9]{8,15}$/.test(phone))return fail("phone");
  const phoneConsent=form.get("phoneConsent")==="yes"?1:0;
  if(phone&&!phoneConsent)return fail("phone-consent");
  const source = String(form.get("source") || "direct").slice(0, 100);
  const skills = String(form.get("skills") || "").slice(0, 1500),
    location = String(form.get("location") || "").slice(0, 200),
    device = String(form.get("device") || "").slice(0, 100);
  try{await (await import('./policy')).recordRegistrationPolicy(user,String(form.get('policyVersion')||''),form.get('platformPolicyConsent'));}catch(error){if(error instanceof Error&&/Read and accept the current platform agreement/i.test(error.message))return fail('policy');throw error;}const chosen=String(form.get('next')||'');if(chosen&&(!phone||!phoneConsent))return fail('phone-required');
  try{await getDb()
    .insert(participants)
    .values({
      id: user.userId,
      username:handle,name,
      phone,phoneConsent,
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
      set: { username:handle,name,phone,phoneConsent, telegram, language, project, skills, location, device },
    });}catch(error){const message=String(error)+String((error as {cause?:unknown})?.cause||"");if(/participant_username_unique|UNIQUE constraint failed: participants.username/i.test(message))return fail("taken");throw error;}
  const next=String(form.get("next")||"");if(next){const e=await import("./enrollment");try{await e.requireApplicationPermission(user.userId,next);await e.assignDirect(user.userId,next);}catch(error){if(error instanceof e.EnrollmentError)redirect("/projects/detail?id="+encodeURIComponent(next)+"&notice="+error.code);throw error;}}
  const returnTo=String(form.get("return_to")||"");if(returnTo)redirect(safeReturn(returnTo));
  redirect(next?"/projects/onboarding?id="+encodeURIComponent(next):"/workspace");
}
export async function report(form: FormData) {
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first.");
  await (await import("./policy")).requirePolicyRole(user.userId,"contributor");
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
