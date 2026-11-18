import {codeMessages} from "./messages";
import {sessionUser} from "../account";
import {Shell,Heading} from "../components/shell";
import {requestCode,confirmExisting} from "./actions";
import {safeReturn} from "../auth-rate";
export const dynamic="force-dynamic";
export default async function Verification({searchParams}:{searchParams:Promise<{status?:string;return_to?:string}>}){
  const q=await searchParams, user=await sessionUser(),next=safeReturn(q.return_to);
  return <Shell><Heading eyebrow="Account" title="Verify your email" description="Use a .com address whose inbox you can open."/>
    <section className="suite-card editor-form">
      {q.status&&<p role="status">{codeMessages[q.status]}</p>}
      <form action={requestCode}><input type="hidden" name="return_to" value={next}/><label>Email address<input type="email" name="email" required defaultValue={user?.email} readOnly={!!user}/></label><button>Request verification code</button></form>
      {user?<form action={confirmExisting}><label>Code from your inbox<input name="code" required maxLength={12} autoComplete="one-time-code"/></label><button>Verify my account</button></form>:<a href={"/login?return_to="+encodeURIComponent(next)+"#create-account"}>I have my code · Create account</a>}
    </section></Shell>;
}
