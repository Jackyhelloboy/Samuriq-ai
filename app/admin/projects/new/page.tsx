import {requireOperatorView} from "../../../access";
import {Shell,Heading} from "../../../components/shell";
import {createDraft} from "../../../recruitment/actions";
export default async function NewProject(){
  await requireOperatorView("/admin/projects/new");
  return <Shell admin active="Projects"><Heading eyebrow="Projects" title="Create a project brief" description="Create a private draft, then add its requirements and group invite."/>
    <form action={createDraft} className="suite-card editor-form"><label>Project title<input required name="title" maxLength={120}/></label>
    <label>Category<input name="category" required maxLength={100}/></label><label>Contributor arrangement<select name="arrangement"><option>Individual</option><option>Pair</option></select></label>
    <label>Project description<textarea name="description" required maxLength={4000}/></label><button>Create draft</button></form></Shell>;
}
