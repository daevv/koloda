import "server-only";

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import type { BoardRecord } from "./db";
import { listBoards } from "./db";
import { demoPins } from "./demo";
import { feedPins, readFeed } from "./feed";
import { pluralBoards } from "./plural";
import { getDeckPrefs } from "./prefs";
import { fetchPinPage, pinterestErrorMessage } from "./pinterest";
import { quotesForMood, shuffle } from "./quotes";
import type {
  DeckCard,
  DeckMode,
  DeckPage,
  DeckPrefs,
  DeckResult,
  PinCard,
  QuoteCard,
} from "./types";
import { MOOD_LABELS } from "./types";

function interleave(groups: PinCard[][]) {
  const max = groups.reduce((longest, group) => Math.max(longest, group.length), 0);
  const seen = new Set<string>();
  const pins: PinCard[] = [];
  for (let index = 0; index < max; index += 1) {
    for (const group of groups) {
      const pin = group[index];
      if (!pin || seen.has(pin.id)) continue;
      seen.add(pin.id);
      pins.push(pin);
    }
  }
  return pins;
}

function mix(pins: PinCard[], quotes: QuoteCard[], mode: DeckMode): DeckCard[] {
  if (mode === "pins") return pins;
  const shuffledQuotes = shuffle(quotes);
  if (mode === "quotes") return shuffledQuotes;
  const cards: DeckCard[] = [...pins];
  for (const quote of shuffledQuotes) {
    const index = Math.floor(Math.random() * (cards.length + 1));
    cards.splice(index, 0, quote);
  }
  return cards;
}

function titleFor(boards: BoardRecord[], prefs: DeckPrefs) {
  if (prefs.mode === "quotes") return MOOD_LABELS[prefs.mood];
  if (boards.length === 0) return MOOD_LABELS[prefs.mood];
  if (boards.length === 1) return boards[0].name;
  return pluralBoards(boards.length);
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return results;
}

type Loaded = {
  board: BoardRecord;
  pins: PinCard[];
  cursor: string | null;
};

async function loadFirstPage(userId: string, board: BoardRecord): Promise<Loaded> {
  if (board.source === "demo") {
    return { board, pins: demoPins(board.id), cursor: null };
  }
  if (board.source === "rss") {
    if (!board.feedUrl) throw new Error(`Нет адреса ленты для ${board.name}`);
    const { items } = await readFeed(board.feedUrl);
    return { board, pins: feedPins(items, board.name), cursor: null };
  }
  const page = await fetchPinPage(userId, board.id, board.name, null);
  return { board, pins: page.pins, cursor: page.cursor };
}

export async function getDeck(): Promise<DeckResult> {
  await connection();
  const user = await requireUser();
  const prefs = await getDeckPrefs();
  const selected = prefs.mode === "quotes" ? [] : await listBoards(user.id);
  const shuffleKey = crypto.randomUUID();

  if (prefs.mode === "pins" && selected.length === 0) redirect("/boards");

  const quotes = prefs.mode === "pins" ? [] : quotesForMood(prefs.mood);
  if (prefs.mode === "quotes" && quotes.length === 0) {
    return { ok: false, message: "Нет цитат для этого настроения." };
  }

  if (selected.length === 0) {
    return {
      ok: true,
      selectionKey: `quotes:${prefs.mood}:${shuffleKey}`,
      title: titleFor(selected, prefs),
      cards: shuffle(quotes),
      cursors: {},
    };
  }

  const results = await mapPool(selected, 4, async (board) => {
    try {
      return { ok: true as const, loaded: await loadFirstPage(user.id, board) };
    } catch (error) {
      console.error(error);
      return {
        ok: false as const,
        board,
        message: pinterestErrorMessage(error),
      };
    }
  });

  const groups: PinCard[][] = [];
  const cursors: Record<string, string | null> = {};
  const failures: string[] = [];
  const messages: string[] = [];

  for (const result of results) {
    if (!result.ok) {
      failures.push(result.board.name);
      messages.push(result.message);
      continue;
    }
    groups.push(result.loaded.pins);
    if (result.loaded.board.source === "pinterest") {
      cursors[result.loaded.board.id] = result.loaded.cursor;
    }
  }

  const pins = interleave(groups);
  if (pins.length === 0 && quotes.length === 0 && failures.length > 0) {
    return { ok: false, message: messages[0] };
  }

  const cards = mix(pins, quotes, prefs.mode);
  return {
    ok: true,
    selectionKey: [
      prefs.mode,
      prefs.mood,
      shuffleKey,
      ...selected.map((board) => board.id).sort(),
    ].join(","),
    title: titleFor(selected, prefs),
    cards,
    cursors,
    warning: failures.length
      ? `Не открылись: ${failures.slice(0, 3).join(", ")}`
      : undefined,
  };
}

export async function loadMoreForUser(
  userId: string,
  cursors: Record<string, string | null>,
): Promise<DeckPage> {
  const selected = (await listBoards(userId)).filter(
    (board) => board.source === "pinterest",
  );
  const byId = new Map(selected.map((board) => [board.id, board]));
  const nextCursors: Record<string, string | null> = {};
  for (const board of selected) {
    const incoming = cursors[board.id];
    nextCursors[board.id] =
      typeof incoming === "string" && incoming.length > 0 && incoming.length < 4000
        ? incoming
        : null;
  }

  const jobs = selected.filter((board) => nextCursors[board.id]);
  const groups: PinCard[][] = [];
  const pages = await mapPool(jobs, 4, async (board) => {
    try {
      const page = await fetchPinPage(
        userId,
        board.id,
        board.name,
        nextCursors[board.id],
      );
      return { board, page };
    } catch (error) {
      console.error(error);
      return { board, error: true as const };
    }
  });

  for (const result of pages) {
    if ("error" in result) {
      nextCursors[result.board.id] = null;
      continue;
    }
    groups.push(result.page.pins);
    nextCursors[result.board.id] = result.page.cursor;
  }

  for (const id of Object.keys(nextCursors)) {
    if (!byId.has(id)) delete nextCursors[id];
  }

  return { cards: interleave(groups), cursors: nextCursors };
}
