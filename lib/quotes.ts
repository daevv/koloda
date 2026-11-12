import "server-only";

import catalog from "@/content/quotes.json";
import {
  MOODS,
  type Mood,
  type QuoteCard,
} from "./types";

function slug(author: string, book: string, text: string) {
  const base = `${author}-${book}-${text.slice(0, 24)}`
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return base || "quote";
}

function asMood(value: unknown): Mood | null {
  return typeof value === "string" && MOODS.includes(value as Mood)
    ? (value as Mood)
    : null;
}

function readCatalog(): QuoteCard[] {
  if (!Array.isArray(catalog)) return [];
  const cards: QuoteCard[] = [];
  const seen = new Set<string>();

  for (const item of catalog) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    const author = typeof row.author === "string" ? row.author.trim() : "";
    const book = typeof row.book === "string" ? row.book.trim() : "";
    const mood = asMood(row.mood);
    if (!text || !author || !book || !mood) continue;

    const rawId = typeof row.id === "string" ? row.id.trim() : "";
    const id = (rawId || `q-${slug(author, book, text)}`).slice(0, 80);
    if (seen.has(id)) continue;
    seen.add(id);

    cards.push({
      kind: "quote",
      id,
      text,
      author,
      book,
      genre: typeof row.genre === "string" ? row.genre.trim() : "",
      mood,
    });
  }

  return cards;
}

const QUOTES = readCatalog();

export function quotesForMood(mood: Mood) {
  return QUOTES.filter((quote) => quote.mood === mood);
}

export function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}
