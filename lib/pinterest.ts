import "server-only";

import { headers } from "next/headers";
import { PINTEREST_SCOPES } from "./constants";
import { readDb, updateDb } from "./db";
import { open, seal } from "./secret";
import type { BoardOption, PinCard } from "./types";

const API = "https://api.pinterest.com/v5";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

type ImageDetails = { url?: string; width?: number };

type PinMedia = {
  images?: Record<string, ImageDetails>;
  cover_image_url?: string;
  items?: Array<{ images?: Record<string, ImageDetails> }>;
};

type RemotePin = {
  id?: string;
  title?: string | null;
  description?: string | null;
  media?: PinMedia | null;
};

type RemoteBoard = {
  id?: string;
  name?: string;
  pin_count?: number;
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
  media?: { image_cover_url?: string | null };
};

type Page<T> = { items?: T[]; bookmark?: string | null };

export class PinterestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PinterestError";
    this.status = status;
  }
}

export function pinterestConfigured() {
  return Boolean(appId() && appSecret());
}

export function pinterestErrorMessage(error: unknown) {
  if (error instanceof PinterestError) return error.message;
  return "Не удалось связаться с Pinterest.";
}

function appId() {
  return process.env.PINTEREST_APP_ID?.trim() ?? "";
}

function appSecret() {
  return process.env.PINTEREST_APP_SECRET?.trim() ?? "";
}

export async function getRedirectUri() {
  const configured = process.env.PINTEREST_REDIRECT_URI?.trim();
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "http://localhost:3000/api/pinterest/callback";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}/api/pinterest/callback`;
}

function basicAuth() {
  if (!pinterestConfigured()) {
    throw new PinterestError(
      "Ключи Pinterest ещё не добавлены в .env.local.",
      500,
    );
  }
  return `Basic ${Buffer.from(`${appId()}:${appSecret()}`).toString("base64")}`;
}

async function requestToken(body: Record<string, string>) {
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new PinterestError(
      await errorMessage(response),
      response.status,
    );
  }
  return (await response.json()) as TokenResponse;
}

async function errorMessage(response: Response) {
  let detail = "";
  try {
    const body = (await response.json()) as { message?: string };
    detail = body.message?.replace(/\s+/g, " ").slice(0, 180) ?? "";
  } catch {
    detail = "";
  }
  if (response.status === 401) {
    return "Сессия Pinterest истекла. Подключи аккаунт ещё раз.";
  }
  if (response.status === 403) {
    return detail
      ? `Нет доступа к Pinterest. ${detail}`
      : "Нет доступа. Для trial-приложения войди в аккаунт владельца.";
  }
  if (response.status === 429) {
    return "Pinterest просит немного подождать — слишком много запросов.";
  }
  return detail || `Ошибка Pinterest (${response.status}).`;
}

async function refreshTokens(refreshToken: string) {
  const scope = PINTEREST_SCOPES.join(",");
  try {
    return await requestToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope,
      refresh_on: "true",
    });
  } catch (error) {
    if (error instanceof PinterestError && error.status === 400) {
      return requestToken({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope,
      });
    }
    throw error;
  }
}

function readToken(value: string) {
  try {
    return open(value);
  } catch {
    throw new PinterestError(
      "Не удалось прочитать сохранённый доступ. Подключи Pinterest ещё раз.",
      401,
    );
  }
}

async function saveTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
) {
  await updateDb((db) => {
    const connection = db.connections.find((item) => item.userId === userId);
    if (!connection) return;
    connection.accessToken = seal(accessToken);
    if (refreshToken) connection.refreshToken = seal(refreshToken);
    connection.expiresAt = Date.now() + expiresIn * 1000;
  });
}

async function accessTokenFor(userId: string) {
  const connection = readDb().connections.find((item) => item.userId === userId);
  if (!connection) {
    throw new PinterestError("Аккаунт Pinterest не подключён.", 401);
  }
  if (connection.expiresAt > Date.now() + 120_000) {
    return readToken(connection.accessToken);
  }
  const tokens = await refreshTokens(readToken(connection.refreshToken));
  await saveTokens(
    userId,
    tokens.access_token,
    tokens.refresh_token,
    tokens.expires_in,
  );
  return tokens.access_token;
}

async function forceRefresh(userId: string) {
  const connection = readDb().connections.find((item) => item.userId === userId);
  if (!connection) {
    throw new PinterestError("Аккаунт Pinterest не подключён.", 401);
  }
  const tokens = await refreshTokens(readToken(connection.refreshToken));
  await saveTokens(
    userId,
    tokens.access_token,
    tokens.refresh_token,
    tokens.expires_in,
  );
  return tokens.access_token;
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new PinterestError(await errorMessage(response), response.status);
  }
  return (await response.json()) as T;
}

async function apiGetForUser<T>(userId: string, path: string, retry = true): Promise<T> {
  const token = await accessTokenFor(userId);
  try {
    return await apiGet<T>(path, token);
  } catch (error) {
    if (retry && error instanceof PinterestError && error.status === 401) {
      const fresh = await forceRefresh(userId);
      return apiGet<T>(path, fresh);
    }
    throw error;
  }
}

export async function connectWithCode(
  userId: string,
  code: string,
  redirectUri: string,
) {
  const tokens = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    throw new PinterestError("Pinterest не прислал refresh token.", 502);
  }

  let account = {
    id: "unknown",
    username: "pinterest",
    profile_image: null as string | null,
  };
  try {
    const remote = await apiGet<{
      id?: string;
      username?: string;
      profile_image?: string | null;
    }>("/user_account", tokens.access_token);
    account = {
      id: remote.id || "unknown",
      username: remote.username || "pinterest",
      profile_image: remote.profile_image ?? null,
    };
  } catch (error) {
    console.error("Pinterest profile lookup failed", error);
  }

  await updateDb((db) => {
    db.connections = db.connections.filter((item) => item.userId !== userId);
    db.connections.push({
      userId,
      pinterestId: account.id,
      username: account.username,
      profileImage: account.profile_image,
      accessToken: seal(tokens.access_token),
      refreshToken: seal(refreshToken),
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });
  });
}

export async function listPinterestBoards(userId: string): Promise<BoardOption[]> {
  const boards: BoardOption[] = [];
  let bookmark: string | null = null;
  for (let page = 0; page < 8; page += 1) {
    const params = new URLSearchParams({ page_size: "50" });
    if (bookmark) params.set("bookmark", bookmark);
    const data = await apiGetForUser<Page<RemoteBoard>>(
      userId,
      `/boards?${params.toString()}`,
    );
    for (const board of data.items ?? []) {
      if (!board.id || !board.name) continue;
      boards.push({
        id: board.id,
        name: board.name,
        pinCount: board.pin_count ?? 0,
        coverUrl: board.media?.image_cover_url ?? null,
        privacy: board.privacy ?? "PUBLIC",
      });
    }
    if (!data.bookmark || data.bookmark === bookmark) break;
    bookmark = data.bookmark;
  }
  return boards;
}

function bestImage(images: Record<string, ImageDetails> | undefined) {
  if (!images) return null;
  const variants = Object.values(images).filter(
    (image): image is ImageDetails & { url: string } =>
      typeof image?.url === "string" && image.url.startsWith("https://"),
  );
  variants.sort((left, right) => (right.width ?? 0) - (left.width ?? 0));
  const preferred =
    variants.find((image) => {
      const width = image.width ?? 0;
      return width >= 600 && width <= 1400;
    }) ?? variants[0];
  return preferred?.url ?? null;
}

function imageFromMedia(media: PinMedia | null | undefined) {
  if (!media) return null;
  const direct = bestImage(media.images);
  if (direct) return direct;
  if (media.cover_image_url?.startsWith("https://")) return media.cover_image_url;
  for (const item of media.items ?? []) {
    const nested = bestImage(item.images);
    if (nested) return nested;
  }
  return null;
}

export async function fetchPinPage(
  userId: string,
  boardId: string,
  boardName: string,
  cursor: string | null,
) {
  const params = new URLSearchParams({ page_size: "20" });
  if (cursor) params.set("bookmark", cursor);
  const data = await apiGetForUser<Page<RemotePin>>(
    userId,
    `/boards/${encodeURIComponent(boardId)}/pins?${params.toString()}`,
  );
  const pins: PinCard[] = [];
  for (const pin of data.items ?? []) {
    if (!pin.id) continue;
    const imageUrl = imageFromMedia(pin.media);
    if (!imageUrl) continue;
    const title =
      pin.title?.trim() ||
      pin.description?.trim().split("\n")[0]?.slice(0, 80) ||
      "Без названия";
    pins.push({
      id: pin.id,
      imageUrl,
      title,
      boardName,
      href: `https://www.pinterest.com/pin/${pin.id}/`,
    });
  }
  const nextCursor =
    data.bookmark && data.bookmark !== cursor ? data.bookmark : null;
  return { pins, cursor: nextCursor };
}
