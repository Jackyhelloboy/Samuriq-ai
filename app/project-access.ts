import {requireLeaderScope} from './vendor-policy';
import { getChatGPTUser } from "./chatgpt-auth";
import { getDb } from "../db";
import { applications, projects, progress,teamMembers,projectTeams,participants,evidenceFolders } from "../db/schema";
import { and, eq, or, desc,inArray } from "drizzle-orm";
import {pairContext} from "./evidence-access";
import { requireFeature } from "./features";
import { requireOnboarding } from "./onboarding-state";
import { projectState, missedInfo } from "./project-state";
export async function accessibleProject(id: string) {
  await requireFeature("client_access");
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
  await (await import("./policy")).requirePolicyRole(user.userId,"contributor");
  await (await import("./work-membership")).requireProjectAllowed(user.userId,id);
  const db = getDb(),
    row = await db
      .select()
      .from(applications)
      .innerJoin(projects, eq(projects.id, applications.projectId))
      .where(
        and(
          eq(applications.projectId, id),
          or(
            eq(applications.userId, user.userId),
            eq(applications.partnerEmail, user.email.toLowerCase()),
          ),
        ),
      )
      .get();
  if (
    !row ||
    row.applications.status !== "approved" ||
    !row.applications.communityVerified ||
    (row.projects.pair && !row.applications.partnerConfirmed)
  )
    throw Error(
      "Coordinator approval and confirmed team membership are required",
    );
  const membership=await db.select().from(teamMembers).where(and(eq(teamMembers.userId,user.userId),eq(teamMembers.projectId,id))).get();
  if(membership){const assigned=await db.select().from(projectTeams).where(eq(projectTeams.id,membership.teamId)).get(),leader=assigned?await db.select().from(participants).where(eq(participants.id,assigned.leaderId)).get():null;if(!assigned?.active||!leader||leader.suspended)throw Error('Your team assignment requires management attention');await requireLeaderScope(assigned);await (await import('./policy')).requirePolicyRole(assigned.leaderId,'tl');}
  if(membership&&!membership.rateAccepted)throw Error("Accept your assigned team terms on the project brief first");
  if(row.projects.enrollmentOnly)throw Error("This project is active; management must finish required onboarding setup before work access");
  await requireOnboarding(user.userId, row.projects);
  if (projectState(row.projects) !== "online")
    throw Error("This project is not currently online");
  if(row.projects.evidenceRequired){
    const pair=await pairContext(id,row.applications.userId),members=await db.select().from(teamMembers).where(and(eq(teamMembers.projectId,id),inArray(teamMembers.userId,[pair.first.id,pair.second.id]))),first=members.find(m=>m.userId===pair.first.id),second=members.find(m=>m.userId===pair.second.id);
    if(!first||!second||!first.rateAccepted||!second.rateAccepted||first.teamId!==second.teamId)throw Error("Both permanent partners must accept the same project team before client access");
    const team=await db.select().from(projectTeams).where(eq(projectTeams.id,first.teamId)).get(),leader=team?await db.select().from(participants).where(eq(participants.id,team.leaderId)).get():null;
    if(!team?.active||!leader||leader.suspended)throw Error("Your project team requires manager attention before work access");
    const folders=await db.select().from(evidenceFolders).where(and(eq(evidenceFolders.projectId,id),inArray(evidenceFolders.userId,[pair.first.id,pair.second.id])));
    if([pair.first,pair.second].some(p=>!folders.find(f=>f.userId===p.id&&f.leadId===pair.a.userId&&f.verifiedBy)))throw Error("Connect both private evidence folders and ask the TL to check viewer access before starting");
    return {user,...row};
  }
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
    throw Error("Submit today’s daily check-in to restore portal access");
  return { user, ...row };
}
