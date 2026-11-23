import {websiteOnly} from "./deployment-mode";
import { env } from "cloudflare:workers";
type BotEnv = { BOT_TOKEN?: string; TELEGRAM_WEBHOOK_SECRET?: string; REMIND_SECRET?: string; ADMIN_EMAIL?: string; BOT_USERNAME?:string; TELEGRAM_WEBHOOK_URL?:string };
export const bot = () => env as unknown as BotEnv;
export async function sendTelegram(chatId: string, text: string) {
  if (websiteOnly()) return false;
  const token = bot().BOT_TOKEN;
  if (!token) return false;
  try{const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),signal:AbortSignal.timeout(8000),
  });const result=await r.json() as {ok?:boolean};return r.ok&&result.ok===true;}catch{return false;}
}
