import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Send, Loader2, Bot, User, ChevronDown, Folder } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

function parseSSEChunks(buffer) {
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

function renderMarkdown(text) {
  const lines = text.split('\n')
  const result = []
  let listItems = []
  let key = 0

  const applyInline = str => {
    const parts = str.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        : part
    )
  }

  const flushList = () => {
    if (!listItems.length) return
    result.push(
      <ul key={key++} className="space-y-0.5 my-1.5 pl-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-1.5 items-start">
            <span className="mt-[5px] w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
            <span>{applyInline(item)}</span>
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList()
      result.push(<p key={key++} className="font-semibold text-text mt-2 mb-0.5">{applyInline(line.slice(3))}</p>)
    } else if (line.startsWith('# ')) {
      flushList()
      result.push(<p key={key++} className="font-bold text-text mt-2 mb-0.5">{applyInline(line.slice(2))}</p>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      result.push(<p key={key++} className="leading-relaxed">{applyInline(line)}</p>)
    }
  }
  flushList()
  return result
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? 'bg-[var(--accent)]' : 'bg-surface border border-border'
      }`}>
        {isUser
          ? <User size={11} className="text-[var(--accent-fg,white)]" />
          : <Bot size={11} className="text-text-secondary" />
        }
      </div>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
        isUser
          ? 'bg-[var(--accent)] text-[var(--accent-fg,white)] rounded-tr-sm leading-relaxed'
          : 'bg-surface border border-border text-text rounded-tl-sm space-y-0.5'
      }`}>
        {isUser ? msg.content : renderMarkdown(msg.content)}
        {msg.streaming && (
          <span className="inline-block w-[3px] h-3.5 bg-text-secondary ml-0.5 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  )
}

// ─── ScopeSelect ──────────────────────────────────────────────────────────

function ScopeSelect({ scope, groupId, groups, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const currentGroup = scope === 'group' ? groups.find(g => g.id === groupId) : null
  const label = scope === 'all' ? 'Toutes les analyses' : (currentGroup?.name ?? 'Groupe')

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text transition-colors max-w-[260px]"
      >
        {currentGroup
          ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: currentGroup.color }} />
          : <Folder size={10} className="shrink-0" />
        }
        <span className="truncate">{label}</span>
        <ChevronDown size={10} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[200px]">
          <button
            onClick={() => { onChange('all', null); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2 transition-colors ${
              scope === 'all' ? 'text-text' : 'text-text-secondary'
            }`}
          >
            <Folder size={13} className="shrink-0 text-text-tertiary" />
            Toutes les analyses
            {scope === 'all' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
          </button>
          {groups.length > 0 && <div className="h-px bg-border mx-2 my-1" />}
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => { onChange('group', g.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2 transition-colors ${
                scope === 'group' && groupId === g.id ? 'text-text' : 'text-text-secondary'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
              <span className="truncate flex-1">{g.name}</span>
              {scope === 'group' && groupId === g.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const SUGGESTIONS = {
  all: [
    'Quel est le meilleur rapport qualité/prix ?',
    'Y a-t-il des véhicules à éviter ?',
    'Compare les coûts de possession',
  ],
  group: [
    'Lequel recommandes-tu dans ce groupe ?',
    'Compare les prix par rapport au marché',
    'Quels sont les risques principaux ?',
  ],
}

export default function DashboardChatPanel({ open, onClose, initialScope = 'all', initialGroupId = null, groups = [], analysisCount }) {
  const { session } = useAuth()
  const [scope, setScope]     = useState(initialScope)
  const [groupId, setGroupId] = useState(initialGroupId)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError]       = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Sync scope when parent selection changes while panel is open
  useEffect(() => {
    setScope(initialScope)
    setGroupId(initialGroupId)
    setMessages([])
    setError(null)
  }, [initialScope, initialGroupId])

  // Reset messages on scope change
  const handleScopeChange = (newScope, newGroupId) => {
    setScope(newScope)
    setGroupId(newGroupId)
    setMessages([])
    setError(null)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [open])

  const sendMessage = async (text) => {
    const userMessage = (text ?? input).trim()
    if (!userMessage || isStreaming) return

    setInput('')
    setError(null)
    if (inputRef.current) inputRef.current.style.height = 'auto'

    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', streaming: true },
    ])
    setIsStreaming(true)

    try {
      const response = await fetch(`${API_URL}/api/chat/dashboard/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          scope,
          group_id: groupId || null,
          message: userMessage,
          history,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur serveur')
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { events, remaining } = parseSSEChunks(buffer)
        buffer = remaining

        for (const { type, data } of events) {
          if (type === 'chunk') {
            const { text } = JSON.parse(data)
            setMessages(prev => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.streaming) next[next.length - 1] = { ...last, content: last.content + text }
              return next
            })
          } else if (type === 'done') {
            setMessages(prev => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.streaming) next[next.length - 1] = { role: 'assistant', content: last.content }
              return next
            })
          } else if (type === 'error') {
            throw new Error(JSON.parse(data).error)
          }
        }
      }
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.filter(m => !m.streaming))
    } finally {
      setIsStreaming(false)
    }
  }

  if (!open) return null

  const suggestions = SUGGESTIONS[scope] ?? SUGGESTIONS.all
  const n = scope === 'group'
    ? (groups.find(g => g.id === groupId) ? (analysisCount ?? 0) : 0)
    : (analysisCount ?? 0)
  const countLabel = n ? `${n} véhicule${n > 1 ? 's' : ''}` : ''

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/25 z-[55]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border z-[60] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[52px] border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <MessageCircle size={16} className="text-[var(--accent)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Chat IA</p>
              <div className="flex items-center gap-1">
                <ScopeSelect
                  scope={scope}
                  groupId={groupId}
                  groups={groups}
                  onChange={handleScopeChange}
                />
                {countLabel && (
                  <span className="text-[11px] text-text-tertiary shrink-0">· {countLabel}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors shrink-0 ml-2"
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-10 space-y-3">
              <Bot size={28} className="text-text-tertiary mx-auto" />
              <p className="text-sm text-text-secondary">
                {scope === 'group'
                  ? 'Posez vos questions sur les véhicules de ce groupe'
                  : 'Comparez et décidez parmi toutes vos analyses'
                }
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-surface hover:text-text transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {error && (
            <p className="text-xs text-red-500 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                  e.target.style.height = 'auto'
                }
              }}
              placeholder="Posez une question… (Shift+Entrée pour saut de ligne)"
              disabled={isStreaming}
              className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg,white)] disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
            >
              {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
