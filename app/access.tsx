import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { settings } from "./telegram";
import { redirect } from "next/navigation";
export async function requireOwner() {
  const user = await getChatGPTUser();
  if (!user) redirect(chatGPTSignInPath("/admin"));
  if (user.email.toLowerCase() !== settings().ADMIN_EMAIL?.toLowerCase())
    throw Error("Owner access required.");
  return user;
}
