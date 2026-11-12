export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthMode = "login" | "register";

export type AuthFormState = {
  mode?: AuthMode;
  error?: string;
  fields?: Partial<Record<"name" | "email" | "password", string>>;
};

export type BoardOption = {
  id: string;
  name: string;
  pinCount: number | null;
  coverUrl: string | null;
  privacy: "PUBLIC" | "PROTECTED" | "SECRET" | null;
  origin?: "link";
};

export type BoardsState = {
  user: PublicUser;
  configured: boolean;
  redirectUri: string;
  connection: { username: string; profileImage: string | null } | null;
  boards: BoardOption[];
  selectedIds: string[];
  dataKey: string;
  usingDemo: boolean;
  loadError: string | null;
  prefs: DeckPrefs;
};

export const MOODS = [
  "calm",
  "motivation",
  "love",
  "fun",
  "wisdom",
  "melancholy",
  "mystery",
  "adventure",
] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_LABELS: Record<Mood, string> = {
  calm: "Спокойное",
  motivation: "Мотивация",
  love: "Любовь",
  fun: "Весёлое",
  wisdom: "Мудрость",
  melancholy: "Грусть",
  mystery: "Тайна",
  adventure: "Приключение",
};

export const DECK_MODES = ["all", "pins", "quotes"] as const;
export type DeckMode = (typeof DECK_MODES)[number];

export const DECK_MODE_LABELS: Record<DeckMode, string> = {
  all: "Всё",
  pins: "Пины",
  quotes: "Цитаты",
};

export type DeckPrefs = {
  mood: Mood;
  mode: DeckMode;
};

export const DEFAULT_PREFS: DeckPrefs = { mood: "calm", mode: "all" };

export type PinCard = {
  kind: "pin";
  id: string;
  imageUrl: string;
  title: string;
  boardName: string;
  href: string;
};

export type QuoteCard = {
  kind: "quote";
  id: string;
  text: string;
  author: string;
  book: string;
  genre: string;
  mood: Mood;
};

export type DeckCard = PinCard | QuoteCard;

export type DeckSuccess = {
  ok: true;
  selectionKey: string;
  title: string;
  cards: DeckCard[];
  cursors: Record<string, string | null>;
  warning?: string;
};

export type DeckFailure = {
  ok: false;
  message: string;
};

export type DeckResult = DeckSuccess | DeckFailure;

export type DeckPage = {
  cards: DeckCard[];
  cursors: Record<string, string | null>;
};
