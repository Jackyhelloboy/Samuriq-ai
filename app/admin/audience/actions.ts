"use server";
import {redirect} from "next/navigation";
import {requireOwner} from "../../access";
import {db,devices} from "../../recruitment/data";
import {INDIA_LANGUAGES} from "../../india-languages";

export async function saveSegment(form:FormData){
  await requireOwner();
  const field=(k:string)=>String(form.get(k)||"").trim();
  const label=field("label"),interest=field("interest"),city=field("city"),language=field("language"),device=field("device");
  if(!label||label.length>64||city.length>80||!["","freelancer","vendor"].includes(interest)||
    (language&&!INDIA_LANGUAGES.some(v=>v===language))||(device&&!devices.some(v=>v===device)))
    redirect("/admin/audience?result=invalid");
  const result=await db().prepare("INSERT INTO hiring_segments(label,interest,city,language,device) VALUES(?,?,?,?,?) ON CONFLICT(label) DO NOTHING")
    .bind(label,interest,city,language,device).run();
  redirect("/admin/audience?"+new URLSearchParams({interest,city,language,device,result:result.meta.changes?"saved":"duplicate"}));
}
export async function removeSegment(form:FormData){
  await requireOwner();
  await db().prepare("DELETE FROM hiring_segments WHERE id=?").bind(Number(form.get("id"))||0).run();
  redirect("/admin/audience?result=removed");
}
