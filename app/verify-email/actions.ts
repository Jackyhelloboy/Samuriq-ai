"use server";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { authLimit,safeReturn,AuthRateLimitError } from "../auth-rate";
import { requireOwner } from "../access";
import { sessionUser } from "../account";
import { db, digest } from "../recruitment/data";
import { acceptedEmail, normalizeEmail, issueCode, consumeCode, markVerified } from "./verification";

export async function sendSignupCode(address:string) {
  const email=normalizeEmail(address);
  if (!acceptedEmail(email)) return "address";
  try { await authLimit(email); }
  catch(error) { if(error instanceof AuthRateLimitError) return "limited"; throw error; }
  const now=Date.now();
  const inserted=await db().prepare("INSERT INTO email_challenges(email,requested) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET requested=excluded.requested WHERE email_challenges.requested < ?")
    .bind(email,now,now-60000).run();
  const mail=env as unknown as {RESEND_API_KEY?:string;VERIFICATION_FROM?:string};
  if(!inserted.meta.changes) return "cooldown";
  const key=mail.RESEND_API_KEY?.trim();
  if (!key) return "requested";
  const sender=mail.VERIFICATION_FROM?.trim() || "Samuriq AI <verification@samuriqai.in>";
  const code=await issueCode(email);
  try {
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify({from:sender,to:[email],subject:"Your Samuriq AI verification code",
        text:"Enter this code on your Samuriq sign-up page: "+code+"\n\nThe code expires in 30 minutes. If you did not request it, you can ignore this email."}),
      signal:AbortSignal.timeout(12000)
    });
    if (response.ok) return "sent";
    console.warn("Signup email rejected by delivery provider",response.status);
  } catch {
    // A timed-out request may still deliver. Keep its code usable.
    console.warn("Signup email delivery could not be confirmed");
    return "uncertain";
  }
  await db().prepare("UPDATE email_challenges SET digest='',expires=0 WHERE email=? AND requested=? AND digest=?")
    .bind(email,now,await digest(email+"|"+code)).run();
  return "delivery";
}
export async function requestCode(f:FormData) {
  const status=await sendSignupCode(String(f.get("email")||""));
  redirect("/verify-email?status="+status+"&return_to="+encodeURIComponent(safeReturn(f.get("return_to"))));
}
export async function staffCode(_:string,f:FormData) {
  await requireOwner();
  const email=normalizeEmail(f.get("email"));
  if(!acceptedEmail(email)) throw Error("Invalid email");
  return await issueCode(email);
}
export async function confirmExisting(f:FormData) {
  const user=await sessionUser();
  if(!user) redirect("/login");
  const email=normalizeEmail(user.email);
  await authLimit(email);
  if(!await consumeCode(email,f.get("code"))) redirect("/verify-email?status=invalid");
  await markVerified(email);
  redirect("/verify-email?status=verified");
}
