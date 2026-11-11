import {getChatGPTUser} from './chatgpt-auth';
import {staffRole} from './access';
import {getDb} from '../db';
import {projectTeams,teamMembers,participants,managers,applications,progress} from '../db/schema';
import {and,eq,or,desc} from 'drizzle-orm';
import {settings} from './telegram';
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
export const baseRate=(project:{hourlyRate:number;pair:number})=>Math.round(project.hourlyRate*100/(project.pair?2:1));
export const workDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
export async function teamContext(id:string){const user=await getChatGPTUser();if(!user)throw Error('Sign in first');const db=getDb(),staff=await staffRole(),team=await db.select().from(projectTeams).where(eq(projectTeams.id,id)).get();if(!team||(!staff&&(team.leaderId!==user.userId||!team.active)))throw Error('This team workspace is not assigned to you');return {user,db,staff,team};}
export async function isProtectedStaff(userId:string,email?:string){if(email?.toLowerCase()===settings().ADMIN_EMAIL?.toLowerCase())return true;return !!await getDb().select().from(managers).where(eq(managers.userId,userId)).get();}
export async function teamRoster(teamId:string){const db=getDb(),rows=await db.select().from(teamMembers).innerJoin(participants,eq(participants.id,teamMembers.userId)).where(eq(teamMembers.teamId,teamId));const managerIds=new Set((await db.select().from(managers)).map(x=>x.userId));return rows.map(({team_members:m,participants:p})=>({membership:m,person:{id:p.id,name:p.name,email:p.email,language:p.language,suspended:p.suspended,phone:p.phoneConsent&&!managerIds.has(p.id)&&p.email.toLowerCase()!==settings().ADMIN_EMAIL?.toLowerCase()?p.phone:'',telegram:p.telegram}}));}
export async function teamActivity(teamId:string,projectId:string,day=workDay()){const db=getDb(),roster=await teamRoster(teamId),apps=await db.select().from(applications).where(eq(applications.projectId,projectId)),reports=await db.select().from(progress).where(and(eq(progress.projectId,projectId),eq(progress.day,day)));return roster.map(r=>{const a=apps.find(a=>a.userId===r.person.id)||apps.find(a=>a.partnerConfirmed&&a.partnerEmail===r.person.email.toLowerCase());const report=reports.find(p=>p.userId===(a?.userId||r.person.id));return {...r,application:a?.status||'Not applied',status:report?.status||'No daily update',minutes:report?.minutes||0,units:report?.units||0};});}
