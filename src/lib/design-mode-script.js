// Design mode helper, written into every sandbox as /home/user/instrumentation-client.js:
// Next.js runs that file in the browser before the app, so the generated app's own files
// stay untouched. It does nothing until the v0 clone workspace (the parent window of the
// preview iframe) turns design mode on; then it outlines elements under the pointer and
// reports the clicked one. Snapshots skip this file, so it never reaches saved versions,
// downloads or published apps.
export const DESIGN_SCRIPT_FILE = "instrumentation-client.js";

export const DESIGN_SCRIPT = `// v0 clone design mode (not part of this app; never saved or published).
(function () {
  if (typeof window === "undefined" || window.__v0Design || window.parent === window) return;
  window.__v0Design = true;
  let enabled = false;
  let hovered = null;
  let selected = null;
  const boxes = {};
  const box = (name, color) => {
    if (boxes[name]) return boxes[name];
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed", pointerEvents: "none", zIndex: "2147483647", display: "none",
      border: "2px solid " + color, background: color + "14", borderRadius: "3px",
    });
    document.documentElement.appendChild(el);
    return (boxes[name] = el);
  };
  const place = (name, color, target) => {
    const el = box(name, color);
    if (!target || !enabled) { el.style.display = "none"; return; }
    const r = target.getBoundingClientRect();
    Object.assign(el.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  };
  const redraw = () => { place("hover", "#3b82f6", hovered); place("selected", "#f59e0b", selected); };
  const plainText = (el) => (Array.from(el.childNodes).every((n) => n.nodeType === 3) ? el.textContent : null);

  const report = (handler) => (event) => {
    try {
      handler(event);
    } catch (error) {
      window.parent.postMessage({ type: "v0-design:error", message: String(error) }, "*");
    }
  };
  window.addEventListener("mousemove", report((event) => {
    if (!enabled || event.target === hovered) return;
    hovered = event.target;
    redraw();
  }), true);
  window.addEventListener("click", report((event) => {
    if (!enabled || !(event.target instanceof Element)) return;
    event.preventDefault();
    event.stopPropagation();
    selected = event.target;
    redraw();
    const style = getComputedStyle(selected);
    window.parent.postMessage({
      type: "v0-design:select",
      tag: selected.tagName.toLowerCase(),
      className: selected.getAttribute("class") || "",
      text: plainText(selected),
      html: selected.outerHTML.slice(0, 300),
      style: { color: style.color, backgroundColor: style.backgroundColor, fontSize: style.fontSize, fontWeight: style.fontWeight },
    }, "*");
  }), true);
  window.addEventListener("scroll", redraw, true);
  window.addEventListener("resize", redraw);
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !event.data || event.data.type !== "v0-design") return;
    try {
      enabled = !!event.data.enabled;
      if (!enabled) { hovered = null; selected = null; }
      document.documentElement.style.cursor = enabled ? "crosshair" : "";
      redraw();
      window.parent.postMessage({ type: "v0-design:state", enabled: enabled }, "*");
    } catch (error) {
      window.parent.postMessage({ type: "v0-design:error", message: String(error) }, "*");
    }
  });
  window.parent.postMessage({ type: "v0-design:ready" }, "*");
})();
`;
