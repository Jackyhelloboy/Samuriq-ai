import { INDIA_LANGUAGES } from "../india-languages";
import { devices, recruitment } from "./data";
import { saveRecruitment } from "./actions";
export async function BriefForm({id}:{id:string}) {
  const brief = await recruitment(id);
  return <form action={saveRecruitment} className="suite-card editor-form"><h2>Recruitment and group access</h2>
    <input type="hidden" name="id" value={id}/><input type="hidden" name="revision" value={brief?.revision || ""}/>
    <p>Select all accepted options. An empty selection accepts any language or device.</p>
    {(["languages","devices"] as const).map(k=><fieldset key={k}><legend>{k==="languages"?"Project languages":"Accepted devices"}</legend><div className="choice-grid">
      {(k==="languages"?INDIA_LANGUAGES:devices).map(item=><label key={item}><input type="checkbox" name={k} value={item} defaultChecked={brief?.[k].split(", ").includes(item)}/>{item}</label>)}
    </div></fieldset>)}
    <label>Private WhatsApp group invite<input name="group" type="url" defaultValue={brief?.group_url} placeholder="https://chat.whatsapp.com/…"/></label>
    <label>Additional instructions<textarea name="notes" maxLength={1200} defaultValue={brief?.notes}/></label>
    <button>Save recruitment settings</button>
  </form>;
}
