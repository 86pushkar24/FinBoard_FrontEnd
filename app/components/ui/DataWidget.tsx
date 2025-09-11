'use client'

import React, { useState, useEffect } from 'react'
import WidgetCard from './WidgetCard'
import ModernTable from './ModernTable'
import StockChart, { generateSampleStockData } from './StockChart'
import { useWidgetStore } from '../../store/widgetStore'
import { getValueByPath, formatDisplayValue } from '../../utils/dataMapper'
import { cachedMultiStockFetch, cachedFetch, CACHE_TTL } from '../../utils/apiCache'
import { exploreJsonStructure } from '../../utils/dataMapper'
import { FaCoins } from 'react-icons/fa'
import { HiPencil } from 'react-icons/hi'

interface Widget {
  id: string
  name: string
  apiUrl: string
  refreshInterval: number
  displayMode: 'card' | 'table' | 'chart' | 'advanced-table' | 'stock-chart'
  selectedFields: string[]
  apiProvider?: 'custom' | 'finnhub'
  apiType?: string
  symbol?: string // Store the symbol for WebSocket connections
  createdAt: Date
}

interface DragHandleProps {
  attributes: any
  listeners: any
}

// Smart function to extract 3-4 most important fields from any data structure
function getImportantFields(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') {
    return { value: data }
  }


  // Handle Coinbase exchange rates format
  if (data.data && data.data.rates && typeof data.data.rates === 'object') {
    const rates = data.data.rates
    const baseCurrency = data.data.currency || 'BTC'
    
    // Show top 4 major currencies
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']
    const importantRates: Record<string, any> = {}
    
    let count = 0
    for (const currency of majorCurrencies) {
      if (rates[currency] && count < 4) {
        importantRates[`${baseCurrency}/${currency}`] = Number(rates[currency]) || rates[currency]
        count++
      }
    }
    
    return importantRates
  }

  // Handle Finnhub Basic Financials format
  if (data.metric && typeof data.metric === 'object') {
    const metric = data.metric
    const importantMetrics: Record<string, any> = {}
    
    // Priority financial metrics
    const keyMetrics = [
      { key: '52WeekHigh', label: '52W High' },
      { key: '52WeekLow', label: '52W Low' }, 
      { key: 'beta', label: 'Beta' },
      { key: 'peBasicExclExtraTTM', label: 'P/E Ratio' },
      { key: 'marketCapitalization', label: 'Market Cap' }
    ]
    
    let count = 0
    for (const { key, label } of keyMetrics) {
      if (metric[key] !== undefined && metric[key] !== null && count < 4) {
        importantMetrics[label] = metric[key]
        count++
      }
    }
    
    return Object.keys(importantMetrics).length > 0 ? importantMetrics : { Symbol: data.symbol || 'N/A' }
  }

  // For any other complex object, use data mapper to find interesting fields
  const fields = exploreJsonStructure(data, '', 2, 0) // Max depth 2
  
  const interestingFields = fields
    .filter(field => {
      // Skip arrays and very deep nesting
      if (field.isArray || field.depth > 1) return false
      
      // Prioritize numeric fields and important strings
      if (field.type === 'number') return true
      if (field.type === 'string' && field.path.match(/(name|symbol|currency|title|status|type)/i)) return true
      
      return false
    })
    .sort((a, b) => {
      // Prioritize numbers over strings, shorter paths over longer ones
      if (a.type === 'number' && b.type !== 'number') return -1
      if (a.type !== 'number' && b.type === 'number') return 1
      return a.path.length - b.path.length
    })
    .slice(0, 4) // Take top 4

  const result: Record<string, any> = {}
  interestingFields.forEach(field => {
    const value = getValueByPath(data, field.path)
    if (value !== undefined && value !== null) {
      const displayName = field.path.split('.').pop()?.replace(/([A-Z])/g, ' $1') || field.path
      result[displayName] = value
    }
  })

  // Fallback: if no interesting fields found, show first 4 simple properties
  if (Object.keys(result).length === 0) {
    const simpleEntries = Object.entries(data)
      .filter(([_, value]) => typeof value !== 'object' || value === null)
      .slice(0, 4)
    
    return simpleEntries.reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, any>)
  }

  return result
}

interface DataWidgetProps {
  widget: Widget
  dragHandleProps?: DragHandleProps
}

export default function DataWidget({ widget, dragHandleProps }: DataWidgetProps) {
  const { removeWidget, updateWidget } = useWidgetStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState(widget.name)
  const [newRefreshInterval, setNewRefreshInterval] = useState<number>(widget.refreshInterval)


  const fetchData = async () => {
    if (!widget.apiUrl || widget.apiUrl.includes('YOUR_API_KEY')) {
      setError('Invalid API configuration')
      return
    }

    setLoading(true)
    setError(null)

    try {

      // Handle multi-stock Finnhub calls
      if (widget.apiUrl.startsWith('finnhub-multi-stock://')) {
        const urlParams = new URLSearchParams(widget.apiUrl.split('://')[1])
        const symbols = urlParams.get('symbols')?.split(',').map(s => s.trim()) || []
        const token = urlParams.get('token')

        if (!token || token === 'YOUR_API_KEY') {
          throw new Error('Valid Finnhub API key required')
        }

        // Use cached multi-stock fetch for better performance
        const stocks = await cachedMultiStockFetch(symbols, token, {
          metrics: true,
          profile: true,
          quote: true
        })
        const result = { stocks }
        setData(result)
        setLastUpdated(new Date())
        return
      }

      // Regular HTTP API call with caching
      // Cache should not exceed user's refresh interval to ensure fresh data when they expect it
      const userRefreshMs = widget.refreshInterval * 1000 // Convert seconds to milliseconds
      const maxCacheTime = widget.apiUrl.includes('coinbase.com') ? 300000 : CACHE_TTL.MARKET_DATA
      const cacheTime = Math.min(userRefreshMs, maxCacheTime)
      
      console.log(`🕐 Cache TTL: ${cacheTime}ms (user refresh: ${userRefreshMs}ms, max cache: ${maxCacheTime}ms)`)
      const result = await cachedFetch(widget.apiUrl, {}, cacheTime)
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and set up refresh interval
  useEffect(() => {
    fetchData()

    const interval = setInterval(() => {
      fetchData()
    }, widget.refreshInterval * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [widget.apiUrl, widget.refreshInterval])

  const renderData = () => {
    if (loading && !data) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-red-400 text-sm py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Error
          </div>
          {error}
        </div>
      )
    }

    if (!data) {
      return <div className="text-gray-400 text-sm py-4">No data available</div>
    }

    // Handle new display modes
    if (widget.displayMode === 'advanced-table') {
      return <AdvancedTableWrapper data={data} widget={widget} />
    }

    if (widget.displayMode === 'stock-chart') {
      return <StockChartWrapper data={data} widget={widget} />
    }

    // Auto-chart mode: Show chart if we have numeric data and no specific fields selected
    if (widget.displayMode === 'chart' && widget.selectedFields.length === 0) {
      const hasNumericData = checkForNumericData(data)
      if (hasNumericData) {
        return <StockChartWrapper data={data} widget={widget} />
      }
    }

    if (widget.displayMode === 'table' && widget.selectedFields.length > 0) {
      // Check if we're dealing with an array of objects
      const firstField = widget.selectedFields[0]
      const isArrayData = firstField.includes('[0]') || firstField.includes('[0].')
      
      if (isArrayData) {
        // Get the array path (e.g., "data" from "data[0].company")
        const arrayPath = firstField.split('[0]')[0]
        const arrayData = getValueByPath(data, arrayPath)
        
        if (Array.isArray(arrayData) && arrayData.length > 0) {
          // Create table headers from selected fields
          const headers = widget.selectedFields.map(field => {
            const fieldName = field.split('.').pop()?.replace('[0]', '') || field
            return fieldName.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
          })
          
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-600">
                {headers.slice(0, 3).map((header, index) => (
                  <span key={index} className="text-gray-400 text-xs font-medium uppercase">
                    {header}
                  </span>
                ))}
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-1">
                {arrayData.slice(0, 10).map((item, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-3 gap-2 py-1 text-sm">
                    {widget.selectedFields.slice(0, 3).map((field, colIndex) => {
                      const itemField = field.replace('[0]', `[${rowIndex}]`)
                      const value = getValueByPath(data, itemField)
                      return (
                        <span key={colIndex} className="text-white truncate">
                          {formatDisplayValue(value)}
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
              
              {arrayData.length > 10 && (
                <div className="text-gray-400 text-xs text-center pt-2 border-t border-slate-700">
                  Showing 10 of {arrayData.length} items
                </div>
              )}
            </div>
          )
        }
      }
      
      // Fallback to original key-value display for non-array data
      return (
        <div className="space-y-2">
          {widget.selectedFields.map((field, index) => {
            const value = getValueByPath(data, field)
            return (
              <div key={index} className="flex justify-between items-center py-1 border-b border-slate-700 last:border-b-0">
                <span className="text-gray-400 text-sm font-mono">{field.split('.').pop()}</span>
                <span className="text-white text-sm font-medium">
                  {formatDisplayValue(value)}
                </span>
              </div>
            )
          })}
        </div>
      )
    }

    const displayData = widget.selectedFields.length > 0 
      ? widget.selectedFields.reduce((acc, field) => {
          const value = getValueByPath(data, field)
          if (value !== null && value !== undefined) {
            acc[field.split('.').pop() || field] = value
          }
          return acc
        }, {} as Record<string, any>)
      : getImportantFields(data)

    return (
      <div className="space-y-2">
        {Object.entries(displayData).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center gap-2">
            <span className="text-gray-400 text-sm capitalize truncate flex-1 min-w-0">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-white text-sm font-medium truncate flex-1 min-w-0 text-right">
              {formatDisplayValue(value)}
            </span>
          </div>
        ))}
        {lastUpdated && (
          <div className="mt-4 pt-2 border-t border-slate-700">
            <div className="text-center text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleEditName = () => {
    setIsEditingName(true)
  }

  const handleSaveName = () => {
    const updates: Partial<Widget> = {}
    if (newName.trim() && newName !== widget.name) {
      updates.name = newName.trim()
    }
    const safeRefresh = Number.isFinite(newRefreshInterval) ? Math.max(2, Math.floor(newRefreshInterval)) : widget.refreshInterval
    if (safeRefresh !== widget.refreshInterval) {
      updates.refreshInterval = safeRefresh
    }
    if (Object.keys(updates).length > 0) {
      updateWidget(widget.id, updates)
    }
    setIsEditingName(false)
  }

  const handleCancelEdit = () => {
    setNewName(widget.name)
    setNewRefreshInterval(widget.refreshInterval)
    setIsEditingName(false)
  }

  const checkForNumericData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false

    const priceFields = ['price', 'close', 'lastPrice', 'rate', 'value', 'amount']
    for (const field of priceFields) {
      if (typeof data[field] === 'number' && data[field] > 0) {
        return true
      }
    }

    if (data.data && data.data.rates) {
      const rates = data.data.rates
      return Object.values(rates).some(rate => typeof rate === 'number' && rate > 0)
    }
    
    if (data.stocks && Array.isArray(data.stocks)) {
      return data.stocks.some((stock: any) => 
        typeof stock.price === 'number' || 
        typeof stock.close === 'number' || 
        typeof stock.lastPrice === 'number'
      )
    }
    
    return Object.values(data).some(value => typeof value === 'number' && value > 0)
  }

  const handleRefresh = () => {
    fetchData()
  }

  return (
    <>
      <WidgetCard 
        title={
          <div className="flex items-center gap-2">
            <FaCoins className="w-4 h-4" />
            <span className='line-clamp-1'>{widget.name}</span>
          </div>
        }
        onRefresh={handleRefresh}
        onRemove={() => removeWidget(widget.id)}
        onEdit={handleEditName}
        loading={loading}
        dragHandleProps={dragHandleProps}
      >
        {renderData()}
      </WidgetCard>

      {isEditingName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 max-w-[90vw] border border-slate-700">
            <h3 className="text-white font-medium text-lg mb-4">Widget Settings</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent mb-4"
              placeholder="Enter widget name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') handleCancelEdit()
              }}
            />
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Auto refresh (seconds)</label>
              <input
                type="number"
                min={2}
                step={1}
                value={newRefreshInterval}
                onChange={(e) => setNewRefreshInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent"
                placeholder="Refresh interval in seconds"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 2 seconds. Current: {widget.refreshInterval}s</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AdvancedTableWrapper({ data, widget }: { data: any, widget: Widget }) {
  console.log('  Table Debug - Raw data:', data)
  console.log('  Table Debug - Widget name:', widget.name)
  console.log('  Table Debug - Selected fields:', widget.selectedFields)
  

  let tableData: any[] = []
  
  if (data && data.stocks && Array.isArray(data.stocks)) {
 
    tableData = data.stocks
    console.log(' Using data.stocks array:', tableData.length, 'items')
  } else if (data && data.data && data.data.rates && typeof data.data.rates === 'object') {
    // Handle Coinbase API format: { data: { currency: "BTC", rates: { "USD": "114282.95", "EUR": "97472.59", ... } } }
    const rates = data.data.rates
    tableData = Object.entries(rates).map(([currency, rate]) => ({
      currency,
      rate: Number(rate) || rate,
      baseCurrency: data.data.currency || 'BTC'
    }))
    console.log('Using data.data.rates object converted to array:', tableData.length, 'items')
  } else if (data && data.rates && typeof data.rates === 'object') {
    // Handle simplified rates format: { rates: { "USD": "114282.95", ... } }
    const rates = data.rates
    tableData = Object.entries(rates).map(([currency, rate]) => ({
      currency,
      rate: Number(rate) || rate
    }))
    console.log(' Using data.rates object converted to array:', tableData.length, 'items')
  } else if (Array.isArray(data)) {
    // Handle direct array response
    tableData = data
    console.log(' Using direct array:', tableData.length, 'items')
  } else if (data && typeof data === 'object') {
    // Handle single object - convert to array
    tableData = [data]
    console.log('Converting single object to array')
  } else {
    console.log(' No valid data format found')
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-lg mb-2">No Table Data</div>
        <div className="text-sm">API response format not supported for table view</div>
        <pre className="mt-4 text-xs bg-slate-700 p-2 rounded max-w-md mx-auto overflow-auto">
          {JSON.stringify(data, null, 2).substring(0, 200)}...
        </pre>
      </div>
    )
  }

  console.log('  Final table data:', tableData)

  // Use the new ModernTable component
  return <ModernTable data={tableData} />
}


function StockChartWrapper({ data, widget }: { data: any, widget: Widget }) {
  console.log('📊 StockChartWrapper - Data:', data)
  console.log('📊 StockChartWrapper - Widget:', widget)
  console.log('📊 StockChartWrapper - Selected Fields:', widget.selectedFields)
  
  // Try to extract meaningful chart data from the API response
  let symbol = data.stocks?.[0]?.symbol || data.symbol || widget.name.split(' ')[0] || 'STOCK'
  
  
  // For exchange rate data, extract the currency from selected fields
  if (data.data && data.data.rates && widget.selectedFields.length > 0) {
    const selectedField = widget.selectedFields[0]
    const currencyMatch = selectedField.match(/rates\.([A-Z]+)/)
    if (currencyMatch) {
      symbol = currencyMatch[1] // Use the actual currency (e.g., INR)
    }
  }

  let chartData = null
  
  // Look for price data in various common API response formats
  if (data.stocks && Array.isArray(data.stocks)) {
    // Multi-stock data - use the first stock's price
    const firstStock = data.stocks[0]
    if (firstStock.price || firstStock.close || firstStock.lastPrice) {
      const price = firstStock.price || firstStock.close || firstStock.lastPrice
      chartData = generateSampleStockData(symbol, 30, price)
    }
  } else if (data.price || data.close || data.lastPrice) {
    // Single stock data
    const price = data.price || data.close || data.lastPrice
    chartData = generateSampleStockData(symbol, 30, price)
  } else if (data.data && data.data.rates) {
    // Exchange rate data 
    const rates = data.data.rates
    
    // Check if user selected a specific currency field
    if (widget.selectedFields.length > 0) {
      const selectedField = widget.selectedFields[0]
      // Extract currency from field path like "data.rates.INR"
      const currencyMatch = selectedField.match(/rates\.([A-Z]+)/)
      if (currencyMatch) {
        const currency = currencyMatch[1]
        const rate = rates[currency]
        if (typeof rate === 'number' && rate > 0) {
          chartData = generateSampleStockData(currency, 30, rate)
        }
      }
    }
    
    // Fallback to USD or first available rate
    if (!chartData) {
      const usdRate = rates.USD || Object.values(rates)[0]
      if (typeof usdRate === 'number') {
        chartData = generateSampleStockData(symbol, 30, usdRate)
      }
    }
  } else if (widget.selectedFields.length > 0) {
    // Try to extract numeric value from selected fields
    const firstField = widget.selectedFields[0]
    const value = getValueByPath(data, firstField)
    if (typeof value === 'number' && value > 0) {
      chartData = generateSampleStockData(symbol, 30, value)
    }
  }
  
  // Fallback to sample data if no meaningful data found
  if (!chartData) {
    console.log('No chart data found, generating sample data for symbol:', symbol)
    chartData = generateSampleStockData(symbol, 30)
  } else {
    console.log('Using real data for chart, symbol:', symbol, 'base price:', chartData[0]?.close)
  }

  return (
    <StockChart
      data={chartData}
      type="line"
      interval="daily"
      symbol={symbol}
    />
  )
}
