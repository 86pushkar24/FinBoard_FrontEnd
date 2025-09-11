'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HiMenuAlt2 } from 'react-icons/hi'
import DataWidget from './DataWidget'

interface Widget {
  id: string
  name: string
  apiUrl: string
  refreshInterval: number
  displayMode: 'card' | 'table' | 'chart' | 'advanced-table' | 'stock-chart'
  selectedFields: string[]
  apiProvider?: 'custom' | 'finnhub'
  apiType?: string
  createdAt: Date
}

interface DraggableWidgetProps {
  widget: Widget
}

export default function DraggableWidget({ widget }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      <div className={`${isDragging ? 'shadow-2xl ring-2 ring-blue-500' : ''}`}>
        <DataWidget widget={widget} dragHandleProps={{ attributes, listeners }} />
      </div>
    </div>
  )
}
