import { BriefForm } from "../../../recruitment/brief-form";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { staffRole } from "../../../access";
import { postEditor } from "../../../project-editor";
import { Delegation } from "./delegation";
import { Shell, Heading } from "../../../components/shell";
import { savePublicPost } from "./action";
import { postFields, postVersion } from "./fields";

export const dynamic = "force-dynamic";

export default async function EditPost({ searchParams }: { searchParams: Promise<{id?: string; team?:string; result?: string}> }) {
  const { id = "", team = "", result } = await searchParams;
  await postEditor(id,team);
  const staff=await staffRole();
  const project = await getDb().select().from(projects).where(eq(projects.id, id)).get();
  if (!project) notFound();
  const visible = !project.archivedAt && (project.active || project.visibility === "listed");
  return <Shell admin={!!staff} active={staff?"Projects":"Team workspace"}>
    <Heading eyebrow="Projects" title="Edit public post" description={project.title} />
    {result === "saved" && <p role="status">{visible ? "Saved. Your public listing has been updated." : "Saved to this unpublished project."}</p>}
    {result === "conflict" && <p role="alert">Someone changed this post. Review the latest details below before saving.</p>}
    {result === "invalid" && <p role="alert">Enter a title and description and check the field lengths.</p>}
    <form action={savePublicPost} className="suite-card editor-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="team" value={team}/><input type="hidden" name="version" value={await postVersion(project)} />
      {postFields.map(({name, label, limit}) => <label key={name}>{label}
        {name === "description" || name === "requirements"
          ? <textarea name={name} rows={5} maxLength={limit} required={name === "description"} defaultValue={project[name]} />
          : <input name={name} maxLength={limit} required={name === "title"} defaultValue={project[name]} />}
      </label>)}
      <button className="button dark">Save post</button>
    </form>
    {staff && <BriefForm id={id} />}
    {staff?.role==="owner" && <Delegation project={id}/>}
    {visible && <a href={"/projects/detail?id=" + encodeURIComponent(id)}>View published post</a>}
  </Shell>;
}
