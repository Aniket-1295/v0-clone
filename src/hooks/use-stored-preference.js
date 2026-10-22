"use client";

import { useSyncExternalStore } from "react";

// A small setting remembered in this browser (localStorage) and shared by every component
// using the same key: the prompt boxes' model tier and "Generate images" switch.
const CHANGE_EVENT = "v0-preference-change";

const subscribe = (onChange) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

/** [value, setValue] for a string setting; `fallback` before hydration and when unset. */
export const useStoredPreference = (key, fallback) => {
  const read = () => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const value = useSyncExternalStore(subscribe, read, () => fallback);

  const setValue = (next) => {
    try {
      localStorage.setItem(key, next);
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return [value, setValue];
};

/** Whether the agent may generate images for the next prompt ("+" menu switch). */
export const useGenerateImages = () => {
  const [value, setValue] = useStoredPreference("v0-generate-images", "off");
  return [value === "on", (on) => setValue(on ? "on" : "off")];
};
