import { endSession } from "../account";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  await endSession();
  const r = new URL(request.url).searchParams.get("return_to") || "/";
  return Response.redirect(new URL(r.startsWith("/") && !r.startsWith("//") ? r : "/", request.url), 303);
}

