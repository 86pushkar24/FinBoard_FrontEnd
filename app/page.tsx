/**
 * Dashboard Page - Main Financial Data Dashboard Interface
 *
 * This is the core dashboard page that orchestrates the entire widget-based
 * financial data display system. It implements drag-and-drop functionality,
 * responsive grid layouts, and real-time widget management.
 *
 * Key Features:
 * - Drag & Drop: Intuitive widget reordering with @dnd-kit
 * - Responsive Grid: Adaptive layout (1-2-3 columns based on screen size)
 * - Widget Management: Add, remove, and configure financial data widgets
 * - Theme Integration: Dynamic styling based on dark/light mode
 * - Touch Support: Works on mobile devices with gesture recognition
 */

"use client";

// Layout and navigation components
import Navbar from "./components/layout/Navbar";

// Widget-related components
import DraggableWidget from "./components/ui/DraggableWidget";
import AddWidget from "./components/ui/AddWidget";
import AddWidgetModal from "./components/ui/AddWidgetModal";
import DataWidget from "./components/ui/DataWidget";

// State management hooks
import { useWidgetStore } from "./store/widgetStore";
import { useThemeStore } from "./store/themeStore";

// Drag and drop functionality from dnd-kit
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

// React hooks
import { useState } from "react";

/**
 * Main Dashboard Component
 *
 * Manages the entire dashboard interface including widget layout,
 * drag-and-drop interactions, and theme-aware styling.
 */
export default function Dashboard() {
  // Get widget data and management functions from Zustand store
  const { widgets, openAddModal, reorderWidgets } = useWidgetStore();

  // Get current theme for dynamic styling
  const { theme } = useThemeStore();

  // Track which widget is currently being dragged
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure drag sensors to prevent accidental drags
  // Requires 8px movement before drag operation starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  /**
   * Handle drag start event
   * Sets the active widget ID for visual feedback during drag
   */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  /**
   * Handle drag end event
   * Reorders widgets if dropped on a different position
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Only reorder if dropped on a different widget
    if (active.id !== over?.id) {
      reorderWidgets(active.id as string, over?.id as string);
    }

    // Clear active drag state
    setActiveId(null);
  };

  // Find the widget currently being dragged for the drag overlay
  const activeWidget = widgets.find((widget) => widget.id === activeId);

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-[#09111C]" : "bg-neutral-100"
      }`}
    >
      {/* Navigation bar with theme toggle and export/import functionality */}
      <Navbar />

      {/* Main dashboard content area */}
      <main className="w-full px-6 py-8">
        {/* Drag and Drop Context - enables widget reordering */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Sortable Context - manages the sorting logic and animations */}
          <SortableContext
            items={widgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            {/* 
              Responsive Grid Layout:
              - 1 column on mobile (< 768px)
              - 2 columns on tablet (768px - 1024px) 
              - 3 columns on desktop (> 1024px)
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
              {/* Render all existing widgets as draggable components */}
              {widgets.map((widget) => (
                <DraggableWidget key={widget.id} widget={widget} />
              ))}

              {/* Add Widget Button - always positioned at the end of the grid */}
              <div onClick={openAddModal}>
                <AddWidget />
              </div>
            </div>
          </SortableContext>

          {/* 
            Drag Overlay - Shows a visual representation of the widget being dragged
            Provides user feedback during drag operations with rotation and scaling
          */}
          <DragOverlay>
            {activeWidget ? (
              <div className="opacity-80 rotate-3 scale-105">
                <DataWidget widget={activeWidget} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Modal for adding new widgets - rendered at the root level */}
      <AddWidgetModal />
    </div>
  );
}
