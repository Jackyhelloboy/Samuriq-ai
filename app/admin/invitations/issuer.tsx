"use client";
import {useActionState,useState} from "react";
import {issueInvitation,type InviteResult} from "../../join/actions";
type Choice={id:string;name:string};
export function Issuer({projects,teams}:{projects:Choice[];teams:Choice[]}){
  const [role,setRole]=useState("tl"),[result,action,pending]=useActionState(issueInvitation,{message:""} as InviteResult);
  return <form className="suite-card invite-form" action={action}><h2>Issue a staff code</h2>
    <label>Contributor username<input name="username" required placeholder="Registered username" autoComplete="off"/></label>
    <label>Role<select name="role" value={role} onChange={e=>setRole(e.target.value)}><option value="tl">Team leader</option><option value="manager">Manager</option><option value="helper">Team helper</option></select></label>
    {role==="tl"&&<><label>Project<select name="project" required><option value="">Select an open project</option>{projects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Direct team name<input name="label" required maxLength={80}/></label></>}
    {role==="helper"&&<><label>Assigned team<select name="team" required><option value="">Select their team</option>{teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <fieldset><legend>Helper permissions</legend>{[["review","Review evidence"],["contact","Team contacts"],["tickets","Support tickets"]].map(([key,label])=><label key={key}><input type="checkbox" name="permissions" value={key}/>{label}</label>)}</fieldset></>}
    <button disabled={pending}>Generate invitation code</button>
    {result.message&&<div role="status"><p>{result.message}</p>{result.code&&<code className="access-code">{result.code}</code>}</div>}
  </form>;
}
