import {workspaceStaffRole} from '../workspace-context';
import {getDb} from '../../db';
import {getChatGPTUser} from '../chatgpt-auth';
import {projectTeams,leaderReports,applications,supportTickets,paymentRequests} from '../../db/schema';
import {eq,and,or,inArray,desc,ne} from 'drizzle-orm';
import {Shell,Heading,Stats} from '../components/shell';
import {workDay} from '../team-access';
import {Bell,ArrowUpRight} from 'lucide-react';

export const dynamic='force-dynamic';

export default async function Notifications(){
  const user=await getChatGPTUser(),staff=await workspaceStaffRole();
  if(!user)return <Shell><Heading eyebrow="YOUR ACTION CENTER" title="Sign in for your updates." description="See project approvals, support replies and payment updates."/><div className="v6-empty-inline"><a className="button dark" href="/login">Sign in</a></div></Shell>;
  const db=getDb(),day=workDay(),teams=await db.select().from(projectTeams).where(staff?eq(projectTeams.active,1):and(eq(projectTeams.leaderId,user.userId),eq(projectTeams.active,1))),daily=await db.select().from(leaderReports).where(eq(leaderReports.day,day)),tickets=await db.select().from(supportTickets).where(and(or(eq(supportTickets.requesterId,user.userId),...(staff?[]:teams.length?[and(inArray(supportTickets.teamId,teams.map(t=>t.id)),eq(supportTickets.privateEscalation,0))]:[])),eq(supportTickets.status,'open'))).orderBy(desc(supportTickets.updated)).limit(50);
  const allTickets=staff?await db.select().from(supportTickets).where(and(eq(supportTickets.status,'open'),staff.role==='owner'?undefined:or(ne(supportTickets.route,'owner'),eq(supportTickets.requesterId,user.userId)))).limit(50):tickets;
  const entries:{title:string;detail:string;href:string;kind:string}[]=allTickets.map(t=>({title:t.subject,detail:t.privateEscalation?'Private manager escalation':'Open project query',href:'/support?ticket='+t.id,kind:'Support'}));
  if(staff){
    for(const t of teams.filter(t=>!daily.some(d=>d.teamId===t.id)))entries.push({title:t.label+' · team update due',detail:'Coordination summary, blockers and next actions are required.',href:'/teams?team='+t.id,kind:'Team'});
    const pending=await db.select().from(applications).where(eq(applications.status,'pending')).limit(100);
    if(pending.length)entries.push({title:pending.length+' applications awaiting review',detail:'Confirm project eligibility, partner and group membership.',href:'/admin',kind:'Onboarding'});
    if(staff.role==='owner'){
      const requests=await db.select().from(paymentRequests).where(eq(paymentRequests.status,'pending')).limit(50);
      if(requests.length)entries.push({title:requests.length+' private payment requests',detail:'Owner beneficiary or family-bank review required.',href:'/admin/identity',kind:'Owner review'});
    }
  }
  return <Shell admin={!!staff}><Heading eyebrow="ACTION CENTER / WEBSITE UPDATES" title="Know what needs your attention." description="Project approvals, support replies and payment actions in one place."/><Stats items={[["Actions shown",entries.length],["Open support queries",allTickets.length],["Team updates due",staff?teams.filter(t=>!daily.some(d=>d.teamId===t.id)).length:0]]}/><section className="suite-card"><h2>Updates & follow-ups</h2>{entries.map((n,i)=><a className="followup-item" key={n.href+i} href={n.href}><span className="followup-icon"><Bell size={17}/></span><span><small>{n.kind}</small><strong>{n.title}</strong><small>{n.detail}</small></span><ArrowUpRight size={17}/></a>)}{!entries.length&&<div className="v6-empty-inline"><h3>You’re up to date.</h3><p>Project approvals, support replies and payment actions appear here.</p></div>}</section></Shell>;
}
