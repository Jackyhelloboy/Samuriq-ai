import { and, eq, sql } from "drizzle-orm";
import { applications } from "../../db/schema";
import { db, digest } from "../recruitment/data";

export function acceptedEmail(email: string) {
  return email.length <= 254 && /^[a-z0-9._%+-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+com$/.test(email);
}

export function mailboxProof(accountId: string, token: string) {
  return digest(JSON.stringify(["mailbox-link", accountId, token]));
}

export async function hasVerifiedMailbox(email: string) {
  return !!await db().prepare("SELECT 1 FROM verified_mailboxes WHERE email=?")
    .bind(email.toLowerCase()).first();
}

// Accounts created before password signup collected profile details keep their
// existing pair access. A new account must prove ownership of its email first.
export function pairMailboxAllowed(accountId: string, email: string) {
  return sql`(NOT EXISTS (SELECT 1 FROM signup_details WHERE account_id=${accountId})
    OR EXISTS (SELECT 1 FROM verified_mailboxes WHERE email=${email.toLowerCase()}))`;
}

export function partnerEmailMatch(user: { userId: string; email: string }) {
  return and(eq(applications.partnerEmail, user.email.toLowerCase()), pairMailboxAllowed(user.userId, user.email));
}
