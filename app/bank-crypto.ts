import { env } from "cloudflare:workers";
async function bankKey() {
  const raw = (env as unknown as { BANK_ENCRYPTION_KEY?: string })
    .BANK_ENCRYPTION_KEY;
  if (!raw || !/^[a-f0-9]{64}$/.test(raw))
    throw Error("Bank storage is not configured");
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(raw.match(/../g)!, (x) => parseInt(x, 16)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptBank(
  value: { holder: string; account: string; ifsc: string },
  userId: string,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) },
    await bankKey(),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return JSON.stringify({
    iv: Array.from(iv),
    cipher: Array.from(new Uint8Array(encrypted)),
  });
}
export async function decryptBank(
  value: string,
  userId: string,
): Promise<{ holder: string; account: string; ifsc: string }> {
  const data = JSON.parse(value);
  const decoded = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(data.iv),
      additionalData: new TextEncoder().encode(userId),
    },
    await bankKey(),
    new Uint8Array(data.cipher),
  );
  return JSON.parse(new TextDecoder().decode(decoded));
}
