import { getChatGPTUser } from "../../../chatgpt-auth";
import { settings } from "../../../telegram";
import { teamRows, indiaDay } from "../../../team-metrics";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (
    !user ||
    user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase()
  )
    return new Response("Owner access required", { status: 403 });
  const q = new URL(request.url).searchParams,
    day = q.get("day") || indiaDay(),
    rows = await teamRows(q.get("project") || "", day);
  const data = [
    [
      "Date (India)",
      "Project",
      "Pair lead",
      "Permanent partner",
      "Language",
      "Client ID",
      "Today status",
      "Sections today",
      "Recording minutes today",
      "Target minutes",
      "Reported minutes in target period",
      "QC-approved minutes in target period",
      "Deadline",
    ],
    ...rows.map((r) => [
      day,
      r.j.title,
      r.p.name,
      r.a.partner,
      r.p.language,
      r.today?.clientId || "",
      r.today?.status || "No report",
      r.today?.units || 0,
      r.today?.minutes || 0,
      r.j.targetMinutes,
      r.minutes,
      r.qc,
      r.j.deadline,
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
          'attachment; filename="samuriq-client-daily-report.csv"',
        "Cache-Control": "no-store",
      },
    },
  );
}
