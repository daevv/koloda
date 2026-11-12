import "server-only";

import { PinterestError } from "./pinterest";
import type { PinCard } from "./types";

// Public Pinterest RSS feeds: https://www.pinterest.com/<user>/<board>.rss and /<user>/feed.rss.
// No app or token needed, but only public boards are visible and only the latest ~25 pins.

export type FeedSource = {
  kind: "board" | "profile";
  feedUrl: string;
};

export type FeedItem = Omit<PinCard, "boardName">;

const FEED_ORIGIN = "https://www.pinterest.com";
const USER_AGENT = "Mozilla/5.0 (compatible; Koloda/1.0)";
const SEGMENT = /^[\p{L}\p{N}_\-][\p{L}\p{N}_.\-]{0,99}$/u;
const RESERVED = new Set([
  "pin",
  "pins",
  "search",
  "ideas",
  "categories",
  "topics",
  "today",
  "business",
  "settings",
  "login",
  "signup",
  "password",
  "explore",
  "about",
  "help",
]);

function isPinterestHost(host: string) {
  return /(^|\.)pinterest\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(host);
}

function isPinItHost(host: string) {
  return host === "pin.it" || host.endsWith(".pin.it");
}

function isAllowedHop(host: string) {
  return isPinterestHost(host) || isPinItHost(host);
}

function parseUrl(input: string) {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isOwner(value: string) {
  return (
    SEGMENT.test(value) && !value.startsWith("_") && !RESERVED.has(value.toLowerCase())
  );
}

// Accepts any Pinterest country domain and only ever builds the feed URL on www.pinterest.com,
// so the server never fetches an arbitrary address from user input.
export function parseSource(input: string): FeedSource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = parseUrl(trimmed);
  if (!url || !isPinterestHost(url.hostname)) return null;

  const raw = url.pathname.split("/").filter(Boolean);
  if (raw.length === 0 || raw.length > 2) return null;

  const decoded = raw.map(safeDecode);
  if (decoded.some((part) => part === null)) return null;
  const [owner, slug] = decoded as string[];
  if (!isOwner(owner)) return null;

  if (slug === undefined || slug === "pins") {
    return { kind: "profile", feedUrl: `${FEED_ORIGIN}/${raw[0]}/feed.rss` };
  }
  if (!SEGMENT.test(slug) || slug.startsWith("_")) return null;
  return { kind: "board", feedUrl: `${FEED_ORIGIN}/${raw[0]}/${raw[1]}.rss` };
}

function pinItCode(pathname: string) {
  const code = pathname.replaceAll("/", "");
  return /^[A-Za-z0-9]{4,24}$/.test(code) ? code : null;
}

// App share links look like pin.it/1aWhqlta4 and redirect through
// api.pinterest.com/url_shortener/... to the public board or profile.
export async function resolveSource(input: string): Promise<FeedSource | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = parseUrl(trimmed);
  if (!url) return null;
  if (isPinterestHost(url.hostname)) return parseSource(url.href);
  if (!isPinItHost(url.hostname)) return null;

  const code = pinItCode(url.pathname);
  if (!code) return null;

  let current = new URL(`https://pin.it/${code}`);
  for (let hop = 0; hop < 8; hop += 1) {
    if (!isAllowedHop(current.hostname)) return null;
    const parsed = parseSource(current.href);
    if (parsed) return parsed;

    let response: Response;
    try {
      response = await fetch(current.href, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html",
          "User-Agent": USER_AGENT,
        },
        cache: "no-store",
      });
    } catch {
      return null;
    }

    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      try {
        current = new URL(location, current);
      } catch {
        return null;
      }
      continue;
    }
    return parseSource(current.href);
  }
  return null;
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(source: string, tag: string) {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(source);
  if (!match) return "";
  const value = match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1");
  return decodeEntities(value).trim();
}

// Feed images are 236px. The same CDN path with a bigger size segment works for the same pin.
function largeImage(url: string) {
  return url.replace(/\/(?:\d+x\d*|originals)\//, "/736x/");
}

export function parseFeed(xml: string) {
  if (!/<rss[\s>]/.test(xml)) {
    throw new PinterestError("Pinterest вернул не ленту.", 502);
  }

  const [head, ...chunks] = xml.split("<item>");
  const title = textOf(head, "title") || "Pinterest";
  const items: FeedItem[] = [];

  for (const chunk of chunks) {
    const item = chunk.split("</item>")[0];
    const href = textOf(item, "link");
    const description = textOf(item, "description");
    const image = /src="(https:\/\/i\.pinimg\.com\/[^"]+)"/.exec(description)?.[1];
    if (!href || !image) continue;
    items.push({
      kind: "pin",
      id: textOf(item, "guid") || href,
      imageUrl: largeImage(image),
      title: textOf(item, "title") || "Без названия",
      href,
    });
  }

  return { title, items };
}

export async function readFeed(feedUrl: string) {
  let response: Response;
  try {
    response = await fetch(feedUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });
  } catch {
    throw new PinterestError("Не удалось открыть ленту Pinterest. Проверь подключение.", 502);
  }

  if (response.status === 404) {
    throw new PinterestError(
      "Лента не найдена. Доска может быть секретной или ссылка неверной.",
      404,
    );
  }
  if (!response.ok) {
    throw new PinterestError(`Лента Pinterest недоступна (${response.status}).`, response.status);
  }
  if (response.url && !isPinterestHost(new URL(response.url).hostname)) {
    throw new PinterestError("Pinterest перенаправил ленту на другой адрес.", 502);
  }

  return parseFeed(await response.text());
}

export function feedPins(items: FeedItem[], boardName: string): PinCard[] {
  return items.map((item) => ({ ...item, boardName }));
}
