import { requireOperatorView } from "../../../access";
import { decideManagerProjectPermission } from "../../../enrollment-actions";
import { getDb } from "../../../../db";
import { participants, projectPermissions, projects } from "../../../../db/schema";
import { Shell, Heading } from "../../../components/shell";
import { and, eq, like } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdditionalProjectApprovals() {
  await requireOperatorView();
  const db = getDb();
  const requests = await db.select({
    userId: projectPermissions.userId,
    teamId: projectPermissions.teamId,
    projectId: projectPermissions.projectId,
    reason: projectPermissions.reason,
    updated: projectPermissions.updated,
    name: participants.name,
    email: participants.email,
    target: projects.title,
  }).from(projectPermissions)
    .innerJoin(participants, eq(participants.id, projectPermissions.userId))
    .innerJoin(projects, eq(projects.id, projectPermissions.projectId))
    .where(and(eq(projectPermissions.status, "pending"), like(projectPermissions.teamId, "application:%")))
    .limit(100);
  const sourceIds = [...new Set(requests.map(request => request.teamId.slice("application:".length)))];
  const sourceTitles = new Map<string, string>();
  for (const id of sourceIds) {
    const project = await db.select({ title: projects.title }).from(projects).where(eq(projects.id, id)).get();
    sourceTitles.set(id, project?.title || "Previous project");
  }

  return <Shell admin active="Projects">
    <Heading eyebrow="PROJECT ACCESS" title="Additional project requests" description="Review contributors who already have an active application before allowing them to join another project." />
    <p><a href="/admin/projects">← All projects</a></p>
    <div className="portfolio-grid">
      {requests.map(request => <article className="suite-card" key={`${request.teamId}:${request.userId}:${request.projectId}`}>
        <h2>{request.name}</h2>
        <p>{request.email}</p>
        <p>Current project · {sourceTitles.get(request.teamId.slice("application:".length))}</p>
        <p>Requested project · {request.target}</p>
        <p>{request.reason}</p>
        <small>Requested {request.updated}</small>
        <form action={decideManagerProjectPermission} className="actions">
          <input type="hidden" name="userId" value={request.userId} />
          <input type="hidden" name="teamId" value={request.teamId} />
          <input type="hidden" name="projectId" value={request.projectId} />
          <button name="decision" value="approved">Approve access</button>
          <button name="decision" value="declined">Decline</button>
        </form>
      </article>)}
    </div>
    {!requests.length && <p className="suite-card">No additional project requests are waiting for review.</p>}
  </Shell>;
}
