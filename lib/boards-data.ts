import "server-only";

import { requireUser } from "./auth";
import { getConnection, listBoards, listLinks } from "./db";
import { demoBoardOptions } from "./demo";
import {
  getRedirectUri,
  listPinterestBoards,
  pinterestConfigured,
  pinterestErrorMessage,
} from "./pinterest";
import type { BoardOption, BoardsState } from "./types";

function keyFor(prefix: string, options: BoardOption[], selected: string[]) {
  return `${prefix}:${options.map((option) => option.id).join(",")}|${selected.join(",")}`;
}

export async function getBoardsState(): Promise<BoardsState> {
  const user = await requireUser();
  const [stored, connection, savedLinks] = await Promise.all([
    listBoards(user.id),
    getConnection(user.id),
    listLinks(user.id),
  ]);

  const links: BoardOption[] = savedLinks.map((link) => ({
    id: link.id,
    name: link.name,
    pinCount: null,
    coverUrl: null,
    privacy: null,
    origin: "link",
  }));
  const linkIds = new Set(links.map((link) => link.id));
  const linkSelected = stored
    .filter((board) => board.source === "rss" && linkIds.has(board.id))
    .map((board) => board.id);

  const redirectUri = await getRedirectUri();
  const usingDemo = stored.some((board) => board.source === "demo");
  const configured = pinterestConfigured();

  if (!connection) {
    const boards = demoBoardOptions();
    const selectedIds = [
      ...stored.filter((board) => board.source === "demo").map((board) => board.id),
      ...linkSelected,
    ];
    const options = [...boards, ...links];
    return {
      user,
      configured,
      redirectUri,
      connection: null,
      boards: options,
      selectedIds,
      dataKey: keyFor("demo", options, selectedIds),
      usingDemo,
      loadError: null,
    };
  }

  try {
    const remote = await listPinterestBoards(user.id);
    const remoteIds = new Set(remote.map((board) => board.id));
    const selectedIds = [
      ...stored.filter((board) => remoteIds.has(board.id)).map((board) => board.id),
      ...linkSelected,
    ];
    const options = [...remote, ...links];
    return {
      user,
      configured: true,
      redirectUri,
      connection: {
        username: connection.username,
        profileImage: connection.profileImage,
      },
      boards: options,
      selectedIds,
      dataKey: keyFor(`pinterest:${connection.username}`, options, selectedIds),
      usingDemo,
      loadError: null,
    };
  } catch (error) {
    console.error(error);
    return {
      user,
      configured: true,
      redirectUri,
      connection: {
        username: connection.username,
        profileImage: connection.profileImage,
      },
      boards: links,
      selectedIds: linkSelected,
      dataKey: keyFor(`pinterest-error:${connection.username}`, links, linkSelected),
      usingDemo,
      loadError: pinterestErrorMessage(error),
    };
  }
}
