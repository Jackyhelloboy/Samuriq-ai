"use server";
import {requireApplicationPermission,assignDirect} from "./enrollment";
import { requireOnboarding } from "./onboarding-state";
import { requireOperator } from "./access";
import { requireFeature } from "./features";
import { getChatGPTUser } from "./chatgpt-auth";
import { settings } from "./telegram";
import { projectState } from "./project-state";
import { getDb } from "../db";
import { projects, applications, participants,teamMembers,projectTeams } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
async function owner() {
  const user = await getChatGPTUser();
  if (
    !user ||
    user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
  )
    throw Error("Owner access required");
}
export async function publishProject(form: FormData) {
  await owner();
  const value = (key: string) => String(form.get(key) || "").trim();
  const title = value("title").slice(0, 120),
    description = value("description").slice(0, 4000);
  if (!title || !description) throw Error("Title and description required");
  const clientUrl = value("clientUrl");
  if (clientUrl) {
    const url = new URL(clientUrl);
    if (url.protocol !== "https:" || url.username || url.password)
      throw Error("Use an HTTPS client URL");
  }
  const vid = (k: string) => {
    const v = value(k);
    if (v) {
      const u = new URL(v);
      if (u.protocol !== "https:" || u.username || u.password)
        throw Error("Video links must be HTTPS");
    }
    return v;
  };
  const introUrl = vid("introUrl"),
    tutorialUrl = vid("tutorialUrl"),
    registerUrl = vid("registerUrl");
  const communityUrl = value("communityUrl");
  if (communityUrl) {
    const u = new URL(communityUrl);
    if (
      u.protocol !== "https:" ||
      !["t.me", "discord.gg", "discord.com"].includes(u.hostname) ||
      u.username ||
      u.password
    )
      throw Error("Use a Telegram or Discord invite URL");
  }
  const targetMinutes = Number(value("targetHours") || 0) * 60,
    hourlyRate = Number(value("hourlyRate") || 0),
    targetStart = value("targetStart"),
    deadline = value("deadline");
  if (
    !Number.isInteger(targetMinutes) ||
    targetMinutes < 0 ||
    targetMinutes > 10080 ||
    !Number.isInteger(hourlyRate) ||
    hourlyRate < 0 ||
    hourlyRate > 100000
  )
    throw Error("Check target hours and hourly rate");
  if (
    (targetStart || deadline) &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(targetStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(deadline) ||
      deadline < targetStart)
  )
    throw Error("Set a valid target period");
  const onboardingRequired = form.get("onboardingRequired") === "yes" ? 1 : 0,
    tutorialSeconds = Number(value("tutorialSeconds") || 60),
    terms = value("terms").slice(0, 5000);
  if (
    !Number.isInteger(tutorialSeconds) ||
    tutorialSeconds < 5 ||
    tutorialSeconds > 14400
  )
    throw Error("Set a tutorial duration from 5 seconds to 4 hours");
  if (onboardingRequired && (!(tutorialUrl || registerUrl) || !terms))
    throw Error("Required onboarding needs a tutorial URL and project terms");
  const id = value("id");
  const visibility=form.get("listed")==="yes"?"listed":"draft";
  const values = {
    visibility,
    archivedAt:form.get("active")==="1"?"":new Date().toISOString(),
    externalAllowed:form.get("externalAllowed")==="yes"?1:0,
    evidenceRequired:form.get("evidenceRequired")==="yes"?1:0,
    title,
    targetMinutes,
    hourlyRate,
    targetStart,
    deadline,
    communityUrl,
    onboardingRequired,
    telegramRequired:form.get("telegramRequired")==="yes"?1:0,
    tutorialReference:form.get("tutorialReference")==="yes"?1:0,
    tutorialSeconds,
    terms,
    introUrl,
    tutorialUrl,
    registerUrl,
    description,
    category: value("category").slice(0, 100),
    requirements: value("requirements").slice(0, 2000),
    clientUrl,
    inviteCode: value("inviteCode").slice(0, 100),
    pair: form.get("pair") === "yes" ? 1 : 0,
    rate: value("rate").slice(0, 200),
    location: value("location").slice(0, 200),
    questions: value("questions").slice(0, 2000),
    active: form.get("active") === "1" && visibility==="listed" ? 1 : 0,
  };
  if(values.evidenceRequired&&(!values.pair||!values.onboardingRequired||!values.inviteCode))throw Error("Pair evidence projects need permanent pairs, tutorial/terms onboarding and an invitation code");
  if(values.active&&(!clientUrl||!communityUrl||(deadline&&deadline<new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date()))))throw Error("Set client/community links and a current schedule before activating");
  if(id){const original=await getDb().select().from(projects).where(eq(projects.id,id)).get(),contract=await getDb().select().from(projectTeams).where(and(eq(projectTeams.projectId,id),(await import('drizzle-orm')).ne(projectTeams.vendorFrom,''))).get();if(original&&contract&&(original.hourlyRate!==values.hourlyRate||original.pair!==values.pair||original.targetStart!==values.targetStart||original.deadline!==values.deadline||original.targetMinutes!==values.targetMinutes))throw Error('This project has a vendor contract. Create a new project for a different financial period, target, budget or work format; existing contract calculations are preserved.');}
  if (id) await getDb().update(projects).set(values).where(eq(projects.id, id));
  else
    await getDb()
      .insert(projects)
      .values({
        id: crypto.randomUUID(),
        ...values,
        created: new Date().toISOString(),
      });
  redirect("/admin/projects");
}
export async function submitProjectApplication(form: FormData) {
  await requireFeature("applications");
  const user = await getChatGPTUser();
  if (!user) redirect("/login?return_to=/projects");
  await (await import("./policy")).requirePolicyRole(user.userId,"contributor");
  const db = getDb(),
    projectId = String(form.get("projectId"));
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  const profile = await db
    .select()
    .from(participants)
    .where(eq(participants.id, user.userId))
    .get();
  if (!profile) redirect("/workspace?next=" + encodeURIComponent(projectId));
  if (!project?.active || project.archivedAt) throw Error("Applications are closed");
  if (projectState(project) !== "online")
    throw Error("This project is paused. Its deadline has passed.");
  await (await import("./work-membership")).requireProjectAllowed(user.userId,projectId);
  await requireApplicationPermission(user.userId,projectId);
  await requireOnboarding(user.userId, project);
  const partner = String(form.get("partner") || "")
    .trim()
    .slice(0, 100);
  if (project.pair && !partner) throw Error("Partner name is required");
  const partnerEmail = String(form.get("partnerEmail") || "")
      .trim()
      .toLowerCase(),
    communityHandle = String(form.get("communityHandle") || "")
      .trim()
      .slice(0, 100);
  if (
    project.pair &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail) ||
      partnerEmail === user.email.toLowerCase())
  )
    throw Error("Use your permanent partner’s separate sign-in email");
  if (!communityHandle) throw Error("Add your Telegram or Discord username");
  const answers = String(form.get("experience") || "").trim();
  if (!answers) throw Error("Complete your application answers");
  if (form.get("consent") !== "yes") throw Error("Confirm your application");
  await assignDirect(user.userId,projectId);
  await (await import("./work-membership")).requireProjectAllowed(user.userId,projectId);
  await requireApplicationPermission(user.userId,projectId);
  await db
    .insert(applications)
    .values({
      userId: user.userId,
      projectId,
      partner,
      partnerEmail,
      communityHandle,
      experience: String(form.get("experience") || "").slice(0, 2000),
      created: new Date().toISOString(),
    })
    .onConflictDoNothing();
}
export async function applyProject(form:FormData){await submitProjectApplication(form);redirect("/projects/work?id="+encodeURIComponent(String(form.get("projectId")))+"&launch=1");}
export async function decideApplication(form: FormData) {
  await requireOperator();
  const status = String(form.get("status"));
  if (!["approved", "pending", "declined"].includes(status))
    throw Error("Invalid status");
  const db = getDb(),
    row = await db
      .select()
      .from(applications)
      .innerJoin(projects, eq(projects.id, applications.projectId))
      .where(
        and(
          eq(applications.userId, String(form.get("userId"))),
          eq(applications.projectId, String(form.get("projectId"))),
        ),
      )
      .get();
  if (!row) throw Error("Application not found");
  if(status==='approved'){const member=await db.select().from(teamMembers).where(and(eq(teamMembers.userId,row.applications.userId),eq(teamMembers.projectId,row.projects.id))).get();if(!member)throw Error('Assign this applicant to an eligible project team before approval. Use Route waiting applicants in the project roster.');}
  const communityVerified = form.get("communityVerified") === "yes" ? 1 : 0;
  if (
    status === "approved" &&
    (!communityVerified ||
      (row.projects.pair && !row.applications.partnerConfirmed))
  )
    throw Error("Confirm both partner consent and community membership first");
  await db
    .update(applications)
    .set({ status, communityVerified })
    .where(
      and(
        eq(applications.userId, String(form.get("userId"))),
        eq(applications.projectId, String(form.get("projectId"))),
      ),
    );
  redirect("/admin");
}
export async function toggleProject(form:FormData){const operator=await requireOperator(),db=getDb(),id=String(form.get("id")),job=await db.select().from(projects).where(eq(projects.id,id)).get();if(!job)throw Error("Project not found");const active=form.get("active")==="1"?1:0;if(active&&job.sample)throw Error("Sample projects stay closed. Create a real project with client requirements instead.");if(active&&job.evidenceRequired&&(!job.onboardingRequired||!(job.tutorialUrl||job.registerUrl)||!job.terms||!job.pair||!job.inviteCode))throw Error("Configure required tutorials, terms, permanent pairs and task invitation code before activating this evidence project");if(active&&(!job.clientUrl||!job.communityUrl))throw Error("The owner must configure client and community links first");if(active&&((job.deadline&&job.deadline<new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date()))||(job.targetStart&&job.targetStart>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date()))))throw Error("The owner must update this project’s schedule before it can be activated");await db.update(projects).set({active,visibility:"listed",archivedAt:active?"":new Date().toISOString()}).where(eq(projects.id,id));redirect("/admin/projects");}
