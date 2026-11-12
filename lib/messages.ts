const KNOWN: Record<string, string> = {
  config:
    "Сначала добавь ключи Pinterest в .env.local и перезапусти сервер.",
  state: "Не удалось подтвердить вход в Pinterest. Начни подключение ещё раз.",
  token:
    "Pinterest не выдал доступ. Проверь ключи, redirect URI и что в trial-приложение входит его владелец.",
  access_denied: "Доступ к Pinterest отменён.",
  empty: "Выбери хотя бы одну доску или ссылку.",
  fetch: "Не удалось получить доски из Pinterest. Попробуй ещё раз.",
  link: "Это не похоже на ссылку Pinterest. Нужна ссылка на доску или профиль, например pinterest.com/имя/доска.",
  feed: "Лента не открылась. Доска или профиль должны быть публичными.",
  feed_empty: "В этой ленте нет фотографий.",
};

export function describePinterestError(code: string | undefined) {
  if (!code) return null;
  if (KNOWN[code]) return KNOWN[code];
  if (/^[a-z0-9_]{1,40}$/.test(code)) {
    return `Pinterest вернул ошибку «${code}». Проверь права приложения и redirect URI.`;
  }
  return "Не получилось подключить Pinterest. Попробуй ещё раз.";
}
