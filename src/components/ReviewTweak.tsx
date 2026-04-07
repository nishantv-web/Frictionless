import { useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import type { SessionData, InterruptionEvent, HesitationEvent } from '../types'

interface Props {
  session: SessionData
  onGenerate: (updated: SessionData) => void
  onBack: () => void
}

function Spinner({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-sm hover:bg-accent transition-colors font-medium"
      >−</button>
      <span className="w-10 text-center text-sm font-mono font-semibold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-sm hover:bg-accent transition-colors font-medium"
      >+</button>
    </div>
  )
}

const INT_TYPE_LABELS: Record<string, string> = {
  modal: 'Modal', new_tab: 'New Tab', overlay: 'Overlay',
  guide: 'Guide', redirect: 'Redirect', manual: 'Manual',
}

export function ReviewTweak({ session, onGenerate, onBack }: Props) {
  const [totalClicks, setTotalClicks] = useState(session.totalClicks)
  const [setupClicks, setSetupClicks] = useState(session.setupClicks)
  const [setupTime, setSetupTime] = useState(session.setupTimeSeconds)
  const [dependencies, setDependencies] = useState(session.dependencies)
  const [interruptions, setInterruptions] = useState<InterruptionEvent[]>(session.interruptionEvents)
  const [hesitations, setHesitations] = useState<HesitationEvent[]>(session.hesitationEvents)
  const [notes, setNotes] = useState(session.notes)

  const confirmedInt = interruptions.filter(e => e.confirmed).length
  const confirmedHes = hesitations.filter(e => e.confirmed).length

  function toggleInterruption(id: string) {
    setInterruptions(prev => prev.map(e => e.id === id ? { ...e, confirmed: !e.confirmed } : e))
  }
  function removeInterruption(id: string) {
    setInterruptions(prev => prev.filter(e => e.id !== id))
  }
  function toggleHesitation(id: string) {
    setHesitations(prev => prev.map(e => e.id === id ? { ...e, confirmed: !e.confirmed } : e))
  }
  function addInterruption() {
    setInterruptions(prev => [...prev, {
      id: crypto.randomUUID(), type: 'manual', timestamp: Date.now(),
      frame: 'Manual', description: 'Manually added interruption', confirmed: true,
    }])
  }
  function addHesitation() {
    setHesitations(prev => [...prev, {
      id: crypto.randomUUID(), timestamp: Date.now(),
      pauseSeconds: 10, frame: 'Manual', confirmed: true,
    }])
  }

  function handleGenerate() {
    onGenerate({ ...session, totalClicks, setupClicks, setupTimeSeconds: setupTime, dependencies, interruptionEvents: interruptions, hesitationEvents: hesitations, notes })
  }

  return (
    <div className="flex flex-col gap-0 pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-semibold text-sm">Review & Tweak</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {session.mode === 'video'
            ? 'Enter what you observed while watching the video. Scores are computed from your inputs.'
            : 'Verify auto-detected data before generating your report.'}
        </p>
      </div>

      {/* Context pill */}
      <div className="mx-4 bg-muted/60 rounded-xl p-3 mb-3">
        <p className="text-xs font-semibold leading-tight">{session.context.jtbd}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground">{session.context.productLine}</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">{session.context.jtbdType}</Badge>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">{session.mode}</Badge>
        </div>
      </div>

      {/* Interactions */}
      <div className="px-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">Interactions</p>
        {[
          ['Total clicks', totalClicks, setTotalClicks] as const,
          ['Setup clicks', setupClicks, setSetupClicks] as const,
          ['Setup time (sec)', setupTime, setSetupTime] as const,
          ['External dependencies', dependencies, setDependencies] as const,
        ].map(([label, val, setter]) => (
          <div key={label} className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Spinner value={val} onChange={setter} />
          </div>
        ))}
      </div>

      <div className="mx-4 my-4"><Separator /></div>

      {/* Interruptions */}
      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">{confirmedInt} Interruption{confirmedInt !== 1 ? 's' : ''} confirmed</p>
          <button onClick={addInterruption} className="text-[10px] text-primary hover:underline font-medium">+ Add</button>
        </div>
        {interruptions.length === 0 && (
          <p className="text-[10px] text-muted-foreground py-2">No interruptions detected.</p>
        )}
        {interruptions.map(e => (
          <div key={e.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${e.confirmed ? 'bg-background border-border' : 'opacity-40 bg-muted border-transparent'}`}>
            <input
              type="checkbox"
              checked={e.confirmed}
              onChange={() => toggleInterruption(e.id)}
              className="mt-0.5 cursor-pointer accent-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-tight truncate">{e.description}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">{e.frame} · {INT_TYPE_LABELS[e.type] ?? e.type}</p>
            </div>
            <button onClick={() => removeInterruption(e.id)} className="text-muted-foreground hover:text-destructive text-[10px] shrink-0">✕</button>
          </div>
        ))}
      </div>

      <div className="mx-4 my-4"><Separator /></div>

      {/* Hesitation flags */}
      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">{confirmedHes} Hesitation Flag{confirmedHes !== 1 ? 's' : ''}</p>
          <button onClick={addHesitation} className="text-[10px] text-primary hover:underline font-medium">+ Add</button>
        </div>
        {hesitations.length === 0 && (
          <p className="text-[10px] text-muted-foreground py-2">No hesitation pauses detected.</p>
        )}
        {hesitations.map(e => (
          <div key={e.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${e.confirmed ? 'bg-background border-border' : 'opacity-40 bg-muted border-transparent'}`}>
            <input
              type="checkbox"
              checked={e.confirmed}
              onChange={() => toggleHesitation(e.id)}
              className="mt-0.5 cursor-pointer accent-primary"
            />
            <div>
              <p className="font-medium">{e.pauseSeconds}s pause</p>
              <p className="text-muted-foreground text-[10px]">{e.frame}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 my-4"><Separator /></div>

      {/* Notes */}
      <div className="px-4 space-y-1.5">
        <Label className="text-xs font-semibold">Notes for Gemini</Label>
        <Textarea
          placeholder="Context Gemini should know — e.g. 'had to search docs externally', 'no copy button on token field'..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="text-xs"
        />
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-2 p-3 bg-background/95 backdrop-blur border-t">
        <Button variant="outline" onClick={onBack} className="flex-1 text-sm h-10">← Back</Button>
        <Button onClick={handleGenerate} className="flex-1 text-sm h-10 font-semibold">Generate Report →</Button>
      </div>
    </div>
  )
}
