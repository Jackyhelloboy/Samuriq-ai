import { db, devices } from "./recruitment/data";

export type SignupDetails = {age:number;address:string;city:string;phone:string;device:string;mobile_os:string;os_version:string};

export function signupDetails(id:string) {
  return db().prepare("SELECT age,address,city,phone,device,mobile_os,os_version FROM signup_details WHERE account_id=?")
    .bind(id).first<SignupDetails>();
}

export function readSignupDetails(form:FormData):SignupDetails|null {
  const field=(key:string)=>String(form.get(key)||"").trim();
  const age=Number(field("age")), address=field("address"), city=field("city");
  const phone=field("phone").replace(/[\s()-]/g,""), device=field("device");
  const mobile_os=device==="iPhone"?"iOS":device==="Android phone"?"Android":device==="Phone and computer"?field("mobileOs"):"";
  const os_version=mobile_os?field("osVersion"):"";
  if (!Number.isInteger(age)||age<1||age>120||!city||city.length>65||address.length>300||
      !/^\+?\d{8,15}$/.test(phone)||!devices.some(d=>d===device)||
      (device==="Phone and computer"&&!["Android","iOS"].includes(mobile_os))||
      (mobile_os&&!/^[1-9]\d?(?:\.\d{1,3}){0,2}$/.test(os_version))) return null;
  return {age,address,city,phone,device,mobile_os,os_version};
}
