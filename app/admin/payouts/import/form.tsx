"use client";
import {useActionState} from "react";
import {preview,type ImportRow} from "./action";
import {preparePayout} from "../../../payout-actions";
export default function Upload(){
  const [rows,action,pending]=useActionState(preview,[] as ImportRow[]);
  return <><form action={action} className="suite-card"><label>Payout list in CSV format<input type="file" name="file" accept=".csv" required/></label><button disabled={pending}>Check against earnings</button></form>{rows.map((r,i)=><section className="suite-card" key={i}><strong>{r.username} {r.amount&&" · ₹"+r.amount}</strong><p>{r.status}</p>{r.status==="Matched"&&<form action={preparePayout}><input type="hidden" name="earningId" value={r.id}/><label><input type="checkbox" name="bankChecked" value="yes" required/> I verified the beneficiary bank account and amount.</label><button>Prepare this payout</button></form>}</section>)}</>;
}
