"use client";
import {useRef,useState} from "react";
import {createAccount,submitSignup} from "../account-actions";
import PasswordField from "../components/password-field";
import MobileEquipment from "../components/mobile-equipment";
import {INDIA_STATES} from "../india-states";

const errors:Record<string,string>={
  details:"Enter your name and a valid .com email.",
  short:"Use a password with 8–128 characters.",
  mismatch:"The password confirmation does not match.",
  exists:"This email already has an account. Use Sign in.",
  admin:"Use the existing owner sign-in.",
  rate:"Too many attempts. Try again in 15 minutes.",
  unavailable:"Registration is temporarily unavailable. Contact support if this continues.",
  profile:"Check your age, state, mobile number and detected device."
};
export default function SignupForm({returnTo}:{returnTo:string}){
  const [saving,setSaving]=useState(false),[error,setError]=useState("");
  const submitBusy=useRef(false);
  const [step,setStep]=useState<1|2>(1);
  const accountFields=useRef<HTMLFieldSetElement>(null);
  function next(){
    const inputs=accountFields.current?.querySelectorAll<HTMLInputElement>("input");
    for(const input of inputs||[]) if(!input.reportValidity())return;
    setStep(2);
  }
  return <form id="create-account" className="account-form" action={createAccount}
    onSubmit={async e=>{
      e.preventDefault();if(step===1){next();return;}if(submitBusy.current)return;
      const form=new FormData(e.currentTarget);
      submitBusy.current=true;setSaving(true);setError("");
      try{const result=await submitSignup(form);if(result.startsWith("/")){window.location.assign(result);return;}setStep(result==="profile"?2:1);setError(errors[result]||"Check your details and try again.");}
      catch{setError("We could not confirm registration. Try signing in before submitting again.");}
      finally{submitBusy.current=false;setSaving(false);}
    }}>
    <h1>Create your account.</h1>
    <p className="entry-progress" aria-live="polite">{step===2?"Step 2 of 2 · Your details":"Step 1 of 2 · Account security"}</p>
    {error&&<p role="alert">{error}</p>}
    <input type="hidden" name="return_to" value={returnTo}/>
    <fieldset hidden={step===2} ref={accountFields} className="entry-fields">
      <legend className="sr-only">Account details</legend>
      <label>Full name<input name="name" autoComplete="name" required maxLength={100}/></label>
      <label>Email address<input name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254}/></label>
      <PasswordField id="signup-password" creating/>
      {step===1&&<button type="submit">Continue</button>}
    </fieldset>
    <fieldset className="entry-fields" hidden={step===1} disabled={step===1}>
      <legend className="sr-only">Your details</legend>
      <label>Age in years<input type="number" inputMode="numeric" name="age" min={1} max={120} step={1} required/></label>
      <label>Mobile number<input type="tel" name="phone" autoComplete="tel" required maxLength={22} placeholder="+91…"/></label>
      <label>State / union territory
        <select name="state" required defaultValue="">
          <option value="" disabled>Select your state</option>
          {INDIA_STATES.map(state=><option value={state.name} key={state.code}>{state.name}</option>)}
        </select>
      </label>
      <MobileEquipment initial="" platform="" version=""/>
      {step===2&&<button className="entry-back" type="button" onClick={()=>setStep(1)}>Back</button>}
      <button className="button dark" disabled={saving}>{saving?"Creating account…":"Create account"}</button>
    </fieldset>
  </form>;
}
