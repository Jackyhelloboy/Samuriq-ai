import { requireOwner } from "../../../access";
import { realProject } from "../../../project-listing";
import { db as directory } from "../../../recruitment/data";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { csvCell } from "../../../../lib/csv.mjs";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Registration = {
  user_id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  city: string;
  state: string;
  language: string;
  age: number | null;
  device: string;
  mobile_os: string;
  os_version: string;
  status: string;
  registered: string;
  team: string;
  leader: string;
  verified: number;
  accepted_at: string;
  client_username: string;
};

export async function GET(request: Request) {
  await requireOwner();
  const projectId = new URL(request.url).searchParams.get("project") || "";
  const project = await getDb().select({ id: projects.id, title: projects.title })
    .from(projects).where(and(eq(projects.id, projectId), realProject)).get();
  if (!project) return new Response("Project unavailable", { status: 404 });

  const encoder = new TextEncoder();
  const line = (values: (string | number | null)[]) =>
    encoder.encode(values.map((value) => csvCell(value ?? "")).join(",") + "\r\n");
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(line([
        "Project", "User ID", "Name", "Email", "Username", "Phone", "State", "City (legacy)",
        "Language", "Age", "Device", "Mobile OS", "OS version", "Application status",
        "Registered", "Team", "Team leader", "Email verified", "Terms accepted",
        "Client username",
      ]));
    },
    async pull(controller) {
      const { results } = await directory().prepare(`
        SELECT a.user_id, p.name, p.email, p.username,
          coalesce(nullif(p.phone,''), s.phone, '') AS phone,
          coalesce(s.city,'') AS city,
          coalesce(nullif(s.state,''), p.location, '') AS state,
          p.language, s.age,
          coalesce(nullif(p.device,''), s.device, '') AS device,
          coalesce(nullif(p.mobile_os,''), s.mobile_os, '') AS mobile_os,
          coalesce(nullif(p.os_version,''), s.os_version, '') AS os_version,
          a.status, a.created AS registered, coalesce(t.label,'') AS team,
          coalesce(leader.name,'') AS leader,
          CASE WHEN v.email IS NULL THEN 0 ELSE 1 END AS verified,
          coalesce(o.accepted_at,'') AS accepted_at,
          coalesce(o.client_username,'') AS client_username
        FROM applications a JOIN participants p ON p.id=a.user_id
        LEFT JOIN signup_details s ON s.account_id=p.id
        LEFT JOIN team_members m ON m.project_id=a.project_id AND m.user_id=a.user_id
        LEFT JOIN project_teams t ON t.id=m.team_id
        LEFT JOIN participants leader ON leader.id=t.leader_id
        LEFT JOIN verified_mailboxes v ON v.email=lower(p.email)
        LEFT JOIN onboarding o ON o.project_id=a.project_id AND o.user_id=a.user_id
        WHERE a.project_id=? ORDER BY a.created DESC, a.user_id LIMIT 200 OFFSET ?
      `).bind(projectId, offset).all<Registration>();
      for (const row of results) {
        controller.enqueue(line([
          project.title, row.user_id, row.name, row.email, row.username, row.phone,
          row.state, row.city, row.language, row.age, row.device, row.mobile_os, row.os_version,
          row.status, row.registered, row.team, row.leader, row.verified ? "Yes" : "No",
          row.accepted_at, row.client_username,
        ]));
      }
      offset += results.length;
      if (results.length < 200) controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="samuriq-project-registrations.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
