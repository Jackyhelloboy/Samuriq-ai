"use server";

import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { authLimit, AuthRateLimitError } from "../auth-rate";
import { requireChatGPTUser } from "../chatgpt-auth";
import { publicSiteOrigin } from "../deployment-mode";
import { randomHex } from "../account";
import { db } from "../recruitment/data";
import { acceptedEmail, hasVerifiedMailbox, mailboxProof } from "./verification";

export async function requestLink() {
  const user = await requireChatGPTUser("/verify-email");
  const email = user.email.toLowerCase();
  if (await hasVerifiedMailbox(email)) redirect("/verify-email");
  const mail = env as unknown as { RESEND_API_KEY?: string; VERIFICATION_FROM?: string };
  const key = mail.RESEND_API_KEY?.trim();
  if (!key || !acceptedEmail(email)) redirect("/verify-email?status=unavailable");
  try {
    await authLimit("mailbox:" + email);
  } catch (error) {
    if (error instanceof AuthRateLimitError) redirect("/verify-email?status=limited");
    throw error;
  }

  const token = randomHex(32);
  const proof = await mailboxProof(user.userId, token);
  const now = Date.now();
  const result = await db().prepare(`INSERT INTO email_challenges(email,digest,expires,requested)
    VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET digest=excluded.digest,
    expires=excluded.expires,requested=excluded.requested WHERE email_challenges.requested<=?`)
    .bind(email, proof, now + 30 * 60000, now, now - 60000).run();
  if (!result.meta.changes) redirect("/verify-email?status=cooldown");

  const url = new URL("/verify-email", publicSiteOrigin());
  url.searchParams.set("token", token);
  let status = "uncertain";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mail.VERIFICATION_FROM?.trim() || "Samuriq AI <verification@samuriqai.in>",
        to: [email],
        subject: "Confirm your Samuriq AI email address",
        text: "Open this link and confirm while signed in to your Samuriq AI account. It expires in 30 minutes.\n\n" + url,
      }),
      signal: AbortSignal.timeout(12000),
    });
    status = response.ok ? "sent" : "unavailable";
  } catch {
    // A delivery timeout can still result in the link reaching the inbox.
  }
  redirect("/verify-email?status=" + status);
}

export async function confirmLink(form: FormData) {
  const user = await requireChatGPTUser("/verify-email");
  const token = String(form.get("token") || "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/verify-email?status=invalid");

  const email = user.email.toLowerCase();
  const proof = await mailboxProof(user.userId, token);
  const now = Date.now();
  const sql = db();
  const [verified] = await sql.batch([
    sql.prepare(`INSERT OR IGNORE INTO verified_mailboxes(email,verified)
      SELECT email,? FROM email_challenges WHERE email=? AND digest=? AND expires>?`)
      .bind(now, email, proof, now),
    sql.prepare("DELETE FROM email_challenges WHERE email=? AND digest=? AND expires>?")
      .bind(email, proof, now),
  ]);
  if (!verified.meta.changes && !await hasVerifiedMailbox(email)) redirect("/verify-email?status=invalid");
  redirect("/verify-email");
}
