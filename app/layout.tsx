/**
 * Root Layout Component - The Foundation of FinBoard Dashboard
 *
 * This is the root layout component that wraps the entire application.
 * It sets up the fundamental structure, fonts, and theme provider that
 * all pages inherit from.
 *
 * Key Features:
 * - Configures Google Fonts (Geist Sans & Mono) for modern typography
 * - Sets up global CSS imports including Tailwind CSS
 * - Provides theme context to all child components
 * - Handles hydration suppression for client-side theme detection
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";

// Configure primary font - Geist Sans for UI text
// Uses CSS variables for optimal performance and theme integration
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Configure monospace font - Geist Mono for code/data display
// Essential for financial data formatting and alignment
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO metadata configuration for the dashboard
export const metadata: Metadata = {
  title: "FinBoard",
  description: "Your financial dashboard",
};

/**
 * Root Layout Component
 *
 * @param children - All page content and nested layouts
 * @returns The complete HTML structure with providers and styling
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Theme Provider wraps the entire app to provide dark/light mode context */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
