import { Suspense } from "react";
import { DeckMessage } from "@/components/deck-message";
import { ScreenFallback } from "@/components/screen-fallback";
import { SwipeDeck } from "@/components/swipe-deck";
import { getDeck } from "@/lib/deck-data";

export const metadata = { title: "Колода" };

export default function DeckPage() {
  return (
    <Suspense fallback={<ScreenFallback label="Собираю колоду" />}>
      <DeckGate />
    </Suspense>
  );
}

async function DeckGate() {
  const deck = await getDeck();
  if (!deck.ok) {
    return <DeckMessage title="Не получилось открыть фото" body={deck.message} />;
  }
  return (
    <SwipeDeck
      key={deck.selectionKey}
      title={deck.title}
      pins={deck.pins}
      cursors={deck.cursors}
      warning={deck.warning ?? null}
    />
  );
}
