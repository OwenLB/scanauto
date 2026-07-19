import { useState, useCallback } from 'react'

let counter = 0

export default function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message) => {
    const id = ++counter
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return { toasts, addToast }
}
