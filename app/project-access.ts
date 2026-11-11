import { getChatGPTUser } from "./chatgpt-auth";
import { getDb } from "../db";
import { applications, projects, progress } from "../db/schema";
import { and, eq, or, desc } from "drizzle-orm";
import { requireFeature } from "./features";
import { requireOnboarding } from "./onboarding-state";
import { projectState, missedInfo } from "./project-state";
export async function accessibleProject(id: string) {
  await requireFeature("client_access");
  const user = await getChatGPTUser();
  if (!user) throw Error("Sign in first");
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
  await requireOnboarding(user.userId, row.projects);
  if (projectState(row.projects) !== "online")
    throw Error("This project is not currently online");
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
