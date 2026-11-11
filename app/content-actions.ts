"use server";
import { requireOwner } from "./access";
import { getDb } from "../db";
import { integrations } from "../db/schema";
import { redirect } from "next/navigation";
export async function saveContent(form: FormData) {
  await requireOwner();
  const slot = String(form.get("slot"));
  if (!["home", "projects", "workspace", "footer"].includes(slot))
    throw Error("Select a supported page area");
  const url = String(form.get("url") || "").trim();
  if (url) {
    const u = new URL(url, "https://samuriq.local");
    if (
      !["https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      (u.origin === "https://samuriq.local" &&
        (!url.startsWith("/") || url.startsWith("//")))
    )
      throw Error("Use a relative page URL or HTTPS destination");
  }
  const value = JSON.stringify({
    title: String(form.get("title") || "").slice(0, 120),
    body: String(form.get("body") || "").slice(0, 3000),
    label: String(form.get("label") || "").slice(0, 60),
    url,
    enabled: form.get("enabled") === "yes",
  });
  await getDb()
    .insert(integrations)
    .values({
      id: "content:" + slot,
      url: value,
      updated: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: integrations.id,
      set: { url: value, updated: new Date().toISOString() },
    });
  redirect("/admin/content?slot=" + slot + "&saved=1");
}
