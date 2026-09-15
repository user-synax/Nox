"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Editor from "@monaco-editor/react";

/**
 * Nox code editor — thin wrapper over Monaco.
 *
 * - One model per file (created in onMount): undo history + cursor
 *   survive tab switches, text lives in models — typing never
 *   re-renders the page.
 * - Nox-dark theme + quiet chrome (minimap off, Geist Mono).
 * - Ctrl/Cmd+S flushes through onRequestSave (draft persist).
 */

const LANG_BY_EXT = { js: "javascript", ts: "typescript", py: "Python", json: "json", md: "markdown" };

function languageFor(path) {
  const ext = String(path ?? "").split(".").pop()?.toLowerCase() ?? "";
  return LANG_BY_EXT[ext] ?? "plaintext";
}

function defineNoxTheme(monaco) {
  monaco.editor.defineTheme("Nox-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5f6b7a", fontStyle: "italic" },
      { token: "keyword", foreground: "4BA9E1" },
      { token: "string", foreground: "36D399" },
      { token: "number", foreground: "F5C451" },
      { token: "type", foreground: "d44df0" },
      { token: "delimiter", foreground: "98A2B3" },
    ],
    colors: {
      "editor.background": "#11161C",
      "editor.foreground": "#F5F7FA",
      "editorLineNumber.foreground": "#4b5563",
      "editorLineNumber.activeForeground": "#F5F7FA",
      "editor.lineHighlightBackground": "#171D24",
      "editor.cursorForeground": "#4BA9E1",
      "editor.selectionBackground": "#4BA9E14D",
      "editor.inactiveSelectionBackground": "#4BA9E133",
      "editorWidget.background": "#171D24",
      "editorWidget.border": "#222A33",
      "editorSuggestWidget.selectedBackground": "#222A33",
      "editorHoverWidget.background": "#171D24",
      "editorHoverWidget.border": "#222A33",
      "editorGutter.background": "#11161C",
      "editor.lineHighlightBorder": "#00000000",
      "editorBracketHighlight.foreground1": "#4BA9E1",
      "editorBracketHighlight.foreground2": "#36D399",
      "editorBracketHighlight.foreground3": "#F5C451",
    },
  });
}

const OPTIONS = {
  fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 14,
  lineHeight: 22,
  minimap: { enabled: false },
  lineNumbers: "on",
  lineNumbersMinChars: 3,
  glyphMargin: false,
  folding: true,
  scrollBeyondLastLine: false,
  padding: { top: 12 },
  autoIndent: "full",
  formatOnPaste: true,
  formatOnType: true,
  tabSize: 2,
  insertSpaces: true,
  smoothScrolling: true,
  cursorSmoothCaretAnimation: "on",
  cursorBlinking: "smooth",
  renderLineHighlight: "all",
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true },
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  parameterHints: { enabled: true },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  overviewRulerLanes: 0,
  automaticLayout: true,
  fixedOverflowWidgets: true,
  renderWhitespace: "none",
  stickyScroll: { enabled: false },
};

export const CodeEditor = forwardRef(function CodeEditor(
  { files, activePath, initialContents, onContent, onRequestSave, onToggleTerminal },
  ref
) {
  const editorRef = useRef(null);
  const modelsRef = useRef(new Map());
  const viewStatesRef = useRef(new Map());
  const activeRef = useRef(activePath);
  const liveRef = useRef({ files, initialContents, onContent, onRequestSave, onToggleTerminal });
  liveRef.current = { files, initialContents, onContent, onRequestSave, onToggleTerminal };

  // Tab switch: park view state, swap model, restore.
  useEffect(() => {
    const editor = editorRef.current;
    const prev = activeRef.current;
    activeRef.current = activePath;
    if (!editor || modelsRef.current.size === 0) return;
    const prevModel = modelsRef.current.get(prev);
    if (prevModel) viewStatesRef.current.set(prev, editor.saveViewState());
    const next = modelsRef.current.get(activePath);
    if (next) {
      editor.setModel(next);
      editor.restoreViewState(viewStatesRef.current.get(activePath) ?? null);
      editor.focus();
    }
  }, [activePath]);

  // Dispose models on unmount (fresh set per workspace visit).
  useEffect(
    () => () => {
      for (const m of modelsRef.current.values()) m?.dispose?.();
      modelsRef.current = new Map();
      viewStatesRef.current = new Map();
      editorRef.current = null;
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      getValue: (path) => modelsRef.current.get(path)?.getValue() ?? "",
      setValue: (path, value) => modelsRef.current.get(path)?.setValue(value ?? ""),
      focus: () => editorRef.current?.focus(),
    }),
    []
  );

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    const { files: fl, initialContents: init } = liveRef.current;
    for (const f of fl) {
      if (!modelsRef.current.has(f.path)) {
        modelsRef.current.set(
          f.path,
          monaco.editor.createModel(init[f.path] ?? "", languageFor(f.path))
        );
      }
    }
    const first = modelsRef.current.get(activeRef.current) ?? [...modelsRef.current.values()][0];
    if (first) editor.setModel(first);
    editor.onDidChangeModelContent(() => {
      liveRef.current.onContent?.(activeRef.current, editor.getValue());
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      liveRef.current.onRequestSave?.();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
      liveRef.current.onToggleTerminal?.();
    });
  };

  return (
    <Editor
      theme="Nox-dark"
      beforeMount={defineNoxTheme}
      onMount={handleMount}
      options={OPTIONS}
      loading={
        <div className="flex h-full items-center justify-center" role="status">
          <p className="text-[14px] text-ink-muted">Loading editor…</p>
        </div>
      }
    />
  );
});
