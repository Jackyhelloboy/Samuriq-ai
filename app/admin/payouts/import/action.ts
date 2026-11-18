"use server";
import {requireOwner} from "../../../access";
import {db} from "../../../recruitment/data";
import {parseCSV} from "../../../../lib/parse-csv";
export type ImportRow={id:string;username:string;amount:string;status:string};
export async function preview(_:ImportRow[],form:FormData):Promise<ImportRow[]>{
  await requireOwner();
  const f=form.get("file");
  const problem=(status:string)=>[{id:"",username:"",amount:"",status}];
  if(!(f instanceof File)||f.size>65536)return problem("Choose a CSV smaller than 64 KB.");
  let rows:string[][];
  try{rows=parseCSV((await f.text()).replace(/^\uFEFF/,""));}catch{return problem("Invalid CSV quoting.");}
  if(rows.shift()?.join(",")!=="earning_id,username,amount_inr"||!rows.length||rows.length>100)return problem("Use the template with 1–100 earnings.");
  const seen=new Set<string>();
  let parsed:{id:string;username:string;amount:string}[];
  try{parsed=rows.map((row,i)=>{
    const [id,username,amount]=row.map(c=>c.trim());
    if(row.length!==3||!id||id.length>250||!username||username.length>80||!/^\d{1,9}(\.\d{1,2})?$/.test(amount)||seen.has(id))throw Error("Check the ID, username, amount or duplicate on row "+(i+2));
    seen.add(id);return {id,username,amount};
  });
  }catch(e){return problem(e instanceof Error?e.message:"Invalid row.");}
  const checks=await db().batch<{username:string;amount_paise:number;claimed:number}>(parsed.map(r=>db().prepare("SELECT p.username,e.amount_paise,EXISTS(SELECT 1 FROM payout_items i WHERE i.earning_id=e.id) AS claimed FROM earnings e JOIN participants p ON p.id=e.user_id WHERE e.id=? AND p.suspended=0").bind(r.id)));
  return parsed.map((r,i)=>{const e=checks[i].results[0];return {...r,status:!e||e.username!==r.username||e.amount_paise!==Math.round(Number(r.amount)*100)?"Does not match the ledger":e.claimed?"Already prepared":"Matched"};});
}
