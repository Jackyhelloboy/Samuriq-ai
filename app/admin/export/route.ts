import { getChatGPTUser } from "../../chatgpt-auth";
import { settings } from "../../telegram";
import { getDb } from "../../../db";
import {
  participants,
  reports,
  progress,
  projects,
  applications,
} from "../../../db/schema";
import { eq, desc, and } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (
    !user ||
    user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
  )
    return new Response("Owner access required", { status: 403 });
  const db = getDb();
  const q = new URL(request.url).searchParams,
    day = q.get("day"),
    project = q.get("project");
  const rows = await db
    .select()
    .from(progress)
    .innerJoin(participants, eq(progress.userId, participants.id))
    .innerJoin(projects, eq(progress.projectId, projects.id))
    .where(
      and(
        day ? eq(progress.day, day) : undefined,
        project ? eq(progress.projectId, project) : undefined,
      ),
    )
    .orderBy(desc(progress.day));
  const earlier = project
    ? []
    : await db
        .select()
        .from(reports)
        .innerJoin(participants, eq(reports.userId, participants.id))
        .where(day ? eq(reports.day, day) : undefined)
        .orderBy(desc(reports.day));
  const missing = day
    ? (
        await db
          .select()
          .from(applications)
          .innerJoin(participants, eq(applications.userId, participants.id))
          .innerJoin(projects, eq(applications.projectId, projects.id))
          .where(
            and(
              eq(applications.status, "approved"),
              project ? eq(applications.projectId, project) : undefined,
            ),
          )
      ).filter(
        (a) =>
          !rows.some(
            (r) =>
              r.project_progress.userId === a.participants.id &&
              r.project_progress.projectId === a.projects.id,
          ),
      )
    : [];
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const data = [
    [
      "Participant",
      "Email",
      "Telegram",
      "Project",
      "Language",
      "Source",
      "Date (India)",
      "Status",
      "Minutes",
      "Units",
      "Notes",
      "Record type",
      "Client ID",
      "Proof URL",
      "Review",
      "Review note",
    ],
    ...rows.map(({ participants: p, project_progress: r, projects: j }) => [
      p.name,
      p.email,
      p.telegram,
      j.title,
      p.language,
      p.source,
      r.day,
      r.status,
      r.minutes,
      r.units,
      r.notes,
      "Project report",
      r.clientId,
      r.proofUrl,
      r.review,
      r.reviewNote,
    ]),
    ...earlier.map(({ participants: p, reports: r }) => [
      p.name,
      p.email,
      p.telegram,
      p.project,
      p.language,
      p.source,
      r.day,
      r.status,
      r.minutes,
      "",
      r.notes,
      "Earlier workspace report",
      "",
      "",
      "",
      "",
    ]),
    ...missing.map(({ participants: p, projects: j }) => [
      p.name,
      p.email,
      p.telegram,
      j.title,
      p.language,
      p.source,
      day,
      "No report",
      0,
      0,
      "",
      "Missing check-in",
      "",
      "",
      "",
      "",
    ]),
  ];
  return new Response(
    "\uFEFF" + data.map((row) => row.map(cell).join(",")).join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="samuriq-work-reports.csv"',
        "Cache-Control": "no-store",
      },
    },
  );
}
