"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Что-то сломалось</h1>
      <p className="text-sm text-muted">Обнови экран. Если повторится — зайди заново.</p>
      <button
        type="button"
        onClick={reset}
        className="flex h-12 items-center justify-center rounded-2xl bg-cream px-6 font-semibold text-ink"
      >
        Ещё раз
      </button>
    </div>
  );
}
