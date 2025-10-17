import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error("JWT_SECRET is not defined in environment variables.");
}
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload: { userId: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h") // Token expires in 2 hours
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = ""): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as { userId: string; role: string };
  } catch (error) {
    console.error("Failed to verify session:", error);
    return null;
  }
}

export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  const session = await encrypt({ userId, role });

  (cookies() as any).set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  (cookies() as any).delete("session");
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const session = (cookies() as any).get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}
