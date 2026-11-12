"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const SCREENS = [
  {
    title: "Не лента",
    text: "Вместо бесконечных тиктоков листай свои доски и цитаты. Одна карточка — и дальше. Без мусора.",
  },
  {
    title: "Только вперёд",
    text: "Свайп влево открывает следующую карточку. Назад нет — так проще не залипнуть.",
  },
  {
    title: "Сам собираешь колоду",
    text: "Пины, цитаты или всё вместе. Для цитат выбираешь настроение: спокойное, мотивация, мудрость.",
  },
  {
    title: "Пользуйся спокойно",
    text: "Добавь доску Pinterest или сразу открой цитаты. Аккаунт — чтобы колода оставалась твоей.",
  },
] as const;

function PhilosophyArt() {
  return (
    <div className="relative mx-auto h-36 w-44" aria-hidden>
      <div className="absolute top-6 left-2 h-24 w-16 -rotate-12 rounded-2xl bg-gradient-to-br from-[#c17f59] to-[#3d2a24] shadow-xl" />
      <div className="absolute top-3 left-14 h-[7.5rem] w-[4.5rem] rounded-2xl bg-[#f4efe8] px-2.5 py-3 shadow-xl">
        <span className="block h-1.5 w-8 rounded-full bg-ink/20" />
        <span className="mt-2 block h-1.5 w-10 rounded-full bg-ink/15" />
        <span className="mt-1.5 block h-1.5 w-7 rounded-full bg-ink/10" />
      </div>
      <div className="absolute top-8 right-1 h-20 w-14 rotate-12 rounded-2xl bg-white/10" />
    </div>
  );
}

function MechanicsArt() {
  return (
    <div className="relative mx-auto h-36 w-44" aria-hidden>
      <div className="absolute top-7 left-16 h-[6.5rem] w-[4.6rem] rotate-6 rounded-2xl bg-white/10" />
      <div className="absolute top-5 left-4 h-[7.25rem] w-20 -rotate-[18deg] rounded-2xl bg-gradient-to-br from-[#d7c4a3] to-[#6a5644] shadow-xl">
        <span className="absolute top-3 left-2 rounded-full border border-white/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
          Далее
        </span>
      </div>
    </div>
  );
}

function ModesArt() {
  return (
    <div className="mx-auto flex h-36 w-full max-w-xs flex-col items-center justify-center gap-2" aria-hidden>
      <div className="flex gap-2">
        <span className="rounded-full bg-cream px-3 py-1.5 text-sm font-medium text-ink">Всё</span>
        <span className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">Пины</span>
        <span className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">Цитаты</span>
      </div>
      <div className="flex gap-2">
        <span className="rounded-full bg-cream/90 px-3 py-1.5 text-sm text-ink">Мудрость</span>
        <span className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">Спокойное</span>
      </div>
    </div>
  );
}

function EnjoyArt() {
  return (
    <div className="mx-auto flex h-36 w-44 items-center" aria-hidden>
      <div className="flex h-[6.5rem] w-full flex-col justify-between rounded-[22px] bg-[#f4efe8] px-4 py-3 text-ink shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <span className="text-[10px] tracking-[0.16em] text-ink/40 uppercase">Цитата</span>
        <span className="text-sm font-medium leading-5">Одна карточка. И тишина.</span>
      </div>
    </div>
  );
}

const ART = [PhilosophyArt, MechanicsArt, ModesArt, EnjoyArt];

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number } | null>(null);
  const last = index === SCREENS.length - 1;
  const screen = SCREENS[index];
  const Art = ART[index];

  const go = useCallback(
    (next: number) => {
      setOffset(0);
      setDragging(false);
      if (next >= SCREENS.length) {
        onFinish();
        return;
      }
      setIndex(Math.max(0, next));
    },
    [onFinish],
  );

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    startRef.current = { x: event.clientX };
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start) return;
    setOffset(Math.max(-140, Math.min(140, event.clientX - start.x)));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current;
    startRef.current = null;
    setDragging(false);
    if (!start) return;
    const distance = event.clientX - start.x;
    if (distance < -56) {
      go(index + 1);
      return;
    }
    if (distance > 56) {
      go(index - 1);
      return;
    }
    setOffset(0);
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex h-11 items-center justify-between">
        <p className="text-sm tracking-wide text-muted">Koloda</p>
        <button
          type="button"
          onClick={onFinish}
          className={`h-11 px-1 text-sm text-muted ${last ? "invisible pointer-events-none" : ""}`}
        >
          Пропустить
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 touch-none flex-col justify-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            transform: `translate3d(${offset}px, 0, 0)`,
            transition: dragging ? "none" : "transform 280ms cubic-bezier(.2,.9,.2,1)",
          }}
        >
          <Art />
          <h1 className="mt-6 text-[2rem] leading-9 font-semibold tracking-tight">{screen.title}</h1>
          <p className="mt-3 max-w-sm text-base leading-6 text-muted">{screen.text}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 py-4">
        {SCREENS.map((item, dot) => (
          <span
            key={item.title}
            className={`h-1.5 rounded-full transition-all ${
              dot === index ? "w-5 bg-cream" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="flex h-12 w-24 items-center justify-center rounded-2xl border border-line text-base"
          >
            Назад
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink transition active:scale-[0.98]"
        >
          {last ? "Начать" : "Дальше"}
        </button>
      </div>
    </div>
  );
}
