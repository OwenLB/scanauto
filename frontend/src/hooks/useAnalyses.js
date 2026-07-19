import { useReducer, useCallback, useRef, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function blank(id, vehicule, analysisId = null) {
  return {
    id,
    status: 'loading',
    vehicule,
    r1: null, r2: null, r3: null, r4: null, r5: null,
    completedSteps: [],
    analysis_id: analysisId,
    error: null,
    r3Error: false,
    r4Error: false,
    vendor_reanalysis: null,
  }
}

function reducer(analyses, action) {
  switch (action.type) {
    case 'ADD':
      return [blank(action.id, action.vehicule, action.analysisId), ...analyses]
    case 'STEP':
      return analyses.map(a => a.id !== action.id ? a : {
        ...a,
        [action.key]: action.data,
        completedSteps: [...a.completedSteps, action.key],
      })
    case 'COMPLETE':
      return analyses.map(a => a.id !== action.id ? a : {
        ...a,
        status: 'complete',
        r3Error: !a.r3,
        r4Error: !a.r4,
        analysis_id: action.payload?.analysis_id ?? a.analysis_id,
      })
    case 'ERROR':
      return analyses.map(a => a.id !== action.id ? a : {
        ...a,
        status: 'error',
        error: action.error,
      })
    case 'REMOVE':
      return analyses.filter(a => a.id !== action.id)
    default:
      return analyses
  }
}

function parseSSEChunk(buffer) {
  const events = []
  const parts = buffer.split('\n\n')
  const remaining = parts.pop()
  for (const part of parts) {
    if (!part.trim() || part.startsWith(':')) continue
    const lines = part.split('\n')
    let eventType = 'message', data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim()
      else if (line.startsWith('data: ')) data = line.slice(6).trim()
    }
    if (data) events.push({ type: eventType, data })
  }
  return { events, remaining }
}

export default function useAnalyses() {
  const [analyses, dispatch] = useReducer(reducer, [])
  const controllers = useRef({})

  const startAnalysis = useCallback(async (vehiculeData, accessToken = null) => {
    const headers = { 'Content-Type': 'application/json' }
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

    // Étape 1 : créer le record DB → obtenir analysis_id immédiatement
    let analysisId = null
    try {
      const createRes = await fetch(`${API_URL}/api/analyses/create/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vehicule: vehiculeData }),
      })
      if (!createRes.ok) {
        const text = await createRes.text()
        throw new Error(`HTTP ${createRes.status}: ${text}`)
      }
      analysisId = (await createRes.json()).analysis_id
    } catch (e) {
      console.error('[useAnalyses] Create failed:', e)
      return null
    }

    // Étape 2 : enregistrer dans l'état local avec l'ID DB connu
    const id = makeId()
    const controller = new AbortController()
    controllers.current[id] = controller
    dispatch({ type: 'ADD', id, vehicule: vehiculeData, analysisId })

    // Étape 3 : lancer le stream SSE en arrière-plan
    void (async () => {
      try {
        const response = await fetch(`${API_URL}/api/analyze/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ vehicule: vehiculeData, analysis_id: analysisId }),
          signal: controller.signal,
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
              if (['r1', 'r2', 'r3', 'r4', 'r5'].includes(type)) {
                dispatch({ type: 'STEP', id, key: type, data: parsed })
              } else if (type === 'complete') {
                dispatch({ type: 'COMPLETE', id, payload: parsed })
              } else if (type === 'error' && parsed.fatal) {
                dispatch({ type: 'ERROR', id, error: parsed.error })
              }
            } catch (e) {
              console.error('SSE parse error:', e, data)
            }
          }
        }

        dispatch({ type: 'COMPLETE', id })
      } catch (err) {
        if (err.name === 'AbortError') return
        dispatch({ type: 'ERROR', id, error: err.message })
      } finally {
        delete controllers.current[id]
      }
    })()

    return analysisId
  }, [])

  const removeAnalysis = useCallback((id) => {
    if (controllers.current[id]) {
      controllers.current[id].abort()
      delete controllers.current[id]
    }
    dispatch({ type: 'REMOVE', id })
  }, [])

  // Abort tous les SSE actifs si le composant démonte (navigation, logout)
  useEffect(() => {
    return () => {
      Object.values(controllers.current).forEach(c => c.abort())
      controllers.current = {}
    }
  }, [])

  return { analyses, startAnalysis, removeAnalysis }
}
