import "server-only";

import fs from "node:fs";
import path from "node:path";

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

// A public board or profile added by pasting a Pinterest link (RSS, no app needed).
export type LinkRecord = {
  userId: string;
  id: string;
  feedUrl: string;
  name: string;
  kind: "board" | "profile";
  createdAt: number;
};

type Database = {
  users: UserRecord[];
  connections: ConnectionRecord[];
  boards: BoardRecord[];
  links: LinkRecord[];
};

const filePath = path.join(process.cwd(), "data", "db.json");

function empty(): Database {
  return { users: [], connections: [], boards: [], links: [] };
}

function ensureFile() {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(empty(), null, 2), { mode: 0o600 });
}

export function readDb(): Database {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<Database>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      boards: Array.isArray(parsed.boards) ? parsed.boards : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return empty();
  }
}

function writeDb(db: Database) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, "db.json.tmp");
  fs.writeFileSync(temporary, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

let queue: Promise<void> = Promise.resolve();

export function updateDb<T>(mutate: (db: Database) => T): Promise<T> {
  let result!: T;
  const run = queue.then(() => {
    const db = readDb();
    result = mutate(db);
    writeDb(db);
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run.then(() => result);
}
