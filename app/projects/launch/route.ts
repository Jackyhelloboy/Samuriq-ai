import { accessibleProject } from "../../project-access";
import { getDb } from "../../../db";
import { launches } from "../../../db/schema";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response("Invalid origin", { status: 403 });
  try {
    const form = await request.formData(),
      row = await accessibleProject(String(form.get("projectId"))),
      target = new URL(row.projects.clientUrl);
    if (target.protocol !== "https:" || target.username || target.password)
      throw Error("Client destination unavailable");
    await getDb()
      .insert(launches)
      .values({
        id: crypto.randomUUID(),
        userId: row.user.userId,
        projectId: row.projects.id,
        created: new Date().toISOString(),
      });
    return new Response(null, {
      status: 303,
      headers: {
        Location: target.href,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Access unavailable", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
