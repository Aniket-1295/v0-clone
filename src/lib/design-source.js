// Design mode: find the JSX element the user clicked in the preview, and rewrite its text
// or Tailwind classes. Works on literal className="..." strings and plain text children;
// anything else (cn(...), template strings, mapped lists) is left to "Ask v0".

const SOURCE_FILE = /^(app|components|src)\/.+\.(tsx|jsx)$/;
const UI_LIBRARY = /^(src\/)?components\/ui\//;

const classSet = (value) => [...new Set(String(value ?? "").split(/\s+/).filter(Boolean))].sort().join(" ");
const squash = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Opening tags `<tag ...>` in `source` with their positions, literal className and plain text. */
const elementsIn = (source, tag) => {
  const found = [];
  const opening = new RegExp(`<${escapeRegExp(tag)}(?=[\\s>/])`, "g");
  for (const match of source.matchAll(opening)) {
    const start = match.index;
    // End of the opening tag: the first ">" outside {...} and quotes.
    let depth = 0;
    let quote = null;
    let end = -1;
    for (let i = start + 1; i < source.length; i++) {
      const char = source[i];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'" || char === "`") quote = char;
      else if (char === "{") depth++;
      else if (char === "}") depth--;
      else if (char === ">" && depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end === -1) continue;
    const openTag = source.slice(start, end);
    const classMatch = /\sclassName="([^"]*)"/.exec(openTag);
    const element = {
      start,
      openEnd: end,
      selfClosing: openTag.endsWith("/>"),
      className: classMatch ? classMatch[1] : null,
      classStart: classMatch ? start + classMatch.index + classMatch[0].indexOf('"') + 1 : -1,
      text: null,
      textStart: -1,
      textEnd: -1,
    };
    if (!element.selfClosing) {
      const close = source.indexOf(`</${tag}>`, end);
      const inner = close === -1 ? "" : source.slice(end, close);
      // Plain text only: no child elements or {expressions}.
      if (close !== -1 && !/[<{}]/.test(inner) && inner.trim()) {
        element.text = squash(inner);
        element.textStart = end;
        element.textEnd = close;
      }
    }
    found.push(element);
  }
  return found;
};

/**
 * Where the clicked element ({ tag, className, text }) is defined in the app's own files.
 * Returns { path, element } when there is exactly one candidate, { matches: n } otherwise.
 */
export const findElementSource = (files, { tag, className, text }) => {
  const wantedClasses = classSet(className);
  const wantedText = text == null ? null : squash(text);
  const candidates = [];

  for (const [path, source] of Object.entries(files ?? {})) {
    if (typeof source !== "string" || !SOURCE_FILE.test(path) || UI_LIBRARY.test(path)) continue;
    for (const element of elementsIn(source, tag)) {
      const classesMatch = wantedClasses ? element.className !== null && classSet(element.className) === wantedClasses : true;
      const textMatches = wantedText == null || element.text === wantedText;
      if (wantedClasses ? classesMatch : element.text !== null && textMatches) candidates.push({ path, element });
    }
  }

  // Same classes in several places: the text decides.
  const narrowed = candidates.length > 1 && wantedText != null ? candidates.filter(({ element }) => element.text === wantedText) : candidates;
  return narrowed.length === 1 ? narrowed[0] : { matches: narrowed.length };
};

/** `source` with the element's className and/or plain text replaced. */
export const applyElementEdit = (source, element, { className, text }) => {
  const edits = [];
  if (className != null && element.classStart !== -1) {
    edits.push([element.classStart, element.classStart + element.className.length, className]);
  }
  if (text != null && element.textStart !== -1) {
    // Keep the original indentation around the text.
    const original = source.slice(element.textStart, element.textEnd);
    const [, before, , after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(original);
    edits.push([element.textStart, element.textEnd, `${before}${text.replace(/[{}<>]/g, "")}${after}`]);
  }
  return edits
    .sort((a, b) => b[0] - a[0])
    .reduce((result, [from, to, value]) => result.slice(0, from) + value + result.slice(to), source);
};

// Tailwind groups the panel edits. Only unprefixed classes are touched (md:, hover: stay).
const COLORS = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// Arbitrary values count too: text-[#111827] is a colour, text-[38px] a size.
const ARBITRARY_COLOR = "\\[(#|rgb|hsl|oklch|color:|var\\(--)[^\\]]*\\]";
const ARBITRARY_LENGTH = "\\[-?\\d*\\.?\\d+(px|rem|em|%|vw|vh)?\\]";
export const STYLE_GROUPS = {
  textColor: new RegExp(`^text-((${COLORS})-\\d{2,3}|white|black|${ARBITRARY_COLOR})$`),
  background: new RegExp(`^bg-((${COLORS})-\\d{2,3}|white|black|transparent|${ARBITRARY_COLOR})$`),
  fontSize: new RegExp(`^text-(xs|sm|base|lg|xl|[2-9]xl|${ARBITRARY_LENGTH})$`),
  fontWeight: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  padding: new RegExp(`^p-(\\d+(\\.5)?|px|${ARBITRARY_LENGTH})$`),
  radius: new RegExp(`^rounded(-(none|sm|md|lg|xl|2xl|3xl|full|${ARBITRARY_LENGTH}))?$`),
};

/** The class from `group` in a class string, or "". */
export const readStyle = (className, group) =>
  String(className ?? "").split(/\s+/).find((token) => STYLE_GROUPS[group].test(token)) ?? "";

/** The class string with `group`'s class replaced by `value` ("" removes it). */
export const writeStyle = (className, group, value) => {
  const tokens = String(className ?? "").split(/\s+/).filter((token) => token && !STYLE_GROUPS[group].test(token));
  if (value) tokens.push(value);
  return tokens.join(" ");
};
