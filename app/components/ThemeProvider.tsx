'use client'

import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore()

  useEffect(() => {
    // Ensure theme is applied on mount and when theme changes
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.remove('light')
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
  }, [theme])

  return <>{children}</>
}
