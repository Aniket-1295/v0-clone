// Workspace tabs the user can add or close. Preview is always open; the rest live in the
// "+" menu. The open set is stored per chat so a refresh does not reset the layout.

export const PANEL_IDS = ["preview", "code", "diff", "logs", "terminal", "settings"];

export const PANELS = [
  { id: "preview", label: "Preview", closeable: false },
  { id: "code", label: "Code", closeable: true },
  { id: "diff", label: "Diff", closeable: true },
  { id: "logs", label: "Logs", closeable: true },
  { id: "terminal", label: "Terminal", closeable: true },
  { id: "settings", label: "Settings", closeable: true },
];

export const DEFAULT_OPEN = ["preview", "code"];

export const STORAGE_PREFIX = "v0:panels:";

export const isPanelId = (id) => PANEL_IDS.includes(id);

export const panelById = (id) => PANELS.find((panel) => panel.id === id) ?? null;

/** Known tab ids only; anything else becomes "preview". */
export const parseTabParam = (tab) => (isPanelId(tab) ? tab : "preview");

/**
 * Drops unknown ids, de-dupes, keeps order, and always includes preview.
 * Empty or unreadable input becomes ["preview"] (loadOpenPanels uses DEFAULT_OPEN instead).
 */
export const parseOpenPanels = (raw) => {
  let ids = [];
  if (Array.isArray(raw)) {
    ids = raw;
  } else if (typeof raw === "string" && raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) ids = parsed;
    } catch {
      ids = [];
    }
  }
  const seen = new Set();
  const open = [];
  for (const id of ids) {
    if (!isPanelId(id) || seen.has(id)) continue;
    seen.add(id);
    open.push(id);
  }
  if (!seen.has("preview")) open.unshift("preview");
  return open;
};

/** Adds a known panel to the end if it is not already open. */
export const openPanel = (open, id) => {
  const next = parseOpenPanels(open);
  if (!isPanelId(id) || next.includes(id)) return next;
  return [...next, id];
};

/** Removes a closeable panel. Closing Preview is a no-op. */
export const closePanel = (open, id) => {
  if (!panelById(id)?.closeable) return parseOpenPanels(open);
  return parseOpenPanels(open).filter((item) => item !== id);
};

/**
 * After closing a tab, keep the current one unless it was the one just closed —
 * then Preview.
 */
export const nextActive = ({ open, active, closing }) => {
  const remaining = closing ? closePanel(open, closing) : parseOpenPanels(open);
  if (active && active !== closing && remaining.includes(active)) return active;
  return "preview";
};

export const closedPanels = (open) => {
  const set = new Set(parseOpenPanels(open));
  return PANELS.filter((panel) => !set.has(panel.id));
};

export const storageKey = (chatId) => `${STORAGE_PREFIX}${chatId}`;

const listeners = new Set();

/** Same-tab subscribers plus the cross-tab `storage` event. */
export const subscribePanelStore = (onChange) => {
  listeners.add(onChange);
  const onStorage = (event) => {
    if (!event.key || event.key.startsWith(STORAGE_PREFIX)) onChange();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
};

/** Canonical JSON of the open set, so useSyncExternalStore can compare snapshots. */
export const getOpenPanelsSnapshot = (chatId) => {
  if (typeof window === "undefined" || !chatId) return JSON.stringify(DEFAULT_OPEN);
  try {
    const raw = window.localStorage.getItem(storageKey(chatId));
    if (raw == null) return JSON.stringify(DEFAULT_OPEN);
    return JSON.stringify(parseOpenPanels(raw));
  } catch {
    return JSON.stringify(DEFAULT_OPEN);
  }
};

/** Stored open set for this chat, or Preview + Code on a first visit / unreadable value. */
export const loadOpenPanels = (chatId) => parseOpenPanels(getOpenPanelsSnapshot(chatId));

export const saveOpenPanels = (chatId, open) => {
  if (typeof window === "undefined" || !chatId) return;
  try {
    window.localStorage.setItem(storageKey(chatId), JSON.stringify(parseOpenPanels(open)));
  } catch {
    // Quota or private mode: keep the session layout only.
  }
  listeners.forEach((listener) => listener());
};
