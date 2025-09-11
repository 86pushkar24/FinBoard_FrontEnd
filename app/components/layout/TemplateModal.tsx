'use client'

import React from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useWidgetStore } from '../../store/widgetStore'

interface TemplateModalProps {
  onClose: () => void
}

export default function TemplateModal({ onClose }: TemplateModalProps) {
  const { addWidget } = useWidgetStore()

  const applyCryptoTemplate = () => {
    const coins = [
      { sym: 'BTC', name: 'BTC Price', pair: 'BINANCE:BTCUSDT' },
      { sym: 'ETH', name: 'ETH Price', pair: 'BINANCE:ETHUSDT' },
      { sym: 'SOL', name: 'SOL Price', pair: 'BINANCE:SOLUSDT' },
    ]
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'YOUR_API_KEY'
    coins.forEach(({ sym, name, pair }) => {
      addWidget({
        name: `${name}`,
        apiUrl: `https://finnhub.io/api/v1/quote?symbol=${pair}&token=${apiKey}`,
        refreshInterval: 30,
        displayMode: 'stock-chart',
        selectedFields: ['c'],
        apiProvider: 'finnhub',
        apiType: 'crypto-quote',
        symbol: sym,
      })
    })
    onClose()
  }

  const applyStocksTemplate = () => {
    const stocks = [
      { sym: 'AAPL', name: 'Apple Inc.' },
      { sym: 'MSFT', name: 'Microsoft' },
      { sym: 'AMZN', name: 'Amazon' },
    ]
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'YOUR_API_KEY'
    stocks.forEach(({ sym, name }) => {
      addWidget({
        name: `${name}`,
        apiUrl: `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`,
        refreshInterval: 45,
        displayMode: 'stock-chart',
        selectedFields: ['c'],
        apiProvider: 'finnhub',
        apiType: 'quote',
        symbol: sym,
      })
    })
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title="Choose a Template">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          <div className="border border-slate-600 rounded-lg p-4 flex flex-col h-full">
            <h4 className="text-white font-medium mb-2">Crypto (BTC, ETH, SOL)</h4>
            <p className="text-gray-400 text-sm mb-4">Adds 3 crypto charts using Finnhub quotes.</p>
            <Button onClick={applyCryptoTemplate} className="w-full mt-auto">Use Crypto Template</Button>
          </div>
          <div className="border border-slate-600 rounded-lg p-4 flex flex-col h-full">
            <h4 className="text-white font-medium mb-2">US Stocks (AAPL, MSFT, AMZN)</h4>
            <p className="text-gray-400 text-sm mb-4">Adds 3 stock charts using Finnhub quotes.</p>
            <Button onClick={applyStocksTemplate} className="w-full mt-auto">Use Stocks Template</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}


