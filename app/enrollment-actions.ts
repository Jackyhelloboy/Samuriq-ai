'use server';
import {contractVersion} from './vendor-policy';
import {getChatGPTUser} from './chatgpt-auth';import {getDb} from '../db';import {projectPermissions,teamMembers,projects,operationAudit} from '../db/schema';import {and,eq} from 'drizzle-orm';import {applicationLocks} from './enrollment';import {teamContext} from './team-access';import {redirect} from 'next/navigation';
import {requireOperator} from './access';
import {applications} from '../db/schema';
import {projectState} from './project-state';
export async function requestProjectPermission(f:FormData){const u=await getChatGPTUser();if(!u)throw Error('Sign in first');const target=String(f.get('projectId')||''),reason=String(f.get('reason')||'').trim().slice(0,1000),db=getDb(),j=await db.select().from(projects).where(eq(projects.id,target)).get();if(!j?.active||reason.length<10)throw Error('Choose an active project and explain your request');for(const row of await applicationLocks(u.userId,target)){await db.insert(projectPermissions).values({teamId:row.teamId,userId:u.userId,projectId:target,reason,updated:new Date().toISOString()}).onConflictDoUpdate({target:[projectPermissions.teamId,projectPermissions.userId,projectPermissions.projectId],set:{status:'pending',reason,actor:'',updated:new Date().toISOString()}});}redirect('/projects/detail?id='+encodeURIComponent(target));}
export async function decideManagerProjectPermission(f:FormData){
  const operator=await requireOperator();
  const teamId=String(f.get('teamId')||'');
  const userId=String(f.get('userId')||'');
  const projectId=String(f.get('projectId')||'');
  const status=String(f.get('decision')||'');
  if(!teamId.startsWith('application:')||!['approved','declined'].includes(status))throw Error('Invalid permission request');
  const sourceId=teamId.slice('application:'.length);
  const db=getDb();
  const [source,target,application,request]=await Promise.all([
    db.select().from(projects).where(eq(projects.id,sourceId)).get(),
    db.select().from(projects).where(eq(projects.id,projectId)).get(),
    db.select().from(applications).where(and(eq(applications.userId,userId),eq(applications.projectId,sourceId))).get(),
    db.select().from(projectPermissions).where(and(eq(projectPermissions.teamId,teamId),eq(projectPermissions.userId,userId),eq(projectPermissions.projectId,projectId),eq(projectPermissions.status,'pending'))).get(),
  ]);
  if(!source||!target||!application||!['pending','approved'].includes(application.status)||!request||sourceId===projectId||projectState(source)!=='online'||projectState(target)!=='online')throw Error('This project permission request is no longer valid');
  const changed=await db.update(projectPermissions).set({status,actor:operator.user.userId,updated:new Date().toISOString()}).where(and(eq(projectPermissions.teamId,teamId),eq(projectPermissions.userId,userId),eq(projectPermissions.projectId,projectId),eq(projectPermissions.status,'pending'))).returning();
  if(!changed.length)throw Error('This request has already been reviewed');
  await db.insert(operationAudit).values({id:crypto.randomUUID(),actor:operator.user.userId,action:'additional-project-'+status,target:userId,detail:sourceId+':'+projectId,created:new Date().toISOString()});
  redirect('/admin/projects/permissions');
}
export async function decideProjectPermission(f:FormData){const {user,db,team}=await teamContext(String(f.get('teamId')||'')),userId=String(f.get('userId')||''),projectId=String(f.get('projectId')||''),status=String(f.get('decision'));if(!['approved','declined'].includes(status))throw Error('Invalid decision');const member=await db.select().from(teamMembers).where(and(eq(teamMembers.userId,userId),eq(teamMembers.teamId,team.id))).get();if(!member)throw Error('Member is outside this team');const changed=await db.update(projectPermissions).set({status,actor:user.userId,updated:new Date().toISOString()}).where(and(eq(projectPermissions.teamId,team.id),eq(projectPermissions.userId,userId),eq(projectPermissions.projectId,projectId))).returning();if(!changed.length)throw Error('Request not found');await db.insert(operationAudit).values({id:crypto.randomUUID(),actor:user.userId,action:'additional-project-'+status,target:userId,detail:team.id+':'+projectId,created:new Date().toISOString()});redirect('/teams?team='+team.id);}
export async function acceptAssignedRate(f:FormData){const u=await getChatGPTUser();if(!u)throw Error('Sign in first');const db=getDb(),projectId=String(f.get('projectId')),m=await db.select().from(teamMembers).where(and(eq(teamMembers.userId,u.userId),eq(teamMembers.projectId,projectId))).get();if(!m||(m.vendorFrom?(m.payrollTerms.length<20||String(f.get('termsVersion'))!==await contractVersion(m)):String(m.ratePaise)!==String(f.get('rate')))||f.get('consent')!=='yes')throw Error('Review and accept your assigned project terms');await db.batch([db.update(teamMembers).set({rateAccepted:1}).where(and(eq(teamMembers.userId,u.userId),eq(teamMembers.projectId,projectId),eq(teamMembers.ratePaise,m.ratePaise),eq(teamMembers.payrollTerms,m.payrollTerms),eq(teamMembers.vendorFrom,m.vendorFrom))),db.insert(operationAudit).values({id:crypto.randomUUID(),actor:u.userId,action:'assigned-rate-accepted',target:m.teamId,detail:projectId+':'+m.ratePaise,created:new Date().toISOString()})]);redirect('/projects/detail?id='+encodeURIComponent(projectId));}
