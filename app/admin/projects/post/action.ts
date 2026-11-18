"use server";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { postEditor } from "../../../project-editor";
import { postFields, postVersion, type PublicPost } from "./fields";

export async function savePublicPost(form: FormData) {
  const team=String(form.get("team") || "");
  const id = String(form.get("id") ?? "");
  await postEditor(id,team);
  const editor = "/admin/projects/post?id=" + encodeURIComponent(id)+"&team="+encodeURIComponent(team);
  const db = getDb();
  const original = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!original) redirect("/admin/projects");
  if (form.get("version") !== await postVersion(original)) redirect(editor + "&result=conflict");

  const values = {} as PublicPost;
  for (const field of postFields) {
    const value = String(form.get(field.name) ?? "").trim();
    if ((!value && (field.name === "title" || field.name === "description")) || value.length > field.limit) {
      redirect(editor + "&result=invalid");
    }
    values[field.name] = value;
  }
  const updated = await db.update(projects).set(values).where(and(
    eq(projects.id, id),
    ...postFields.map(field => eq(projects[field.name], original[field.name])),
  )).returning({ id: projects.id });
  redirect(editor + (updated.length ? "&result=saved" : "&result=conflict"));
}
