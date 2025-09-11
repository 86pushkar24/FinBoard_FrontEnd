// Dynamic data mapping utilities for exploring and extracting API response structures

export interface FieldInfo {
  path: string
  type: string
  sampleValue: any
  isArray: boolean
  isObject: boolean
  depth: number
}

export interface DataMapperResult {
  fields: FieldInfo[]
  totalFields: number
  maxDepth: number
}

/**
 * Recursively explores a JSON object and extracts all field paths with metadata
 */
export function exploreJsonStructure(
  obj: any, 
  prefix: string = '', 
  maxDepth: number = 5,
  currentDepth: number = 0
): FieldInfo[] {
  const fields: FieldInfo[] = []
  
  if (currentDepth >= maxDepth || obj === null || obj === undefined) {
    return fields
  }

  if (Array.isArray(obj)) {
    // Handle arrays
    const arrayPath = prefix || 'root'
    fields.push({
      path: arrayPath,
      type: 'array',
      sampleValue: `Array[${obj.length}]`,
      isArray: true,
      isObject: false,
      depth: currentDepth
    })

    // Explore first element if array is not empty
    if (obj.length > 0) {
      const firstElement = obj[0]
      if (typeof firstElement === 'object' && firstElement !== null) {
        const subFields = exploreJsonStructure(
          firstElement, 
          `${arrayPath}[0]`, 
          maxDepth, 
          currentDepth + 1
        )
        fields.push(...subFields)
      } else {
        fields.push({
          path: `${arrayPath}[0]`,
          type: typeof firstElement,
          sampleValue: firstElement,
          isArray: false,
          isObject: false,
          depth: currentDepth + 1
        })
      }
    }
  } else if (typeof obj === 'object') {
    // Handle objects
    if (prefix && currentDepth > 0) {
      fields.push({
        path: prefix,
        type: 'object',
        sampleValue: `Object{${Object.keys(obj).length} keys}`,
        isArray: false,
        isObject: true,
        depth: currentDepth
      })
    }

    // Explore object properties
    Object.entries(obj).forEach(([key, value]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key
      
      if (value === null || value === undefined) {
        fields.push({
          path: newPrefix,
          type: 'null',
          sampleValue: value,
          isArray: false,
          isObject: false,
          depth: currentDepth + 1
        })
      } else if (Array.isArray(value) || typeof value === 'object') {
        const subFields = exploreJsonStructure(value, newPrefix, maxDepth, currentDepth + 1)
        fields.push(...subFields)
      } else {
        fields.push({
          path: newPrefix,
          type: typeof value,
          sampleValue: value,
          isArray: false,
          isObject: false,
          depth: currentDepth + 1
        })
      }
    })
  } else {
    // Handle primitive values at root level
    fields.push({
      path: prefix || 'value',
      type: typeof obj,
      sampleValue: obj,
      isArray: false,
      isObject: false,
      depth: currentDepth
    })
  }

  return fields
}

export function analyzeApiResponse(data: any): DataMapperResult {
  const fields = exploreJsonStructure(data)
  
  return {
    fields: fields.sort((a, b) => {
      // Sort by depth first, then alphabetically
      if (a.depth !== b.depth) return a.depth - b.depth
      return a.path.localeCompare(b.path)
    }),
    totalFields: fields.length,
    maxDepth: Math.max(...fields.map(f => f.depth), 0)
  }
}

export function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return null
  
  // Handle array notation like data[0].name
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1')
  
  return normalizedPath.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return null
    
    // Handle numeric keys for array access
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10)
      return Array.isArray(current) ? current[index] : null
    }
    
    return current[key]
  }, obj)
}

export function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) return 'N/A'
  
  if (typeof value === 'number') {
    // Format numbers with appropriate precision
    if (Number.isInteger(value)) {
      return value.toLocaleString()
    } else {
      return value.toLocaleString(undefined, { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 6 
      })
    }
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  if (typeof value === 'string') {
    // Truncate very long strings
    if (value.length > 100) {
      return value.substring(0, 97) + '...'
    }
    return value
  }
  
  if (Array.isArray(value)) {
    return `Array[${value.length}]`
  }
  
  if (typeof value === 'object') {
    return `Object{${Object.keys(value).length} keys}`
  }
  
  return String(value)
}

export function filterFields(
  fields: FieldInfo[],
  searchQuery: string = '',
  options: {
    arraysOnly?: boolean
    primitiveOnly?: boolean
    maxDepth?: number
  } = {}
): FieldInfo[] {
  let filtered = fields

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(field => 
      field.path.toLowerCase().includes(query) ||
      field.type.toLowerCase().includes(query)
    )
  }
` `
  if (options.arraysOnly) {
    filtered = filtered.filter(field => field.isArray)
  }

  if (options.primitiveOnly) {
    filtered = filtered.filter(field => 
      !field.isArray && !field.isObject && 
      ['string', 'number', 'boolean'].includes(field.type)
    )
  }

  if (typeof options.maxDepth === 'number') {
    filtered = filtered.filter(field => field.depth <= options.maxDepth!)
  }

  return filtered
}

export function createApiAdapter(apiType: string) {
  const adapters = {
    finnhub: {
      companyProfile: (data: any) => ({
        name: data.name,
        symbol: data.ticker,
        country: data.country,
        currency: data.currency,
        marketCap: data.marketCapitalization,
        website: data.weburl
      }),
      basicFinancials: (data: any) => ({
        '52WeekHigh': data.metric?.['52WeekHigh'],
        '52WeekLow': data.metric?.['52WeekLow'],
        beta: data.metric?.beta,
        currentRatio: data.series?.annual?.currentRatio?.[0]?.v,
        salesPerShare: data.series?.annual?.salesPerShare?.[0]?.v
      })
    },
    coinbase: (data: any) => ({
      currency: data.data?.currency,
      rates: data.data?.rates
    }),
    generic: (data: any) => data
  }

  return adapters[apiType as keyof typeof adapters] || adapters.generic
}
