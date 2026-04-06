import type { Report } from '../types'

interface Props {
  reports: Report[]
  onSelect: (r: Report) => void
}

const QUALITY_STYLES: Record<string, string> = {
  green:  'bg-green-100 text-green-800',
  blue:   'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  red:    'bg-red-100 text-red-800',
}

export function SessionHistory({ reports, onSelect }: Props) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
        <p className="text-3xl">📋</p>
        <p className="text-sm font-semibold">No sessions yet</p>
        <p className="text-xs text-muted-foreground">Start a new session to begin evaluating UX flows.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{reports.length} session{reports.length !== 1 ? 's' : ''}</p>
      {reports.map(r => (
        <button
          key={r.session.context.id}
          onClick={() => onSelect(r)}
          className="w-full text-left p-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-all space-y-2 group"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold leading-tight flex-1 group-hover:text-primary transition-colors">{r.session.context.jtbd}</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${QUALITY_STYLES[r.scores.uxQualityColor] ?? QUALITY_STYLES.red}`}>
              {r.scores.uxQualityLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{r.session.context.productLine}</span>
            <span className="text-border">·</span>
            <span>Usage <strong className="text-foreground">{r.scores.usageFriction}</strong>/5</span>
            <span>Setup <strong className="text-foreground">{r.scores.setupFriction}</strong>/5</span>
          </div>
          <p className="text-[9px] text-muted-foreground">
            {new Date(r.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{r.session.context.jtbdType}{' · '}{r.session.mode}
          </p>
        </button>
      ))}
    </div>
  )
}
