import { ButtonHTMLAttributes, ReactNode } from 'react'
import { useThemeStore } from '../../store/themeStore'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const { theme } = useThemeStore()
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: theme === 'dark' 
      ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90 focus:ring-[#16A34A]/50'
      : 'bg-[#10B981] text-white/90 hover:bg-[#16A34A] focus:ring-[#10B981]/50',
    secondary: theme === 'dark' 
      ? 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
      : 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-500',
    outline: theme === 'dark'
      ? 'border border-gray-600 text-gray-300 hover:bg-gray-700 focus:ring-gray-500'
      : 'border border-slate-300 text-slate-700 hover:bg-slate-100 focus:ring-slate-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
