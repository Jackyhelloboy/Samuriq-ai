import {ensureTelegramSetup} from '../../../telegram-setup';
export const dynamic='force-dynamic';
export async function GET(){const result=await ensureTelegramSetup().catch(()=>({ready:false,state:'unavailable'}));return Response.json(result,{headers:{'Cache-Control':'no-store'}})}
