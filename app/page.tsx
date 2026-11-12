import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { ScreenFallback } from "@/components/screen-fallback";
import { getUser } from "@/lib/auth";
import { userHasBoards } from "@/lib/db";
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
  redirect((await userHasBoards(user.id)) ? "/deck" : "/boards");
}
