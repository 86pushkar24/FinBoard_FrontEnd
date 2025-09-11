'use client'
import React, { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { useWidgetStore } from '../../store/widgetStore'
import { HiCheckCircle, HiPlus, HiSearch, HiX, HiViewGrid, HiTable, HiChartBar } from 'react-icons/hi'
import { analyzeApiResponse, filterFields, formatDisplayValue, type FieldInfo } from '../../utils/dataMapper'
interface FinnhubApiOption {
  id: string
  name: string
  description: string
  endpoint: string
  method: 'GET'
  requiredParams: string[]
  sampleFields: string[]
}
//i havw put 4 endpoints for the finhubb api for demo purposes, we may have any in a dropdown for any website  
const FINNHUB_API_OPTIONS: FinnhubApiOption[] = [
  {
    id: 'company-profile',
    name: 'Company Profile',
    description: 'Get general information of a company by symbol, ISIN or CUSIP',
    endpoint: '/stock/profile2',
    method: 'GET',
    requiredParams: ['symbol'],
    sampleFields: ['country', 'currency', 'exchange', 'marketCapitalization', 'name', 'phone', 'weburl', 'logo']
  },
  {
    id: 'basic-financials',
    name: 'Basic Financials',
    description: 'Get company basic financials such as margin, P/E ratio, 52-week high/low etc.',
    endpoint: '/stock/metric',
    method: 'GET',
    requiredParams: ['symbol', 'metric'],
    sampleFields: ['series.annual.currentRatio', 'series.annual.salesPerShare', 'metric.52WeekHigh', 'metric.52WeekLow', 'metric.beta']
  },
  {
    id: 'multi-stock-metrics',
    name: '52-Week Highs (Multiple Stocks)',
    description: 'Get 52-week high/low data for multiple stocks in table format',
    endpoint: '/multi-stock-metrics',
    method: 'GET',
    requiredParams: ['symbols'],
    sampleFields: ['stocks[0].symbol', 'stocks[0].name', 'stocks[0].price', 'stocks[0].fiftyTwoWeekHigh', 'stocks[0].fiftyTwoWeekLow', 'stocks[0].volume', 'stocks[0].marketCap', 'stocks[0].beta', 'stocks[0].peRatio']
  }
  
]

export default function AddWidgetModal() {
  //using zustand for state management here
  const { isAddModalOpen, closeAddModal, addWidget } = useWidgetStore()
  const [formData, setFormData] = useState({
    name: '',
    apiUrl: '',
    refreshInterval: 30
  })
  //other states for our form
  const [displayMode, setDisplayMode] = useState<'card' | 'advanced-table' | 'stock-chart'>('card')
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<string | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [availableFields, setAvailableFields] = useState<FieldInfo[]>([])
  const [apiProvider, setApiProvider] = useState<'custom' | 'finnhub'>('custom')
  const [selectedFinnhubApi, setSelectedFinnhubApi] = useState<FinnhubApiOption | null>(null)
  const [stockSymbol, setStockSymbol] = useState('')
  const [, setApiResponseData] = useState<unknown>(null)
  const [fieldSearchQuery, setFieldSearchQuery] = useState('')
  const [fieldFilters, setFieldFilters] = useState({
    arraysOnly: false,
    primitiveOnly: false,
    maxDepth: 5
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const generateFinnhubUrl = (api: FinnhubApiOption, symbol: string) => {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'YOUR_API_KEY'
    let apiUrl = ''
    if (api.id === 'multi-stock-metrics') {
      // For multi-stock, we handle API calls directly in testApiConnection
      const symbols = symbol || 'AAPL,GOOGL,MSFT,TSLA,AMZN'
      apiUrl = `finnhub-multi-stock://symbols=${symbols}&token=${apiKey}`
    } else {
      apiUrl = `https://finnhub.io/api/v1${api.endpoint}?symbol=${symbol || 'AAPL'}&token=${apiKey}`
      if (api.id === 'basic-financials') {
        apiUrl += '&metric=all'
      }
    }
    return apiUrl
  }

  const handleFinnhubApiSelect = (api: FinnhubApiOption) => {
    setSelectedFinnhubApi(api)
    setSelectedFields([])
    setApiResponseData(null)
    
    // Set sample fields as FieldInfo objects
    // user can choose betwee the data he wants in the form , whjich we show here as a dropdown
    //can use mui or shad here for more appealing dropdowns
    const sampleFields: FieldInfo[] = api.sampleFields.map(field => ({
      path: field,
      type: 'unknown',
      sampleValue: 'Sample data will appear after testing API',
      isArray: false,
      isObject: false,
      depth: field.split('.').length - 1
    }))
    setAvailableFields(sampleFields)
    
    const apiUrl = generateFinnhubUrl(api, stockSymbol)
    
    setFormData(prev => ({
      ...prev,
      name: `${api.name} - ${stockSymbol || 'AAPL'}`,
      apiUrl
    }))
  }

  // Update URL when symbol changes
  const updateFinnhubUrl = React.useCallback(() => {
    if (selectedFinnhubApi && apiProvider === 'finnhub') {
      const apiUrl = generateFinnhubUrl(selectedFinnhubApi, stockSymbol)
      setFormData(prev => ({
        ...prev,
        name: `${selectedFinnhubApi.name} - ${stockSymbol || 'AAPL'}`,
        apiUrl
      }))
    }
  }, [selectedFinnhubApi, apiProvider, stockSymbol])

  // Call updateFinnhubUrl when symbol changes
  React.useEffect(() => {
    updateFinnhubUrl()
  }, [updateFinnhubUrl])

  const testApiConnection = async () => {
    if (!formData.apiUrl || formData.apiUrl.includes('YOUR_API_KEY')) {
      setApiTestResult('Please provide a valid API URL and API key')
      return
    }

    setIsTestingApi(true)
    setApiTestResult(null)
    setApiResponseData(null)

    try {
      let data
      
      // Handle multi-stock-metrics with real Finnhub API calls
      //created this as the pdf had 52 multi stocks card
      if (selectedFinnhubApi?.id === 'multi-stock-metrics') {
        const finnhubApiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY
        if (!finnhubApiKey || finnhubApiKey === 'YOUR_API_KEY') {
          throw new Error('Finnhub API key not configured. Please set NEXT_PUBLIC_FINNHUB_API_KEY in environment variables.')
        }

        const symbols = stockSymbol ? stockSymbol.split(',').map(s => s.trim()) : ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']
        
        setApiTestResult('Fetching data for multiple stocks...')
        
        // Make parallel API calls to Finnhub for each stock
        const stockPromises = symbols.map(async (symbol) => {
          try {
            // Get basic financials (52-week high/low)
            const metricsResponse = await fetch(
              `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${finnhubApiKey}`
            )
            
            // Get company profile (name)
            const profileResponse = await fetch(
              `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubApiKey}`
            )

            // Get current price
            const quoteResponse = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
            )

            if (!metricsResponse.ok) {
              throw new Error(`Failed to fetch metrics for ${symbol}: ${metricsResponse.status}`)
            }

            const [metrics, profile, quote] = await Promise.all([
              metricsResponse.json(),
              profileResponse.ok ? profileResponse.json() : {},
              quoteResponse.ok ? quoteResponse.json() : {}
            ])

            return {
              symbol: symbol,
              name: (profile as Record<string, unknown>)?.name || symbol,
              price: (quote as Record<string, unknown>)?.c || 0, // current price
              fiftyTwoWeekHigh: metrics.metric?.['52WeekHigh'] || 0,
              fiftyTwoWeekLow: metrics.metric?.['52WeekLow'] || 0,
              volume: metrics.metric?.['10DayAverageTradingVolume'] || 0,
              marketCap: (profile as Record<string, unknown>)?.marketCapitalization || 0,
              beta: metrics.metric?.beta || 0,
              peRatio: metrics.metric?.peBasicExclExtraTTM || 0
            }
          } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error)
            return {
              symbol: symbol,
              name: symbol,
              price: 0,
              fiftyTwoWeekHigh: 0,
              fiftyTwoWeekLow: 0,
              volume: 0,
              marketCap: 0,
              beta: 0,
              peRatio: 0,
              error: `Failed to fetch data for ${symbol}`
            }
          }
        })

        const stocks = await Promise.all(stockPromises)
        data = { stocks }
        
        const successCount = stocks.filter(stock => !stock.error).length
        setApiTestResult(`Successfully fetched data for ${successCount}/${symbols.length} stocks from Finnhub API`)
      } else {
        // Regular API call
        const response = await fetch(formData.apiUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        data = await response.json()
        setApiTestResult('API connection successful!')
      }

      setApiResponseData(data)

      // Analyze the API response structure
      const analysis = analyzeApiResponse(data)
      setAvailableFields(analysis.fields)
      
      if (selectedFinnhubApi?.id !== 'multi-stock-metrics') {
        setApiTestResult(
          `API connection successful! Found ${analysis.totalFields} fields across ${analysis.maxDepth + 1} levels.`
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to API'
      setApiTestResult(`Error: ${errorMessage}`)
      setAvailableFields([])
    } finally {
      setIsTestingApi(false)
    }
  }

  const toggleField = (fieldPath: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldPath) 
        ? prev.filter(f => f !== fieldPath)
        : [...prev, fieldPath]
    )
  }

  const handleSubmit = () => {
    addWidget({
      name: formData.name,
      apiUrl: formData.apiUrl,
      refreshInterval: formData.refreshInterval,
      displayMode,
      selectedFields,
      apiProvider,
      apiType: selectedFinnhubApi?.id,
      symbol: stockSymbol
    })
    
    // Reset form
    setFormData({ name: '', apiUrl: '', refreshInterval: 30 })
    setSelectedFields([])
    setApiTestResult(null)
    setApiResponseData(null)
    setApiProvider('custom')
    setSelectedFinnhubApi(null)
    setStockSymbol('')
    setAvailableFields([])
    setFieldSearchQuery('')
    setFieldFilters({ arraysOnly: false, primitiveOnly: false, maxDepth: 5 })
    closeAddModal()
  }

  const removeSelectedField = (field: string) => {
    setSelectedFields(prev => prev.filter(f => f !== field))
  }

  return (
    <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Add New Widget">
      <div className="space-y-6">
        {/* Widget Name - First */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Widget Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Stock Price Tracker"
            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Data Source Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Data Source
          </label>
          <select
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value as 'custom' | 'finnhub')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="custom">Custom API URL</option>
            <option value="finnhub">Integrated Financial Data (Finnhub)</option>
          </select>
        </div>

        {/* Finnhub Options */}
        {apiProvider === 'finnhub' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Financial Data Type
              </label>
              <select
                value={selectedFinnhubApi?.id || ''}
                onChange={(e) => {
                  const api = FINNHUB_API_OPTIONS.find(a => a.id === e.target.value)
                  if (api) handleFinnhubApiSelect(api)
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select data type...</option>
                {FINNHUB_API_OPTIONS.map((api) => (
                  <option key={api.id} value={api.id}>
                    {api.name} 
                  </option>
                ))}
              </select>
            </div>

            {selectedFinnhubApi && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {selectedFinnhubApi.id === 'multi-stock-metrics' 
                    ? 'Stock Symbols (comma-separated)' 
                    : 'Stock Symbol'
                  }
                </label>
                <input
                  type="text"
                  value={stockSymbol}
                  onChange={(e) => setStockSymbol(e.target.value)}
                  placeholder={
                    selectedFinnhubApi.id === 'multi-stock-metrics' 
                      ? 'e.g., AAPL,GOOGL,MSFT,TSLA,AMZN' 
                      : 'e.g., AAPL'
                  }
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {selectedFinnhubApi.id === 'multi-stock-metrics' && (
                  <div className="mt-2 p-2 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                    <div className="text-sm text-blue-400">
                      Tip: Enter 5 stock symbols separated by commas for your 52-week high table
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* API URL - Only show for custom API or after Finnhub selection */}
        {(apiProvider === 'custom' || (apiProvider === 'finnhub' && selectedFinnhubApi)) && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="apiUrl"
                value={formData.apiUrl}
                onChange={handleInputChange}
                placeholder="e.g., https://api.coinbase.com/v2/exchange-rates?currency=BTC"
                className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                readOnly={apiProvider === 'finnhub'}
              />
              <Button 
                onClick={testApiConnection}
                disabled={!formData.apiUrl || isTestingApi}
                className="px-4 py-1.5"
              >
                {isTestingApi ? 'Testing...' : 'Test'}
              </Button>
            </div>
            
            {apiTestResult && (
              <div className="mt-2 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/20 px-3 py-2 rounded-lg">
                <HiCheckCircle className="w-4 h-4" />
                {apiTestResult}
              </div>
            )}
          </div>
        )}

        {/* Refresh Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Refresh Interval (seconds)
          </label>
          <input
            type="number"
            name="refreshInterval"
            value={formData.refreshInterval}
            onChange={handleInputChange}
            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Display Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Display Mode
          </label>
          <div className="flex gap-2">
            {[
              { key: 'card', label: 'Card', icon: HiViewGrid },
              { key: 'advanced-table', label: 'Table', icon: HiTable },
              { key: 'stock-chart', label: 'Chart', icon: HiChartBar }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => setDisplayMode(mode.key as typeof displayMode)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  displayMode === mode.key
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
          
          {selectedFields.some(field => field.includes('[0]')) && displayMode === 'advanced-table' && (
            <div className="mt-2 p-2 bg-emerald-900/20 border border-emerald-600/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span>Table mode will display multiple rows from the array data</span>
              </div>
            </div>
          )}
        </div>

        {/* Field Explorer */}
        {(apiProvider === 'custom' || (apiProvider === 'finnhub' && selectedFinnhubApi)) && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Field Explorer
            </label>
            
            {/* Search and Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={fieldSearchQuery}
                  onChange={(e) => setFieldSearchQuery(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-10 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {fieldSearchQuery && (
                  <button
                    onClick={() => setFieldSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <HiX className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 text-sm">
                <label className="flex items-center gap-2 text-gray-400">
                  <input 
                    type="checkbox" 
                    checked={fieldFilters.primitiveOnly}
                    onChange={(e) => setFieldFilters(prev => ({ ...prev, primitiveOnly: e.target.checked }))}
                    className="rounded text-emerald-500 focus:ring-emerald-500" 
                  />
                  Primitive values only
                </label>
                <label className="flex items-center gap-2 text-gray-400">
                  <input 
                    type="checkbox" 
                    checked={fieldFilters.arraysOnly}
                    onChange={(e) => setFieldFilters(prev => ({ ...prev, arraysOnly: e.target.checked }))}
                    className="rounded text-emerald-500 focus:ring-emerald-500" 
                  />
                  Arrays only
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Available Fields */}
        {availableFields.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Available Fields ({filterFields(availableFields, fieldSearchQuery, fieldFilters).length})
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto bg-slate-700 rounded-lg p-2">
              {filterFields(availableFields, fieldSearchQuery, fieldFilters).map(field => (
                <div key={field.path} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-xs truncate">{field.path}</span>
                      <div className="flex gap-1">
                        <span className={`px-1.5 py-0.5 text-xs rounded text-white ${
                          field.type === 'string' ? 'bg-blue-600' :
                          field.type === 'number' ? 'bg-green-600' :
                          field.type === 'boolean' ? 'bg-purple-600' :
                          field.isArray ? 'bg-orange-600' :
                          field.isObject ? 'bg-slate-600' : 'bg-gray-600'
                        }`}>
                          {field.isArray ? 'array' : field.isObject ? 'object' : field.type}
                        </span>
                        {field.path.includes('[0]') && (
                          <span className="px-1.5 py-0.5 text-xs rounded text-white bg-emerald-600">
                            table-ready
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs mt-1 truncate">
                      {formatDisplayValue(field.sampleValue)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleField(field.path)}
                    className={`ml-2 p-1 rounded transition-colors ${
                      selectedFields.includes(field.path)
                        ? 'text-emerald-400 bg-emerald-400/20'
                        : 'text-gray-400 hover:text-emerald-300'
                    }`}
                  >
                    <HiPlus className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {filterFields(availableFields, fieldSearchQuery, fieldFilters).length === 0 && (
                <div className="text-gray-400 text-sm py-4 text-center">
                  {availableFields.length === 0 
                    ? 'Test API connection to explore available fields'
                    : 'No fields match your search criteria'
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Fields */}
        {selectedFields.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selected Fields ({selectedFields.length})
            </label>
            <div className="space-y-2">
              {selectedFields.map(fieldPath => {
                const fieldInfo = availableFields.find(f => f.path === fieldPath)
                return (
                  <div key={fieldPath} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-white font-mono text-sm truncate">{fieldPath}</div>
                        {fieldInfo && (
                          <span className={`px-1.5 py-0.5 text-xs rounded text-white ${
                            fieldInfo.type === 'string' ? 'bg-blue-600' :
                            fieldInfo.type === 'number' ? 'bg-green-600' :
                            fieldInfo.type === 'boolean' ? 'bg-purple-600' :
                            fieldInfo.isArray ? 'bg-orange-600' :
                            fieldInfo.isObject ? 'bg-slate-600' : 'bg-gray-600'
                          }`}>
                            {fieldInfo.isArray ? 'array' : fieldInfo.isObject ? 'object' : fieldInfo.type}
                          </span>
                        )}
                      </div>
                      {fieldInfo && (
                        <div className="text-gray-400 text-xs mt-1 truncate">
                          {formatDisplayValue(fieldInfo.sampleValue)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeSelectedField(fieldPath)}
                      className="text-red-400 hover:text-red-300 ml-3 p-1 rounded transition-colors"
                    >
                      <HiX className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={closeAddModal}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.apiUrl}
            className="flex-1"
          >
            Add Widget
          </Button>
        </div>
      </div>
    </Modal>
  )
}
