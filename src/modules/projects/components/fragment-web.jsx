import React from "react";
import { Spinner } from "@/components/ui/spinner";

// The toolbar (refresh, URL, open in new tab) lives in the preview pane header.
const FragmentWeb = ({ data, refreshKey, iframeRef }) => {
  // A version without a sandbox yet (a GitHub import): the chat page is building one.
  if (!data.sandboxUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
        <Spinner className="size-5" />
        <p className="max-w-xs text-sm">Starting the preview. Installing an imported app&apos;s packages can take a minute or two.</p>
      </div>
    );
  }

  return (
    <iframe
      key={refreshKey}
      ref={iframeRef}
      title="App preview"
      className="h-full w-full bg-white"
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
      src={data.sandboxUrl}
    />
  );
};

export default FragmentWeb;
