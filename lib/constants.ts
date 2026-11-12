export const SESSION_COOKIE = "koloda_session";
export const PREFS_COOKIE = "koloda_prefs";
export const ONBOARDING_COOKIE = "koloda_onboarded";

export function freshDeckPath() {
  return `/deck?s=${crypto.randomUUID().slice(0, 8)}`;
}
export const OAUTH_STATE_COOKIE = "koloda_oauth_state";
export const OAUTH_REDIRECT_COOKIE = "koloda_oauth_redirect";

export const PINTEREST_SCOPES = [
  "boards:read",
  "boards:read_secret",
  "pins:read",
  "pins:read_secret",
  "user_accounts:read",
] as const;
