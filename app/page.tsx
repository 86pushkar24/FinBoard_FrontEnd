'use client'

import Navbar from './components/layout/Navbar'
import DraggableWidget from './components/ui/DraggableWidget'
import AddWidget from './components/ui/AddWidget'
import AddWidgetModal from './components/ui/AddWidgetModal'
import { useWidgetStore } from './store/widgetStore'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from 'react'
import DataWidget from './components/ui/DataWidget'
import { useThemeStore } from './store/themeStore'

export default function Dashboard() {
  const { widgets, openAddModal, reorderWidgets } = useWidgetStore()
  const { theme } = useThemeStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Prevent accidental drags - requires 8px movement to start
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, 
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      reorderWidgets(active.id as string, over?.id as string)
    }

    setActiveId(null)
  }

  const activeWidget = widgets.find(widget => widget.id === activeId)

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#09111C]' : 'bg-neutral-100'}`}>
      <Navbar />
      
      <main className="w-full px-6 py-8">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            {/* Responsive grid: 1 col mobile, 2 tablet, 3 desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">

              {widgets.map(widget => (
                <DraggableWidget key={widget.id} widget={widget} />
              ))}

              <div onClick={openAddModal}>
                <AddWidget />
              </div>
            </div>
          </SortableContext>

          {/* Shows widget being dragged with visual effects */}
          <DragOverlay>
            {activeWidget ? (
              <div className="opacity-80 rotate-3 scale-105">
                <DataWidget widget={activeWidget} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <AddWidgetModal />
    </div>
  )
}