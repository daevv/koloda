"use client";

import { useState } from "react";
import { finishOnboarding } from "@/app/actions/auth";
import { AuthScreen } from "@/components/auth-screen";
import { Onboarding } from "@/components/onboarding";

export function Welcome({ onboarded }: { onboarded: boolean }) {
  const [done, setDone] = useState(onboarded);

  if (!done) {
    return (
      <Onboarding
        onFinish={() => {
          setDone(true);
          void finishOnboarding();
        }}
      />
    );
  }

  return <AuthScreen />;
}
