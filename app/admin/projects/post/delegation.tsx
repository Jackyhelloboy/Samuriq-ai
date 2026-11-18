import { requireOwner } from "../../../access";
import { db } from "../../../recruitment/data";
import { redirect } from "next/navigation";

async function changeGrant(form: FormData) {
  "use server";
  await requireOwner();
  const project = String(form.get("project"));
  const leader = String(form.get("leader"));
  await db().prepare("UPDATE project_teams SET post_editor=? WHERE id=? AND project_id=? AND leader_id=? AND active=1")
    .bind(form.get("grant")==="yes" ? leader : "",String(form.get("team")),project,leader).run();
  redirect("/admin/projects/post?id="+encodeURIComponent(project));
}

export async function Delegation({project}:{project:string}) {
  const {results} = await db().prepare("SELECT t.id,t.label,t.leader_id,t.post_editor,p.name FROM project_teams t JOIN participants p ON p.id=t.leader_id WHERE t.project_id=? AND t.active=1 ORDER BY t.label")
    .bind(project).all<{id:string; label:string; leader_id:string; post_editor:string; name:string}>();
  return <section className="suite-card"><h2>Team leader editing access</h2>
    <p>Allow an assigned leader to edit this project’s public title, description and requirements.</p>
    {results.length===0 && <p>Assign a team leader to this project first.</p>}
    {results.map(t=><form action={changeGrant} className="invite-history" key={t.id}>
      <input type="hidden" name="team" value={t.id}/><input type="hidden" name="project" value={project}/>
      <input type="hidden" name="leader" value={t.leader_id}/><strong>{t.name} · {t.label}</strong>
      <button name="grant" value={t.post_editor===t.leader_id?"no":"yes"}>{t.post_editor===t.leader_id?"Revoke editing access":"Grant editing access"}</button>
    </form>)}</section>;
}
