import { useReducer, useCallback } from 'react'
import { MOCK_VEHICULE, MOCK_R1, MOCK_R2, MOCK_R3, MOCK_R4, MOCK_R5 } from '../mockData.js'

const API_URL = import.meta.env.VITE_API_URL || ''

const initialState = {
  status: 'idle',
  vehicule: null,
  r1: null,
  r2: null,
  r3: null,
  r4: null,
  r5: null,
  error: null,
  completedSteps: [],
  analysis_id: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...initialState, status: 'loading', vehicule: action.payload }
    case 'R1':
      return { ...state, r1: action.payload, completedSteps: [...state.completedSteps, 'r1'] }
    case 'R2':
      return { ...state, r2: action.payload, completedSteps: [...state.completedSteps, 'r2'] }
    case 'R3':
      return { ...state, r3: action.payload, completedSteps: [...state.completedSteps, 'r3'] }
    case 'R4':
      return { ...state, r4: action.payload, completedSteps: [...state.completedSteps, 'r4'] }
    case 'R5':
      return { ...state, r5: action.payload, completedSteps: [...state.completedSteps, 'r5'] }
    case 'COMPLETE':
      return {
        ...state,
        status: 'complete',
        r3Error: !state.r3,
        r4Error: !state.r4,
        analysis_id: action.payload?.analysis_id || null,
      }
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

function parseSSEChunk(buffer) {
  const events = []
  const parts = buffer.split('\n\n')
  const remaining = parts.pop()
  for (const part of parts) {
    if (!part.trim() || part.startsWith(':')) continue
    const lines = part.split('\n')
    let eventType = 'message'
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim()
      else if (line.startsWith('data: ')) data = line.slice(6).trim()
    }
    if (data) events.push({ type: eventType, data })
  }
  return { events, remaining }
}

export default function useAnalysis() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const startAnalysis = useCallback(async (vehiculeData, accessToken = null) => {
    dispatch({ type: 'START', payload: vehiculeData })

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      // Strip images before sending to backend — display-only, not needed for analysis
      const { images: _images, ...vehiculeForApi } = vehiculeData

      const response = await fetch(`${API_URL}/api/analyze/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vehicule: vehiculeForApi }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const { events, remaining } = parseSSEChunk(buffer)
        buffer = remaining

        for (const { type, data } of events) {
          try {
            const parsed = JSON.parse(data)
            if (type === 'r1') dispatch({ type: 'R1', payload: parsed })
            else if (type === 'r2') dispatch({ type: 'R2', payload: parsed })
            else if (type === 'r3') dispatch({ type: 'R3', payload: parsed })
            else if (type === 'r4') dispatch({ type: 'R4', payload: parsed })
            else if (type === 'r5') dispatch({ type: 'R5', payload: parsed })
            else if (type === 'complete') dispatch({ type: 'COMPLETE', payload: parsed })
            else if (type === 'error' && parsed.fatal) {
              dispatch({ type: 'ERROR', payload: parsed.error })
            }
          } catch (e) {
            console.error('SSE parse error:', e, data)
          }
        }
      }

      dispatch({ type: 'COMPLETE' })
    } catch (err) {
      dispatch({ type: 'ERROR', payload: err.message })
    }
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const loadMock = useCallback(() => {
    dispatch({ type: 'START', payload: MOCK_VEHICULE })
    dispatch({ type: 'R1', payload: MOCK_R1 })
    dispatch({ type: 'R2', payload: MOCK_R2 })
    dispatch({ type: 'R5', payload: MOCK_R5 })
    dispatch({ type: 'R3', payload: MOCK_R3 })
    dispatch({ type: 'R4', payload: MOCK_R4 })
    dispatch({ type: 'COMPLETE', payload: {} })
  }, [])

  return { state, startAnalysis, reset, loadMock }
}
