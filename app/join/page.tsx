import {Shell,Heading} from "../components/shell";
import {requireChatGPTUser} from "../chatgpt-auth";
import CodeForm from "./form";
import {db} from "../recruitment/data";
import {KeyRound} from "lucide-react";
export const dynamic="force-dynamic";
export default async function Join(){
  const u=await requireChatGPTUser("/join");
  const profile=await db().prepare("SELECT id FROM participants WHERE id=?").bind(u.userId).first();
  const staff=await db().prepare("SELECT reference FROM staff_ids WHERE user_id=? AND (EXISTS(SELECT 1 FROM managers WHERE user_id=?) OR EXISTS(SELECT 1 FROM project_teams WHERE leader_id=? AND active=1))").bind(u.userId,u.userId,u.userId).first<{reference:string}>();
  return <Shell><Heading eyebrow="Team access" title="Use an invitation" description="Enter the code shared by your team leader or the site owner."/>
    <section className="suite-card join-code"><KeyRound aria-hidden="true"/>{profile?<CodeForm/>:<a className="button dark" href="/workspace?edit=1&return_to=%2Fjoin">Complete your contributor profile</a>}<a href="/verify-email">Confirm my email</a>{staff&&<p>Your staff ID <code>{staff.reference}</code></p>}</section></Shell>;
}
