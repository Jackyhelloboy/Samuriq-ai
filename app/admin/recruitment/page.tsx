import {settings} from "../../telegram";
import {requireOperatorView} from "../../access";
import {db,profileVersion,devices} from "../../recruitment/data";
import {verifyProfile} from "../../recruitment/actions";
import {INDIA_LANGUAGES} from "../../india-languages";
import {Shell,Heading} from "../../components/shell";
import {Mail} from "./mail";
export const dynamic="force-dynamic";
type Person={id:string;username:string;name:string;email:string;location:string;language:string;device:string;phone:string;phone_consent:number;profile_version:string;verified:number;opened:number};
export default async function Recruitment({searchParams}:{searchParams:Promise<Record<string,string>>}){
  const operator=await requireOperatorView("/admin/recruitment");
  const q=await searchParams,city=(q.city||"").trim().slice(0,80),language=q.language||"",device=q.device||"",page=Math.max(1,Math.min(10000,Math.trunc(Number(q.page)||1)));
  const {results}=await db().prepare(`SELECT p.id,p.username,p.name,p.email,p.location,p.language,p.device,p.phone,p.phone_consent,r.profile_version,m.verified,
    (SELECT count(*) FROM group_visits g WHERE g.user_id=p.id) opened FROM participants p
    LEFT JOIN recruitment_reviews r ON r.user_id=p.id LEFT JOIN verified_mailboxes m ON m.email=lower(p.email)
    WHERE p.suspended=0 AND lower(p.email)<>? AND NOT EXISTS(SELECT 1 FROM managers m WHERE m.user_id=p.id) AND instr(lower(p.location),lower(?))>0 AND (?='' OR instr(','||replace(lower(p.language),', ',',')||',', ','||lower(?)||',')>0)
    AND (?='' OR p.device=?) ORDER BY p.created DESC,p.id LIMIT 31 OFFSET ?`).bind(settings().ADMIN_EMAIL?.toLowerCase()||"",city,language,language,device,device,(page-1)*30).all<Person>();
  const queue=operator.role!=="owner"?{results:[]}:await db().prepare("SELECT email FROM email_challenges WHERE expires<? AND requested>? ORDER BY requested LIMIT 40").bind(Date.now(),Date.now()-86400000).all<{email:string}>();
  const link=(n:number)=>"?"+new URLSearchParams({city,language,device,page:String(n)});
  return <Shell admin active="Recruitment"><Heading eyebrow="Recruitment" title="Contributor directory" description="Match contributors to a brief and review their current profile."/>
    <form className="filter-bar"><label>City or region<input name="city" defaultValue={city}/></label>
    {([["language",INDIA_LANGUAGES],["device",devices]] as const).map(([key,options])=><label key={key}>{key==="device"?"Device":"Language"}<select name={key} defaultValue={q[key]||""}><option value="">All</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}<button>Find contributors</button></form>
    {await Promise.all(results.slice(0,30).map(async p=>{const version=await profileVersion(p);return <section key={p.id} className="suite-card"><h2>{p.name}</h2><p>{p.username} · {p.location} · {p.language} · {p.device}</p><p>{p.email} · {p.verified?"Inbox verified":"Email awaiting verification"}{p.phone_consent?" · "+p.phone:""}</p><p>Project group links opened: {p.opened}</p>
      {p.profile_version===version?<strong>Profile reviewed</strong>:<form action={verifyProfile}><input type="hidden" name="userId" value={p.id}/><input type="hidden" name="version" value={version}/><label><input type="checkbox" name="checked" value="yes" required/> I checked this contributor’s location, language and device.</label><button>Mark profile reviewed</button></form>}</section>}))}
    {!results.length&&<p>No matching contributors.</p>}<nav>{page>1&&<a href={link(page-1)}>Previous page</a>} {results.length>30&&<a href={link(page+1)}>Next page</a>}</nav>
    {!!queue.results.length&&<section className="suite-card"><h2>Requested verification emails</h2><p>Send each code only to the mailbox shown.</p>{queue.results.map(row=><Mail key={row.email} email={row.email}/>)}</section>}</Shell>;
}
