import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('et-theme')
    // Only enable dark if user explicitly chose it; default is light
    if (stored === null) {
      document.documentElement.classList.remove('dark')
      return false
    }
    return stored === 'dark'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('et-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => setDark((d) => !d)
  return { dark, toggle }
}
