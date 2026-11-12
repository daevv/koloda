"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, requireUser } from "@/lib/auth";
import { OAUTH_REDIRECT_COOKIE, OAUTH_STATE_COOKIE, PINTEREST_SCOPES } from "@/lib/constants";
import {
  type BoardRecord,
  deleteLink,
  disconnectPinterestAccount,
  getConnection,
  listLinks,
  replaceBoards,
  upsertBoard,
  upsertLink,
} from "@/lib/db";
import { demoBoardsByIds } from "@/lib/demo";
import { loadMoreForUser } from "@/lib/deck-data";
import { parseSource, readFeed } from "@/lib/feed";
import {
  getRedirectUri,
  listPinterestBoards,
  pinterestConfigured,
} from "@/lib/pinterest";
import { cookieBase } from "@/lib/session";
import type { BoardOption, DeckPage } from "@/lib/types";

const LINK_PREFIX = "link:";

async function storeBoards(userId: string, boards: BoardRecord[]) {
  await replaceBoards(userId, boards);
}

export async function beginPinterestConnect() {
  await requireUser();
  if (!pinterestConfigured()) redirect("/boards?error=config");

  const state = randomBytes(24).toString("hex");
  const redirectUri = await getRedirectUri();
  const jar = await cookies();
  const options = { ...cookieBase(), maxAge: 60 * 10 };
  jar.set(OAUTH_STATE_COOKIE, state, options);
  jar.set(OAUTH_REDIRECT_COOKIE, redirectUri, options);

  const url = new URL("https://www.pinterest.com/oauth/");
  url.searchParams.set("client_id", process.env.PINTEREST_APP_ID!.trim());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", PINTEREST_SCOPES.join(","));
  url.searchParams.set("state", state);
  redirect(url.toString());
}

export async function disconnectPinterest() {
  const user = await requireUser();
  await disconnectPinterestAccount(user.id);
  redirect("/boards");
}

// Adds a public board or profile by link and puts it into the current deck.
export async function addLink(formData: FormData) {
  const user = await requireUser();
  const input = formData.get("link");
  const source = typeof input === "string" ? parseSource(input) : null;
  if (!source) redirect("/boards?error=link");

  let feed: Awaited<ReturnType<typeof readFeed>>;
  try {
    feed = await readFeed(source.feedUrl);
  } catch (error) {
    console.error(error);
    redirect("/boards?error=feed");
  }
  if (feed.items.length === 0) redirect("/boards?error=feed_empty");

  const name = source.kind === "profile" ? `${feed.title} · все пины` : feed.title;
  const id = `${LINK_PREFIX}${source.feedUrl}`;

  await upsertLink({
    userId: user.id,
    id,
    feedUrl: source.feedUrl,
    name,
    kind: source.kind,
    createdAt: Date.now(),
  });
  await upsertBoard({
    userId: user.id,
    id,
    name,
    coverUrl: null,
    pinCount: null,
    source: "rss",
    feedUrl: source.feedUrl,
  });

  redirect("/deck");
}

export async function removeLink(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !id.startsWith(LINK_PREFIX)) redirect("/boards");

  await deleteLink(user.id, id);
  redirect("/boards");
}

export async function saveBoards(formData: FormData) {
  const user = await requireUser();

  if (formData.get("intent") === "demo") {
    const boards = demoBoardsByIds(["demo:city", "demo:wild"]);
    await storeBoards(
      user.id,
      boards.map(
        (board): BoardRecord => ({
          userId: user.id,
          id: board.id,
          name: board.name,
          coverUrl: board.coverUrl,
          pinCount: board.pinCount,
          source: "demo",
        }),
      ),
    );
    redirect("/deck");
  }

  const ids = new Set(
    formData
      .getAll("board")
      .filter((value): value is string => typeof value === "string"),
  );
  if (ids.size === 0) redirect("/boards?error=empty");

  const savedLinks = await listLinks(user.id);
  const linkBoards = savedLinks
    .filter((link) => ids.has(link.id))
    .map(
      (link): BoardRecord => ({
        userId: user.id,
        id: link.id,
        name: link.name,
        coverUrl: null,
        pinCount: null,
        source: "rss",
        feedUrl: link.feedUrl,
      }),
    );

  const otherIds = [...ids].filter((id) => !id.startsWith(LINK_PREFIX));
  let accountBoards: BoardRecord[] = [];

  if (otherIds.length > 0) {
    const connected = Boolean(await getConnection(user.id));
    if (connected) {
      let remote: BoardOption[];
      try {
        remote = await listPinterestBoards(user.id);
      } catch (error) {
        console.error(error);
        redirect("/boards?error=fetch");
      }
      accountBoards = remote
        .filter((board) => ids.has(board.id) && /^\d+$/.test(board.id))
        .map(
          (board): BoardRecord => ({
            userId: user.id,
            id: board.id,
            name: board.name,
            coverUrl: board.coverUrl,
            pinCount: board.pinCount,
            source: "pinterest",
          }),
        );
    } else {
      accountBoards = demoBoardsByIds(otherIds).map(
        (board): BoardRecord => ({
          userId: user.id,
          id: board.id,
          name: board.name,
          coverUrl: board.coverUrl,
          pinCount: board.pinCount,
          source: "demo",
        }),
      );
    }
  }

  const selection = [...accountBoards, ...linkBoards];
  if (selection.length === 0) redirect("/boards?error=empty");

  await storeBoards(user.id, selection);
  redirect("/deck");
}

export async function loadMorePins(
  cursors: Record<string, string | null>,
): Promise<DeckPage | null> {
  const user = await getUser();
  if (!user) return null;
  return loadMoreForUser(user.id, cursors);
}
