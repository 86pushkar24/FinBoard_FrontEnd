/**
 * Theme Store - Global Dark/Light Mode Management
 *
 * This Zustand store manages the application's theme state with persistent storage.
 * It handles theme switching, browser storage synchronization, and DOM manipulation
 * for seamless dark/light mode transitions across the entire dashboard.
 *
 * Key Features:
 * - Persistent theme storage with localStorage
 * - Cross-tab synchronization for consistent theming
 * - DOM class manipulation for Tailwind CSS theme support
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Theme type definition - supports dark and light modes
type Theme = "dark" | "light";

/**
 * Theme Store Interface
 * Defines the structure of theme-related state and actions
 */
interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Theme Store Implementation
 *
 * Uses Zustand with persistence middleware to maintain theme preferences
 * across browser sessions and page refreshes.
 * 
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Default theme is dark for optimal dashboard viewing
      theme: "dark",

      /**
       * Toggle between dark and light themes
       * Updates state and immediately applies theme to DOM
       */
      toggleTheme: () => {
        const newTheme = get().theme === "dark" ? "light" : "dark";
        set({ theme: newTheme });
        // Apply theme to document for immediate visual feedback
        applyTheme(newTheme);
      },

      /**
       * Set specific theme (used for programmatic theme changes)
       * @param theme - The theme to apply ('dark' | 'light')
       */
      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: "theme-store",
      /**
       * Rehydration callback - ensures theme is applied when store loads from storage
       * Critical for preventing theme flashing on page load
       */
      onRehydrateStorage: () => (state) => {
        // Apply theme when store is rehydrated from localStorage
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

/**
 * Apply Theme to DOM
 *
 * Manipulates the document's root element classes to enable Tailwind CSS
 * theme switching. This function ensures immediate visual feedback when
 * theme changes occur.
 *
 * @param theme - The theme to apply to the DOM
 */
function applyTheme(theme: Theme) {
  // Only run in browser environment
  if (typeof window !== "undefined") {
    const root = document.documentElement;

    if (theme === "dark") {
      // Apply dark theme classes
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      // Apply light theme classes
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }
}

/**
 * Theme Initialization and Cross-Tab Synchronization
 *
 * This code block handles:
 * 1. Initial theme application on app startup
 * 2. Cross-tab theme synchronization via localStorage events
 * 3. Prevention of theme flashing during page loads
 */
if (typeof window !== "undefined") {
  // Apply stored theme immediately to prevent flash of unstyled content
  const store = useThemeStore.getState();
  applyTheme(store.theme);

  /**
   * Cross-Tab Theme Synchronization
   *
   * Listens for localStorage changes to keep theme consistent
   * across multiple dashboard tabs. This fixes glitches when
   * theme is changed in one tab and needs to reflect in others.
   */
  window.addEventListener("storage", (e) => {
    if (e.key === "theme-store") {
      const newState = JSON.parse(e.newValue || "{}");
      if (newState?.state?.theme) {
        applyTheme(newState.state.theme);
      }
    }
  });
}
