import {db} from "../../recruitment/data";
import {settings} from "../../telegram";
export type Filters={interest?:string;city?:string;language?:string;device?:string};
type Contact={id:string;name:string;interest:string;city:string;language:string;device:string;whatsapp:string;updated:string};
export function audience(q:Filters,cursor="",limit=51){
  const city=(q.city||"").trim().slice(0,80),language=q.language||"",device=q.device||"",interest=q.interest||"";
  return db().prepare(`WITH eligible AS (
    SELECT h.user_id id,a.name,h.interest,h.whatsapp,h.updated,
      coalesce(nullif(p.location,''),s.city,'') city,coalesce(p.language,'') language,
      coalesce(nullif(p.device,''),s.device,'') device
    FROM hiring_preferences h JOIN accounts a ON a.id=h.user_id
    JOIN verified_mailboxes v ON v.email=lower(a.email)
    LEFT JOIN participants p ON p.id=h.user_id LEFT JOIN signup_details s ON s.account_id=h.user_id
    WHERE h.opted_in=1 AND coalesce(p.suspended,0)=0 AND lower(a.email)<>?
    AND NOT EXISTS (SELECT 1 FROM managers m WHERE m.user_id=h.user_id)
  ) SELECT * FROM eligible WHERE id>? AND (?='' OR interest=?) AND instr(lower(city),lower(?))>0
    AND (?='' OR instr(','||replace(lower(language),', ',',')||',', ','||lower(?)||',')>0)
    AND (?='' OR device=?) ORDER BY id LIMIT ?`)
    .bind(settings().ADMIN_EMAIL?.toLowerCase()||"",cursor,interest,interest,city,language,language,device,device,limit).all<Contact>();
}
