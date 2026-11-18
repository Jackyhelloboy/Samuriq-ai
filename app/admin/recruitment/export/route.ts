import {requireOwner} from "../../../access";
import {contributors} from "../query";
import {csvCell} from "../../../../lib/csv.mjs";
import {profileVersion} from "../../../recruitment/data";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  await requireOwner();
  const q=Object.fromEntries(new URL(request.url).searchParams);
  const encoder=new TextEncoder();
  let offset=0;
  const line=(r:(string|number)[])=>encoder.encode(r.map(csvCell).join(",")+"\r\n");
  const body=new ReadableStream<Uint8Array>({
    start(out){out.enqueue(line(["Username","Name","Email","Email verified","Location","Languages","Experience (self-reported)","Skills","Device","Mobile OS","OS version","Consented contact","Profile review","Group links opened"]));},
    async pull(out){
      const {results}=await contributors(q,100,offset);
      for(const p of results)out.enqueue(line([p.username,p.name,p.email,p.verified?"Yes":"No",p.location,p.language,p.skillLevel,p.skills,p.device,p.mobileOs,p.osVersion,p.phone_consent?p.phone:"",p.profile_version===await profileVersion(p)?"Reviewed":"Pending",p.opened]));
      offset+=results.length;
      if(results.length<100)out.close();
    }
  });
  return new Response(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="samuriq-contributors.csv"',"Cache-Control":"private, no-store"}});
}
