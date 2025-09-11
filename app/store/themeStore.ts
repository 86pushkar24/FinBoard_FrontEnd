import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark theme
      
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: newTheme })
        // Apply theme to document
        applyTheme(newTheme)
      },
      
      setTheme: (theme: Theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    {
      name: 'theme-store',
      onRehydrateStorage: () => (state) => {
        // Apply theme when store is rehydrated
        if (state?.theme) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

// Apply theme to document
function applyTheme(theme: Theme) {
  if (typeof window !== 'undefined') {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.remove('light')
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
  }
}

// Initialize theme on app start
if (typeof window !== 'undefined') {
  // Check if user has set theme preference, otherwise use dark as default
  const store = useThemeStore.getState()
  applyTheme(store.theme)
  
  // Also listen for storage changes to sync across tabs
  //FIX FOR THE GLITCH WHEN REFRESH PAGE
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme-store') {
      const newState = JSON.parse(e.newValue || '{}')
      if (newState?.state?.theme) {
        applyTheme(newState.state.theme)
      }
    }
  })
}
