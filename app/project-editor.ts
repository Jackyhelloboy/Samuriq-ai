import { staffRole, requireOperator } from "./access";
import { teamContext } from "./team-access";
import { db } from "./recruitment/data";

export async function postEditor(projectId: string, teamId: string) {
  if (await staffRole()) {
    await requireOperator();
    return;
  }
  const { user, team } = await teamContext(teamId);
  const grant = await db().prepare(
    "SELECT 1 FROM project_teams WHERE id=? AND project_id=? AND active=1 AND leader_id=? AND post_editor=leader_id"
  ).bind(team.id, projectId, user.userId).first();
  if (!grant) throw Error("Ask the owner for permission to edit this project post.");
}
