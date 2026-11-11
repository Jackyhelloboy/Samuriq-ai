import { env } from "cloudflare:workers";
type BotEnv = { BOT_TOKEN?: string; TELEGRAM_WEBHOOK_SECRET?: string; REMIND_SECRET?: string; ADMIN_EMAIL?: string };
export const bot = () => env as unknown as BotEnv;
export const normHandle = (h: string) => h.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "").toLowerCase();
export async function sendTelegram(chatId: string, text: string) {
  const token = bot().BOT_TOKEN;
  if (!token) return false;
  const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return r.ok;
}

