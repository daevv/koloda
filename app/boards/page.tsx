import { Suspense } from "react";
import { BoardsScreen } from "@/components/boards-screen";
import { ScreenFallback } from "@/components/screen-fallback";
import { getBoardsState } from "@/lib/boards-data";
import { describePinterestError } from "@/lib/messages";

export const metadata = { title: "Доски" };

export default function BoardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<ScreenFallback label="Загружаю доски" />}>
      <BoardsGate searchParams={searchParams} />
    </Suspense>
  );
}

async function BoardsGate({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const data = await getBoardsState();
  return (
    <BoardsScreen
      key={data.dataKey}
      data={data}
      notice={describePinterestError(params.error)}
    />
  );
}
