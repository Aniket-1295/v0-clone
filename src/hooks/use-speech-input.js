"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

const getRecognition = () =>
  typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null;

/**
 * Browser dictation via the Web Speech API. `onText(fullText)` receives the base text
 * plus everything said so far. `supported` is false during SSR and in browsers without it.
 */
export const useSpeechInput = ({ getBase, onText }) => {
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognition(),
    () => false
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    const base = getBase();
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      onText([base, spoken].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") toast.error("Microphone access was blocked.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return { supported, listening, toggle };
};
