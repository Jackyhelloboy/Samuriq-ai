import { getChatGPTUser } from "../../chatgpt-auth";
import { settings } from "../../telegram";
import { bot, normHandle, sendTelegram } from "../../telegram-bot";
import { teamRows, indiaDay } from "../../team-metrics";
import { getDb } from "../../../db";
import { telegramLinks } from "../../../db/schema";
export const dynamic = "force-dynamic";
// POST from the Admin button, or from any daily scheduler with header "Authorization: Bearer <REMIND_SECRET>" (e.g. 9 pm India time).
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "",
    rs = bot().REMIND_SECRET;
  const byCron = !!rs && auth === "Bearer " + rs;
  if (!byCron) {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return new Response("Invalid origin", { status: 403 });
    const user = await getChatGPTUser();
    if (
      !user ||
      user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
    )
      return new Response("Owner access required", { status: 403 });
  }
  const rows = await teamRows("", indiaDay());
  const links = await getDb().select().from(telegramLinks),
    map = new Map(links.map((l) => [l.userId, l.chatId]));
  let sent = 0,
    unlinked = 0;
  for (const r of rows.filter((x) => !x.today)) {
    const chat = map.get(r.p.id);
    if (!chat) {
      unlinked++;
      continue;
    }
    if (
      await sendTelegram(
        chat,
        "Reminder from Samuriq AI: your daily update for " +
          r.j.title +
          " is missing today. Please submit it in your workspace. Payment depends on client-QC-approved work, not on this reminder.",
      )
    )
      sent++;
  }
  const body = {
    missing: rows.filter((x) => !x.today).length,
    sent,
    notLinkedToBot: unlinked,
  };
  return byCron
    ? Response.json(body)
    : Response.redirect(
        new URL(
          "/admin/team?reminded=" + sent + "&unlinked=" + unlinked,
          request.url,
        ),
        303,
      );
}
