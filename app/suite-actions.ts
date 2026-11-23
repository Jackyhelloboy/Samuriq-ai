"use server";
import {websiteOnly} from "./deployment-mode";
import { requireOwner } from "./access";
import { getDb } from "../db";
import { integrations, notices } from "../db/schema";
import { redirect } from "next/navigation";
export async function saveIntegration(form: FormData) {
  await requireOwner();
  if(websiteOnly())throw Error("External integrations are disabled. Use website announcements and support.");
  const id = String(form.get("id")),
    raw = String(form.get("url") || "").trim();
  const hosts: Record<string, string[]> = {
    telegram: ["t.me"],
    discord: ["discord.gg", "discord.com"],
    instagram: ["instagram.com", "www.instagram.com"],
  };
  if (!hosts[id]) throw Error("Unsupported service");
  if (raw) {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      !hosts[id].includes(u.hostname) ||
      u.username ||
      u.password
    )
      throw Error("Use the official service URL");
  }
  await getDb()
    .insert(integrations)
    .values({ id, url: raw, updated: new Date().toISOString() })
    .onConflictDoUpdate({
      target: integrations.id,
      set: { url: raw, updated: new Date().toISOString() },
    });
  redirect("/admin/integrations?saved=1");
}
export async function announce(form: FormData) {
  await requireOwner();
  const title = String(form.get("title") || "")
      .trim()
      .slice(0, 120),
    body = String(form.get("body") || "")
      .trim()
      .slice(0, 3000);
  if (!title || !body) throw Error("Title and message required");
  await getDb().insert(notices).values({
    id: crypto.randomUUID(),
    title,
    body,
    created: new Date().toISOString(),
  });
  redirect("/admin/announcements?saved=1");
}

