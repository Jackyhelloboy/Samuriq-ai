'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {requireChatGPTUser} from './chatgpt-auth';
import {getDb} from '../db';
import {telegramLinkCodes} from '../db/schema';
import {eq} from 'drizzle-orm';
import {randomHex} from './account';
import {authLimit} from './auth-rate';
export async function telegramCodeHash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');}
export async function createTelegramCode(){const u=await requireChatGPTUser('/workspace/telegram');await authLimit('telegram:'+u.userId);const code=randomHex(24),db=getDb();await db.batch([db.delete(telegramLinkCodes).where(eq(telegramLinkCodes.userId,u.userId)),db.insert(telegramLinkCodes).values({codeHash:await telegramCodeHash(code),userId:u.userId,expires:Date.now()+600000,used:0})]);(await cookies()).set('sq_telegram_code',code,{httpOnly:true,secure:true,sameSite:'lax',path:'/workspace/telegram',maxAge:600});redirect('/workspace/telegram');}
