import {settings} from "../../telegram";
import {db} from "../../recruitment/data";
import {workDay} from "../../team-access";
import {ClipboardCheck,UserRoundCheck,Smartphone,CalendarCheck} from "lucide-react";
export async function Checkpoints(){
  const row=await db().prepare(`WITH pool AS (SELECT * FROM participants p WHERE lower(p.email)<>? AND NOT EXISTS(SELECT 1 FROM managers m WHERE m.user_id=p.id)) SELECT
    (SELECT count(*) FROM applications WHERE status='pending') applications,
    (SELECT count(*) FROM pool p WHERE suspended=0 AND NOT EXISTS(SELECT 1 FROM recruitment_reviews r WHERE r.user_id=p.id)) profiles,
    (SELECT count(*) FROM pool WHERE suspended=0 AND device IN ('Android phone','iPhone','Phone and computer') AND os_version='') devices,
    (SELECT count(*) FROM project_teams t JOIN projects p ON p.id=t.project_id WHERE t.active=1 AND p.active=1 AND p.archived_at='' AND NOT EXISTS(SELECT 1 FROM leader_reports r WHERE r.team_id=t.id AND r.day=?)) reports`).bind(settings().ADMIN_EMAIL?.toLowerCase()||"",workDay()).first<{applications:number;profiles:number;devices:number;reports:number}>();
  if(!row)return null;
  return <section aria-label="Recruitment checkpoints" className="checkpoint-grid">{[
    {label:"Pending applications",value:row.applications,Icon:ClipboardCheck,url:"/admin?status=pending"},
    {label:"Profiles awaiting review",value:row.profiles,Icon:UserRoundCheck,url:"/admin/recruitment?checkpoint=profile"},
    {label:"Missing phone versions",value:row.devices,Icon:Smartphone,url:"/admin/recruitment?checkpoint=device"},
    {label:"Team updates due today",value:row.reports,Icon:CalendarCheck,url:"/admin/recruitment?checkpoint=reports"}
  ].map(({label,value,Icon,url})=><a key={label} href={url}><Icon size={21}/><strong>{value}</strong><span>{label}</span></a>)}</section>;
}
