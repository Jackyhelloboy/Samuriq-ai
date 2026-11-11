import { getDb } from "../../../db";
import { applications, participants, telegramLinks } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { bot, normHandle, sendTelegram } from "../../telegram-bot";
export const dynamic = "force-dynamic";
// Telegram webhook. Anyone who messages the bot from the Telegram username they registered with is linked and community-verified.
export async function POST(request: Request) {
  const secret = bot().TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret)
    return new Response("Forbidden", { status: 403 });
  const update = (await request.json().catch(() => null)) as { message?: { chat?: { id?: number; type?: string }; from?: { username?: string } } } | null;
  const chat = update?.message?.chat, username = update?.message?.from?.username;
  if (!chat?.id || chat.type !== "private") return Response.json({ ok: true });
  const chatId = String(chat.id);
  if (!username) {
    await sendTelegram(chatId, "Please set a Telegram username (Settings > Username) and message me again so I can verify your registration.");
    return Response.json({ ok: true });
  }
  const handle = normHandle(username), db = getDb();
  const rows = await db.select().from(participants).where(sql`lower(replace(${participants.telegram}, '@', '')) = ${handle}`);
  if (!rows.length) {
    await sendTelegram(chatId, "I could not find a Samuriq AI registration with the Telegram username @" + username + ". Register on the website first and use this exact username.");
    return Response.json({ ok: true });
  }
  await db.insert(telegramLinks).values({ handle, chatId, created: new Date().toISOString() }).onConflictDoUpdate({ target: telegramLinks.handle, set: { chatId } });
  for (const p of rows) await db.update(applications).set({ communityVerified: 1 }).where(eq(applications.userId, p.id));
  await sendTelegram(chatId, "Verified, " + rows[0].name + ". You will get a reminder here if your daily update is missing. Send your update in your workspace every day. Missed days are not paid.");
  return Response.json({ ok: true });
}
