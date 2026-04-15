import { useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext'

export function useToast() {
  const { dispatch } = useApp()
  const timerRef = useRef(null)

  const showToast = useCallback((msg) => {
    clearTimeout(timerRef.current)
    dispatch({ type: 'SET_TOAST', payload: msg })
    timerRef.current = setTimeout(() => dispatch({ type: 'SET_TOAST', payload: null }), 2800)
  }, [dispatch])

  return { showToast }
}
