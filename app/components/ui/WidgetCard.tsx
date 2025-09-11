import { ReactNode } from 'react'
import { HiMenuAlt2 } from 'react-icons/hi'
import { useThemeStore } from '../../store/themeStore'

interface DragHandleProps {
  attributes: any
  listeners: any
}

interface WidgetCardProps {
  title: string | ReactNode
  children: ReactNode
  className?: string
  onRefresh?: () => void
  onRemove?: () => void
  onEdit?: () => void
  loading?: boolean
  dragHandleProps?: DragHandleProps
}

export default function WidgetCard({ 
  title, 
  children, 
  className = '', 
  onRefresh, 
  onRemove,
  onEdit,
  loading,
  dragHandleProps
}: WidgetCardProps) {
  const { theme } = useThemeStore()
  
  const cardClasses = theme === 'dark' 
    ? 'bg-slate-900 border-slate-600 shadow-2xl shadow-[#16A34A]/10 ring-slate-700/30 z-20'
    : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50 ring-slate-100/50 z-20'
  
  return (
    <div className={`${cardClasses} rounded-lg border p-4 ring-1 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1 hover:rotate-[0.1deg] ${theme === 'dark' ? 'hover:shadow-[#16A34A]/20' : 'hover:shadow-slate-300/60'} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-medium text-sm`}>{title}</h3>
        <div className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
          {dragHandleProps && (
            <button 
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'} transition-colors cursor-grab active:cursor-grabbing`}
              title="Drag to reorder"
            >
              <HiMenuAlt2 className="w-4 h-4" />
            </button>
          )}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={loading}
              className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'} transition-colors disabled:opacity-50`}
              title="Refresh data"
            >
              <svg 
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button 
            onClick={onEdit}
            className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'} transition-colors`} 
            title="Edit Widget"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {onRemove && (
            <button 
              onClick={onRemove}
              className="hover:text-red-500 transition-colors"
              title="Remove widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
        {children}
      </div>
    </div>
  )
}
