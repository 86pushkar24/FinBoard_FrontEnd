/**
 * Template Modal Component
 *
 * Provides quick-start templates for setting up common dashboard configurations.
 * Allows users to instantly populate their dashboard with pre-configured widgets
 * for popular financial instruments and data sources.
 *
 * Key Features:
 * - Pre-configured crypto dashboard (BTC, ETH, SOL)
 * - Pre-configured stocks dashboard (AAPL, MSFT, AMZN)
 * - One-click dashboard setup for new users
 * - Automatic API configuration with environment variables
 * - Responsive grid layout for template options
 */

"use client";

import React from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useWidgetStore } from "../../store/widgetStore";

/**
 * Component Props Interface
 */
interface TemplateModalProps {
  onClose: () => void; // Callback to close the modal
}

/**
 * Template Modal Component
 *
 * @param onClose - Function to call when modal should be closed
 * @returns JSX element containing template selection interface
 */
export default function TemplateModal({ onClose }: TemplateModalProps) {
  const { addWidget } = useWidgetStore();

  /**
   * Apply Cryptocurrency Template
   *
   * Creates widgets for popular cryptocurrencies (BTC, ETH, SOL) using
   * Binance trading pairs via Finnhub API. Each widget is configured
   * with stock-chart display mode for price visualization.
   */
  const applyCryptoTemplate = () => {
    const coins = [
      { sym: "BTC", name: "BTC Price", pair: "BINANCE:BTCUSDT" },
      { sym: "ETH", name: "ETH Price", pair: "BINANCE:ETHUSDT" },
      { sym: "SOL", name: "SOL Price", pair: "BINANCE:SOLUSDT" },
    ];
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "YOUR_API_KEY";

    // Create a widget for each cryptocurrency
    coins.forEach(({ sym, name, pair }) => {
      addWidget({
        name: `${name}`,
        apiUrl: `https://finnhub.io/api/v1/quote?symbol=${pair}&token=${apiKey}`,
        refreshInterval: 30, // 30-second refresh for crypto volatility
        displayMode: "stock-chart", // Chart view for price trends
        selectedFields: ["c"], // Current price field
        apiProvider: "finnhub",
        apiType: "crypto-quote",
        symbol: sym,
      });
    });
    onClose();
  };

  /**
   * Apply US Stocks Template
   *
   * Creates widgets for major US technology stocks (AAPL, MSFT, AMZN)
   * using direct stock symbols via Finnhub API. Configured with slightly
   * longer refresh intervals suitable for stock market volatility.
   */
  const applyStocksTemplate = () => {
    const stocks = [
      { sym: "AAPL", name: "Apple Inc." },
      { sym: "MSFT", name: "Microsoft" },
      { sym: "AMZN", name: "Amazon" },
    ];
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "YOUR_API_KEY";

    // Create a widget for each stock
    stocks.forEach(({ sym, name }) => {
      addWidget({
        name: `${name}`,
        apiUrl: `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`,
        refreshInterval: 45, // 45-second refresh for stocks
        displayMode: "stock-chart", // Chart view for price trends
        selectedFields: ["c"], // Current price field
        apiProvider: "finnhub",
        apiType: "quote",
        symbol: sym,
      });
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Choose a Template">
      <div className="space-y-4">
        {/* Template Grid - responsive layout for template options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          {/* Cryptocurrency Template Card */}
          <div className="border border-slate-600 rounded-lg p-4 flex flex-col h-full">
            <h4 className="text-white font-medium mb-2">
              Crypto (BTC, ETH, SOL)
            </h4>
            <p className="text-gray-400 text-sm mb-4">
              Adds 3 crypto charts using Finnhub quotes with 30-second refresh
              intervals.
            </p>
            <Button onClick={applyCryptoTemplate} className="w-full mt-auto">
              Use Crypto Template
            </Button>
          </div>

          {/* US Stocks Template Card */}
          <div className="border border-slate-600 rounded-lg p-4 flex flex-col h-full">
            <h4 className="text-white font-medium mb-2">
              US Stocks (AAPL, MSFT, AMZN)
            </h4>
            <p className="text-gray-400 text-sm mb-4">
              Adds 3 stock charts using Finnhub quotes with 45-second refresh
              intervals.
            </p>
            <Button onClick={applyStocksTemplate} className="w-full mt-auto">
              Use Stocks Template
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
