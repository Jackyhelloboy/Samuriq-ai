import {getDb} from '../db';
import {telegramLinks} from '../db/schema';
import {eq} from 'drizzle-orm';
export async function telegramIdentity(userId:string){const row=await getDb().select().from(telegramLinks).where(eq(telegramLinks.handle,'user:'+userId)).get();return row?.userId===userId&&row.chatId?row:null;}
export async function requireTelegramIdentity(userId:string,j:{telegramRequired?:number}){if(!j.telegramRequired)return;const row=await telegramIdentity(userId);if(!row?.username)throw Error('Verify your Telegram account and username from Connect Telegram before continuing.');}
