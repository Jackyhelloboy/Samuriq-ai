import {requireChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {applications,projects} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {Shell,Heading} from '../../components/shell';
export const dynamic='force-dynamic';
export default async function ClientAccess(){
 const user=await requireChatGPTUser('/workspace/client');
 const rows=await getDb().select().from(applications).innerJoin(projects,eq(applications.projectId,projects.id)).where(eq(applications.userId,user.userId));
 return <Shell active="Client workspace"><Heading eyebrow="YOUR PROJECT ACCESS" title="Open your client workspace." description="Training and coordination happen here. Recording and client QC happen on the client platform."/><div className="client-access-grid">{rows.map(({applications:a,projects:j})=><section className="suite-card" key={j.id}><p className="eyebrow">{a.status==='approved'?'APPLICATION APPROVED':a.status.toUpperCase()}</p><h2>{j.title}</h2><ol><li>Complete all project tutorials and accept the current agreement.</li><li>Confirm your partner where required, join the project Telegram and wait for TL approval.</li><li>Open the work desk and click <strong>Load client workspace</strong>. Sign in using your own client account.</li></ol>{j.inviteCode&&<p>Mandatory client task code: <strong>{j.inviteCode}</strong></p>}<div className="actions"><a className="button dark" href={'/projects/work?id='+encodeURIComponent(j.id)}>Open work desk</a><a className="button light" href={'/projects/onboarding?id='+encodeURIComponent(j.id)}>Training & setup</a></div><p className="small-note">Access is checked on every launch. An external client may block embedded login or recording; report this to your TL. This portal cannot independently confirm client activity or prevent registration on their public website.</p></section>)}</div>{!rows.length&&<section className="suite-card"><h2>No project selected yet</h2><p>Select a project, register your profile and complete onboarding. Your client work desk will appear here after application.</p><a className="button dark" href="/projects">Find projects</a></section>}</Shell>
}
