// API Caching system to reduce redundant calls and improve performance

interface CacheEntry {
  data: any
  timestamp: number
  expiry: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry>()
  private rateLimits = new Map<string, RateLimitEntry>()
  private defaultTTL = 60000 // 1 minute default

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    // Auto-delete expired entries
    if (now > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: any, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    }
    this.cache.set(key, entry)
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  cleanup(): void {
    const now = Date.now()
    // Remove expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
    // Clean expired rate limit entries
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key)
      }
    }
  }
  isRateLimited(domain: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now()
    const entry = this.rateLimits.get(domain)

    if (!entry || now > entry.resetTime) {
      // First request or window expired - reset counter
      this.rateLimits.set(domain, {
        count: 1,
        resetTime: now + windowMs
      })
      return false
    }

    if (entry.count >= maxRequests) {
      return true // Rate limited
    }

    // Increment count
    entry.count++
    return false
  }


  getRemainingRequests(domain: string, maxRequests: number = 60): { remaining: number, resetTime: number } {
    const entry = this.rateLimits.get(domain)
    if (!entry) {
      return { remaining: maxRequests, resetTime: Date.now() + 60000 }
    }
    
    return {
      remaining: Math.max(0, maxRequests - entry.count),
      resetTime: entry.resetTime
    }
  }
}

export const apiCache = new ApiCache()

export const CACHE_TTL = {
  STOCK_QUOTE: 30000,     // 30 seconds for real-time quotes
  STOCK_METRICS: 300000,  // 5 minutes for metrics/fundamentals
  COMPANY_PROFILE: 3600000, // 1 hour for company info
  MARKET_DATA: 60000,     // 1 minute for market data
  HISTORICAL: 1800000     // 30 minutes for historical data
} as const

export function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  // Sort params to ensure consistent cache keys regardless of order
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {} as Record<string, any>)
  
  return `${endpoint}:${JSON.stringify(sortedParams)}`
}

// Rate limiting configuration by domain
const RATE_LIMITS = {
  'api.coinbase.com': { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  'finnhub.io': { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
  'default': { maxRequests: 30, windowMs: 60000 } // 30 requests per minute for other APIs
} as const

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'unknown'
  }
}

export async function cachedFetch(
  url: string, 
  options: RequestInit = {}, 
  ttlMs?: number
): Promise<any> {
  const cacheKey = generateCacheKey(url, {})
  
  // Check cache first
  const cached = apiCache.get(cacheKey)
  if (cached) {
    console.log(`🟢 Cache hit for: ${cacheKey}`)
    return cached
  }

  // Check rate limiting before making request
  const domain = extractDomain(url)
  const limits = RATE_LIMITS[domain as keyof typeof RATE_LIMITS] || RATE_LIMITS.default
  
  if (apiCache.isRateLimited(domain, limits.maxRequests, limits.windowMs)) {
    const { remaining, resetTime } = apiCache.getRemainingRequests(domain, limits.maxRequests)
    const waitTime = Math.ceil((resetTime - Date.now()) / 1000)
    
    console.log(` Rate limited for ${domain}. Wait ${waitTime}s`)
    throw new Error(`Rate limited for ${domain}. Please wait ${waitTime} seconds before trying again.`)
  }

  // Make actual API call
  console.log(` Cache miss, fetching: ${cacheKey}`)
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Store in cache for future requests
  apiCache.set(cacheKey, data, ttlMs)
  
  const { remaining } = apiCache.getRemainingRequests(domain, limits.maxRequests)
  console.log(`API call successful. ${remaining} requests remaining for ${domain}`)
  
  return data
}

export async function cachedMultiStockFetch(
  symbols: string[],
  token: string,
  endpoints: {
    metrics?: boolean
    profile?: boolean
    quote?: boolean
  } = { metrics: true, profile: true, quote: true }
): Promise<any[]> {
  
  const stockPromises = symbols.map(async (symbol) => {
    const results: any = { symbol }

    try {
      // Fetch metrics if requested
      if (endpoints.metrics) {
        const metricsKey = generateCacheKey('metrics', { symbol, token })
        let metrics = apiCache.get(metricsKey)
        
        if (!metrics) {
          metrics = await cachedFetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${token}`,
            {},
            CACHE_TTL.STOCK_METRICS
          )
        }
        
        results.metrics = metrics
        results.fiftyTwoWeekHigh = metrics.metric?.['52WeekHigh'] || 0
        results.fiftyTwoWeekLow = metrics.metric?.['52WeekLow'] || 0
        results.beta = metrics.metric?.beta || 0
        results.peRatio = metrics.metric?.peBasicExclExtraTTM || 0
        results.volume = metrics.metric?.['10DayAverageTradingVolume'] || 0
      }

      // Fetch profile if requested
      if (endpoints.profile) {
        const profileKey = generateCacheKey('profile', { symbol, token })
        let profile = apiCache.get(profileKey)
        
        if (!profile) {
          profile = await cachedFetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${token}`,
            {},
            CACHE_TTL.COMPANY_PROFILE
          )
        }
        
        results.profile = profile
        results.name = (profile as any)?.name || symbol
        results.marketCap = (profile as any)?.marketCapitalization || 0
        results.industry = (profile as any)?.finnhubIndustry || ''
        results.country = (profile as any)?.country || ''
      }

      // Fetch quote if requested
      if (endpoints.quote) {
        const quoteKey = generateCacheKey('quote', { symbol, token })
        let quote = apiCache.get(quoteKey)
        
        if (!quote) {
          quote = await cachedFetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`,
            {},
            CACHE_TTL.STOCK_QUOTE
          )
        }
        
        results.quote = quote
        results.price = (quote as any)?.c || 0
        results.change = (quote as any)?.d || 0
        results.changePercent = (quote as any)?.dp || 0
        results.previousClose = (quote as any)?.pc || 0
      }

      return results
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error)
      return {
        symbol,
        name: symbol,
        price: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        error: `Failed to fetch ${symbol}`
      }
    }
  })

  return Promise.all(stockPromises)
}

// Auto cleanup every 10 minutes
setInterval(() => {
  apiCache.cleanup()
}, 600000)


