import {bot} from './telegram-bot';
import {getDb} from '../db';
import {integrations} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
const origin='https://samuriq-ai-recording-community.thinladle2.chatgpt.site';
const id='private-telegram-setup-v1';
// Runtime secrets opt in to a fixed, idempotent integration setup. No request data can
// select a destination, read the token, or grant Telegram administration rights.
export async function ensureTelegramSetup(){
 const e=bot();if(!e.BOT_TOKEN||!e.BOT_USERNAME||!e.TELEGRAM_WEBHOOK_SECRET||e.TELEGRAM_WEBHOOK_URL!==origin+'/api/telegram')return {ready:false,state:'not-configured'};
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode([e.BOT_TOKEN,e.BOT_USERNAME,e.TELEGRAM_WEBHOOK_SECRET,e.TELEGRAM_WEBHOOK_URL].join('|')))),x=>x.toString(16).padStart(2,'0')).join('');
 const db=getDb(),row=await db.select().from(integrations).where(eq(integrations.id,id)).get();
 if(row?.url==='ready:'+fingerprint)return {ready:true,state:'ready'};
 const now=Date.now(),lease=await db.insert(integrations).values({id,url:'pending:'+fingerprint,updated:String(now)}).onConflictDoUpdate({target:integrations.id,set:{url:'pending:'+fingerprint,updated:String(now)},setWhere:sql`CAST(${integrations.updated} AS INTEGER)<${now-300000}`}).returning();
 if(!lease.length)return {ready:false,state:row?.url.startsWith('failed:')?'retry-later':'configuring'};
 const call=async(method:string,payload:unknown)=>{const response=await fetch('https://api.telegram.org/bot'+e.BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});const result=await response.json() as {ok:boolean;result?:any};if(!response.ok||!result.ok)throw Error('Telegram setup step failed');return result.result;};
 try{
  const me=await call('getMe',{});if(me.username!==e.BOT_USERNAME)throw Error('Configured bot does not match');
  const results=await Promise.allSettled([
   call('setMyName',{name:'Samuriq AI Project Assistant'}),
   call('setMyDescription',{description:'Official Samuriq AI project assistant. Connect your own registered website account for private reminders. Complete training and receive your TL approval before client work. Use the website for project access, daily evidence and support. Never send passwords, OTPs or bank details here.'}),
   call('setMyShortDescription',{short_description:'Samuriq AI project guidance and private reminders. Register and connect through our official website.'}),
   call('setMyCommands',{commands:[{command:'start',description:'Connect your Samuriq website account'},{command:'help',description:'Project access and support guidance'},{command:'status',description:'Check this Telegram account connection'}]}),
   (async()=>{const asset=await fetch(origin+'/images/samuriq-brand.jpg',{signal:AbortSignal.timeout(10000)});if(!asset.ok)throw Error('Brand image unavailable');const form=new FormData();form.set('photo',JSON.stringify({type:'static',photo:'attach://brand'}));form.set('brand',new Blob([await asset.arrayBuffer()],{type:'image/jpeg'}),'samuriq.jpg');const response=await fetch('https://api.telegram.org/bot'+e.BOT_TOKEN+'/setMyProfilePhoto',{method:'POST',body:form,signal:AbortSignal.timeout(10000)});const result=await response.json() as {ok:boolean};if(!result.ok)throw Error('Bot image setup failed');})()
  ]);
  if(results.some(r=>r.status==='rejected'))throw Error('One or more profile steps failed');
  await call('setWebhook',{url:e.TELEGRAM_WEBHOOK_URL,secret_token:e.TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message'],max_connections:20,drop_pending_updates:false});
  const info=await call('getWebhookInfo',{});if(info.url!==e.TELEGRAM_WEBHOOK_URL)throw Error('Webhook not confirmed');
  await db.update(integrations).set({url:'ready:'+fingerprint,updated:String(Date.now())}).where(eq(integrations.id,id));return {ready:true,state:'ready'};
 }catch{await db.update(integrations).set({url:'failed:'+fingerprint,updated:String(Date.now())}).where(eq(integrations.id,id));return {ready:false,state:'retry-later'};}
}
