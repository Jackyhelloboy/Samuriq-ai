import {requireOwnerView} from "../../../access";
import {Shell,Heading} from "../../../components/shell";
import Upload from "./form";
export default async function Import(){
  await requireOwnerView();
  return <Shell admin active="Payout ledger"><Heading eyebrow="Payouts" title="Review a payout list" description="Download posted earnings, keep the rows you want to pay in Excel, then save as CSV UTF-8. Uploading checks your list. Each payment needs separate owner approval."/><a href="/admin/payouts/import/template">Download up to 100 unprepared earnings</a><Upload/></Shell>;
}
