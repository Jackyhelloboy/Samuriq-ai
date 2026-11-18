import {requireOwner} from "../../../../access";
import {db} from "../../../../recruitment/data";
import {csvCell} from "../../../../../lib/csv.mjs";
export const dynamic="force-dynamic";
export async function GET(){
  await requireOwner();
  const rows=await db().prepare("SELECT e.id,p.username,e.amount_paise FROM earnings e JOIN participants p ON p.id=e.user_id WHERE p.suspended=0 AND p.username<>'' AND NOT EXISTS(SELECT 1 FROM payout_items i WHERE i.earning_id=e.id) ORDER BY e.day,e.id LIMIT 100").all<{id:string;username:string;amount_paise:number}>();
  const lines=rows.results.map(r=>[r.id,r.username,(r.amount_paise/100).toFixed(2)].map(csvCell).join(","));
  return new Response(["earning_id,username,amount_inr",...lines].join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="payout-review.csv"',"Cache-Control":"private, no-store"}});
}
