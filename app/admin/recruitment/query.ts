import {settings} from "../../telegram";
import {db} from "../../recruitment/data";
type Person={id:string;username:string;name:string;email:string;location:string;language:string;device:string;phone:string;phone_consent:number;mobileOs:string;osVersion:string;skillLevel:string;skills:string;profile_version:string;verified:number;opened:number};
export function contributors(q:Record<string,string>,limit:number,offset:number){
  const city=(q.city||"").trim().slice(0,80),language=q.language||"",device=q.device||"",checkpoint=q.checkpoint||"";
  return db().prepare(`SELECT p.id,p.username,p.name,p.email,p.location,p.language,p.device,p.skill_level AS skillLevel,p.skills,p.mobile_os AS mobileOs,p.os_version AS osVersion,p.phone,p.phone_consent,r.profile_version,m.verified,
    (SELECT count(*) FROM group_visits g WHERE g.user_id=p.id) opened FROM participants p
    LEFT JOIN recruitment_reviews r ON r.user_id=p.id LEFT JOIN verified_mailboxes m ON m.email=lower(p.email)
    WHERE p.suspended=0 AND lower(p.email)<>? AND NOT EXISTS(SELECT 1 FROM managers m WHERE m.user_id=p.id) AND (?<>'device' OR (p.os_version='' AND p.device IN ('iPhone','Android phone','Phone and computer'))) AND (?<>'profile' OR r.user_id IS NULL) AND instr(lower(p.location),lower(?))>0 AND (?='' OR instr(','||replace(lower(p.language),', ',',')||',', ','||lower(?)||',')>0)
    AND (?='' OR p.skill_level=?) AND (?='' OR p.device=?) AND (?='' OR p.os_version=? OR p.os_version LIKE ?) ORDER BY p.created DESC,p.id LIMIT ? OFFSET ?`).bind(settings().ADMIN_EMAIL?.toLowerCase()||"",checkpoint,checkpoint,city,language,language,q.level||"",q.level||"",device,device,q.version||"",q.version||"",(q.version||"").replace(/[^0-9.]/g,"")+".%",limit,offset).all<Person>();
}
