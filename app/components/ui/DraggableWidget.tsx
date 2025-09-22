/**
 * Draggable Widget Wrapper Component
 *
 * This component wraps individual widgets with drag-and-drop functionality using
 * @dnd-kit/sortable. It handles the drag states, visual feedback, and provides
 * the necessary props to make widgets draggable within the dashboard grid.
 *
 * Key Features:
 * - Sortable drag and drop with @dnd-kit
 * - Visual feedback during drag operations (reduced opacity, shadow, ring)
 * - Proper z-index management to ensure dragged items appear above others
 * - Seamless integration with the DataWidget component
 */

"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HiMenuAlt2 } from "react-icons/hi";
import DataWidget from "./DataWidget";

/**
 * Widget Interface
 * Defines the structure of a financial data widget
 */
interface Widget {
  id: string; // Unique identifier
  name: string; // Display name
  apiUrl: string; // Data source endpoint
  refreshInterval: number; // Auto-refresh interval in seconds
  displayMode: "card" | "table" | "chart" | "advanced-table" | "stock-chart"; // Display format
  selectedFields: string[]; // Fields to show from API response
  apiProvider?: "custom" | "finnhub"; // API provider type
  apiType?: string; // Specific API endpoint type
  createdAt: Date; // Creation timestamp
}

/**
 * Component Props Interface
 */
interface DraggableWidgetProps {
  widget: Widget; // Widget configuration to render and make draggable
}

/**
 * Draggable Widget Component
 *
 * Wraps a DataWidget with drag-and-drop functionality, handling all the
 * sortable logic and visual states required for dashboard reordering.
 *
 * @param widget - Widget configuration object
 * @returns JSX element with drag-and-drop enabled widget
 */
export default function DraggableWidget({ widget }: DraggableWidgetProps) {
  // Hook into @dnd-kit sortable functionality
  const {
    attributes, // Accessibility attributes for screen readers
    listeners, // Event listeners for drag interactions
    setNodeRef, // Ref to attach to the DOM element
    transform, // Current transform values during drag
    transition, // CSS transition for smooth animations
    isDragging, // Boolean indicating if this widget is being dragged
  } = useSortable({ id: widget.id });

  // Calculate CSS styles for drag animations
  const style = {
    transform: CSS.Transform.toString(transform), // Apply drag transform
    transition, // Smooth transitions
    opacity: isDragging ? 0.5 : 1, // Fade during drag
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-50" : ""}`} // Higher z-index when dragging
    >
      {/* Visual feedback container - adds shadow and ring when dragging */}
      <div className={`${isDragging ? "shadow-2xl ring-2 ring-blue-500" : ""}`}>
        {/* The actual widget component with drag handle props */}
        <DataWidget
          widget={widget}
          dragHandleProps={{ attributes, listeners }}
        />
      </div>
    </div>
  );
}
