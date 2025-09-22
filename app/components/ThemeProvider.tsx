/**
 * Theme Provider Component
 *
 * A client-side theme provider that wraps the entire application to ensure
 * consistent theme application across all components. This component bridges
 * the gap between Zustand theme state and DOM manipulation for Tailwind CSS.
 *
 * Key Features:
 * - Synchronizes theme state with DOM classes for Tailwind CSS
 * - Prevents theme flashing during page loads and navigation
 * - Automatically applies theme changes throughout the component tree
 * - Works in conjunction with the theme store for persistence
 *
 * Implementation Note: This component uses useEffect to apply theme changes
 * directly to the document root, which allows Tailwind's dark: prefix to
 * work correctly throughout the application.
 */

"use client";

import { useEffect } from "react";
import { useThemeStore } from "../store/themeStore";

/**
 * Theme Provider Component
 *
 * @param children - Child components to wrap with theme context
 * @returns Transparent wrapper that applies theme to DOM
 */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current theme from the global theme store
  const { theme } = useThemeStore();

  // Apply theme to DOM whenever theme changes
  useEffect(() => {
    // Get the document root element to apply theme classes
    const root = document.documentElement;

    if (theme === "dark") {
      // Apply dark theme classes for Tailwind CSS
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      // Apply light theme classes for Tailwind CSS
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]); // Re-run when theme changes

  // Return children without additional wrapper elements
  return <>{children}</>;
}
