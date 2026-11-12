import "server-only";

import { cookies } from "next/headers";
import { PREFS_COOKIE } from "./constants";
import { cookieBase } from "./session";
import {
  DECK_MODES,
  DEFAULT_PREFS,
  MOODS,
  type DeckMode,
  type DeckPrefs,
  type Mood,
} from "./types";

function asMood(value: unknown): Mood | null {
  return typeof value === "string" && MOODS.includes(value as Mood)
    ? (value as Mood)
    : null;
}

function asMode(value: unknown): DeckMode | null {
  return typeof value === "string" && DECK_MODES.includes(value as DeckMode)
    ? (value as DeckMode)
    : null;
}

export function parsePrefs(raw: unknown): DeckPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
  const row = raw as Record<string, unknown>;
  return {
    mood: asMood(row.mood) ?? DEFAULT_PREFS.mood,
    mode: asMode(row.mode) ?? DEFAULT_PREFS.mode,
  };
}

export function prefsFromForm(formData: FormData): DeckPrefs {
  return parsePrefs({
    mood: formData.get("mood"),
    mode: formData.get("mode"),
  });
}

export async function getDeckPrefs(): Promise<DeckPrefs> {
  const raw = (await cookies()).get(PREFS_COOKIE)?.value;
  if (!raw) return DEFAULT_PREFS;
  try {
    return parsePrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setDeckPrefs(prefs: DeckPrefs) {
  const jar = await cookies();
  jar.set(PREFS_COOKIE, JSON.stringify(prefs), {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function saveDeckPrefsFromForm(formData: FormData) {
  const prefs = prefsFromForm(formData);
  await setDeckPrefs(prefs);
  return prefs;
}
