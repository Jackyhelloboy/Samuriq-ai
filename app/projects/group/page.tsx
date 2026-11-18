import { and, eq, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications, projects, participants } from "../../../db/schema";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { db, groupEligibility, recruitment, validGroup } from "../../recruitment/data";
import { projectState } from "../../project-state";
import { Shell, Heading } from "../../components/shell";
import { redirect } from "next/navigation";
import { requireProjectAllowed } from "../../work-membership";
export const dynamic="force-dynamic";
export default async function Group({searchParams}:{searchParams:Promise<{id?:string}>}) {
  const id=(await searchParams).id || "";
  const user=await requireChatGPTUser("/projects/group?id="+encodeURIComponent(id));
  const project=await getDb().select().from(projects).where(eq(projects.id,id)).get();
  const brief=await recruitment(id);
  if (!project || project.archivedAt || projectState(project)!=="online" || !brief || !validGroup(brief.group_url)) redirect("/projects");
  const p=await getDb().select().from(participants).where(eq(participants.id,user.userId)).get();
  const application=await getDb().select().from(applications).where(and(eq(applications.projectId,id),or(eq(applications.userId,user.userId),and(eq(applications.partnerEmail,user.email.toLowerCase()),eq(applications.partnerConfirmed,1))))).orderBy(applications.created).get();
  if (!p || !application) redirect("/projects/detail?id="+encodeURIComponent(id));
  const mailbox=await db().prepare("SELECT 1 FROM verified_mailboxes WHERE email=?").bind(user.email.toLowerCase()).first();
  if (application.status==="approved" && (!project.pair || application.partnerConfirmed) && await groupEligibility(brief,p,user.email)) {
    await requireProjectAllowed(user.userId,id);
    await db().prepare("INSERT OR IGNORE INTO group_visits VALUES(?,?,?)").bind(id,user.userId,new Date().toISOString()).run();
    redirect(brief.group_url);
  }
  return <Shell><Heading eyebrow={project.title} title="Your application is on file" description="Group access opens after email verification, profile review and project approval."/>
    <p>{mailbox?"Email verified.":"Verify your account email to continue."} Your application status is {application.status}.</p>
    {!mailbox&&<a href="/verify-email">Verify email</a>} <a href="/support">Ask your coordinator</a></Shell>;
}
