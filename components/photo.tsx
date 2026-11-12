"use client";

import Image from "next/image";
import { useState } from "react";

function safeHttps(src: string | null | undefined) {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function canOptimize(src: string) {
  const host = new URL(src).hostname;
  return host === "images.unsplash.com" || host.endsWith(".pinimg.com");
}

export function FillPhoto({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const safe = safeHttps(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === safe;

  if (!safe || failed) return null;
  if (!canOptimize(safe)) {
    return (
      // Pin image hosts vary, and some are outside the optimizer allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safe}
        alt={alt}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(safe)}
      />
    );
  }
  return (
    <Image
      src={safe}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 430px) 100vw, 430px"
      className="pointer-events-none object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(safe)}
    />
  );
}

export function Thumb({ src, alt }: { src: string | null; alt: string }) {
  const safe = safeHttps(src);
  const [failed, setFailed] = useState(false);
  if (!safe || failed) {
    return <div className="h-16 w-12 shrink-0 rounded-xl bg-white/10" />;
  }
  if (!canOptimize(safe)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safe}
        alt={alt}
        className="h-16 w-12 shrink-0 rounded-xl object-cover"
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <Image
      src={safe}
      alt={alt}
      width={96}
      height={128}
      className="h-16 w-12 shrink-0 rounded-xl object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
