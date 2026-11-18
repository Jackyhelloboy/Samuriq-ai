import {requireOwnerView} from "../../access";
import {db} from "../../recruitment/data";
import {Shell,Heading} from "../../components/shell";
import {KeyRound,Users,ClipboardCheck} from "lucide-react";
import {Issuer} from "./issuer";
import {revokeInvitation} from "../../join/actions";
export const dynamic="force-dynamic";
type Choice={id:string;name:string};
type Entry={id:string;username:string;role:string;status:string;expires:number;label:string};
export default async function Invitations(){
  await requireOwnerView();
  const [projects,teams,history,staff]=await Promise.all([
    db().prepare("SELECT id,title AS name FROM projects WHERE active=1 AND archived_at='' AND hourly_rate>0 ORDER BY title").all<Choice>(),
    db().prepare("SELECT t.id,t.label||' · '||p.title AS name FROM project_teams t JOIN projects p ON p.id=t.project_id WHERE t.active=1 ORDER BY t.label").all<Choice>(),
    db().prepare("SELECT i.id,p.username,i.role,i.status,i.expires,i.label FROM staff_invites i JOIN participants p ON p.id=i.recipient ORDER BY i.created DESC LIMIT 50").all<Entry>(),
    db().prepare("SELECT p.username,s.reference FROM staff_ids s JOIN participants p ON p.id=s.user_id WHERE EXISTS(SELECT 1 FROM managers WHERE user_id=p.id) OR EXISTS(SELECT 1 FROM project_teams WHERE leader_id=p.id AND active=1) ORDER BY p.username").all<{username:string;reference:string}>()
  ]);
  return <Shell admin active="Staff invitations"><Heading eyebrow="People & access" title="Staff invitations" description="Invite a registered contributor into a role and track who accepted."/>
    <div className="invitation-layout"><Issuer projects={projects.results} teams={teams.results}/>
    <aside className="suite-card"><KeyRound/><h2>How staff join</h2><ol><li>Choose their username and role.</li><li>Share the code privately.</li><li>They sign in and enter it on the invitation page.</li></ol><a href="/join">Open invitation page →</a></aside></div>
    <section className="suite-card"><h2><ClipboardCheck size={22}/> Recent invitations</h2>{history.results.length?history.results.map(i=>{const status=i.status==="pending"&&i.expires<=Date.now()?"expired":i.status;return <div className="invite-history" key={i.id}><span><strong>{i.username}</strong><small>{i.role==="tl"?"Team leader":i.role} {i.label}</small></span><span className="badge">{status}</span>{status==="pending"&&<form action={revokeInvitation}><input type="hidden" name="id" value={i.id}/><button>Revoke</button></form>}</div>}):<p>Your first invitation will appear here.</p>}</section>
    <section className="suite-card"><h2><Users size={22}/> Staff directory</h2><p>Use these permanent IDs when referring to staff in reports.</p>{staff.results.map(s=><div key={s.reference} className="invite-history"><strong>{s.username}</strong><code>{s.reference}</code></div>)}</section>
  </Shell>;
}
