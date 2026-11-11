import { getChatGPTUser } from "../../chatgpt-auth";
import { settings } from "../../telegram";
import { getDb } from "../../../db";
import { onboarding, participants, projects } from "../../../db/schema";
import { eq } from "drizzle-orm";
export async function GET() {
  const user = await getChatGPTUser();
  if (
    !user ||
    user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
  )
    return new Response("Owner access required", { status: 403 });
  const rows = await getDb()
    .select()
    .from(onboarding)
    .innerJoin(participants, eq(participants.id, onboarding.userId))
    .innerJoin(projects, eq(projects.id, onboarding.projectId));
  const data = [
    [
      "Name",
      "Website email",
      "Project",
      "Declared client email",
      "Intended client username",
      "Tutorial seconds",
      "Coordinator verified",
      "Terms accepted",
      "Onboarding version",
    ],
    ...rows.map((r) => [
      r.participants.name,
      r.participants.email,
      r.projects.title,
      r.onboarding.clientEmail,
      r.onboarding.clientUsername,
      r.onboarding.watched,
      r.onboarding.verified ? "Yes" : "No",
      r.onboarding.acceptedAt,
      r.onboarding.version,
    ]),
  ];
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return new Response(
    "\uFEFF" + data.map((r) => r.map(cell).join(",")).join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="samuriq-private-registrations.csv"',
        "Cache-Control": "no-store, private",
      },
    },
  );
}
