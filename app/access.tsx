import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { settings } from "./telegram";
import { getDb } from "../db";
import { managers } from "../db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
export async function staffRole() {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (user.email.toLowerCase() === settings().ADMIN_EMAIL?.toLowerCase())
    return { user, role: "owner" as const };
  const row = await getDb()
    .select()
    .from(managers)
    .where(eq(managers.userId, user.userId))
    .get();
  return row ? { user, role: "manager" as const } : null;
}
export async function requireOwner(){const user=await getChatGPTUser();if(!user)redirect(chatGPTSignInPath('/admin'));if(user.email.toLowerCase()!==settings().ADMIN_EMAIL?.toLowerCase())throw Error('Owner access required');await (await import('./policy')).requirePolicyRole(user.userId,'owner',true);return user;}
export async function requireOperator() {
  const staff = await staffRole();
  if (!staff) throw Error("Manager or owner access required");
  await (await import("./policy")).requirePolicyRole(staff.user.userId,staff.role,true);
  return staff;
}
