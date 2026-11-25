import {requireOwnerView} from "../../access";
import {saveSegment,removeSegment} from "./actions";
import {db,devices} from "../../recruitment/data";
import {INDIA_LANGUAGES} from "../../india-languages";
import {Heading,Shell} from "../../components/shell";
import {audience} from "./query";
export const dynamic="force-dynamic";
export default async function Audience({searchParams}:{searchParams:Promise<Record<string,string>>}){
  await requireOwnerView();
  const q=await searchParams;
  const filters=new URLSearchParams();
  for(const key of ["interest","city","language","device"])if(q[key])filters.set(key,q[key]);
  const {results}=await audience(q,q.after||"");
  const {results:segments}=await db().prepare("SELECT * FROM hiring_segments ORDER BY label").all<{id:number;label:string;interest:string;city:string;language:string;device:string}>();
  const messages:Record<string,string>={saved:"Audience filters saved.",removed:"Saved audience removed.",duplicate:"That audience name is already in use.",invalid:"Check the audience name and filter choices."};
  const displayed=results.slice(0,50);
  return <Shell admin active="WhatsApp audience"><Heading eyebrow="Recruitment" title="WhatsApp audience" description="Build a contact list for a hiring campaign. Only verified accounts that opted in to project invitations appear here."/>
    <form className="suite-card project-filters" method="get"><label>Work type<select name="interest" defaultValue={q.interest||""}><option value="">All work types</option><option value="freelancer">Freelancers</option><option value="vendor">Vendors</option></select></label>
      <label>State<input name="city" defaultValue={q.city||""} maxLength={80} placeholder="Search by state"/></label>
      {([["language","Language",INDIA_LANGUAGES],["device","Device",devices]] as const).map(([key,label,options])=><label key={key}>{label}<select name={key} defaultValue={q[key]||""}><option value="">All</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}
      <button>Filter audience</button></form>
    {q.result && <p role="status">{messages[q.result]}</p>}
    <details className="suite-card"><summary>Saved audiences ({segments.length})</summary>
      {segments.map(({id,label,interest,city,language,device})=><div key={id} className="segment-row"><a href={"?"+new URLSearchParams({interest,city,language,device})}>{label}</a><form action={removeSegment}><input type="hidden" name="id" value={id}/><button aria-label={"Remove "+label}>Remove</button></form></div>)}
      <form action={saveSegment} className="editor-form">{["interest","city","language","device"].map(k=><input key={k} name={k} type="hidden" value={filters.get(k)||""}/>)}<label>Save current filters as<input name="label" required maxLength={64} placeholder="e.g. Hindi freelancers in Pune"/></label><button>Save audience</button></form>
    </details>
    <section className="suite-card"><div className="section-kicker"><h2>Matching contacts</h2>{displayed.length>0&&<a className="button light" href={"/admin/audience/export?"+filters}>Export matching CSV</a>}</div>
      {displayed.length?<div className="table-scroll"><table className="suite-table"><thead><tr>{["Name","Work type","Location","Language","Device","WhatsApp"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{displayed.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.interest}</td><td>{r.city||"—"}</td><td>{r.language||"—"}</td><td>{r.device||"—"}</td><td>•••• {r.whatsapp.slice(-4)}</td></tr>)}</tbody></table></div>:<p>No opted-in contacts match these filters. Contributors can subscribe in Hiring preferences.</p>}
      {results.length>50&&<a href={"?"+filters+"&after="+encodeURIComponent(displayed[49].id)}>Next 50 contacts →</a>}
      <p>Export a fresh list before each campaign so withdrawals are reflected. Exporting downloads contacts to your device.</p>
    </section></Shell>;
}
