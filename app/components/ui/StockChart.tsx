'use client'

import React, { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { useThemeStore } from '../../store/themeStore'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartDataPoint {
  date: string
  open?: number
  high?: number
  low?: number
  close: number
  volume?: number
}

interface StockChartProps {
  data: ChartDataPoint[]
  type: 'line' | 'candlestick' | 'volume'
  interval: 'daily' | 'weekly' | 'monthly'
  symbol: string
  className?: string
}

export default function StockChart({ 
  data, 
  type = 'line', 
  interval = 'daily', 
  symbol, 
  className = '' 
}: StockChartProps) {
  const { theme } = useThemeStore()
  type GraphType = 'line' | 'area' | 'box'
  const initialGraphType: GraphType = type === 'line' ? 'line' : 'line'
  const [graphType, setGraphType] = useState<GraphType>(initialGraphType)
  
  const chartData = useMemo(() => {
    const labels = data.map(point => {
      const date = new Date(point.date)
      switch (interval) {
        case 'daily':
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        case 'weekly':
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        case 'monthly':
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        default:
          return date.toLocaleDateString()
      }
    })

    if (graphType === 'box') {
      return {
        labels,
        datasets: [
          {
            label: `${symbol} Price (Bar)`,
            data: data.map(point => point.close),
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
          },
        ],
      }
    }

    // Line and Area
    return {
      labels,
      datasets: [
        {
          label: `${symbol} Price`,
          data: data.map(point => point.close),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: graphType === 'area' ? 'rgba(34, 197, 94, 0.35)' : 'transparent',
          borderWidth: 2,
          fill: graphType === 'area' ? 'origin' : false,
          tension: 0.1,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [data, graphType, interval, symbol])

  const options: ChartOptions<'line' | 'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? '#d1d5db' : '#374151',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
        text: '',
        color: theme === 'dark' ? '#ffffff' : '#6b7280',
        font: {
          size: 14,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme === 'dark' ? '#ffffff' : '#374151',
        bodyColor: theme === 'dark' ? '#d1d5db' : '#374151',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            return `${context.dataset.label}: $${value.toFixed(2)}`
          }
        }
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
          },
        },
        grid: {
          color: theme === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(156, 163, 175, 0.2)',
        },
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
          },
          callback: function(value) {
            return '$' + (value as number).toFixed(2)
          }
        },
        grid: {
          color: theme === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(156, 163, 175, 0.2)',
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgba(34, 197, 94, 1)',
      },
    },
  }), [symbol, interval, theme])

  const ChartComponent = graphType === 'box' ? Bar : Line

  return (
    <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-sm font-semibold`}>
          {`${symbol} - ${interval.charAt(0).toUpperCase() + interval.slice(1)} ${graphType.charAt(0).toUpperCase() + graphType.slice(1)} Chart`}
        </h3>
        <div className="hidden sm:flex items-center gap-2">
          <label htmlFor="graphType" className={`${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'} text-xs`}>Graph</label>
          <select
            id="graphType"
            value={graphType}
            onChange={(e) => setGraphType(e.target.value as GraphType)}
            className={`${theme === 'dark' ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} text-xs rounded-md border px-2 py-1`}
          >
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="box">Box</option>
          </select>
        </div>
      </div>
      <div className="h-64 relative">
        <ChartComponent data={chartData} options={options} />
      </div>
      
      {/* Chart Controls */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}>Last updated:</span>
          <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{new Date().toLocaleTimeString()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}>Data points:</span>
          <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{data.length}</span>
        </div>
      </div>
    </div>
  )
}

// Simple seeded random number generator for consistent data
function seededRandom(seed: number): () => number {
  let state = seed
  return function() {
    state = (state * 1664525 + 1013904223) % Math.pow(2, 32)
    return state / Math.pow(2, 32)
  }
}

// Generate hash from string for deterministic seed
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Sample data generator for testing - now with consistent data per symbol
export function generateSampleStockData(symbol: string, days: number = 30, customBasePrice?: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  
  // Create seeded random generator based on symbol
  const seed = hashCode(symbol + 'stockchart')
  const random = seededRandom(seed)
  
  // Use custom base price if provided, otherwise deterministic base price based on symbol
  let basePrice = customBasePrice || (50 + (random() * 200)) // Base price between 50-250
  
  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Simulate price movement with deterministic randomness
    const change = (random() - 0.5) * 10 // Change between -5 and +5
    basePrice = Math.max(10, basePrice + change) // Don't go below $10
    
    const open = basePrice
    const close = basePrice + (random() - 0.5) * 5
    const high = Math.max(open, close) + random() * 3
    const low = Math.min(open, close) - random() * 3
    const volume = Math.floor(random() * 10000000) + 1000000 // 1M to 11M volume
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    })
    
    basePrice = close
  }
  
  return data.reverse() // Most recent first
}
