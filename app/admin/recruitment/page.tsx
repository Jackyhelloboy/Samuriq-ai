import {Checkpoints} from "./checkpoints";
import {workDay} from "../../team-access";
import {contributors} from "./query";
import {requireOperatorView} from "../../access";
import {db,profileVersion,devices} from "../../recruitment/data";
import {verifyProfile} from "../../recruitment/actions";
import {INDIA_LANGUAGES} from "../../india-languages";
import {Shell,Heading} from "../../components/shell";
import {Mail} from "./mail";
export const dynamic="force-dynamic";
export default async function Recruitment({searchParams}:{searchParams:Promise<Record<string,string>>}){
  const operator=await requireOperatorView("/admin/recruitment");
  const q=await searchParams,city=(q.city||"").trim().slice(0,80),language=q.language||"",device=q.device||"",page=Math.max(1,Math.min(10000,Math.trunc(Number(q.page)||1)));
  const checkpoint=q.checkpoint||"";
  const overdue=checkpoint==="reports"?await db().prepare("SELECT t.id,t.label,p.title FROM project_teams t JOIN projects p ON p.id=t.project_id WHERE t.active=1 AND p.active=1 AND p.archived_at='' AND NOT EXISTS(SELECT 1 FROM leader_reports r WHERE r.team_id=t.id AND r.day=?) ORDER BY t.label").bind(workDay()).all<{id:string;label:string;title:string}>():null;
  const {results}=await contributors(q,31,(page-1)*30);
  const queue=operator.role!=="owner"?{results:[]}:await db().prepare("SELECT email FROM email_challenges WHERE expires<? AND requested>? ORDER BY requested LIMIT 40").bind(Date.now(),Date.now()-86400000).all<{email:string}>();
  const link=(n:number)=>"?"+new URLSearchParams({city,language,device,checkpoint,level:q.level||"",version:q.version||"",page:String(n)});
  return <Shell admin active="Recruitment"><Heading eyebrow="Recruitment" title="Contributor directory" description="Match contributors to a brief and review their current profile."/>
    {operator.role==="owner"&&<p><a className="button light" href={"/admin/recruitment/export"+link(page)}>Download matching contributors (CSV)</a></p>}<Checkpoints/>{checkpoint&&<a href="/admin/recruitment">Clear checkpoint filter</a>}
    {overdue&&<section className="suite-card"><h2>Team updates due today</h2>{overdue.results.length?overdue.results.map(t=><p key={t.id}><a href={"/teams?team="+encodeURIComponent(t.id)}>{t.label}</a> · {t.title}</p>):<p>Every active team has reported.</p>}</section>}
    <form className="filter-bar"><input type="hidden" name="checkpoint" value={checkpoint}/><label>City or region<input name="city" defaultValue={city}/></label>
    {([["language",INDIA_LANGUAGES],["device",devices]] as const).map(([key,options])=><label key={key}>{key==="device"?"Device":"Language"}<select name={key} defaultValue={q[key]||""}><option value="">All</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}<label>Experience<select name="level" defaultValue={q.level||""}><option value="">All levels</option>{["New to project work","Experienced contributor","Team coordination experience"].map(l=><option key={l}>{l}</option>)}</select></label><label>OS version<input name="version" defaultValue={q.version||""} placeholder="e.g. 18" maxLength={10}/></label><button>Find contributors</button></form>
    {await Promise.all(results.slice(0,30).map(async p=>{const version=await profileVersion(p);return <section key={p.id} className="suite-card"><h2>{p.name}</h2><p>{p.username} · {p.location} · {p.language} · {p.device} {p.mobileOs} {p.osVersion}</p><p>{[p.skillLevel,p.skills].filter(Boolean).join(" · ")}</p><p>{p.email} · {p.verified?"Inbox verified":"Email awaiting verification"}{p.phone_consent?" · "+p.phone:""}</p><p>Project group links opened: {p.opened}</p>
      {p.profile_version===version?<strong>Profile reviewed</strong>:<form action={verifyProfile}><input type="hidden" name="userId" value={p.id}/><input type="hidden" name="version" value={version}/><label><input type="checkbox" name="checked" value="yes" required/> I checked this contributor’s location, language and device.</label><button>Mark profile reviewed</button></form>}</section>}))}
    {!results.length&&<p>No matching contributors.</p>}<nav>{page>1&&<a href={link(page-1)}>Previous page</a>} {results.length>30&&<a href={link(page+1)}>Next page</a>}</nav>
    {!!queue.results.length&&<section className="suite-card"><h2>Requested verification emails</h2><p>Send each code only to the mailbox shown.</p>{queue.results.map(row=><Mail key={row.email} email={row.email}/>)}</section>}</Shell>;
}
