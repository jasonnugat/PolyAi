"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

const THEME_CHANGE_EVENT = "polyai:theme-change";

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerTheme(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    applyTheme(event.newValue === "dark" ? "dark" : "light");
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function chooseTheme(theme: Theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The control still works when browser storage is unavailable.
  }
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  useLayoutEffect(() => {
    // React's development remount may clear the attribute set by the head script.
    try {
      applyTheme(window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light");
    } catch {
      // Preserve the current in-memory choice when storage is blocked.
    }
  }, []);

  return (
    <div className="theme-toggle" role="group" aria-label="Appearance">
      <button
        type="button"
        className="theme-option"
        aria-label="Light mode"
        aria-pressed={theme === "light"}
        onClick={() => chooseTheme("light")}
        title="Light mode"
      >
        <Icon name="sun" />
      </button>
      <button
        type="button"
        className="theme-option"
        aria-label="Dark mode"
        aria-pressed={theme === "dark"}
        onClick={() => chooseTheme("dark")}
        title="Dark mode"
      >
        <Icon name="moon" />
      </button>
    </div>
  );
}
