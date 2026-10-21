"use client";

import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "./code-theme.css";

const escapeHtml = (code) => code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const highlight = (code, lang) =>
  Prism.languages[lang] ? Prism.highlight(code, Prism.languages[lang], lang) : escapeHtml(code);

// Shared by the gutter and the editor so line numbers stay aligned with the text.
const TEXT_STYLE = { fontFamily: "'SF Mono', Monaco, Menlo, monospace", fontSize: 12, lineHeight: "18px" };

/** Editable code with the same Prism highlighting as the read-only view, and line numbers. */
export const CodeEditor = ({ value, onChange, lang }) => {
  const lines = value.split("\n").length;

  return (
    <div className="flex min-h-full">
      <div
        aria-hidden="true"
        className="sticky left-0 shrink-0 select-none border-r bg-card px-2 py-2 text-right text-muted-foreground/60"
        style={TEXT_STYLE}
      >
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) => highlight(code, lang)}
        padding={8}
        tabSize={2}
        insertSpaces
        autoFocus
        spellCheck={false}
        className={`language-${lang} min-w-0 flex-1`}
        textareaClassName="outline-none"
        style={{ ...TEXT_STYLE, whiteSpace: "pre", minHeight: "100%" }}
      />
    </div>
  );
};
