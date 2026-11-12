import {getDb} from '../../../db';
import {telegramLinkCodes,telegramLinks} from '../../../db/schema';
import {and,eq,gt} from 'drizzle-orm';
import {bot,sendTelegram} from '../../telegram-bot';
import {telegramCodeHash} from '../../telegram-link-actions';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const secret=bot().TELEGRAM_WEBHOOK_SECRET;
 if(!secret||request.headers.get('x-telegram-bot-api-secret-token')!==secret)return new Response('Forbidden',{status:403});
 const raw=await request.text();if(raw.length>32768)return new Response('Too large',{status:413});
 let update:{message?:{chat?:{id?:number;type?:string};text?:string}};try{update=JSON.parse(raw)}catch{return new Response('Invalid JSON',{status:400})}
 const chat=update?.message?.chat;if(!chat?.id||chat.type!=='private')return Response.json({ok:true});
 const text=update.message?.text||'';
 if(/^\/help(?:@[A-Za-z0-9_]+)?$/.test(text)){await sendTelegram(String(chat.id),'Register on https://samuriq-ai-recording-community.thinladle2.chatgpt.site then select your project, complete all tutorials, accept the agreement and wait for TL approval. Website menu → Client workspace → Open work desk → Load client workspace. Submit section screenshots as instructed. Contact your TL through website Support. Never send bank details, passwords or OTPs here.');return Response.json({ok:true})}
 if(/^\/status(?:@[A-Za-z0-9_]+)?$/.test(text)){const linked=await getDb().select({userId:telegramLinks.userId}).from(telegramLinks).where(eq(telegramLinks.chatId,String(chat.id))).get();await sendTelegram(String(chat.id),linked?.userId?'This Telegram account is connected. Open your website workspace for your actual project approval, evidence and daily record.':'This Telegram account is not connected. Sign in to the website and open Connect Telegram to create a private connection code.');return Response.json({ok:true})}
 const code=update.message?.text?.match(/^\/start(?:@[A-Za-z0-9_]+)?\s+([a-f0-9]{48})$/)?.[1];
 if(!code){await sendTelegram(String(chat.id),'Sign in to Samuriq AI, open Connect Telegram and create a private connection code. Telegram usernames alone cannot link an account.');return Response.json({ok:true})}
 const db=getDb(),claimed=await db.update(telegramLinkCodes).set({used:1}).where(and(eq(telegramLinkCodes.codeHash,await telegramCodeHash(code)),eq(telegramLinkCodes.used,0),gt(telegramLinkCodes.expires,Date.now()))).returning();
 if(!claimed.length){await sendTelegram(String(chat.id),'This connection code has expired or was already used. Generate a new code from your signed-in website account.');return Response.json({ok:true})}
 const userId=claimed[0].userId,handle='user:'+userId;
 await db.insert(telegramLinks).values({userId,handle,chatId:String(chat.id),created:new Date().toISOString()}).onConflictDoUpdate({target:telegramLinks.handle,set:{userId,chatId:String(chat.id),created:new Date().toISOString()}});
 await sendTelegram(String(chat.id),'Your Samuriq account is linked for private reminders. Complete website training and wait for your TL approval before work. No password, OTP or bank details are needed here.');return Response.json({ok:true});
}
