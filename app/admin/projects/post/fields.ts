export const postFields = [
  { name: "title", label: "Project title", limit: 120 },
  { name: "category", label: "Category", limit: 100 },
  { name: "location", label: "Location", limit: 200 },
  { name: "description", label: "Description", limit: 4000 },
  { name: "requirements", label: "Requirements", limit: 2000 },
] as const;

export type PublicPost = Record<(typeof postFields)[number]["name"], string>;

export async function postVersion(post: PublicPost) {
  const bytes = new TextEncoder().encode(JSON.stringify(postFields.map(field => post[field.name])));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
