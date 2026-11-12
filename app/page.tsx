import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { ScreenFallback } from "@/components/screen-fallback";
import { getUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { redirect } from "next/navigation";

export default function HomePage() {
  return (
    <Suspense fallback={<ScreenFallback label="Открываю" />}>
      <HomeGate />
    </Suspense>
  );
}

async function HomeGate() {
  const user = await getUser();
  if (!user) return <AuthScreen />;
  const hasBoards = readDb().boards.some((board) => board.userId === user.id);
  redirect(hasBoards ? "/deck" : "/boards");
}
