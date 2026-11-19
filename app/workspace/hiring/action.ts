"use server";
import {redirect} from "next/navigation";
import {requireChatGPTUser} from "../../chatgpt-auth";
import {db} from "../../recruitment/data";

export async function saveHiringPreferences(form:FormData) {
  const user=await requireChatGPTUser("/workspace/hiring");
  const interest=String(form.get("interest") || "");
  const subscribed=form.get("consent")==="yes";
  const number=subscribed ? String(form.get("whatsapp") || "").replace(/[\s()-]/g,"") : "";
  if (!["freelancer","vendor"].includes(interest) || (subscribed && !/^\+[1-9]\d{7,14}$/.test(number)))
    redirect("/workspace/hiring?result=invalid");
  await db().prepare(`INSERT INTO hiring_preferences(user_id,interest,opted_in,whatsapp,updated,consent_version)
    VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET interest=excluded.interest,opted_in=excluded.opted_in,
    whatsapp=excluded.whatsapp,updated=excluded.updated,consent_version=excluded.consent_version`)
    .bind(user.userId,interest,Number(subscribed),number,new Date().toISOString(),subscribed?"project-invitations-v1":"").run();
  redirect("/workspace/hiring?result=saved");
}
