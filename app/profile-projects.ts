import {getDb} from '../db';
import {projects,teamMembers,projectTeams,participants} from '../db/schema';
import {and,eq,asc} from 'drizzle-orm';
import {projectState} from './project-state';
import {applicationLocks} from './enrollment';
export async function profileProjects(userId:string,profile?:typeof participants.$inferSelect|null){
  const db=getDb();
  const [raw,members]=await Promise.all([
    db.select().from(projects).where(and(eq(projects.active,1),eq(projects.archivedAt,''))).orderBy(asc(projects.created)),
    db.select().from(teamMembers).innerJoin(projectTeams,eq(teamMembers.teamId,projectTeams.id)).where(and(eq(teamMembers.userId,userId),eq(projectTeams.active,1))).orderBy(asc(teamMembers.joined)),
  ]);
  const jobs=raw.filter(job=>projectState(job)==='online');
  const choices=await Promise.all(jobs.map(async job=>({id:job.id,title:job.title,locked:(await applicationLocks(userId,job.id)).length>0})));
  const selected=[profile?.primaryProjectId,members[0]?.team_members.projectId,jobs[0]?.id].find(id=>choices.some(job=>job.id===id&&!job.locked))||'';
  return {selected,choices};
}
