/**
 * Data Mapper Utilities - Smart API Response Processing
 *
 * This module provides intelligent analysis and processing of API responses from
 * various financial data providers. It automatically discovers data structures,
 * extracts field information, and provides utilities for data transformation
 * and display formatting.
 *
 * Key Features:
 * - Recursive JSON structure analysis with depth limiting
 * - Automatic field type detection and classification
 * - Path-based data extraction with array/object support
 * - Smart value formatting for different data types
 * - API-specific data adapters for normalized output
 * - Field filtering and search capabilities
 */

/**
 * Field Information Structure
 *
 * Describes a single field discovered in an API response with its metadata
 */
export interface FieldInfo {
  path: string; // Dot notation path to the field (e.g., 'data.rates.USD')
  type: string; // JavaScript type of the field value
  sampleValue: any; // Example value for display purposes
  isArray: boolean; // Whether the field contains an array
  isObject: boolean; // Whether the field contains an object
  depth: number; // Nesting depth from root (0 = root level)
}

/**
 * Data Analysis Result Structure
 *
 * Contains comprehensive analysis results of an API response
 */
export interface DataMapperResult {
  fields: FieldInfo[]; // All discovered fields with metadata
  totalFields: number; // Total number of fields found
  maxDepth: number; // Maximum nesting depth encountered
}

/**
 * Recursive JSON Structure Explorer
 *
 * Recursively traverses a JSON object to discover all available fields,
 * their types, and structural information. Used for automatic field
 * detection in dynamic API responses.
 *
 * @param obj - The object to explore
 * @param prefix - Current path prefix for nested fields
 * @param maxDepth - Maximum recursion depth to prevent infinite loops
 * @param currentDepth - Current recursion depth
 * @returns Array of field information objects
 */
export function exploreJsonStructure(
  obj: any,
  prefix: string = "",
  maxDepth: number = 5,
  currentDepth: number = 0
): FieldInfo[] {
  const fields: FieldInfo[] = [];

  // Prevent infinite recursion and handle null/undefined values
  if (currentDepth >= maxDepth || obj === null || obj === undefined) {
    return fields;
  }

  if (Array.isArray(obj)) {
    // Handle array structures
    const arrayPath = prefix || "root";
    fields.push({
      path: arrayPath,
      type: "array",
      sampleValue: `Array[${obj.length}]`,
      isArray: true,
      isObject: false,
      depth: currentDepth,
    });

    // Explore first element to understand array structure
    if (obj.length > 0) {
      const firstElement = obj[0];
      if (typeof firstElement === "object" && firstElement !== null) {
        // Recursively explore object within array
        const subFields = exploreJsonStructure(
          firstElement,
          `${arrayPath}[0]`,
          maxDepth,
          currentDepth + 1
        );
        fields.push(...subFields);
      } else {
        // Handle primitive array elements
        fields.push({
          path: `${arrayPath}[0]`,
          type: typeof firstElement,
          sampleValue: firstElement,
          isArray: false,
          isObject: false,
          depth: currentDepth + 1,
        });
      }
    }
  } else if (typeof obj === "object") {
    // Handle object structures
    if (prefix && currentDepth > 0) {
      fields.push({
        path: prefix,
        type: "object",
        sampleValue: `Object{${Object.keys(obj).length} keys}`,
        isArray: false,
        isObject: true,
        depth: currentDepth,
      });
    }

    // Recursively explore all object properties
    Object.entries(obj).forEach(([key, value]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        // Handle null/undefined values explicitly
        fields.push({
          path: newPrefix,
          type: "null",
          sampleValue: value,
          isArray: false,
          isObject: false,
          depth: currentDepth + 1,
        });
      } else if (Array.isArray(value) || typeof value === "object") {
        // Recursively explore nested structures
        const subFields = exploreJsonStructure(
          value,
          newPrefix,
          maxDepth,
          currentDepth + 1
        );
        fields.push(...subFields);
      } else {
        // Handle primitive values (string, number, boolean)
        fields.push({
          path: newPrefix,
          type: typeof value,
          sampleValue: value,
          isArray: false,
          isObject: false,
          depth: currentDepth + 1,
        });
      }
    });
  } else {
    // Handle primitive values at root level
    fields.push({
      path: prefix || "value",
      type: typeof obj,
      sampleValue: obj,
      isArray: false,
      isObject: false,
      depth: currentDepth,
    });
  }

  return fields;
}

/**
 * Analyze API Response Structure
 *
 * Performs comprehensive analysis of an API response to extract all available
 * fields and their metadata. Results are sorted by depth and name for
 * consistent display in the UI.
 *
 * @param data - Raw API response data
 * @returns Complete analysis with sorted fields and statistics
 */
export function analyzeApiResponse(data: any): DataMapperResult {
  const fields = exploreJsonStructure(data);

  return {
    fields: fields.sort((a, b) => {
      // Sort by depth first (shallow to deep), then alphabetically
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.path.localeCompare(b.path);
    }),
    totalFields: fields.length,
    maxDepth: Math.max(...fields.map((f) => f.depth), 0),
  };
}

/**
 * Extract Value by Dot Notation Path
 *
 * Safely extracts values from nested objects using dot notation paths.
 * Handles array notation and provides null safety for missing paths.
 *
 * @param obj - Source object to extract from
 * @param path - Dot notation path (e.g., 'data.rates.USD' or 'items[0].name')
 * @returns Extracted value or null if path doesn't exist
 */
export function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return null;

  // Normalize array notation: data[0].name becomes data.0.name
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");

  return normalizedPath.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return null;

    // Handle numeric keys for array access
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      return Array.isArray(current) ? current[index] : null;
    }

    return current[key];
  }, obj);
}

/**
 * Format Values for Display
 *
 * Intelligently formats different data types for consistent display
 * in widgets. Handles numbers, currencies, booleans, and complex objects.
 *
 * @param value - Raw value to format
 * @returns Human-readable formatted string
 */
export function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) return "N/A";

  if (typeof value === "number") {
    // Format numbers with appropriate precision and locale-specific separators
    if (Number.isInteger(value)) {
      return value.toLocaleString(); // 1,234,567
    } else {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6, // Handle crypto decimals
      });
    }
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    // Truncate very long strings to prevent UI overflow
    if (value.length > 100) {
      return value.substring(0, 97) + "...";
    }
    return value;
  }

  if (Array.isArray(value)) {
    return `Array[${value.length}]`;
  }

  if (typeof value === "object") {
    return `Object{${Object.keys(value).length} keys}`;
  }

  return String(value);
}

/**
 * Filter Fields with Search and Options
 *
 * Provides flexible filtering of discovered fields based on search terms
 * and structural criteria. Used in the UI for field selection and display.
 *
 * @param fields - Array of field information to filter
 * @param searchQuery - Text search query for field paths and types
 * @param options - Additional filtering options
 * @returns Filtered array of field information
 */
export function filterFields(
  fields: FieldInfo[],
  searchQuery: string = "",
  options: {
    arraysOnly?: boolean; // Only show array fields
    primitiveOnly?: boolean; // Only show primitive values (string, number, boolean)
    maxDepth?: number; // Maximum nesting depth to include
  } = {}
): FieldInfo[] {
  let filtered = fields;

  // Text search filter - searches both path and type
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (field) =>
        field.path.toLowerCase().includes(query) ||
        field.type.toLowerCase().includes(query)
    );
  }

  // Show only array fields (useful for table displays)
  if (options.arraysOnly) {
    filtered = filtered.filter((field) => field.isArray);
  }

  // Show only primitive values (useful for card displays)
  if (options.primitiveOnly) {
    filtered = filtered.filter(
      (field) =>
        !field.isArray &&
        !field.isObject &&
        ["string", "number", "boolean"].includes(field.type)
    );
  }

  // Limit by nesting depth (prevents overly complex displays)
  if (typeof options.maxDepth === "number") {
    filtered = filtered.filter((field) => field.depth <= options.maxDepth!);
  }

  return filtered;
}

/**
 * Create API-Specific Data Adapters
 *
 * Returns specialized data transformation functions for different API providers.
 * These adapters normalize various API response formats into consistent structures
 * that widgets can display reliably.
 *
 * @param apiType - Type of API to create adapter for
 * @returns Object with adapter functions for the specified API
 */
export function createApiAdapter(apiType: string) {
  const adapters = {
    // Finnhub API adapters for financial data
    finnhub: {
      /**
       * Company Profile Adapter
       * Normalizes Finnhub company profile responses
       */
      companyProfile: (data: any) => ({
        name: data.name,
        symbol: data.ticker,
        country: data.country,
        currency: data.currency,
        marketCap: data.marketCapitalization,
        website: data.weburl,
      }),

      /**
       * Basic Financials Adapter
       * Extracts key financial metrics from Finnhub metrics endpoint
       */
      basicFinancials: (data: any) => ({
        "52WeekHigh": data.metric?.["52WeekHigh"],
        "52WeekLow": data.metric?.["52WeekLow"],
        beta: data.metric?.beta,
        currentRatio: data.series?.annual?.currentRatio?.[0]?.v,
        salesPerShare: data.series?.annual?.salesPerShare?.[0]?.v,
      }),
    },

    /**
     * Coinbase API Adapter
     * Normalizes Coinbase exchange rate responses
     */
    coinbase: (data: any) => ({
      currency: data.data?.currency,
      rates: data.data?.rates,
    }),

    /**
     * Generic Adapter
     * Pass-through for unknown APIs - returns data as-is
     */
    generic: (data: any) => data,
  };

  return adapters[apiType as keyof typeof adapters] || adapters.generic;
}
