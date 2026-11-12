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
};

export type PinCard = {
  id: string;
  imageUrl: string;
  title: string;
  boardName: string;
  href: string;
};

export type DeckSuccess = {
  ok: true;
  selectionKey: string;
  title: string;
  pins: PinCard[];
  cursors: Record<string, string | null>;
  warning?: string;
};

export type DeckFailure = {
  ok: false;
  message: string;
};

export type DeckResult = DeckSuccess | DeckFailure;

export type DeckPage = {
  pins: PinCard[];
  cursors: Record<string, string | null>;
};
