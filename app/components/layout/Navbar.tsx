/**
 * Navigation Bar Component
 *
 * The main navigation component for the FinBoard dashboard featuring:
 * - Responsive design with mobile hamburger menu
 * - Widget management actions (add, export, import)
 * - Theme toggle integration
 * - Template quick-start modal
 * - Real-time widget count display
 *
 * Key Features:
 * - Export/Import: Save and restore widget configurations as JSON files
 * - Mobile-first responsive design with collapsible menu
 * - Theme-aware styling with dark/light mode support
 * - Template system for quick dashboard setup
 * - Error handling for import operations
 */

"use client";
import Button from "../ui/Button";
import ThemeToggle from "../ui/ThemeToggle";
import { MdShowChart } from "react-icons/md";
import { HiPlus, HiDownload, HiUpload, HiMenu, HiX } from "react-icons/hi";
import { useWidgetStore } from "../../store/widgetStore";
import { useThemeStore } from "../../store/themeStore";
import { useState, useRef } from "react";
import TemplateModal from "./TemplateModal";

/**
 * Navbar Component
 *
 * Renders the main navigation bar with all dashboard management functionality.
 * Handles both desktop and mobile layouts with appropriate responsive behavior.
 */
export default function Navbar() {
  // Widget store hooks for dashboard management
  const { widgets, openAddModal, exportWidgets, importWidgets } =
    useWidgetStore();
  const { theme } = useThemeStore();
  const widgetCount = widgets.length;

  // Component state for UI interactions
  const [importError, setImportError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  /**
   * Handle Widget Configuration Export
   *
   * Exports all current widgets as a JSON file for backup or sharing.
   * Creates a downloadable file with timestamp in the filename.
   */
  const handleExport = () => {
    const data = exportWidgets();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finboard-widgets-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Handle Widget Configuration Import
   *
   * Imports widgets from a JSON file with comprehensive error handling.
   * Validates file format and provides user feedback on success/failure.
   *
   * @param event - File input change event
   */
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = importWidgets(jsonData);

        if (success) {
          setImportError(null);
          alert("Widgets imported successfully!");
        } else {
          setImportError(
            "Failed to import widgets. Please check the file format."
          );
        }
      } catch (error) {
        setImportError("Invalid file format. Please select a valid JSON file.");
      }
    };
    reader.readAsText(file);

    // Reset file input to allow importing the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <header
        className={`${
          theme === "dark"
            ? "bg-slate-950 border-slate-700"
            : "bg-white border-slate-200 shadow-sm"
        } border-b px-3 sm:px-6 py-1`}
      >
        <div className="max-full mx-auto">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Brand Section */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* App logo with chart icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 ${
                  theme === "dark" ? "bg-[#16A34A]" : "bg-[#10B981]"
                } rounded-lg flex items-center justify-center`}
              >
                <MdShowChart className="text-white text-sm sm:text-base" />
              </div>

              {/* App title and status information */}
              <div className="min-w-0 flex-1 items-center">
                <h1
                  className={`${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  } font-medium sm:font-semibold text-base sm:text-lg truncate`}
                >
                  FinBoard
                </h1>
                <p
                  className={`${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  } text-xs sm:text-sm hidden md:block`}
                >
                  {widgetCount} active widget{widgetCount !== 1 ? "s" : ""} •
                  Real-time data
                </p>
              </div>
            </div>

            {/* Desktop Navigation Actions */}
            <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
              {/* Theme toggle button */}
              <ThemeToggle />

              {/* Templates button - opens modal with pre-configured widget sets */}
              <Button
                onClick={() => setIsTemplateOpen(true)}
                variant="outline"
                className="flex items-center space-x-1 px-1 py-2 sm:px-3"
                title="Use a starter template"
              >
                <span className="hidden sm:inline text-sm">Templates</span>
              </Button>

              {/* Export button - downloads widget configuration as JSON */}
              <Button
                onClick={handleExport}
                variant="outline"
                className="flex items-center space-x-1 px-1 py-2 sm:px-3"
                title="Export widgets"
              >
                <HiDownload className="text-sm" />
                <span className="hidden sm:inline text-sm">Export</span>
              </Button>

              {/* Import button - uploads widget configuration from JSON file */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center space-x-1 px-1 py-2 sm:px-3"
                  title="Import widgets"
                >
                  <HiUpload className="text-sm" />
                  <span className="hidden sm:inline text-sm">Import</span>
                </Button>
              </div>

              {/* Add widget button - primary action for creating new widgets */}
              <Button
                onClick={openAddModal}
                className="flex items-center space-x-1 sm:space-x-2 px-1 py-2 sm:px-4"
              >
                <HiPlus className="text-sm sm:text-base" />
                <span className="text-sm sm:text-base hidden sm:inline">
                  Add Widget
                </span>
                <span className="text-sm sm:hidden">Add</span>
              </Button>
            </div>

            {/* Mobile Navigation - Theme toggle and hamburger menu */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`${
                  theme === "dark"
                    ? "text-white hover:bg-slate-800"
                    : "text-slate-900 hover:bg-slate-100"
                } p-2 rounded-lg transition-colors`}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <HiX className="w-5 h-5" />
                ) : (
                  <HiMenu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown - shows all navigation options vertically */}
          {isMobileMenuOpen && (
            <div
              className={`${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              } border-t md:hidden`}
            >
              <div className="px-3 py-4 space-y-3">
                <Button
                  onClick={() => {
                    setIsTemplateOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <span>Templates</span>
                </Button>

                <Button
                  onClick={() => {
                    handleExport();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <HiDownload className="text-sm" />
                  <span>Export Widgets</span>
                </Button>

                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      handleImport(e);
                      setIsMobileMenuOpen(false);
                    }}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <HiUpload className="text-sm" />
                    <span>Import Widgets</span>
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    openAddModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <HiPlus className="text-sm" />
                  <span>Add Widget</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      {isTemplateOpen && (
        <TemplateModal onClose={() => setIsTemplateOpen(false)} />
      )}
    </>
  );
}
