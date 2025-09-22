/**
 * Widget Store - Core Dashboard State Management
 *
 * This Zustand store manages the entire widget ecosystem of the financial dashboard.
 * It handles widget creation, deletion, reordering, and persistence with advanced
 * features like export/import, duplicate ID prevention, and robust error handling.
 *
 * Key Features:
 * - Persistent widget storage with localStorage
 * - Drag-and-drop widget reordering
 * - Export/import functionality for widget configurations
 * - Robust ID generation and duplicate prevention
 * - Modal state management for widget creation
 * - Support for multiple display modes and data sources
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Widget Interface
 *
 * Defines the complete structure of a dashboard widget including
 * configuration, data source, and display preferences.
 */
interface Widget {
  id: string; // Unique identifier for the widget
  name: string; // User-friendly display name
  apiUrl: string; // API endpoint for data fetching
  refreshInterval: number; // Auto-refresh interval in seconds
  displayMode: "card" | "table" | "chart" | "advanced-table" | "stock-chart"; // Display format
  selectedFields: string[]; // Fields to display from API response
  apiProvider?: "custom" | "finnhub"; // API provider type for specialized handling
  apiType?: string; // Specific API endpoint type
  symbol?: string; // Stock symbol (for financial widgets)
  createdAt: Date; // Creation timestamp for sorting/analytics
}

/**
 * Widget Store Interface
 *
 * Defines all state and actions available for widget management
 */
interface WidgetStore {
  widgets: Widget[]; // Array of all dashboard widgets
  isAddModalOpen: boolean; // Modal visibility state
  addWidget: (widget: Omit<Widget, "id" | "createdAt">) => void; // Add new widget
  removeWidget: (id: string) => void; // Remove widget by ID
  updateWidget: (id: string, updates: Partial<Widget>) => void; // Update widget properties
  reorderWidgets: (activeId: string, overId: string) => void; // Drag-and-drop reordering
  openAddModal: () => void; // Open widget creation modal
  closeAddModal: () => void; // Close widget creation modal
  getWidgetCount: () => number; // Get total widget count
  clearAllWidgets: () => void; // Remove all widgets
  exportWidgets: () => string; // Export widgets as JSON
  importWidgets: (jsonData: string) => boolean; // Import widgets from JSON
}

/**
 * Generate Secure Unique ID
 *
 * Uses crypto.randomUUID() when available (modern browsers) or falls back
 * to timestamp + random string for older environments. Ensures unique
 * widget identification across sessions.
 */
const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Initialize Widgets from Storage
 *
 * Safely loads widgets from localStorage with error handling and ID validation.
 * Prevents duplicate IDs and ensures data integrity on app startup.
 *
 * @returns Array of valid widgets or empty array if loading fails
 */
const getInitialWidgets = (): Widget[] => {
  // Server-side rendering safety check
  if (typeof window === "undefined") return [];

  const saved = localStorage.getItem("widget-store");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const widgets: Widget[] = (parsed.state?.widgets || []).map(
        (widget: any) => ({
          ...widget,
          createdAt: new Date(widget.createdAt), // Restore Date objects from JSON
        })
      );

      // Ensure unique IDs across all widgets to prevent conflicts
      const seen = new Set<string>();
      for (const w of widgets) {
        if (!w.id || seen.has(w.id)) {
          w.id = generateId();
        }
        seen.add(w.id);
      }
      return widgets;
    } catch (error) {
      console.error("Failed to parse saved widgets:", error);
    }
  }

  // Return empty array for fresh starts - no default widgets
  return [];
};

/**
 * Widget Store Implementation
 *
 * Creates the main widget store with persistence middleware for localStorage.
 * Handles all widget operations, modal state, and data import/export.
 */
export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: getInitialWidgets(), // Load persisted widgets or start empty
      isAddModalOpen: false, // Modal starts closed

      /**
       * Add New Widget
       *
       * Creates a new widget with generated ID and timestamp, then adds it
       * to the dashboard. Used by the AddWidgetModal component.
       *
       * @param widgetData - Widget configuration without ID and timestamp
       */
      addWidget: (widgetData) => {
        const newWidget: Widget = {
          ...widgetData,
          id: generateId(), // Generate unique ID
          createdAt: new Date(), // Set creation timestamp
        };
        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      /**
       * Remove Widget
       *
       * Removes a widget from the dashboard by filtering out the specified ID.
       * Used by widget delete buttons and cleanup operations.
       *
       * @param id - Unique ID of the widget to remove
       */
      removeWidget: (id) => {
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== id),
        }));
      },

      /**
       * Update Widget Properties
       *
       * Updates specific properties of a widget while preserving others.
       * Used for editing widget settings like name, refresh interval, etc.
       *
       * @param id - Widget ID to update
       * @param updates - Partial widget object with properties to update
       */
      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, ...updates } : widget
          ),
        }));
      },

      /**
       * Reorder Widgets (Drag and Drop)
       *
       * Handles widget reordering when user drags widgets to new positions.
       * Uses array splicing to move widgets while maintaining order integrity.
       *
       * @param activeId - ID of the widget being dragged
       * @param overId - ID of the widget being dropped onto
       */
      reorderWidgets: (activeId, overId) => {
        set((state) => {
          const widgets = [...state.widgets];
          const activeIndex = widgets.findIndex(
            (widget) => widget.id === activeId
          );
          const overIndex = widgets.findIndex((widget) => widget.id === overId);

          // Validate that both widgets exist
          if (activeIndex === -1 || overIndex === -1) return state;

          // Remove the active widget and insert it at the new position
          const [movedWidget] = widgets.splice(activeIndex, 1);
          widgets.splice(overIndex, 0, movedWidget);

          return { widgets };
        });
      },

      // Modal State Management - simple boolean toggles for clean context
      openAddModal: () => set({ isAddModalOpen: true }),
      closeAddModal: () => set({ isAddModalOpen: false }),

      // Utility Functions
      getWidgetCount: () => get().widgets.length,
      clearAllWidgets: () => set({ widgets: [] }),

      /**
       * Export Widgets Configuration
       *
       * Creates a JSON export of all current widgets with metadata.
       * Useful for backing up dashboard configurations or sharing setups.
       *
       * @returns JSON string containing all widgets and export metadata
       */
      exportWidgets: () => {
        const state = get();
        const exportData = {
          widgets: state.widgets,
          exportDate: new Date().toISOString(), // Timestamp for export tracking
          version: "1.0", // Version for future compatibility
        };
        return JSON.stringify(exportData, null, 2);
      },

      /**
       * Import Widgets Configuration
       *
       * Imports widgets from JSON data with comprehensive validation and error handling.
       * Generates new IDs to prevent conflicts and validates required fields.
       *
       * @param jsonData - JSON string containing widget configurations
       * @returns boolean indicating success/failure of import operation
       */
      importWidgets: (jsonData: string) => {
        try {
          const importData = JSON.parse(jsonData);

          // Validate the import data structure
          if (!importData.widgets || !Array.isArray(importData.widgets)) {
            throw new Error("Invalid import data: widgets array not found");
          }

          // Validate each widget has required fields for proper functionality
          const validWidgets = importData.widgets.filter((widget: any) => {
            return (
              widget.id && widget.name && widget.apiUrl && widget.displayMode
            );
          });

          if (validWidgets.length === 0) {
            throw new Error("No valid widgets found in import data");
          }

          // Generate new IDs to avoid conflicts with existing widgets
          const widgetsWithNewIds = validWidgets.map((widget: any) => ({
            ...widget,
            id: `imported-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            createdAt: new Date(), // Reset creation date to import time
          }));

          // Replace current widgets with imported ones
          set({ widgets: widgetsWithNewIds });

          return true; // Import successful
        } catch (error) {
          console.error("Import failed:", error);
          return false; // Import failed
        }
      },
    }),
    {
      name: "widget-store", // localStorage key
      partialize: (state) => ({ widgets: state.widgets }), // Only persist widgets array
    }
  )
);
