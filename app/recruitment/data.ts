import { env } from "cloudflare:workers";
import { INDIA_LANGUAGES } from "../india-languages";
export const devices = ["Android phone", "iPhone", "Laptop / desktop", "Phone and computer"] as const;
export const db = () => {
  if (!env.DB) throw Error("Database unavailable");
  return env.DB;
};
export type Brief = { project_id: string; languages: string; devices: string; group_url: string; notes: string; revision: string };
export function recruitment(id: string) {
  return db().prepare("SELECT * FROM project_recruitment WHERE project_id=?").bind(id).first<Brief>();
}
export function selections(form: FormData, key: string) {
  const allowed: readonly string[] = key === "languages" ? INDIA_LANGUAGES : devices;
  return allowed.filter(item => form.getAll(key).includes(item)).join(", ");
}
export function validGroup(url: string) {
  return /^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9_-]{12,64}$/.test(url);
}
export const words = (value: string) => value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
export function matches(brief: Brief, profile: {language:string; device:string;mobileOs?:string}) {
  const langs = words(brief.languages), hardware = words(brief.devices);
  const owned = words(profile.device);
  if (owned.includes("phone and computer")) owned.push("laptop / desktop",profile.mobileOs==="iOS"?"iphone":profile.mobileOs==="Android"?"android phone":"");
  return (!langs.length || langs.some(l => words(profile.language).includes(l))) &&
    (!hardware.length || hardware.some(d => owned.includes(d)));
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
}
export function profileVersion(p: {username:string;name:string;email:string;location:string;language:string;device:string;phone:string;mobileOs?:string;osVersion?:string}) {
  return digest(JSON.stringify([p.username,p.name,p.email,p.location,p.language,p.device,p.phone,...(p.mobileOs||p.osVersion?[p.mobileOs,p.osVersion]:[])]));
}
export async function groupEligibility(brief:Brief,p:{id:string;username:string;name:string;email:string;location:string;language:string;device:string;phone:string;mobileOs?:string;osVersion?:string;suspended:number},email:string){
  if(p.suspended || !matches(brief,p)) return false;
  const reviewed=await db().prepare("SELECT r.profile_version FROM recruitment_reviews r WHERE r.user_id=? AND EXISTS(SELECT 1 FROM verified_mailboxes WHERE email=?)").bind(p.id,email.toLowerCase()).first<{profile_version:string}>();
  return reviewed?.profile_version===await profileVersion(p);
}

export async function memberBrief(projectId:string,userId?:string){
  const brief=await recruitment(projectId);
  if(!userId)return brief;
  const team=await db().prepare("SELECT g.url FROM team_group_links g JOIN team_members m ON m.team_id=g.team_id JOIN project_teams t ON t.id=g.team_id WHERE m.project_id=? AND m.user_id=? AND t.active=1 AND g.url<>''").bind(projectId,userId).first<{url:string}>();
  if(!team)return brief;
  return {...(brief||{project_id:projectId,languages:"",devices:"",notes:"",revision:""}),group_url:team.url};
}
