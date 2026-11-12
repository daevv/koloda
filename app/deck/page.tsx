import { Suspense } from "react";
import { DeckMessage } from "@/components/deck-message";
import { ScreenFallback } from "@/components/screen-fallback";
import { SwipeDeck } from "@/components/swipe-deck";
import { getDeck } from "@/lib/deck-data";

export const metadata = { title: "Колода" };

export default function DeckPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  return (
    <Suspense fallback={<ScreenFallback label="Собираю колоду" />}>
      <DeckGate searchParams={searchParams} />
    </Suspense>
  );
}

async function DeckGate({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const params = await searchParams;
  const deck = await getDeck();
  if (!deck.ok) {
    return <DeckMessage title="Не получилось открыть фото" body={deck.message} />;
  }
  return (
    <SwipeDeck
      key={`${deck.selectionKey}:${params.s ?? ""}`}
      title={deck.title}
      cards={deck.cards}
      cursors={deck.cursors}
      warning={deck.warning ?? null}
    />
  );
}
