import { getChatGPTUser } from "../../chatgpt-auth";
import { settings } from "../../telegram";
import { bot, sendTelegram } from "../../telegram-bot";
import { teamRows, indiaDay } from "../../team-metrics";
import { getDb } from "../../../db";
import {projectState} from "../../project-state";
import {eq,and,sql} from "drizzle-orm";
import { telegramLinks,pairReviews,teamMembers,projectTeams,participants,integrations } from "../../../db/schema";
export const dynamic = "force-dynamic";
// POST from the Admin button, or from any daily scheduler with header "Authorization: Bearer <REMIND_SECRET>" (e.g. 9 pm India time).
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "",
    rs = bot().REMIND_SECRET;
  const byCron = !!rs && auth === "Bearer " + rs;
  if (!byCron) {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return new Response("Invalid origin", { status: 403 });
    const user = await getChatGPTUser();
    if (
      !user ||
      user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
    )
      return new Response("Owner access required", { status: 403 });
  }
  const day=indiaDay(),db=getDb(),rows=(await teamRows("",day)).filter(r=>!r.p.suspended&&!r.j.archivedAt&&projectState(r.j)==='online');
  const reviews=await db.select({projectId:pairReviews.projectId,leadId:pairReviews.leadId}).from(pairReviews).where(eq(pairReviews.day,day));
  const missing=rows.filter(r=>r.j.evidenceRequired?!reviews.some(v=>v.projectId===r.j.id&&v.leadId===r.a.userId):!r.today);
  const links=await db.select().from(telegramLinks),map=new Map(links.filter(l=>l.userId).map(l=>[l.userId,l.chatId]));
  const assignments=await db.select().from(teamMembers).innerJoin(projectTeams,eq(projectTeams.id,teamMembers.teamId)).where(eq(projectTeams.active,1));
  const people=await db.select({id:participants.id,suspended:participants.suspended}).from(participants),restricted=new Set(people.filter(p=>p.suspended).map(p=>p.id));
  const notices:{userId:string;scope:string;text:string}[]=[],groups=new Map<string,{userId:string;projectId:string;title:string;count:number}>();
  for(const r of missing){notices.push({userId:r.p.id,scope:r.j.id,text:r.j.evidenceRequired?'Samuriq AI: today’s team evidence review for '+r.j.title+' has not been published. Please ensure your completed-section screenshots are uploaded, then contact your assigned TL. A pending TL review does not mean you were absent.':'Samuriq AI: your daily update for '+r.j.title+' is missing today. Please open your website workspace and report your actual work or request help.'});
   const t=assignments.find(t=>t.team_members.userId===r.p.id&&t.team_members.projectId===r.j.id)?.project_teams;if(t&&!restricted.has(t.leaderId)){const k=t.leaderId+'|'+r.j.id,g=groups.get(k)||{userId:t.leaderId,projectId:r.j.id,title:r.j.title,count:0};g.count++;groups.set(k,g);}}
  for(const g of groups.values())notices.push({userId:g.userId,scope:'tl:'+g.projectId,text:'Samuriq AI TL follow-up: '+g.count+' approved contribution/pair record(s) in your assigned team for '+g.title+' still need today’s update or evidence review. Open your own team workspace, verify the evidence and submit your daily TL report. This is a portal count, not client activity or QC.'});
  let sent=0,unlinked=0,failed=0,processed=0,alreadySent=0;
  for(const n of notices){const chat=map.get(n.userId);if(!chat){unlinked++;continue;}const id='private-reminder:'+day+':'+n.userId+':'+n.scope,old=await db.select().from(integrations).where(eq(integrations.id,id)).get();if(old?.url==='sent'){alreadySent++;continue;}if(processed>=50)continue;
   const now=Date.now(),lease=await db.insert(integrations).values({id,url:'pending',updated:String(now)}).onConflictDoUpdate({target:integrations.id,set:{url:'pending',updated:String(now)},setWhere:and(sql`${integrations.url}<>'sent'`,sql`CAST(${integrations.updated} AS INTEGER)<${now-300000}`)}).returning();if(!lease.length)continue;processed++;
   if(await sendTelegram(chat,n.text)){await db.update(integrations).set({url:'sent',updated:String(Date.now())}).where(eq(integrations.id,id));sent++;}else failed++;
  }
  const body={missing:missing.length,sent,notLinkedToBot:unlinked,teamLeaderNotices:groups.size,failed,alreadySent,batchLimit:50};
  return byCron
    ? Response.json(body)
    : Response.redirect(
        new URL(
          "/admin/team?reminded=" + sent + "&unlinked=" + unlinked,
          request.url,
        ),
        303,
      );
}
