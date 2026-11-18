import {ensureTelegramSetup} from '../../../telegram-setup';
import {requireOwner} from '../../../access';
export const dynamic='force-dynamic';
export async function GET(){return new Response('Not found',{status:404});}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 try{await requireOwner()}catch{return new Response('Owner access required',{status:403})}
 const result=await ensureTelegramSetup().catch(()=>({ready:false,state:'unavailable'}));
 return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
}
