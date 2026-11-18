"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireOperator } from "../access";
import { getDb } from "../../db";
import { participants, projects } from "../../db/schema";
import { db, selections, validGroup, profileVersion } from "./data";

export async function saveRecruitment(f: FormData) {
  await requireOperator();
  const id = String(f.get("id")), version = String(f.get("revision") || "");
  const url = String(f.get("group") || "").trim();
  const notes = String(f.get("notes") || "").trim();
  if (notes.length > 1200 || (url && !validGroup(url))) throw Error("Use a WhatsApp group invite link and up to 1,200 characters of instructions.");
  if (!await getDb().select({id:projects.id}).from(projects).where(eq(projects.id,id)).get()) throw Error("Unknown project");
  const args = [id,selections(f,"languages"),selections(f,"devices"),url,notes,crypto.randomUUID()];
  const statement = version
    ? db().prepare("UPDATE project_recruitment SET languages=?,devices=?,group_url=?,notes=?,revision=? WHERE project_id=? AND revision=?").bind(...args.slice(1),id,version)
    : db().prepare("INSERT OR IGNORE INTO project_recruitment VALUES(?,?,?,?,?,?)").bind(...args);
  const result = await statement.run();
  redirect("/admin/projects/post?id="+encodeURIComponent(id)+"&result="+(result.meta.changes?"saved":"conflict"));
}
export async function verifyProfile(f: FormData) {
  const staff = await requireOperator();
  const id = String(f.get("userId"));
  const p = await getDb().select().from(participants).where(eq(participants.id,id)).get();
  if (!p || p.suspended || !p.location || !p.username || !p.device || !p.language || f.get("checked")!=="yes") throw Error("Check the contributor’s complete profile first.");
  const version = await profileVersion(p);
  if (version!==f.get("version")) throw Error("The profile changed. Refresh and check it again.");
  await db().prepare("INSERT OR REPLACE INTO recruitment_reviews VALUES(?,?,?,?)").bind(id,version,staff.user.userId,new Date().toISOString()).run();
  redirect("/admin/recruitment");
}
export async function createDraft(f:FormData){
  await requireOperator();
  const title=String(f.get("title")||"").trim(), category=String(f.get("category")||"").trim(), description=String(f.get("description")||"").trim();
  if(!title||title.length>120||!category||category.length>100||!description||description.length>4000)throw Error("Check the title, category and description.");
  const id=crypto.randomUUID();
  await getDb().insert(projects).values({id,title,category,description,requirements:"",clientUrl:"",inviteCode:"",pair:f.get("arrangement")==="Pair"?1:0,visibility:"draft",active:0,created:new Date().toISOString()});
  redirect("/admin/projects/post?id="+id);
}
