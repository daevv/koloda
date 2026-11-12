import "server-only";

import { isUniqueViolation, supabase } from "./supabase";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
};

export type ConnectionRecord = {
  userId: string;
  pinterestId: string;
  username: string;
  profileImage: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type BoardRecord = {
  userId: string;
  id: string;
  name: string;
  coverUrl: string | null;
  pinCount: number | null;
  source: "pinterest" | "demo" | "rss";
  feedUrl?: string;
};

export type LinkRecord = {
  userId: string;
  id: string;
  feedUrl: string;
  name: string;
  kind: "board" | "profile";
  createdAt: number;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

type ConnectionRow = {
  user_id: string;
  pinterest_id: string;
  username: string;
  profile_image: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type BoardRow = {
  user_id: string;
  board_id: string;
  name: string;
  cover_url: string | null;
  pin_count: number | null;
  source: BoardRecord["source"];
  feed_url: string | null;
};

type LinkRow = {
  user_id: string;
  link_id: string;
  feed_url: string;
  name: string;
  kind: LinkRecord["kind"];
  created_at: string;
};

function fail(message: string, error: { message?: string } | null): never {
  throw new Error(error?.message ? `${message}: ${error.message}` : message);
}

function asUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: Date.parse(row.created_at) || Date.now(),
  };
}

function asConnection(row: ConnectionRow): ConnectionRecord {
  return {
    userId: row.user_id,
    pinterestId: row.pinterest_id,
    username: row.username,
    profileImage: row.profile_image,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: Date.parse(row.expires_at) || 0,
  };
}

function asBoard(row: BoardRow): BoardRecord {
  return {
    userId: row.user_id,
    id: row.board_id,
    name: row.name,
    coverUrl: row.cover_url,
    pinCount: row.pin_count,
    source: row.source,
    feedUrl: row.feed_url ?? undefined,
  };
}

function asLink(row: LinkRow): LinkRecord {
  return {
    userId: row.user_id,
    id: row.link_id,
    feedUrl: row.feed_url,
    name: row.name,
    kind: row.kind,
    createdAt: Date.parse(row.created_at) || Date.now(),
  };
}

function boardRow(board: BoardRecord): BoardRow {
  return {
    user_id: board.userId,
    board_id: board.id,
    name: board.name,
    cover_url: board.coverUrl,
    pin_count: board.pinCount,
    source: board.source,
    feed_url: board.feedUrl ?? null,
  };
}

export async function findUserById(id: string) {
  const { data, error } = await supabase()
    .from("users")
    .select("id, email, name, password_hash, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Не удалось прочитать пользователя", error);
  return data ? asUser(data as UserRow) : null;
}

export async function findUserByEmail(email: string) {
  const { data, error } = await supabase()
    .from("users")
    .select("id, email, name, password_hash, created_at")
    .eq("email", email)
    .maybeSingle();
  if (error) fail("Не удалось прочитать пользователя", error);
  return data ? asUser(data as UserRow) : null;
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const { data, error } = await supabase()
    .from("users")
    .insert({
      email: input.email,
      name: input.name,
      password_hash: input.passwordHash,
    })
    .select("id, email, name, password_hash, created_at")
    .single();
  if (isUniqueViolation(error)) return null;
  if (error || !data) fail("Не удалось создать пользователя", error);
  return asUser(data as UserRow);
}

export async function userHasBoards(userId: string) {
  const { count, error } = await supabase()
    .from("boards")
    .select("board_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) fail("Не удалось проверить доски", error);
  return (count ?? 0) > 0;
}

export async function listBoards(userId: string) {
  const { data, error } = await supabase()
    .from("boards")
    .select("user_id, board_id, name, cover_url, pin_count, source, feed_url")
    .eq("user_id", userId);
  if (error) fail("Не удалось загрузить доски", error);
  return ((data ?? []) as BoardRow[]).map(asBoard);
}

export async function listLinks(userId: string) {
  const { data, error } = await supabase()
    .from("board_links")
    .select("user_id, link_id, feed_url, name, kind, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) fail("Не удалось загрузить ссылки", error);
  return ((data ?? []) as LinkRow[]).map(asLink);
}

export async function getConnection(userId: string) {
  const { data, error } = await supabase()
    .from("pinterest_connections")
    .select(
      "user_id, pinterest_id, username, profile_image, access_token, refresh_token, expires_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail("Не удалось прочитать подключение Pinterest", error);
  return data ? asConnection(data as ConnectionRow) : null;
}

export async function upsertConnection(connection: ConnectionRecord) {
  const { error } = await supabase().from("pinterest_connections").upsert(
    {
      user_id: connection.userId,
      pinterest_id: connection.pinterestId,
      username: connection.username,
      profile_image: connection.profileImage,
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expires_at: new Date(connection.expiresAt).toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) fail("Не удалось сохранить подключение Pinterest", error);
}

export async function updateConnectionTokens(
  userId: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt: number },
) {
  const patch: Record<string, string> = {
    access_token: tokens.accessToken,
    expires_at: new Date(tokens.expiresAt).toISOString(),
  };
  if (tokens.refreshToken) patch.refresh_token = tokens.refreshToken;
  const { error } = await supabase()
    .from("pinterest_connections")
    .update(patch)
    .eq("user_id", userId);
  if (error) fail("Не удалось обновить токены Pinterest", error);
}

export async function replaceBoards(userId: string, boards: BoardRecord[]) {
  const { error: removeError } = await supabase()
    .from("boards")
    .delete()
    .eq("user_id", userId);
  if (removeError) fail("Не удалось обновить доски", removeError);
  if (boards.length === 0) return;
  const { error } = await supabase().from("boards").insert(boards.map(boardRow));
  if (error) fail("Не удалось сохранить доски", error);
}

export async function upsertBoard(board: BoardRecord) {
  const { error } = await supabase()
    .from("boards")
    .upsert(boardRow(board), { onConflict: "user_id,board_id" });
  if (error) fail("Не удалось сохранить доску", error);
}

export async function upsertLink(link: LinkRecord) {
  const { error } = await supabase().from("board_links").upsert(
    {
      user_id: link.userId,
      link_id: link.id,
      feed_url: link.feedUrl,
      name: link.name,
      kind: link.kind,
      created_at: new Date(link.createdAt).toISOString(),
    },
    { onConflict: "user_id,link_id" },
  );
  if (error) fail("Не удалось сохранить ссылку", error);
}

export async function deleteLink(userId: string, id: string) {
  const [{ error: linkError }, { error: boardError }] = await Promise.all([
    supabase().from("board_links").delete().eq("user_id", userId).eq("link_id", id),
    supabase().from("boards").delete().eq("user_id", userId).eq("board_id", id),
  ]);
  if (linkError) fail("Не удалось удалить ссылку", linkError);
  if (boardError) fail("Не удалось удалить доску", boardError);
}

export async function disconnectPinterestAccount(userId: string) {
  const [{ error: connectionError }, { error: boardsError }] = await Promise.all([
    supabase().from("pinterest_connections").delete().eq("user_id", userId),
    supabase()
      .from("boards")
      .delete()
      .eq("user_id", userId)
      .eq("source", "pinterest"),
  ]);
  if (connectionError) fail("Не удалось отключить Pinterest", connectionError);
  if (boardsError) fail("Не удалось убрать доски Pinterest", boardsError);
}
