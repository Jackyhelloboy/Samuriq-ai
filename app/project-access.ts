import {recruitment,groupEligibility,db as directory} from "./recruitment/data";
import {requireLeaderScope} from './vendor-policy';
import { getChatGPTUser } from "./chatgpt-auth";
import { getDb } from "../db";
import { applications, projects,teamMembers,projectTeams,participants } from "../db/schema";
import { and, eq, or } from "drizzle-orm";
import { requireFeature } from "./features";
import { requireOnboarding } from "./onboarding-state";
import { projectState } from "./project-state";
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
    !row || row.projects.archivedAt ||
    row.applications.status !== "approved" ||
    !row.applications.communityVerified ||
    (row.projects.pair && !row.applications.partnerConfirmed)
  )
    throw Error(
      "Coordinator approval and confirmed team membership are required",
    );
  const brief=await recruitment(id);
  if(brief?.group_url){
    const profile=await db.select().from(participants).where(eq(participants.id,user.userId)).get();
    const visit=await directory().prepare("SELECT 1 FROM group_visits WHERE project_id=? AND user_id=?").bind(id,user.userId).first();
    if(!profile || !await groupEligibility(brief,profile,user.email) || !visit)
      throw Error("Verify your profile and open the project WhatsApp group before starting client work.");
  }
  const membership=await db.select().from(teamMembers).where(and(eq(teamMembers.userId,user.userId),eq(teamMembers.projectId,id))).get();
  if(membership){const assigned=await db.select().from(projectTeams).where(eq(projectTeams.id,membership.teamId)).get(),leader=assigned?await db.select().from(participants).where(eq(participants.id,assigned.leaderId)).get():null;if(!assigned?.active||!leader||leader.suspended)throw Error('Your team assignment requires management attention');await requireLeaderScope(assigned);await (await import('./policy')).requirePolicyRole(assigned.leaderId,'tl');}
  if(membership&&!membership.rateAccepted)throw Error("Accept your assigned team terms on the project brief first");
  if(row.projects.enrollmentOnly)throw Error("This project is active; management must finish required onboarding setup before work access");
  await requireOnboarding(user.userId, row.projects);
  if (projectState(row.projects) !== "online")
    throw Error("This project is not currently online");
  // Approved users enter the project directly. Attendance, evidence folders and
  // daily check-ins are intentionally not access gates in the simplified flow.
  return { user, ...row };
}
