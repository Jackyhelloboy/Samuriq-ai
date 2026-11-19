import {requireOwner} from "../../../access";
import {audience} from "../query";
import {csvCell} from "../../../../lib/csv.mjs";
export const dynamic="force-dynamic";
export async function GET(req:Request) {
  await requireOwner();
  const q=Object.fromEntries(new URL(req.url).searchParams);
  let cursor="";
  const encoder=new TextEncoder(),seen=new Set<string>();
  const row=(values:string[])=>encoder.encode(values.map(csvCell).join(",")+"\r\n");
  const body=new ReadableStream<Uint8Array>({
    start(c){c.enqueue(row(["Name","Work type","WhatsApp (country code and number)","City","Languages","Device","Consent updated (UTC)"]));},
    async pull(c){
      const {results}=await audience(q,cursor,200);
      for(const r of results){
        cursor=r.id;
        if(seen.has(r.whatsapp))continue;
        seen.add(r.whatsapp);
        c.enqueue(row([r.name,r.interest,r.whatsapp.slice(1),r.city,r.language,r.device,r.updated]));
      }
      if(results.length<200)c.close();
    }
  });
  return new Response(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="samuriq-whatsapp-audience.csv"',"Cache-Control":"private, no-store"}});
}
