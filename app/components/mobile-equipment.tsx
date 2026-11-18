"use client";
import {useState} from "react";
export default function MobileEquipment({initial,platform,version}:{initial:string;platform:string;version:string}){
  const [device,setDevice]=useState(initial||"Android phone"),[mixed,setMixed]=useState(platform||"Android");
  const os=device==="Phone and computer"?mixed:device==="Android phone"?"Android":device==="iPhone"?"iOS":"";
  return <fieldset className="equipment-fields"><legend>Your equipment</legend><label>Device<select name="device" value={device} onChange={e=>setDevice(e.target.value)}>
    {["Android phone","iPhone","Laptop / desktop","Phone and computer"].map(x=><option key={x}>{x}</option>)}</select></label>
    {device==="Phone and computer"&&<label>Phone operating system<select name="mobileOs" value={mixed} onChange={e=>setMixed(e.target.value)}><option>Android</option><option>iOS</option></select></label>}
    {os&&<label key={os}>{os} version<input name="osVersion" required inputMode="decimal" pattern="[0-9]{1,2}([.][0-9]{1,3}){0,2}" defaultValue={os===platform?version:""} placeholder={os==="iOS"?"e.g. 18.4":"e.g. 15"}/><small>{os==="iOS"?"Settings → General → About → iOS Version":"Settings → About phone → Android version"}</small></label>}</fieldset>;
}
