import { CopyCheckIcon, CopyIcon, PencilIcon } from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import { CodeEditor } from "./code-view/editor";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { CodeView } from "./code-view";
import {
  ResizablePanel,
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { convertFilesToTreeItems } from "@/lib/utils";
import { TreeView } from "./tree-view";
import { Hint } from "@/components/ui/hint";

const FileBreadcrumb = ({ filePath }) => {
  const pathSegments = filePath.split("/");
  const maxSegments = 4;

  const renderBreadCrumItems = () => {
    if (pathSegments.length <= maxSegments) {
      return pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;

        return (
          <Fragment key={index}>
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage>{segment}</BreadcrumbPage>
              ) : (
                <span className="text-muted-foreground+">{segment}</span>
              )}
            </BreadcrumbItem>
            {!isLast && <BreadcrumbSeparator />}
          </Fragment>
        );
      });
    } else {
      const firstSegment = pathSegments[0];
      const lastSegment = pathSegments[pathSegments.length - 1];

      return (
        <>
          <BreadcrumbItem>
            <span className="text-muted-foreground">{firstSegment}</span>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="font-medium">
              {lastSegment}
            </BreadcrumbItem>
          </BreadcrumbItem>
        </>
      );
    }
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>{renderBreadCrumItems()}</BreadcrumbList>
    </Breadcrumb>
  );
};

function getLanguageFromExtension(filename) {
  const extension = filename.split(".").pop()?.toLowerCase();

  const languageMap = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };

  return languageMap[extension] || "text";
}

/**
 * File tree and code of a version. With `editable`, an Edit mode lets the user change files
 * and save them (`onSave(changes)` gets { path: content } of the changed files; it returns a
 * promise). `readOnlyReason` explains why a version cannot be edited.
 */
export const FileExplorer = ({ files, editable = false, readOnlyReason, onSave, saving = false }) => {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  // Edited contents by path; compared with `files` to find the real changes.
  const [drafts, setDrafts] = useState({});
  // Versions hold the whole app tree; open the main page rather than README.md.
  const [selectedFile, setSelectedFile] = useState(() => {
    const fileKeys = Object.keys(files);
    return typeof files["app/page.tsx"] === "string" ? "app/page.tsx" : fileKeys.length > 0 ? fileKeys[0] : null;
  });

  const treeData = useMemo(() => {
    return convertFilesToTreeItems(files);
  }, [files]);

  const changes = useMemo(
    () => Object.fromEntries(Object.entries(drafts).filter(([path, content]) => content !== files[path])),
    [drafts, files]
  );
  const changedCount = Object.keys(changes).length;
  const content = drafts[selectedFile] ?? files[selectedFile];

  const save = useCallback(async () => {
    if (!changedCount || saving) return;
    try {
      await onSave?.(changes);
      setDrafts({});
      setEditing(false);
    } catch {
      // The caller shows the error; keep the edits so nothing is lost.
    }
  }, [changes, changedCount, onSave, saving]);

  // Cmd/Ctrl+S saves while editing.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing]);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!changedCount) return;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [changedCount]);

  const handleFileSelect = useCallback(
    (filePath) => {
      if (typeof files[filePath] === "string") {
        setSelectedFile(filePath);
      }
    },
    [files]
  );
  const handleCopy = useCallback(() => {
    if (selectedFile && typeof content === "string") {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((error) => {
          console.error("Failed to copy:", error);
        });
    }
  }, [selectedFile, content]);

  return (
    <div className="flex h-full flex-col">
      {editing && (
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b bg-muted/40 px-3 text-xs">
          <span className="text-muted-foreground">
            {changedCount ? `${changedCount} ${changedCount === 1 ? "file" : "files"} changed` : "Editing. Changes are saved as a new version."}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={saving}
              onClick={() => {
                setDrafts({});
                setEditing(false);
              }}
            >
              {changedCount ? "Discard" : "Done"}
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
              disabled={!changedCount || saving}
              onClick={save}
            >
              {saving && <Spinner className="size-3" />}
              Save <kbd className="hidden font-mono text-[10px] opacity-70 sm:inline">⌘S</kbd>
            </Button>
          </div>
        </div>
      )}
      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          defaultSize={25}
          minSize={20}
          maxSize={40}
          className="border-r"
        >
          <div className="h-full overflow-auto">
            <TreeView
              data={treeData}
              value={selectedFile}
              onSelect={handleFileSelect}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle className="bg-transparent hover:bg-border transition-colors" />

        <ResizablePanel defaultSize={75} minSize={40}>
          {selectedFile && typeof content === "string" ? (
            <div className="h-full w-full flex flex-col">
              <div className="h-10 border-b px-3 flex justify-between items-center gap-x-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileBreadcrumb filePath={selectedFile} />
                  {changes[selectedFile] !== undefined && (
                    <span className="size-2 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!editing && editable && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setEditing(true)}>
                      <PencilIcon className="size-3.5" /> Edit
                    </Button>
                  )}
                  {!editable && readOnlyReason && (
                    <span className="hidden text-xs text-muted-foreground md:inline">{readOnlyReason}</span>
                  )}
                  <Hint text="Copy to clipboard" side="bottom">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <CopyCheckIcon className="h-4 w-4" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </Hint>
                </div>
              </div>
              <div className="flex-1 overflow-auto relative">
                {editing ? (
                  <CodeEditor
                    key={selectedFile}
                    value={content}
                    lang={getLanguageFromExtension(selectedFile)}
                    onChange={(value) => setDrafts((current) => ({ ...current, [selectedFile]: value }))}
                  />
                ) : (
                  <CodeView
                    code={content}
                    lang={getLanguageFromExtension(selectedFile)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">Select a file to view its content</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
