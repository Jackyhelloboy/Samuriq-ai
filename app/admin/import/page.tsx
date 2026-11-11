import { requireOwner } from "../../access";
import { Shell, Heading } from "../../components/shell";
import { importProjects } from "../../control-actions";
export const dynamic = "force-dynamic";
export default async function Import() {
  await requireOwner();
  return (
    <Shell admin active="Projects">
      <Heading
        eyebrow="PROJECT OPERATIONS"
        title="Bring your project pipeline."
        description="Import up to 100 client briefs at once. Every imported project starts as a draft, ready for your review."
      />
      <section className="suite-card">
        <h2>Import projects from CSV</h2>
        <p>
          Download the blank template, add your real project details in Excel,
          and save as CSV UTF-8. Keep the heading row unchanged.
        </p>
        <a className="button light" href="/admin/import/template">
          Download CSV template ↓
        </a>
        <form action={importProjects}>
          <label>
            Project CSV
            <input type="file" name="csv" accept=".csv,text/csv" required />
          </label>
          <p>Maximum 1 MB · All rows are validated before anything is saved.</p>
          <button>Import as drafts</button>
        </form>
      </section>
    </Shell>
  );
}
