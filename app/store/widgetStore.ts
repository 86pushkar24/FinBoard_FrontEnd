import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Widget {
  id: string
  name: string
  apiUrl: string
  refreshInterval: number
  displayMode: 'card' | 'table' | 'chart' | 'advanced-table' | 'stock-chart'
  selectedFields: string[]
  apiProvider?: 'custom' | 'finnhub'
  apiType?: string
  symbol?: string // Store the symbol for WebSocket connections , Removed as was not apt data that too on time
  createdAt: Date
}

interface WidgetStore {
  widgets: Widget[]
  isAddModalOpen: boolean
  addWidget: (widget: Omit<Widget, 'id' | 'createdAt'>) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  reorderWidgets: (activeId: string, overId: string) => void
  openAddModal: () => void
  closeAddModal: () => void
  getWidgetCount: () => number
  clearAllWidgets: () => void
  exportWidgets: () => string
  importWidgets: (jsonData: string) => boolean
}

// Helper function to generate a robust unique id
const generateId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

// Helper function to load initial widgets and fix any duplicate/missing IDs
const getInitialWidgets = (): Widget[] => {
  if (typeof window === 'undefined') return []
  
  const saved = localStorage.getItem('widget-store')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const widgets: Widget[] = (parsed.state?.widgets || []).map((widget: any) => ({
        ...widget,
        createdAt: new Date(widget.createdAt)
      }))

      // Ensure unique IDs across all widgets
      const seen = new Set<string>()
      for (const w of widgets) {
        if (!w.id || seen.has(w.id)) {
          w.id = generateId()
        }
        seen.add(w.id)
      }
      return widgets
    } catch (error) {
      console.error('Failed to parse saved widgets:', error)
    }
  }
  
  // Return empty array - no default widgets
  return []
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: getInitialWidgets(),
      isAddModalOpen: false,
      
      addWidget: (widgetData) => {
        const generateId = () =>
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? (crypto as any).randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

        const newWidget: Widget = {
          ...widgetData,
          id: generateId(),
          createdAt: new Date()
        }
        set(state => ({
          widgets: [...state.widgets, newWidget]
        }))
      },
      
      removeWidget: (id) => {
        set(state => ({
          widgets: state.widgets.filter(widget => widget.id !== id)
        }))
      },

      updateWidget: (id, updates) => {
        set(state => ({
          widgets: state.widgets.map(widget => 
            widget.id === id ? { ...widget, ...updates } : widget
          )
        }))
      },

      reorderWidgets: (activeId, overId) => {
        set(state => {
          const widgets = [...state.widgets]
          const activeIndex = widgets.findIndex(widget => widget.id === activeId)
          const overIndex = widgets.findIndex(widget => widget.id === overId)
          
          if (activeIndex === -1 || overIndex === -1) return state
          
          // Remove the active widget and insert it at the new position
          const [movedWidget] = widgets.splice(activeIndex, 1)
          widgets.splice(overIndex, 0, movedWidget)
          
          return { widgets }
        })
      },
      
      openAddModal: () => set({ isAddModalOpen: true }),
      closeAddModal: () => set({ isAddModalOpen: false }),
      
      getWidgetCount: () => get().widgets.length,
      
      clearAllWidgets: () => set({ widgets: [] }),
      
      exportWidgets: () => {
        const state = get()
        const exportData = {
          widgets: state.widgets,
          exportDate: new Date().toISOString(),
          version: '1.0'
        }
        return JSON.stringify(exportData, null, 2)
      },
      
      importWidgets: (jsonData: string) => {
        try {
          const importData = JSON.parse(jsonData)
          
          // Validate the import data structure
          if (!importData.widgets || !Array.isArray(importData.widgets)) {
            throw new Error('Invalid import data: widgets array not found')
          }
          
          // Validate each widget has required fields
          const validWidgets = importData.widgets.filter((widget: any) => {
            return widget.id && widget.name && widget.apiUrl && widget.displayMode
          })
          
          if (validWidgets.length === 0) {
            throw new Error('No valid widgets found in import data')
          }
          
          // Generate new IDs to avoid conflicts
          const widgetsWithNewIds = validWidgets.map((widget: any) => ({
            ...widget,
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date()
          }))
          
          // Replace current widgets with imported ones
          set({ widgets: widgetsWithNewIds })
          
          return true
        } catch (error) {
          console.error('Import failed:', error)
          return false
        }
      }
    }),
    {
      name: 'widget-store',
      partialize: (state) => ({ widgets: state.widgets }),
    }
  )
)
