import { Mark } from "./mark";

export function ScreenFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <Mark />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
