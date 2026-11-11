import { requireOwner } from "../../../access";
export async function GET() {
  await requireOwner();
  return new Response(
    "title,category,description,requirements,rate,location,client_url,invite_code,pair\r\n",
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="samuriq-project-import.csv"',
        "Cache-Control": "no-store",
      },
    },
  );
}
