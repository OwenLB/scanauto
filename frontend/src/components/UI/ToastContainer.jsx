import { CheckCircle2 } from 'lucide-react'

const DURATION = 3500

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 left-4 z-[100] flex flex-col gap-2 no-print pointer-events-none">
      {toasts.map(({ id, message }) => (
        <div
          key={id}
          className="relative overflow-hidden flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-sm text-text animate-fade-in pointer-events-auto"
        >
          <CheckCircle2 size={15} className="text-green-500 shrink-0" />
          <span>{message}</span>
          {/* Progress bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-border"
          >
            <div
              className="h-full bg-text origin-left"
              style={{ animation: `toast-progress ${DURATION}ms linear forwards` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
