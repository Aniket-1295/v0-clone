import Image from "next/image";
import React from "react";
import { useState, useEffect } from "react";

const ShimmerMessages = () => {
  const messages = [
    "Thinking...",
    "loading...",
    "Generating...",
    "Processing...",
    "Analyzing your prompt....",
    "Generating response....",
    "Adding final touches to response....",
    "Almost there....",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground animate-pulse">
        {messages[currentMessageIndex]}
      </span>
    </div>
  );
};

const MessageLoading = () => {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md border bg-card">
          <Image
            src={"/logo.svg"}
            alt="v0"
            width={14}
            height={14}
            className="shrink-0 invert dark:invert-0"
          />
        </div>
      </div>

      <div className="pl-8 flex flex-col gap-y-4">
        <ShimmerMessages />
      </div>
    </div>
  );
};

export default MessageLoading;