import "server-only";

import { redirect } from "next/navigation";
import { findUserById } from "./db";
import { getSessionUserId } from "./session";
import type { PublicUser } from "./types";

export async function getUser(): Promise<PublicUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/");
  return user;
}
