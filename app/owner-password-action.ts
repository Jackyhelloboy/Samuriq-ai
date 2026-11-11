"use server";
import { requireOwner } from "./access";
import { getDb } from "../db";
import { accounts, operationAudit } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, randomHex } from "./account";
import { redirect } from "next/navigation";
export async function setOwnerPassword(form: FormData) {
  const owner = await requireOwner(),
    pw = String(form.get("password") || "");
  if (
    pw.length < 12 ||
    pw.length > 128 ||
    pw !== String(form.get("confirm") || "")
  )
    throw Error("Use matching passwords between 12 and 128 characters");
  const db = getDb(),
    row = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, owner.email.toLowerCase()))
      .get();
  if (row && row.id !== owner.userId)
    throw Error(
      "An owner password account with a different identity exists. Use that existing sign-in to change its password.",
    );
  const salt = randomHex(16),
    hash = await hashPassword(pw, salt);
  await db.batch([
    db
      .insert(accounts)
      .values({
        id: owner.userId,
        email: owner.email.toLowerCase(),
        name: owner.displayName,
        salt,
        hash,
        created: new Date().toISOString(),
      })
      .onConflictDoUpdate({ target: accounts.id, set: { salt, hash } }),
    db
      .insert(operationAudit)
      .values({
        id: crypto.randomUUID(),
        actor: owner.userId,
        action: "owner-password-updated",
        target: owner.userId,
        detail:
          "Owner configured their own password. No additional admin was created.",
        created: new Date().toISOString(),
      }),
  ]);
  redirect("/admin/security?saved=1");
}
