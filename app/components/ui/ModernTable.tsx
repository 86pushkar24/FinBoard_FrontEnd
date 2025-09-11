'use client'

import React, { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { HiChevronUp, HiChevronDown, HiSearch } from 'react-icons/hi'
import { formatDisplayValue, exploreJsonStructure, getValueByPath } from '../../utils/dataMapper'
import { useThemeStore } from '../../store/themeStore'

interface ModernTableProps {
  data: any[]
  className?: string
}

// Helper function to flatten complex objects into displayable table data
const flattenDataForTable = (data: any[]): any[] => {
  if (!data || data.length === 0) return []

  return data.map((item, index) => {
    // If it's already a simple object with string/number values, return as-is
    const sampleValues = Object.values(item).slice(0, 3)
    const isSimpleObject = sampleValues.every(val => 
      typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null
    )
    
    if (isSimpleObject) {
      return item
    }

    // For complex objects, extract meaningful fields using our data mapper
    const flattened: any = {}
    
    // First, add any simple top-level fields
    Object.entries(item).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        flattened[key] = value
      }
    })

    // Then explore nested structures and extract interesting fields
    const fields = exploreJsonStructure(item, '', 3, 0)
    
    // Pick the most interesting fields (avoid arrays and deep nesting)
    const interestingFields = fields
      .filter(field => {
        // Skip arrays and very deep paths
        if (field.isArray || field.depth > 2) return false
        
        // Prefer numeric fields for financial data
        if (field.type === 'number') return true
        
        // Include strings if they're not too nested
        if (field.type === 'string' && field.depth <= 1) return true
        
        return false
      })
      .slice(0, 15) // Limit to reasonable number of columns
      .sort((a, b) => {
        // Prioritize less nested and numeric fields
        if (a.depth !== b.depth) return a.depth - b.depth
        if (a.type === 'number' && b.type !== 'number') return -1
        if (a.type !== 'number' && b.type === 'number') return 1
        return 0
      })

    // Add these fields to flattened object
    interestingFields.forEach(field => {
      const value = getValueByPath(item, field.path)
      if (value !== undefined && value !== null) {
        // Create a readable column name
        const columnName = field.path
          .split('.')
          .map(part => part.replace(/([A-Z])/g, ' $1').trim())
          .join(' > ')
          .replace(/^\w/, c => c.toUpperCase())
        
        flattened[columnName] = value
      }
    })

    return flattened
  })
}

// Helper function to format cell values based on column name
const formatCellValue = (value: any, columnId: string): string => {
  if (value === null || value === undefined) return 'N/A'
  
  const lowerColumnId = columnId.toLowerCase()
  
  if (lowerColumnId.includes('change') && lowerColumnId.includes('percent')) {
    const numValue = Number(value)
    return `${numValue >= 0 ? '+' : ''}${formatDisplayValue(numValue)}%`
  }
  
  if (lowerColumnId.includes('change') && !lowerColumnId.includes('percent')) {
    const numValue = Number(value)
    return `${numValue >= 0 ? '+' : ''}$${formatDisplayValue(Math.abs(numValue))}`
  }
  
  if (lowerColumnId.includes('price') || lowerColumnId.includes('high') || lowerColumnId.includes('low')) {
    return `$${formatDisplayValue(value)}`
  }
  
  if (lowerColumnId.includes('cap') || lowerColumnId.includes('market')) {
    const numValue = Number(value)
    if (numValue >= 1000000000) {
      return `$${formatDisplayValue(numValue / 1000000000)}B`
    } else if (numValue >= 1000000) {
      return `$${formatDisplayValue(numValue / 1000000)}M`
    }
    return `$${formatDisplayValue(numValue)}`
  }
  
  if (lowerColumnId.includes('volume')) {
    const numValue = Number(value)
    if (numValue >= 1000000) {
      return `${formatDisplayValue(numValue / 1000000)}M`
    } else if (numValue >= 1000) {
      return `${formatDisplayValue(numValue / 1000)}K`
    }
    return formatDisplayValue(numValue)
  }
  
  return formatDisplayValue(value)
}

// Helper function to get cell styling based on value and column
const getCellClassName = (value: any, columnId: string): string => {
  const lowerColumnId = columnId.toLowerCase()
  
  if (lowerColumnId.includes('change') || lowerColumnId.includes('percent')) {
    const numValue = Number(value)
    if (numValue > 0) return 'text-green-400 font-medium'
    if (numValue < 0) return 'text-red-400 font-medium'
    return 'text-gray-400'
  }
  
  if (lowerColumnId.includes('symbol')) {
    return 'text-emerald-400 font-bold'
  }
  
  if (lowerColumnId.includes('price') || lowerColumnId.includes('high') || lowerColumnId.includes('low') || lowerColumnId.includes('cap')) {
    return 'text-white font-medium'
  }
  
  if (lowerColumnId.includes('name')) {
    return 'text-gray-300'
  }
  
  return 'text-white'
}

export default function ModernTable({ data, className = '' }: ModernTableProps) {
  const { theme } = useThemeStore()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Flatten complex data structures for display
  const flattenedData = useMemo(() => {
    console.log('🔍 ModernTable - Raw data:', data)
    const flattened = flattenDataForTable(data)
    console.log('🔍 ModernTable - Flattened data:', flattened)
    return flattened
  }, [data])

  // Generate columns dynamically from flattened data
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!flattenedData || flattenedData.length === 0) return []

    const sampleRow = flattenedData[0]
    const keys = Object.keys(sampleRow)

    return keys.map((key) => ({
      accessorKey: key,
      header: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
      cell: ({ getValue, column }) => {
        const value = getValue()
        return (
          <span className={getCellClassName(value, column.id)}>
            {formatCellValue(value, column.id)}
          </span>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
    }))
  }, [flattenedData])

  const table = useReactTable({
    data: flattenedData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  if (!flattenedData || flattenedData.length === 0) {
    const emptyStateClasses = theme === 'dark'
      ? 'bg-slate-800 border-slate-700 text-gray-400'
      : 'bg-white border-slate-200 text-slate-500'
    
    return (
      <div className={`${emptyStateClasses} rounded-lg border p-8 text-center ${className}`}>
        <div>
          <svg className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2`}>No Data Available</div>
          <div className="text-sm">Connect to an API to see your data in this table</div>
        </div>
      </div>
    )
  }

  const tableClasses = theme === 'dark'
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200'
  
  const headerClasses = theme === 'dark'
    ? 'border-slate-700'
    : 'border-slate-200'
  
  const inputClasses = theme === 'dark'
    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400 focus:ring-emerald-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:ring-[#16A34A]'

  return (
    <div className={`${tableClasses} rounded-lg border overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`p-4 border-b ${headerClasses}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-sm sm:font-medium`}>📊 Data Table</h3>
          </div>
          
          <div className="relative">
            <HiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'} w-4 h-4`} />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search all columns..."
              className={`w-48 sm:w-64 pl-10 pr-3 py-2 ${inputClasses} rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm`}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300 hover:bg-slate-600' : 'text-slate-600 hover:bg-slate-100'} uppercase tracking-wider cursor-pointer transition-colors`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                      <div className="flex flex-col">
                        {header.column.getIsSorted() === 'asc' ? (
                          <HiChevronUp className="w-4 h-4" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <HiChevronDown className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 opacity-50">
                            <HiChevronUp className="w-3 h-3" />
                            <HiChevronDown className="w-3 h-3 -mt-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={theme === 'dark' ? 'divide-y divide-slate-700' : 'divide-y divide-slate-200'}>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={`${theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'} transition-colors`}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={`px-4 py-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex flex-col gap-3 items-center ">
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={`px-3 py-1 ${theme === 'dark' 
                ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' 
                : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'} border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              Previous
            </button>
            
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={`px-3 py-1 ${theme === 'dark' 
                ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' 
                : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'} border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
