import { getChatGPTUser } from "../../../chatgpt-auth";
import { settings } from "../../../telegram";
import { getDb } from "../../../../db";
import { bankDetails, bankAudit } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { decryptBank } from "../../../bank-crypto";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (
    !user ||
    user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
  )
    return new Response("Owner access required", { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response("Invalid origin", { status: 403 });
  const form = await request.formData(),
    id = String(form.get("userId") || ""),
    db = getDb();
  const bank = await db
    .select()
    .from(bankDetails)
    .where(eq(bankDetails.userId, id))
    .get();
  if (!bank) return new Response("No bank details", { status: 404 });
  const details = await decryptBank(bank.encrypted, id);
  await db
    .insert(bankAudit)
    .values({
      id: crypto.randomUUID(),
      actor: user.userId,
      target: id,
      action: "revealed",
      created: new Date().toISOString(),
    });
  return new Response(
    "SAMURIQ AI — PAYMENT ADMINISTRATION\n\nAccount holder: " +
      details.holder +
      "\nAccount number: " +
      details.account +
      "\nIFSC: " +
      details.ifsc +
      "\n\nUnverified details. No transfer has been initiated.",
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
