"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { logout } from "@/app/actions/auth";
import {
  addLink,
  beginPinterestConnect,
  disconnectPinterest,
  removeLink,
  saveBoards,
} from "@/app/actions/pinterest";
import { AppBar } from "@/components/app-bar";
import { Thumb } from "@/components/photo";
import { PINTEREST_SCOPES } from "@/lib/constants";
import { pluralPins } from "@/lib/plural";
import type { BoardOption, BoardsState } from "@/lib/types";

function WatchButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="flex h-12 w-full items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink transition active:scale-[0.98] disabled:opacity-40"
    >
      {pending ? "Открываю…" : count > 0 ? `Смотреть · ${count}` : "Выбери доску"}
    </button>
  );
}

function AddLinkButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink transition active:scale-[0.98] disabled:opacity-40"
    >
      {pending ? "Загружаю ленту…" : "Добавить и смотреть"}
    </button>
  );
}

function ConnectButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
    >
      {pending ? "Перехожу в Pinterest…" : "Подключить Pinterest"}
    </button>
  );
}

function privacyLabel(privacy: BoardOption["privacy"]) {
  if (privacy === "SECRET") return "секретная";
  if (privacy === "PROTECTED") return "закрытая";
  return null;
}

function noteFor(board: BoardOption) {
  if (board.origin === "link") return "по ссылке";
  const parts: string[] = [];
  if (board.pinCount !== null) parts.push(pluralPins(board.pinCount));
  const badge = privacyLabel(board.privacy);
  if (badge) parts.push(badge);
  return parts.join(" · ");
}

export function BoardsScreen({
  data,
  notice,
}: {
  data: BoardsState;
  notice: string | null;
}) {
  const [hiddenNotice, setHiddenNotice] = useState<string | null>(null);
  const banner = notice && notice !== hiddenNotice ? notice : null;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(data.selectedIds));

  const needle = query.trim().toLowerCase();
  const sectionTitle = data.connection ? "Твои доски" : "Демо-доски";

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppBar
          eyebrow={`Привет, ${data.user.name}`}
          title="Koloda"
          trailing={
            <form action={logout}>
              <button type="submit" className="flex h-11 items-center px-1 text-sm text-muted">
                Выйти
              </button>
            </form>
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4">
        {banner ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-accent/15 px-3 py-3 text-sm text-[#ffb4ae]">
            <p>{banner}</p>
            <button type="button" onClick={() => setHiddenNotice(notice)} className="shrink-0">
              Закрыть
            </button>
          </div>
        ) : null}

        <section className="rounded-3xl bg-card p-4">
          <h2 className="text-lg font-semibold">Ссылка на доску</h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Публичная доска или профиль Pinterest, без приложения. Подойдёт
            обычная ссылка или короткая pin.it из приложения.
          </p>
          <form action={addLink} className="mt-3 flex flex-col gap-2">
            <input
              name="link"
              required
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="pin.it/… или pinterest.com/имя/доска"
              className="h-12 w-full rounded-2xl border border-line bg-white/5 px-4 text-base outline-none placeholder:text-muted focus:border-white/30"
            />
            <AddLinkButton />
          </form>
          <p className="mt-2 text-xs leading-4 text-muted">
            По ссылке видны последние ~25 пинов публичной доски. Секретные и закрытые доски так не открыть.
          </p>
        </section>

        {data.connection ? (
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-card p-3">
            <Thumb src={data.connection.profileImage} alt="" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">@{data.connection.username}</p>
              <p className="text-sm text-muted">Pinterest подключён</p>
            </div>
            <form action={disconnectPinterest}>
              <button type="submit" className="h-11 px-2 text-sm text-muted">
                Отключить
              </button>
            </form>
          </div>
        ) : (
          <details className="mt-4 rounded-3xl bg-card p-4">
            <summary className="cursor-pointer list-none">
              <span className="block text-base font-semibold">Подключить Pinterest</span>
              <span className="block text-sm text-muted">для своих и секретных досок</span>
            </summary>
            <p className="mt-2 text-sm leading-5 text-muted">
              Нужно только для секретных досок и полного списка своих досок. Для этого
              создаётся приложение на Pinterest.
            </p>
            <label className="mt-4 block text-xs text-muted">
              Redirect URI — вставь его в настройки приложения
              <input
                readOnly
                value={data.redirectUri}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-1 h-11 w-full rounded-xl border border-line bg-black/20 px-3 font-mono text-xs text-foreground outline-none"
              />
            </label>
            {data.configured ? (
              <form action={beginPinterestConnect} className="mt-4">
                <ConnectButton />
              </form>
            ) : (
              <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm leading-5 text-muted">
                <li>
                  Создай приложение на{" "}
                  <a
                    href="https://developers.pinterest.com/apps/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline underline-offset-2"
                  >
                    developers.pinterest.com
                  </a>
                  .
                </li>
                <li>Включи scopes: {PINTEREST_SCOPES.join(", ")}.</li>
                <li>Вставь Redirect URI выше без изменений.</li>
                <li>
                  Добавь <span className="font-mono text-foreground">PINTEREST_APP_ID</span> и{" "}
                  <span className="font-mono text-foreground">PINTEREST_APP_SECRET</span> в{" "}
                  <span className="font-mono text-foreground">.env.local</span> и перезапусти сервер.
                </li>
                <li>Trial-приложение пускает только аккаунт его владельца.</li>
              </ol>
            )}
          </details>
        )}

        {data.usingDemo && data.connection ? (
          <p className="mt-4 text-sm leading-5 text-muted">
            Сейчас в колоде демо. Выбери свои доски — они его заменят.
          </p>
        ) : null}

        {data.loadError ? (
          <div className="mt-4 rounded-2xl bg-accent/15 px-3 py-3 text-sm text-[#ffb4ae]">
            <p>{data.loadError}</p>
            <form action={saveBoards} className="mt-3">
              <input type="hidden" name="intent" value="demo" />
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-white/15 text-sm text-foreground"
              >
                Пока посмотреть демо
              </button>
            </form>
          </div>
        ) : null}

        <div className="mt-6 mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{sectionTitle}</h2>
            <p className="text-sm text-muted">Можно несколько. В колоде они перемешаются.</p>
          </div>
          {data.boards.length > 1 ? (
            <div className="flex shrink-0 gap-2 text-sm">
              <button
                type="button"
                className="text-foreground"
                onClick={() => setSelected(new Set(data.boards.map((board) => board.id)))}
              >
                Все
              </button>
              <button type="button" className="text-muted" onClick={() => setSelected(new Set())}>
                Сбросить
              </button>
            </div>
          ) : null}
        </div>

        {data.boards.length > 6 ? (
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти доску"
            className="mb-3 h-11 w-full rounded-2xl border border-line bg-white/5 px-4 text-base outline-none placeholder:text-muted"
          />
        ) : null}

        {data.boards.length === 0 && !data.loadError ? (
          <p className="rounded-2xl bg-card px-4 py-6 text-sm text-muted">
            Пока пусто. Добавь ссылку на доску выше.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.boards.map((board) => {
              const visible =
                needle.length === 0 || board.name.toLowerCase().includes(needle);
              const isSelected = selected.has(board.id);
              return (
                <li key={board.id} className={visible ? "flex items-stretch gap-2" : "hidden"}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl bg-card px-3 py-2.5">
                    <input
                      form="save-boards"
                      type="checkbox"
                      name="board"
                      value={board.id}
                      checked={isSelected}
                      onChange={() => toggle(board.id)}
                      className="sr-only"
                    />
                    <Thumb src={board.coverUrl} alt="" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{board.name}</span>
                      <span className="mt-0.5 block text-sm text-muted">{noteFor(board)}</span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        isSelected ? "border-accent bg-accent text-white" : "border-white/20"
                      }`}
                      aria-hidden
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </label>
                  {board.origin === "link" ? (
                    <form action={removeLink} className="flex">
                      <input type="hidden" name="id" value={board.id} />
                      <button type="submit" className="px-2 text-sm text-muted">
                        Убрать
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        id="save-boards"
        action={saveBoards}
        className="shrink-0 border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <input type="hidden" name="intent" value="selection" />
        <WatchButton count={selected.size} />
      </form>
    </div>
  );
}
