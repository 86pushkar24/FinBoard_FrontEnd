# Financial Data Dashboard

![FinBoard Dashboard Screenshot](./public/Screenshot%202025-09-11%20224726.png)

A modern, customizable financial data dashboard built with Next.js that allows you to create and manage widgets displaying real-time financial data from various APIs including Finnhub, Coinbase, and custom endpoints.

## Features

### 🎯 Core Functionality
- **Drag & Drop Widgets**: Intuitive interface to reorder dashboard layout with visual feedback and touch support
- **Real-time Data**: Auto-refreshing widgets with configurable intervals (2s minimum, recommended 30-300s)
- **Multiple Display Modes**: Cards, tables, charts, and advanced table views with seamless switching
- **Smart Caching**: Multi-layer caching with TTL-based expiration and intelligent rate limiting
- **Responsive Design**: Adaptive grid layout (1 col mobile, 2 tablet, 3 desktop) with persistent storage
- **Widget Management**: In-place editing, bulk operations, and export/import functionality

### 📊 Supported Data Sources
- **Finnhub API**: 
  - Stock quotes with real-time price updates and change indicators
  - Company profiles including market cap, industry, and country information
  - Financial metrics (P/E ratios, beta values, 52-week highs/lows, trading volumes)
  - Multi-stock queries for batch data fetching with error isolation
- **Coinbase API**: 
  - Cryptocurrency exchange rates for BTC, ETH, SOL, and other major currencies
  - Real-time rate conversion between different currency pairs
  - Smart formatting and automatic data type detection
- **Custom APIs**: 
  - Universal support for any REST API endpoint with JSON responses
  - Automatic field detection and intelligent data structure analysis
  - Support for nested objects, arrays, and complex data formats

### 🎨 Display Options
- **Card View**: 
  - Clean, compact display of 3-4 most important metrics
  - Smart field selection with automatic importance scoring
  - Intelligent formatting for numbers, currencies, and percentages
- **Table View**: 
  - Enhanced table with modern typography and spacing
  - Multi-column layout with data transformation
  - Built-in pagination and export-ready formatting
- **Chart View**: 
  - Interactive charts (line, area, bar) with Chart.js integration
  - Real-time updates with sample data fallback
  - Responsive design that adapts to widget size

### ⚡ Performance Features
- **Smart Caching System**: 
  - Browser memory cache with configurable TTL (30s quotes, 5min metrics, 1hr profiles)
  - Automatic cleanup every 10 minutes to prevent memory leaks
  - Cache hit/miss statistics for performance monitoring
- **Rate Limiting & API Management**: 
  - Domain-specific limits (60/min Finnhub, 10/min Coinbase, 30/min default)
  - Real-time request tracking with graceful degradation
  - Automatic retry with exponential backoff
- **Optimized Rendering**: 
  - Zustand state management with minimal re-renders
  - Lazy loading of chart components and debounced updates
  - Memory-efficient cleanup of unused components
- **Data Processing**: 
  - Intelligent field detection with recursive JSON analysis
  - Type inference for numbers, strings, dates, and nested objects
  - Built-in validation with error recovery mechanisms

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Finnhub API key (optional, for stock data)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fin/frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
# Create .env.local file
echo "NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key_here" > .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating Your First Widget

1. **Click the "+" button** to open the widget creation modal
2. **Choose your data source**:
   - Select from pre-configured Finnhub endpoints (Company Profile, Basic Financials, Multi-Stock Metrics)
   - Enter a custom API URL that returns JSON data
3. **Configure display settings**:
   - Set widget name and refresh interval (2s minimum)
   - Choose display mode (card, table, chart, etc.)
   - Select specific data fields or use auto-detection
4. **Save and enjoy** your new widget!

### Widget Management

- **Drag & Drop**: Click and drag widgets to rearrange your dashboard
- **Edit Settings**: Click the edit icon to modify widget name and refresh interval
- **Export/Import**: Use navbar options to backup and restore widget configurations
- **Manual Refresh**: Click refresh icon to force immediate data update
- **Remove Widgets**: Click the X icon to delete unwanted widgets

### Supported API Formats

The dashboard handles various JSON response formats:

```json
// Simple object
{ "price": 150.25, "change": 2.5 }

// Nested data
{ "data": { "rates": { "USD": "45000.00" } } }

// Array format
[{ "symbol": "AAPL", "price": 150.25 }]

// Multi-stock format
{ "stocks": [{ "symbol": "AAPL", "price": 150.25 }] }
```

## API Integration

### Finnhub API Setup
1. Get a free API key from [Finnhub](https://finnhub.io/)
2. Add it to your `.env.local` file:
```bash
NEXT_PUBLIC_FINNHUB_API_KEY=your_api_key_here
```

### Custom API Integration
Connect any REST API that returns JSON data. The dashboard automatically detects fields and handles various data structures.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Drag & Drop**: @dnd-kit
- **Charts**: Chart.js with react-chartjs-2
- **Tables**: @tanstack/react-table
- **Icons**: React Icons

## Project Structure

```
frontend/
├── app/                     # Next.js App Router directory
│   ├── favicon.ico          # Site favicon
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main dashboard page
├── components/              # React components
│   ├── layout/              # Layout and navigation components
│   │   ├── Navbar.tsx       # Main navigation bar with theme toggle
│   │   └── TemplateModal.tsx # Template selection modal
│   ├── ui/                  # Reusable UI components
│   │   ├── AddWidget.tsx    # Add widget button component
│   │   ├── AddWidgetModal.tsx # Widget creation modal
│   │   ├── Button.tsx       # Reusable button component
│   │   ├── DataWidget.tsx   # Main widget container with data fetching
│   │   ├── DraggableWidget.tsx # Drag & drop wrapper for widgets
│   │   ├── Modal.tsx        # Base modal component
│   │   ├── ModernTable.tsx  # Advanced table component
│   │   ├── StockChart.tsx   # Financial chart component
│   │   ├── ThemeToggle.tsx  # Dark/light mode toggle
│   │   └── WidgetCard.tsx   # Widget card wrapper
│   └── ThemeProvider.tsx    # Theme context provider
├── store/                   # Zustand state management
│   ├── themeStore.ts        # Theme state management
│   └── widgetStore.ts       # Widget state management
├── utils/                   # Utility functions and helpers
│   ├── apiCache.ts          # API caching and rate limiting
│   └── dataMapper.ts        # Data processing and field mapping
├── public/                  # Static assets
│   ├── file.svg             # File icon
│   ├── globe.svg            # Globe icon
│   ├── next.svg             # Next.js logo
│   ├── vercel.svg           # Vercel logo
│   ├── window.svg           # Window icon
│   └── Screenshot*.png      # Dashboard screenshots
├── eslint.config.mjs        # ESLint configuration
├── next-env.d.ts            # Next.js TypeScript declarations
├── next.config.ts           # Next.js configuration
├── package.json             # Project dependencies and scripts
├── postcss.config.mjs       # PostCSS configuration
├── README.md                # Project documentation
└── tsconfig.json            # TypeScript configuration
```

## Development

### Available Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Implementation Details
- **State Management**: Zustand stores for widgets and themes with localStorage persistence
- **Caching System**: TTL-based cache with rate limiting and automatic cleanup
- **Data Processing**: Intelligent field detection and type inference
- **Drag & Drop**: DnD Kit with visual feedback and touch support
- **Performance**: Optimized rendering with minimal re-renders and lazy loading

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository or contact the development team.
