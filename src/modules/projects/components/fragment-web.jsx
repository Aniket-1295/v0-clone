import React from "react";

// The toolbar (refresh, URL, open in new tab) lives in the preview pane header.
const FragmentWeb = ({ data, refreshKey, iframeRef }) => {
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
