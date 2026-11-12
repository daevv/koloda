"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { authenticate } from "@/app/actions/auth";
import type { AuthFormState, AuthMode } from "@/lib/types";

const initialState: AuthFormState = {};

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink transition active:scale-[0.98] disabled:opacity-40"
    >
      {pending ? "Секунду…" : mode === "login" ? "Войти" : "Создать аккаунт"}
    </button>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [state, action] = useActionState(authenticate, initialState);
  const visible = state.mode === mode ? state : undefined;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div
        className="relative mx-auto mt-4 mb-2 h-28 w-full max-w-56 shrink-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute top-5 left-1 h-24 w-16 -rotate-12 rounded-2xl bg-gradient-to-br from-[#c17f59] to-[#3d2a24] shadow-xl" />
        <div className="absolute top-2 left-16 h-28 w-20 rotate-6 rounded-2xl bg-gradient-to-br from-[#6e8b74] to-[#1d2a22] shadow-xl" />
        <div className="absolute top-4 right-2 h-24 w-16 rotate-3 rounded-2xl bg-gradient-to-br from-[#d7c4a3] to-[#6a5644] shadow-xl" />
      </div>
      <h1 className="relative z-10 text-[2rem] leading-9 font-semibold tracking-tight">
        Листай доски как колоду
      </h1>
      <p className="mt-2 text-base leading-6 text-muted">
        Подключи Pinterest, выбери доски и смотри фотографии. Свайп пока только
        вперёд.
      </p>
      <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
        {(
          [
            ["login", "Войти"],
            ["register", "Регистрация"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`h-10 rounded-xl text-sm font-medium ${
              mode === value ? "bg-cream text-ink" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <form action={action} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="mode" value={mode} />
        {mode === "register" ? (
          <label className="flex flex-col gap-1.5 text-sm">
            Имя
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={40}
              placeholder="Как к тебе обращаться"
              className="h-12 rounded-2xl border border-line bg-white/5 px-4 text-base outline-none placeholder:text-muted focus:border-white/30"
            />
            {visible?.fields?.name ? (
              <span className="px-1 text-sm text-[#ffb4ae]">{visible.fields.name}</span>
            ) : null}
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          Почта
          <input
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            placeholder="you@email.com"
            className="h-12 rounded-2xl border border-line bg-white/5 px-4 text-base outline-none placeholder:text-muted focus:border-white/30"
          />
          {visible?.fields?.email ? (
            <span className="px-1 text-sm text-[#ffb4ae]">{visible.fields.email}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Пароль
          <span className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              placeholder="Буква и цифра"
              className="h-12 w-full rounded-2xl border border-line bg-white/5 px-4 pr-16 text-base outline-none placeholder:text-muted focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-0 right-1 h-12 px-3 text-sm text-muted"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </span>
          {visible?.fields?.password ? (
            <span className="px-1 text-sm text-[#ffb4ae]">
              {visible.fields.password}
            </span>
          ) : mode === "register" ? (
            <span className="px-1 text-xs text-muted">
              Минимум 8 символов, буква и цифра.
            </span>
          ) : null}
        </label>
        {visible?.error ? (
          <p className="rounded-2xl bg-accent/15 px-3 py-2 text-sm text-[#ffb4ae]">
            {visible.error}
          </p>
        ) : null}
        <SubmitButton mode={mode} />
      </form>
    </div>
  );
}
