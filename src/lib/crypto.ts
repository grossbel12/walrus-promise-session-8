const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function signIdentity(identity: string, secret: string): Promise<string> {
  return `${identity}.${await hmac(identity, secret)}`;
}

export async function verifyIdentity(cookieValue: string, secret: string): Promise<string | null> {
  const separator = cookieValue.lastIndexOf(".");
  if (separator < 1) return null;
  const identity = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/iu.test(identity)) return null;
  const expected = await hmac(identity, secret);
  return constantTimeEqual(signature, expected) ? identity : null;
}

export async function userNamespace(identity: string): Promise<string> {
  return `walrus-promise:user:${await sha256(identity)}`;
}

export async function demoNamespace(identity: string): Promise<string> {
  return `walrus-promise:demo:${await sha256(identity)}`;
}

export async function signMemoryJob(identity: string, jobId: string, secret: string): Promise<string> {
  return hmac(`${identity}:${jobId}`, secret);
}

export async function verifyMemoryJob(
  identity: string,
  jobId: string,
  token: string,
  secret: string,
): Promise<boolean> {
  const expected = await signMemoryJob(identity, jobId, secret);
  return constantTimeEqual(token, expected);
}
