import { INDIA_STATES } from "./india-states";
import { db, devices, legacyDevices } from "./recruitment/data";

export type SignupDetails = {age:number|null;address:string;city:string;phone:string;device:string;mobile_os:string;os_version:string};

export function signupDetails(id:string) {
  return db().prepare("SELECT age,address,city,phone,device,mobile_os,os_version FROM signup_details WHERE account_id=?")
    .bind(id).first<SignupDetails>();
}

export function readSignupDetails(form:FormData):SignupDetails|null {
  const field=(key:string)=>String(form.get(key)||"").trim();
  const state=field("state"), age=field("age")?Number(field("age")):null, address=field("address"), city=state||field("city");
  if(state&&!INDIA_STATES.some(s=>s.name===state))return null;
  const phone=field("phone").replace(/[\s()-]/g,""), device=field("device");
  const mobile_os=device==="iPhone"||device==="iOS"?"iOS":device==="Android phone"||device==="Android"?"Android":device==="Mac"?"macOS":device==="Phone and computer"?field("mobileOs"):device==="Laptops"?field("mobileOs"):"";
  const os_version=field("osVersion");
  if ((age!==null&&(!Number.isInteger(age)||age<1||age>120))||!city||city.length>65||address.length>300||
      !/^\+?\d{8,15}$/.test(phone)||![...devices,...legacyDevices].some(d=>d===device)||
      (device==="Phone and computer"&&!["Android","iOS"].includes(mobile_os))||
      (os_version&&!/^\d{1,3}(?:\.\d{1,3}){0,3}$/.test(os_version))||
      (mobile_os.length>30)) return null;
  return {age,address,city,phone,device,mobile_os,os_version};
}
