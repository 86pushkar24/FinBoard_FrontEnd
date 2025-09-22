/**
 * API Cache System - High-Performance Caching with Rate Limiting
 *
 * This module provides a comprehensive caching and rate limiting system for financial
 * API calls. It reduces redundant requests, improves dashboard performance, and
 * ensures compliance with API usage limits from providers like Finnhub and Coinbase.
 *
 * Key Features:
 * - TTL-based memory caching with automatic expiration
 * - Domain-specific rate limiting with sliding windows
 * - Automatic cleanup of expired entries
 * - Multi-stock batch fetching with error isolation
 * - Cache hit/miss logging for performance monitoring
 */

/**
 * Cache Entry Structure
 * Stores cached API responses with metadata for expiration tracking
 */
interface CacheEntry {
  data: any; // The actual API response data
  timestamp: number; // When the data was cached
  expiry: number; // When the cache entry expires
}

/**
 * Rate Limit Entry Structure
 * Tracks API request counts and reset times per domain
 */
interface RateLimitEntry {
  count: number; // Number of requests made in current window
  resetTime: number; // When the rate limit window resets
}

/**
 * ApiCache Class - Core Caching Implementation
 *
 * Manages in-memory caching with TTL support and automatic cleanup.
 * Provides rate limiting functionality to prevent API abuse.
 */
class ApiCache {
  private cache = new Map<string, CacheEntry>(); // Main cache storage
  private rateLimits = new Map<string, RateLimitEntry>(); // Rate limit tracking
  private defaultTTL = 60000; // 1 minute default cache duration

  /**
   * Retrieve data from cache
   *
   * @param key - Cache key to look up
   * @returns Cached data or null if not found/expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    // Auto-delete expired entries to keep memory clean
    if (now > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache with TTL
   *
   * @param key - Unique cache key
   * @param data - Data to cache
   * @param ttlMs - Time to live in milliseconds (optional)
   */
  set(key: string, data: any, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  /**
   * Remove specific cache entry
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired cache entries and rate limits
   * Called automatically every 10 minutes to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    // Remove expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    // Clean expired rate limit entries
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }
  /**
   * Check if domain is rate limited
   *
   * @param domain - API domain to check
   * @param maxRequests - Maximum requests allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns true if rate limited, false if request can proceed
   */
  isRateLimited(
    domain: string,
    maxRequests: number = 60,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(domain);

    if (!entry || now > entry.resetTime) {
      // First request or window expired - reset counter
      this.rateLimits.set(domain, {
        count: 1,
        resetTime: now + windowMs,
      });
      return false;
    }

    if (entry.count >= maxRequests) {
      return true; // Rate limited - too many requests
    }

    // Increment count and allow request
    entry.count++;
    return false;
  }

  /**
   * Get remaining API requests for domain
   *
   * @param domain - API domain to check
   * @param maxRequests - Maximum requests in window
   * @returns Object with remaining requests and reset time
   */
  getRemainingRequests(
    domain: string,
    maxRequests: number = 60
  ): { remaining: number; resetTime: number } {
    const entry = this.rateLimits.get(domain);
    if (!entry) {
      return { remaining: maxRequests, resetTime: Date.now() + 60000 };
    }

    return {
      remaining: Math.max(0, maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }
}

/**
 * Global Cache Instance
 * Single instance used throughout the application
 */
export const apiCache = new ApiCache();

/**
 * Cache TTL Configuration
 * Different cache durations for different types of financial data
 * based on how frequently the data changes
 */
export const CACHE_TTL = {
  STOCK_QUOTE: 30000, // 30 seconds for real-time quotes (most volatile)
  STOCK_METRICS: 300000, // 5 minutes for metrics/fundamentals (moderate change)
  COMPANY_PROFILE: 3600000, // 1 hour for company info (rarely changes)
  MARKET_DATA: 60000, // 1 minute for market data (frequent updates)
  HISTORICAL: 1800000, // 30 minutes for historical data (static)
} as const;

/**
 * Generate Consistent Cache Key
 *
 * Creates deterministic cache keys by sorting parameters to ensure
 * the same data request always generates the same cache key
 *
 * @param endpoint - API endpoint URL
 * @param params - Request parameters
 * @returns Consistent cache key string
 */
export function generateCacheKey(
  endpoint: string,
  params: Record<string, any>
): string {
  // Sort params to ensure consistent cache keys regardless of parameter order
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return `${endpoint}:${JSON.stringify(sortedParams)}`;
}

/**
 * Rate Limiting Configuration by API Provider
 *
 * Different APIs have different rate limits, so we configure them
 * based on their documented limits to prevent service disruptions
 */
const RATE_LIMITS = {
  "api.coinbase.com": { maxRequests: 10, windowMs: 60000 }, // Conservative limit for Coinbase
  "finnhub.io": { maxRequests: 60, windowMs: 60000 }, // Finnhub free tier limit
  default: { maxRequests: 30, windowMs: 60000 }, // Safe default for unknown APIs
} as const;

/**
 * Extract Domain from URL
 *
 * Safely extracts hostname from URL for rate limiting purposes
 *
 * @param url - Full API URL
 * @returns Domain hostname or 'unknown' if parsing fails
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Cached Fetch Function
 *
 * Enhanced fetch function with automatic caching and rate limiting.
 * Checks cache first, then rate limits, then makes API call if needed.
 *
 * @param url - API endpoint URL
 * @param options - Fetch options (headers, method, etc.)
 * @param ttlMs - Custom cache TTL in milliseconds
 * @returns Promise resolving to API response data
 */
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  ttlMs?: number
): Promise<any> {
  const cacheKey = generateCacheKey(url, {});

  // Step 1: Check cache first for immediate response
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log(`🟢 Cache hit for: ${cacheKey}`);
    return cached;
  }

  // Step 2: Check rate limiting before making expensive API call
  const domain = extractDomain(url);
  const limits =
    RATE_LIMITS[domain as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;

  if (apiCache.isRateLimited(domain, limits.maxRequests, limits.windowMs)) {
    const { remaining, resetTime } = apiCache.getRemainingRequests(
      domain,
      limits.maxRequests
    );
    const waitTime = Math.ceil((resetTime - Date.now()) / 1000);

    console.log(`⚠️  Rate limited for ${domain}. Wait ${waitTime}s`);
    throw new Error(
      `Rate limited for ${domain}. Please wait ${waitTime} seconds before trying again.`
    );
  }

  // Step 3: Make actual API call (cache miss)
  console.log(`🔄 Cache miss, fetching: ${cacheKey}`);
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Step 4: Store in cache for future requests
  apiCache.set(cacheKey, data, ttlMs);

  const { remaining } = apiCache.getRemainingRequests(
    domain,
    limits.maxRequests
  );
  console.log(
    `✅ API call successful. ${remaining} requests remaining for ${domain}`
  );

  return data;
}

/**
 * Multi-Stock Batch Fetching Function
 *
 * Efficiently fetches multiple stock data points in parallel with error isolation.
 * Each stock's data is fetched independently, so one failure doesn't affect others.
 * Supports selective endpoint fetching to optimize API usage.
 *
 * @param symbols - Array of stock symbols to fetch
 * @param token - Finnhub API token
 * @param endpoints - Which data types to fetch (metrics, profile, quote)
 * @returns Promise resolving to array of stock data objects
 */
export async function cachedMultiStockFetch(
  symbols: string[],
  token: string,
  endpoints: {
    metrics?: boolean; // Financial metrics (P/E, beta, 52-week high/low)
    profile?: boolean; // Company profile (name, market cap, industry)
    quote?: boolean; // Real-time quote (price, change, volume)
  } = { metrics: true, profile: true, quote: true }
): Promise<any[]> {
  // Process each symbol independently for error isolation
  const stockPromises = symbols.map(async (symbol) => {
    const results: any = { symbol };

    try {
      // Fetch financial metrics if requested
      if (endpoints.metrics) {
        const metricsKey = generateCacheKey("metrics", { symbol, token });
        let metrics = apiCache.get(metricsKey);

        if (!metrics) {
          metrics = await cachedFetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${token}`,
            {},
            CACHE_TTL.STOCK_METRICS
          );
        }

        // Extract and normalize key metrics
        results.metrics = metrics;
        results.fiftyTwoWeekHigh = metrics.metric?.["52WeekHigh"] || 0;
        results.fiftyTwoWeekLow = metrics.metric?.["52WeekLow"] || 0;
        results.beta = metrics.metric?.beta || 0;
        results.peRatio = metrics.metric?.peBasicExclExtraTTM || 0;
        results.volume = metrics.metric?.["10DayAverageTradingVolume"] || 0;
      }

      // Fetch company profile if requested
      if (endpoints.profile) {
        const profileKey = generateCacheKey("profile", { symbol, token });
        let profile = apiCache.get(profileKey);

        if (!profile) {
          profile = await cachedFetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${token}`,
            {},
            CACHE_TTL.COMPANY_PROFILE
          );
        }

        // Extract and normalize company information
        results.profile = profile;
        results.name = (profile as any)?.name || symbol;
        results.marketCap = (profile as any)?.marketCapitalization || 0;
        results.industry = (profile as any)?.finnhubIndustry || "";
        results.country = (profile as any)?.country || "";
      }

      // Fetch real-time quote if requested
      if (endpoints.quote) {
        const quoteKey = generateCacheKey("quote", { symbol, token });
        let quote = apiCache.get(quoteKey);

        if (!quote) {
          quote = await cachedFetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`,
            {},
            CACHE_TTL.STOCK_QUOTE
          );
        }

        // Extract and normalize price information
        results.quote = quote;
        results.price = (quote as any)?.c || 0; // Current price
        results.change = (quote as any)?.d || 0; // Price change
        results.changePercent = (quote as any)?.dp || 0; // Percentage change
        results.previousClose = (quote as any)?.pc || 0; // Previous close
      }

      return results;
    } catch (error) {
      // Error isolation - return partial data with error flag
      console.error(`Error fetching data for ${symbol}:`, error);
      return {
        symbol,
        name: symbol,
        price: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        error: `Failed to fetch ${symbol}`,
      };
    }
  });

  // Execute all requests in parallel for maximum performance
  return Promise.all(stockPromises);
}

/**
 * Automatic Cache Cleanup
 *
 * Runs every 10 minutes to clean up expired cache entries and rate limit data.
 * Prevents memory leaks and keeps the application performant over long sessions.
 */
setInterval(() => {
  apiCache.cleanup();
}, 600000);
