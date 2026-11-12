import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

let cached: string | null = null;

function secretFile() {
  return path.join(process.cwd(), "data", "session-secret");
}

export function getSecret() {
  if (cached) return cached;
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
    cached = fromEnv;
    return cached;
  }

  const file = secretFile();
  if (fs.existsSync(file)) {
    cached = fs.readFileSync(file, "utf8").trim();
    return cached;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  cached = randomBytes(32).toString("base64url");
  fs.writeFileSync(file, cached, { mode: 0o600 });
  return cached;
}

function key() {
  return createHash("sha256").update(getSecret()).digest();
}

export function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function open(payload: string) {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Не удалось прочитать сохранённый доступ.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function safeEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
