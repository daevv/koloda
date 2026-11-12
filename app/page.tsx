import { Suspense } from "react";
import { Welcome } from "@/components/welcome";
import { ScreenFallback } from "@/components/screen-fallback";
import { getUser } from "@/lib/auth";
import { userHasBoards } from "@/lib/db";
import { freshDeckPath } from "@/lib/constants";
import { hasSeenOnboarding } from "@/lib/session";
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
  if (!user) return <Welcome onboarded={await hasSeenOnboarding()} />;
  redirect((await userHasBoards(user.id)) ? freshDeckPath() : "/boards");
}
