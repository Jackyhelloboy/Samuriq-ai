"use client";
import {useEffect,useRef,useState} from "react";
import {createAccount,submitSignup} from "../account-actions";
import {sendSignupCode} from "../verify-email/actions";
import {codeMessages} from "../verify-email/messages";
import PasswordField from "../components/password-field";
import MobileEquipment from "../components/mobile-equipment";

const errors:Record<string,string>={
  details:"Enter your name and a valid .com email.",short:"Use a password with 8–128 characters.",
  exists:"This email already has an account. Use Sign in.",admin:"Use the existing owner sign-in.",
  rate:"Too many attempts. Try again in 15 minutes.",verification:"This code is incorrect or expired. Check your inbox or request a new code.",
  profile:"Check your age, city, mobile number and device version."
};
export default function SignupForm({returnTo}:{returnTo:string}){
  const email=useRef<HTMLInputElement>(null);
  const [sending,setSending]=useState(false),[notice,setNotice]=useState(""),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const codeBusy=useRef(false), submitBusy=useRef(false);
  const [step,setStep]=useState<0|1|2>(0);
  const accountFields=useRef<HTMLFieldSetElement>(null), profileHeading=useRef<HTMLLegendElement>(null);
  useEffect(()=>setStep(1),[]);
  useEffect(()=>{if(step===2)profileHeading.current?.focus();},[step]);
  function next(){
    const inputs=accountFields.current?.querySelectorAll<HTMLInputElement>("input");
    for(const input of inputs||[]) if(!input.reportValidity())return;
    setStep(2);
  }
  async function send(){
    if(codeBusy.current||!email.current?.reportValidity())return;
    codeBusy.current=true;setSending(true);setNotice("");
    try{setNotice(codeMessages[await sendSignupCode(email.current.value)]);}
    catch{setNotice("The request could not be confirmed. Check your inbox before trying again.");}
    finally{codeBusy.current=false;setSending(false);}
  }
  return <form id="create-account" className="account-form" action={createAccount}
    onSubmit={async e=>{
      e.preventDefault();if(step===1){next();return;}if(submitBusy.current)return;
      const form=new FormData(e.currentTarget);
      submitBusy.current=true;setSaving(true);setError("");
      try{const result=await submitSignup(form);if(result.startsWith("/")){window.location.assign(result);return;}if(result!=="profile")setStep(1);setError(errors[result]||"Check your details and try again.");}
      catch{setError("We could not confirm registration. Try signing in before submitting again.");}
      finally{submitBusy.current=false;setSaving(false);}
    }}>
    <h1>Create your account.</h1><p className="entry-progress" aria-live="polite">{step===2?"Step 2 of 2 · Contact and equipment":"Step 1 of 2 · Account details"}</p>{error&&<p role="alert">{error}</p>}<input type="hidden" name="return_to" value={returnTo}/>
    <fieldset hidden={step===2} ref={accountFields} className="entry-fields"><legend className="sr-only">Account details</legend>
    <label>Full name<input name="name" autoComplete="name" required maxLength={100}/></label>
    <label>Email address<input ref={email} name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} onChange={()=>setNotice("")}/></label>
    <div className="signup-verification"><button type="button" disabled={sending||saving} onClick={send}>{sending?"Requesting…":"Send verification code"}</button>
    <span role="status">{notice} {notice && [codeMessages.requested,codeMessages.delivery].includes(notice) && <a href="/support" target="_blank" rel="noreferrer">Open support in a new tab</a>}</span>
    <label>Code from your inbox<input name="code" required minLength={12} maxLength={12} pattern="[0-9A-Fa-f]{12}" title="Enter the 12-character code from your email" autoComplete="one-time-code" spellCheck={false}/></label></div>
    <PasswordField id="signup-password" creating/>
    {step===1&&<button type="submit">Continue to contact details</button>}</fieldset>
    <fieldset className="entry-fields" hidden={step===1} disabled={step===1}><legend className="sr-only">Your profile</legend><fieldset className="signup-contact"><legend ref={profileHeading} tabIndex={-1}>Contact details</legend>
      <label>Age in years<input type="number" inputMode="numeric" name="age" min={1} max={120} step={1} required/></label>
      <label>Mobile number<input type="tel" name="phone" autoComplete="tel" required maxLength={22} placeholder="+91…"/></label>
      <label>City or town<input name="city" autoComplete="address-level2" required maxLength={65}/></label>
      <label>Street address (optional)<textarea name="address" autoComplete="street-address" rows={2} maxLength={300}/></label>
    </fieldset>
    <MobileEquipment initial="" platform="" version=""/>
    {step===2&&<button className="entry-back" type="button" onClick={()=>setStep(1)}>Back to account details</button>}
    <button className="button dark" disabled={saving||sending}>{saving?"Creating account…":"Create account"}</button></fieldset>
  </form>;
}
