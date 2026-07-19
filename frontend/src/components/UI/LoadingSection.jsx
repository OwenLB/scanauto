export default function LoadingSection({ height = 'h-24', label = null }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-5 mb-4 ${height} flex flex-col justify-center`}>
      {label && <p className="text-text-tertiary text-xs text-center mb-3">{label}</p>}
      <div className="space-y-2">
        <div className="skeleton h-2.5 w-3/4 rounded" />
        <div className="skeleton h-2.5 w-1/2 rounded" />
        <div className="skeleton h-2.5 w-2/3 rounded" />
      </div>
    </div>
  )
}
