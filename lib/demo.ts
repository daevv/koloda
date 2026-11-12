import "server-only";

import type { BoardOption, PinCard } from "./types";

type DemoBoard = BoardOption & { pins: PinCard[] };

function pin(boardName: string, title: string, photoId: string): PinCard {
  const imageUrl = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`;
  return {
    id: `demo-${photoId}`,
    imageUrl,
    title,
    boardName,
    href: imageUrl,
  };
}

const DEMO_BOARDS: DemoBoard[] = [
  {
    id: "demo:city",
    name: "Город",
    pinCount: 8,
    privacy: null,
    coverUrl:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=400&q=80",
    pins: [
      pin("Город", "Огни", "photo-1449824913935-59a10b8d2000"),
      pin("Город", "Крыши", "photo-1480714378408-67cf0d13bc1b"),
      pin("Город", "Ночь", "photo-1514565131-fce0801e5785"),
      pin("Город", "Улица", "photo-1502602898657-3e91760cbb34"),
      pin("Город", "Набережная", "photo-1523906834658-6e24ef2386f9"),
      pin("Город", "Площадь", "photo-1467269204594-9661b134dd2b"),
      pin("Город", "Мост", "photo-1477959858617-67f85cf4f1df"),
      pin("Город", "Дождь", "photo-1519501025264-65ba15a82390"),
    ],
  },
  {
    id: "demo:wild",
    name: "Природа",
    pinCount: 8,
    privacy: null,
    coverUrl:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80",
    pins: [
      pin("Природа", "Лес", "photo-1441974231531-c6227db76b6e"),
      pin("Природа", "Туман", "photo-1470071459604-3b5ec3a7fe05"),
      pin("Природа", "Озеро", "photo-1501785888041-af3ef285b470"),
      pin("Природа", "Поле", "photo-1472214103451-9374bd1c798e"),
      pin("Природа", "Горы", "photo-1426604966848-d7adac402bff"),
      pin("Природа", "Берег", "photo-1475924156734-496f6cac6ec1"),
      pin("Природа", "Закат", "photo-1500534314209-a25ddb2bd429"),
      pin("Природа", "Звёзды", "photo-1519681393784-d120267933ba"),
    ],
  },
];

export function demoBoardOptions(): BoardOption[] {
  return DEMO_BOARDS.map((board) => ({
    id: board.id,
    name: board.name,
    pinCount: board.pinCount,
    coverUrl: board.coverUrl,
    privacy: board.privacy,
  }));
}

export function demoPins(boardId: string) {
  return DEMO_BOARDS.find((board) => board.id === boardId)?.pins ?? [];
}

export function demoBoardsByIds(ids: Iterable<string>) {
  const selected = new Set(ids);
  return DEMO_BOARDS.filter((board) => selected.has(board.id));
}
