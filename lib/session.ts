import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { ONBOARDING_COOKIE, SESSION_COOKIE } from "./constants";
import { getSecret } from "./secret";

function key() {
  return new TextEncoder().encode(getSecret());
}

export function cookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase(), expires });
}

export async function deleteSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieBase(), maxAge: 0 });
}

export async function markOnboardingSeen() {
  const jar = await cookies();
  jar.set(ONBOARDING_COOKIE, "1", {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function hasSeenOnboarding() {
  return (await cookies()).get(ONBOARDING_COOKIE)?.value === "1";
}

export async function getSessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
