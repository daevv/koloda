import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { OAUTH_REDIRECT_COOKIE, OAUTH_STATE_COOKIE } from "@/lib/constants";
import { connectWithCode } from "@/lib/pinterest";
import { safeEqual } from "@/lib/secret";
import { cookieBase } from "@/lib/session";

function clearOauth(jar: Awaited<ReturnType<typeof cookies>>) {
  const options = { ...cookieBase(), maxAge: 0 };
  jar.set(OAUTH_STATE_COOKIE, "", options);
  jar.set(OAUTH_REDIRECT_COOKIE, "", options);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const jar = await cookies();

  if (oauthError) {
    clearOauth(jar);
    redirect(`/boards?error=${encodeURIComponent(oauthError)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value;
  const redirectUri = jar.get(OAUTH_REDIRECT_COOKIE)?.value;
  if (!code || !state || !expected || !redirectUri || !safeEqual(state, expected)) {
    clearOauth(jar);
    redirect("/boards?error=state");
  }

  const user = await getUser();
  if (!user) {
    clearOauth(jar);
    redirect("/");
  }

  let failed = false;
  try {
    await connectWithCode(user.id, code, redirectUri);
  } catch (error) {
    console.error(error);
    failed = true;
  }
  clearOauth(jar);
  redirect(failed ? "/boards?error=token" : "/boards");
}
