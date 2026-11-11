"use server";
import { requireOwner } from "./access";
import { getDb } from "../db";
import { integrations, projects } from "../db/schema";
import { featureDefinitions } from "./features";
import { redirect } from "next/navigation";
export async function saveFeatures(form: FormData) {
  await requireOwner();
  const db = getDb();
  const writes = featureDefinitions.map(([key]) =>
    db
      .insert(integrations)
      .values({
        id: "feature:" + key,
        url: form.get(key) === "on" ? "1" : "0",
        updated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: integrations.id,
        set: {
          url: form.get(key) === "on" ? "1" : "0",
          updated: new Date().toISOString(),
        },
      }),
  );
  await db.batch([writes[0], ...writes.slice(1)]);
  redirect("/admin/settings?saved=1");
}
function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV contains an unclosed quote");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export async function importProjects(form: FormData) {
  await requireOwner();
  const file = form.get("csv");
  if (!(file instanceof File) || file.size > 1000000)
    throw Error("Upload a CSV smaller than 1 MB");
  const rows = parseCSV((await file.text()).replace(/^\uFEFF/, "")),
    headers = rows.shift()?.map((v) => v.trim()) || [];
  if (
    !["title", "category", "description", "requirements", "rate"].every((k) =>
      headers.includes(k),
    )
  )
    throw Error("Use the template headings");
  if (!rows.length || rows.length > 100)
    throw Error("Import 1–100 project rows at a time");
  const values = rows.map((r, i) => {
    if (r.length !== headers.length)
      throw Error("Column count mismatch on row " + (i + 2));
    const x = Object.fromEntries(headers.map((h, k) => [h, r[k].trim()]));
    if (!x.title || !x.description || !x.requirements || !x.rate)
      throw Error("Missing required fields on row " + (i + 2));
    if (
      x.title.length > 120 ||
      x.description.length > 4000 ||
      x.requirements.length > 2000 ||
      x.rate.length > 200 ||
      x.category.length > 100
    )
      throw Error("Text too long on row " + (i + 2));
    if (x.client_url) {
      const u = new URL(x.client_url);
      if (u.protocol !== "https:" || u.username || u.password)
        throw Error("Use HTTPS client URLs without credentials");
    }
    return {
      id: crypto.randomUUID(),
      title: x.title,
      category: x.category,
      description: x.description,
      requirements: x.requirements,
      rate: x.rate,
      location: (x.location || "Remote").slice(0, 200),
      clientUrl: x.client_url || "",
      inviteCode: (x.invite_code || "").slice(0, 100),
      pair: x.pair === "yes" ? 1 : 0,
      active: 0,
      created: new Date().toISOString(),
    };
  });
  const db = getDb();
  const inserts = values.map((v) => db.insert(projects).values(v));
  await db.batch([inserts[0], ...inserts.slice(1)]);
  redirect("/admin/projects?imported=" + values.length);
}
