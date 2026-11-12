import Link from "next/link";
import { AppBar, TextLink } from "./app-bar";

export function DeckMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <AppBar
        eyebrow="Koloda"
        title="Колода"
        trailing={<TextLink href="/boards">Доски</TextLink>}
      />
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-sm text-base leading-6 text-muted">{body}</p>
      </div>
      <Link
        href="/boards"
        className="flex h-12 items-center justify-center rounded-2xl bg-cream text-base font-semibold text-ink"
      >
        К доскам
      </Link>
    </div>
  );
}
