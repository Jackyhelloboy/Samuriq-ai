import {db} from "../../recruitment/data";

export async function VendorInterests({after}:{after:string}){
  const {results}=await db().prepare(`SELECT h.user_id id,a.name,a.email,coalesce(nullif(p.location,''),s.city,'') city,h.updated
    FROM hiring_preferences h JOIN accounts a ON a.id=h.user_id JOIN verified_mailboxes v ON v.email=lower(a.email)
    LEFT JOIN participants p ON p.id=h.user_id LEFT JOIN signup_details s ON s.account_id=h.user_id
    WHERE h.interest='vendor' AND coalesce(p.suspended,0)=0 AND h.user_id>? ORDER BY h.user_id LIMIT 26`)
    .bind(after).all<{id:string;name:string;email:string;city:string;updated:string}>();
  return <section className="suite-card"><h2>Registered vendor interest</h2><p>These people asked to coordinate a team. Review their profile before granting a team assignment.</p>
    {results.length?<div className="table-scroll"><table className="suite-table"><thead><tr><th>Contact</th><th>City</th><th>Updated</th></tr></thead><tbody>{results.slice(0,25).map(r=><tr key={r.id}><td><strong>{r.name}</strong><small>{r.email}</small></td><td>{r.city||"—"}</td><td>{r.updated.slice(0,10)}</td></tr>)}</tbody></table></div>:<p>No registered vendor interest on this page.</p>}
    {results.length>25&&<a href={"?after="+encodeURIComponent(results[24].id)}>Next 25 →</a>}{after&&<a href="/admin/vendors"> First page</a>}
  </section>;
}
