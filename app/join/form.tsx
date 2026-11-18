"use client";
import {useActionState} from "react";
import {redeemInvitation} from "./actions";
export default function CodeForm(){
  const [message,action,pending]=useActionState(redeemInvitation,"");
  return <form action={action} className="invite-form"><label>Invitation code<input name="code" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={64}/></label><button disabled={pending}>Continue with code</button>{message&&<p role="alert">{message}</p>}</form>;
}
