import { Brand } from "../../marks";
export default function DemoLogin() {
  return <main className="demo-workspace"><Brand /><section>
    <h1>Try the project workspace</h1>
    <p>Use a sample manager account to edit a project and preview the listing. No email or password is needed.</p>
    <a className="button dark" href="/demo">Enter demo as manager</a>
    <a href="/login">Sign in to your own account</a>
  </section></main>;
}
