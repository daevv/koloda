"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { loadMorePins } from "@/app/actions/pinterest";
import { AppBar, TextLink } from "@/components/app-bar";
import { FillPhoto } from "@/components/photo";
import type { PinCard } from "@/lib/types";

function appendUnique(current: PinCard[], incoming: PinCard[]) {
  const seen = new Set(current.map((pin) => pin.id));
  const extra = incoming.filter((pin) => !seen.has(pin.id));
  return extra.length > 0 ? [...current, ...extra] : current;
}

function hue(id: string) {
  let value = 0;
  for (const char of id) value = (value + char.charCodeAt(0) * 17) % 360;
  return value;
}

export function SwipeDeck({
  title,
  pins: initialPins,
  cursors: initialCursors,
  warning,
}: {
  title: string;
  pins: PinCard[];
  cursors: Record<string, string | null>;
  warning: string | null;
}) {
  const [pins, setPins] = useState(initialPins);
  const [cursors, setCursors] = useState(initialCursors);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);
  const cursorsRef = useRef(initialCursors);
  const startRef = useRef<{ x: number; t: number } | null>(null);
  const committed = useRef(false);
  const timerRef = useRef<number | null>(null);
  const loadingMore = useRef(false);
  const stopped = useRef(false);
  const emptyStreak = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    committed.current = false;
  }, [index]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const remaining = pins.length - index;
    const hasCursor = Object.values(cursorsRef.current).some(Boolean);
    if (!hasCursor || loadingMore.current || stopped.current) return;
    if (pins.length > 0 && remaining > 5) return;

    loadingMore.current = true;
    loadMorePins(cursorsRef.current)
      .then((page) => {
        if (!mounted.current || !page) return;
        let added = 0;
        setPins((current) => {
          const next = appendUnique(current, page.pins);
          added = next.length - current.length;
          return next;
        });
        const progressed =
          JSON.stringify(page.cursors) !== JSON.stringify(cursorsRef.current);
        if (added === 0 && (!progressed || emptyStreak.current >= 2)) {
          const drained = Object.fromEntries(
            Object.keys(page.cursors).map((id) => [id, null]),
          ) as Record<string, string | null>;
          cursorsRef.current = drained;
          setCursors(drained);
          return;
        }
        emptyStreak.current = added === 0 ? emptyStreak.current + 1 : 0;
        cursorsRef.current = page.cursors;
        setCursors(page.cursors);
      })
      .catch(() => {
        stopped.current = true;
      })
      .finally(() => {
        loadingMore.current = false;
      });
  }, [index, pins.length]);

  const finish = useCallback(() => {
    if (committed.current) return;
    committed.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setLeaving(false);
    setOffset(0);
    setDragging(false);
    setHintSeen(true);
    setIndex((current) => current + 1);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  }, []);

  const dismiss = useCallback(() => {
    if (leaving || index >= pins.length) return;
    if (reduced) {
      finish();
      return;
    }
    setLeaving(true);
    setOffset(-Math.max(window.innerWidth, 480) - 80);
    timerRef.current = window.setTimeout(finish, 420);
  }, [finish, index, leaving, pins.length, reduced]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft") return;
      event.preventDefault();
      dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const hasMore = Object.values(cursors).some(Boolean);
  const current = pins[index];
  const upcoming = pins.slice(index, index + 3);
  const progress = Math.min(1, Math.max(0, -Math.min(offset, 0) / 240));

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (leaving || event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some input paths cannot capture the pointer. The gesture still tracks moves.
    }
    startRef.current = { x: event.clientX, t: Date.now() };
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start || leaving) return;
    const delta = event.clientX - start.x;
    setOffset(delta < 0 ? delta : Math.min(delta, 72) * 0.2);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current;
    startRef.current = null;
    setDragging(false);
    if (!start || leaving) return;
    const delta = event.clientX - start.x;
    const velocity = delta / Math.max(1, Date.now() - start.t);
    if (delta < -96 || (delta < -40 && velocity < -0.5)) {
      dismiss();
      return;
    }
    setOffset(0);
  }

  const shell = (children: ReactNode, footer: ReactNode) => (
    <div className="flex h-full min-h-0 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <AppBar
        eyebrow={
          pins.length === 0
            ? title
            : `${Math.min(index + 1, pins.length)} / ${pins.length}${hasMore ? "+" : ""}`
        }
        title={title}
        trailing={<TextLink href="/boards">Доски</TextLink>}
      />
      {warning ? <p className="mt-3 text-center text-xs text-muted">{warning}</p> : null}
      <div className="relative mt-3 min-h-0 flex-1">{children}</div>
      <div className="shrink-0 pt-3">{footer}</div>
    </div>
  );

  if (!current && hasMore) {
    return shell(
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Достаю ещё фото…
      </div>,
      <div className="h-12" />,
    );
  }

  if (!current) {
    const empty = pins.length === 0;
    return shell(
      <div className="flex h-full flex-col justify-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          {empty ? "Пусто" : "Всё"}
        </h1>
        <p className="mt-3 max-w-xs text-base leading-6 text-muted">
          {empty
            ? "На выбранных досках нет фотографий."
            : `Ты посмотрел ${pins.length} фото.`}
        </p>
      </div>,
      <div className="flex flex-col gap-2">
        {empty ? null : (
          <button
            type="button"
            onClick={() => setIndex(0)}
            className="flex h-12 items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink"
          >
            Сначала
          </button>
        )}
        <Link
          href="/boards"
          className="flex h-12 items-center justify-center rounded-2xl border border-line text-base"
        >
          К доскам
        </Link>
      </div>,
    );
  }

  return shell(
    <>
      {upcoming
        .map((pin, depth) => ({ pin, depth }))
        .reverse()
        .map(({ pin, depth }) => {
          const gone = depth === 0 && leaving;
          const transform =
            depth === 0
              ? `translate3d(${offset}px, 0, 0) rotate(${offset / 22}deg)`
              : `translate3d(0, ${10 + depth * 8}px, 0) scale(${0.96 - depth * 0.03 + (depth === 1 ? progress * 0.03 : 0)})`;
          return (
            <article
              key={pin.id}
              className={`absolute inset-0 overflow-hidden rounded-[28px] shadow-[0_18px_50px_rgba(0,0,0,0.35)] ${
                depth === 0 ? "z-20 touch-none" : "pointer-events-none z-10"
              }`}
              style={{
                background: `hsl(${hue(pin.id)} 28% 16%)`,
                transform,
                transition:
                  depth === 0 && dragging
                    ? "none"
                    : "transform 280ms cubic-bezier(.2,.9,.2,1)",
              }}
              onPointerDown={depth === 0 ? onPointerDown : undefined}
              onPointerMove={depth === 0 ? onPointerMove : undefined}
              onPointerUp={depth === 0 ? onPointerUp : undefined}
              onPointerCancel={depth === 0 ? onPointerUp : undefined}
              onTransitionEnd={
                depth === 0
                  ? (event) => {
                      if (event.propertyName !== "transform" || !gone) return;
                      finish();
                    }
                  : undefined
              }
            >
              <FillPhoto src={pin.imageUrl} alt={pin.title} priority={depth === 0} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/10" />
              {depth === 0 ? (
                <div
                  className="absolute top-5 left-5 rounded-full border-2 border-white px-3 py-1 text-sm font-bold tracking-wide text-white uppercase"
                  style={{ opacity: offset < 0 ? Math.min(1, -offset / 110) : 0 }}
                >
                  Далее
                </div>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-xs tracking-wide text-white/75 uppercase">{pin.boardName}</p>
                <h2 className="mt-1 line-clamp-2 text-2xl font-semibold text-white">
                  {pin.title}
                </h2>
              </div>
            </article>
          );
        })}
    </>,
    <div className="flex flex-col gap-2">
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-cream"
          style={{ width: `${(index / pins.length) * 100}%` }}
        />
      </div>
      <p className="text-center text-sm text-muted">
        {offset > 10
          ? "Назад нельзя — только дальше"
          : hintSeen
            ? "Свайп влево"
            : "Свайпни влево, чтобы открыть следующее"}
        <span className="hidden sm:inline"> · или ←</span>
      </p>
      <a
        href={current.href}
        target="_blank"
        rel="noreferrer"
        className="text-center text-sm text-white/75 underline-offset-4 hover:underline"
      >
        {current.href.includes("pinterest.com") ? "Открыть пин" : "Открыть фото"}
      </a>
      <button
        type="button"
        onClick={dismiss}
        className="flex h-12 items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink transition active:scale-[0.98]"
      >
        Дальше
      </button>
    </div>,
  );
}
