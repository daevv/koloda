"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "./mark";

export function AppBar({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Mark />
        <div className="min-w-0">
          {eyebrow ? <p className="truncate text-xs text-muted">{eyebrow}</p> : null}
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
      </div>
      {trailing}
    </header>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center rounded-full px-3 text-sm text-foreground/80"
    >
      {children}
    </Link>
  );
}
