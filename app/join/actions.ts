"use server";
import {redirect} from "next/navigation";
import {requireOwner} from "../access";
import {randomHex,sessionUser} from "../account";
import {authLimit} from "../auth-rate";
import {db,digest} from "../recruitment/data";
const val=(f:FormData,k:string)=>String(f.get(k)||"").trim();
export type InviteResult={code?:string;message:string};
export async function issueInvitation(_:InviteResult,f:FormData):Promise<InviteResult>{
  const owner=await requireOwner(), role=val(f,"role"), username=val(f,"username").toLowerCase();
  const person=await db().prepare("SELECT p.id,p.email FROM participants p JOIN accounts a ON a.id=p.id WHERE p.username=? AND p.suspended=0").bind(username).first<{id:string;email:string}>();
  if(!person||person.email.toLowerCase()===owner.email.toLowerCase()) return {message:"Select an existing contributor’s username."};
  if(!["manager","tl","helper"].includes(role))return {message:"Choose a supported role."};
  let scope="",label="",permissions="";
  if(role==="tl"){
    scope=val(f,"project");label=val(f,"label");
    const project=await db().prepare("SELECT 1 FROM projects WHERE id=? AND active=1 AND archived_at='' AND hourly_rate>0").bind(scope).first();
    if(!project||!label||label.length>80)return {message:"Choose an open, priced project and enter a team name."};
  }
  if(role==="helper"){
    scope=val(f,"team");
    const member=await db().prepare("SELECT 1 FROM team_members m JOIN project_teams t ON t.id=m.team_id WHERE m.team_id=? AND m.user_id=? AND t.active=1").bind(scope,person.id).first();
    permissions=["review","contact","tickets"].filter(s=>f.getAll("permissions").includes(s)).join(",");
    if(!member||!permissions)return {message:"Choose the contributor’s current team and at least one helper permission."};
  }
  const code="SQ-"+randomHex(12).toUpperCase(),id=crypto.randomUUID(),now=new Date().toISOString();
  await db().batch([
    db().prepare("UPDATE staff_invites SET status='revoked' WHERE recipient=? AND role=? AND scope=? AND status='pending'").bind(person.id,role,scope),
    db().prepare("INSERT INTO staff_invites(id,digest,recipient,role,scope,label,permissions,issuer,expires,created) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(id,await digest(code),person.id,role,scope,label,permissions,owner.userId,Date.now()+48*3600000,now),
    db().prepare("INSERT INTO operation_audit(id,actor,action,target,detail,created) VALUES(?,?,'staff-invite-issued',?,?,?)").bind(crypto.randomUUID(),owner.userId,id,role,now)
  ]);
  return {code,message:"Share this one-time code privately with "+username+". It expires in 48 hours."};
}
export async function revokeInvitation(f:FormData){
  const owner=await requireOwner(),id=val(f,"id");
  await db().batch([db().prepare("UPDATE staff_invites SET status='revoked' WHERE id=? AND status='pending'").bind(id),
    db().prepare("INSERT INTO operation_audit(id,actor,action,target,detail,created) SELECT ?,?,'staff-invite-revoked',id,role,? FROM staff_invites WHERE id=? AND changes()=1").bind(crypto.randomUUID(),owner.userId,new Date().toISOString(),id)]);
  redirect("/admin/invitations");
}
export async function redeemInvitation(_:string,f:FormData):Promise<string>{
  const user=await sessionUser();if(!user)redirect("/login?return_to=%2Fjoin");
  await authLimit("invitation:"+user.userId);
  const entered=val(f,"code");
  if(!entered.toUpperCase().startsWith("SQ-")){
    if(!/^[a-zA-Z0-9_-]{8,64}$/.test(entered))return "Enter the code your coordinator shared.";
    redirect("/teams/join?code="+encodeURIComponent(entered));
  }
  const row=await db().prepare("SELECT role,id FROM staff_invites WHERE digest=? AND recipient=? AND status='pending' AND expires>?")
    .bind(await digest(entered.toUpperCase()),user.userId,Date.now()).first<{role:string;id:string}>();
  if(!row)return "This code is unavailable for your account. Ask the owner for a fresh invitation.";
  if(!await db().prepare("SELECT 1 FROM verified_mailboxes WHERE email=?").bind(user.email.toLowerCase()).first())return "Verify your account email, then enter your code again.";
  let changed;
  try{
    changed=await db().prepare("UPDATE staff_invites SET status='accepted',redeemed=? WHERE id=? AND recipient=? AND status='pending' AND expires>?")
      .bind(new Date().toISOString(),row.id,user.userId,Date.now()).run();
  }catch{return "Your current role, team or project settings prevent this appointment. Ask the owner to review your assignment.";}
  if(!changed.meta.changes)return "This invitation is no longer available.";
  redirect(row.role==="manager"?"/manager":row.role==="tl"?"/teams":"/helper");
}
