export function isNextInterrupt(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_NOT_FOUND") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

export function publicErrorMessage(error: unknown) {
  if (error instanceof Error && error.message && !/digest/i.test(error.message)) {
    const message = error.message.replace(/\s+/g, " ").trim();
    if (message.length > 0 && message.length < 280) return message;
  }
  return "Не получилось сохранить аккаунт. Проверь переменные Vercel и таблицы в Supabase.";
}
