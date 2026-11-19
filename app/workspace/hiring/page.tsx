import {Shell,Heading} from "../../components/shell";
import {requireChatGPTUser} from "../../chatgpt-auth";
import {db} from "../../recruitment/data";
import {saveHiringPreferences} from "./action";
export const dynamic="force-dynamic";

export default async function HiringPreferences({searchParams}:{searchParams:Promise<{interest?:string;result?:string}>}) {
  const q=await searchParams;
  const user=await requireChatGPTUser("/workspace/hiring"+(q.interest==="vendor"?"?interest=vendor":""));
  const saved=await db().prepare("SELECT interest,opted_in,whatsapp FROM hiring_preferences WHERE user_id=?").bind(user.userId)
    .first<{interest:string;opted_in:number;whatsapp:string}>();
  return <Shell active="Hiring preferences"><Heading eyebrow="My profile" title="Hiring preferences" description="Choose how you want to work and whether to hear about new projects."/>
    <form action={saveHiringPreferences} className="suite-card editor-form hiring-preferences">
      {q.result==="saved"&&<p role="status">Preferences saved. WhatsApp project invitations are {saved?.opted_in?"on":"off"}.</p>}
      {q.result==="invalid"&&<p role="alert">Choose a work type. To receive invitations, enter your WhatsApp number with its country code, starting with +.</p>}
      <label>Work type<select name="interest" defaultValue={saved?.interest||(q.interest==="vendor"?"vendor":"freelancer")}>
        <option value="freelancer">Freelancer · I do project work</option><option value="vendor">Vendor · I coordinate a team</option></select></label>
      <label>WhatsApp number with country code<input name="whatsapp" autoComplete="tel" type="tel" maxLength={25} defaultValue={saved?.whatsapp||""} placeholder="+91…"/></label>
      <label className="check"><input type="checkbox" name="consent" value="yes" defaultChecked={!!saved?.opted_in}/>I agree to receive WhatsApp messages from Samuriq AI about new project opportunities at this number.</label>
      <p>You can apply without subscribing. To stop future invitations, clear the checkbox and save. Update your city, languages and equipment in <a href="/workspace?edit=1">My profile</a>.</p>
      <button>Save preferences</button>
    </form></Shell>;
}
