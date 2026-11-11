import { getDb } from "../db";
import { applications, participants, projects, progress } from "../db/schema";
import { and, eq } from "drizzle-orm";
export function indiaDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}
export async function teamRows(projectId: string, day: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(applications)
    .innerJoin(participants, eq(participants.id, applications.userId))
    .innerJoin(projects, eq(projects.id, applications.projectId))
    .where(
      and(
        eq(applications.status, "approved"),
        projectId ? eq(applications.projectId, projectId) : undefined,
      ),
    );
  const all = await db
    .select()
    .from(progress)
    .where(projectId ? eq(progress.projectId, projectId) : undefined);
  return rows.map(({ applications: a, participants: p, projects: j }) => {
    const reports = all.filter(
        (r) => r.userId === a.userId && r.projectId === j.id,
      ),
      today = reports.find((r) => r.day === day),
      period = reports.filter(
        (r) =>
          (!j.targetStart || r.day >= j.targetStart) &&
          (!j.deadline || r.day <= j.deadline),
      ),
      minutes = period.reduce((s, r) => s + r.minutes, 0),
      qc = period.reduce(
        (s, r) => s + (r.review === "client-approved" ? r.approvedMinutes : 0),
        0,
      );
    return {
      a,
      p,
      j,
      today,
      minutes,
      qc,
      remaining: Math.max(0, j.targetMinutes - minutes),
      amount: Math.round(((qc * j.hourlyRate) / 60) * 100) / 100,
    };
  });
}
