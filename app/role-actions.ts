"use server";
import { requireOwner } from "./access";
import { getDb } from "../db";
import { managers, participants, operationAudit, projectTeams } from "../db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
export async function setManager(form: FormData) {
  const owner = await requireOwner(),
    db = getDb(),
    userId = String(form.get("userId") || ""),
    grant = form.get("grant") === "yes",
    p = await db
      .select()
      .from(participants)
      .where(eq(participants.id, userId))
      .get();
  if (!p || p.email.toLowerCase() === owner.email.toLowerCase())
    throw Error("Select an existing contributor account");
  if(grant&&await db.select().from(projectTeams).where(eq(projectTeams.leaderId,userId)).get())throw Error("Revoke this contributor’s team leadership before appointing them as manager");
  const action = grant
    ? db
        .insert(managers)
        .values({
          userId,
          grantedBy: owner.userId,
          created: new Date().toISOString(),
        })
        .onConflictDoNothing()
    : db.delete(managers).where(eq(managers.userId, userId));
  await db.batch([
    action,
    db
      .insert(operationAudit)
      .values({
        id: crypto.randomUUID(),
        actor: owner.userId,
        action: grant ? "manager-granted" : "manager-revoked",
        target: userId,
        detail: "Manager access only. Owner privileges cannot be assigned.",
        created: new Date().toISOString(),
      }),
  ]);
  redirect("/admin/people?saved=1");
}
