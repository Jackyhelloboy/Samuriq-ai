"use client";
import {useActionState} from "react";
import {staffCode} from "../../verify-email/actions";
export function Mail({email}:{email:string}){
  const [code,action,pending]=useActionState(staffCode,"");
  return <form action={action}><input type="hidden" name="email" value={email}/><strong>{email}</strong>{" "}
    {code?<a href={"mailto:"+encodeURIComponent(email)+"?subject=Samuriq%20email%20verification&body="+encodeURIComponent("Your verification code is "+code+". It expires in 30 minutes.")}>Open verification email draft</a>:<button disabled={pending}>Prepare inbox verification email</button>}</form>;
}
