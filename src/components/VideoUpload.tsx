import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { extractVideoEvents } from '../lib/gemini'
import type { SessionContext, InterruptionEvent, HesitationEvent, ClickEvent } from '../types'

interface VideoResult {
  totalClicks: number
  interruptionEvents: InterruptionEvent[]
  hesitationEvents: HesitationEvent[]
  clickEvents: ClickEvent[]
  durationSeconds: number
}

interface Props {
  context: SessionContext
  apiKey: string
  onComplete: (data: VideoResult) => void
  onBack: () => void
}

export function VideoUpload({ context, apiKey, onComplete, onBack }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAnalyse() {
    if (!file) return
    setLoading(true)
    setError('')

    try {
      setProgress('Reading video file...')
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
      }
      const base64 = btoa(binary)

      setProgress('Sending to Gemini Vision — this may take 30–90s for longer videos...')
      const rawEvents = await extractVideoEvents(apiKey, base64, file.type || 'video/mp4')

      setProgress('Processing extracted events...')
      const clicks: ClickEvent[] = []
      const interruptions: InterruptionEvent[] = []
      const hesitations: HesitationEvent[] = []

      rawEvents.forEach((e, i) => {
        if (e.type === 'click') {
          clicks.push({ id: `c${i}`, timestamp: e.timestamp * 1000, target: e.description, frame: 'Video' })
        } else if (e.type === 'interruption') {
          interruptions.push({ id: `i${i}`, type: 'modal', timestamp: e.timestamp * 1000, frame: 'Video', description: e.description, confirmed: true })
        } else if (e.type === 'hesitation') {
          hesitations.push({ id: `h${i}`, timestamp: e.timestamp * 1000, pauseSeconds: 10, frame: 'Video', confirmed: true })
        } else if (e.type === 'context_switch') {
          interruptions.push({ id: `cs${i}`, type: 'new_tab', timestamp: e.timestamp * 1000, frame: 'Video', description: e.description, confirmed: true })
        }
      })

      onComplete({
        totalClicks: clicks.length,
        interruptionEvents: interruptions,
        hesitationEvents: hesitations,
        clickEvents: clicks,
        durationSeconds: Math.round(file.size / 125000), // rough estimate
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const isDragging = useRef(false)

  return (
    <div className="p-4 space-y-4">
      {/* Context header */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold">{context.jtbd}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{context.productLine} · {context.jtbdType} · {context.journeyType.replace(/_/g, ' ')}</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); isDragging.current = true }}
        onDrop={e => {
          e.preventDefault()
          isDragging.current = false
          const f = e.dataTransfer.files[0]
          if (f?.type.startsWith('video/')) setFile(f)
        }}
        className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/20 transition-all"
      >
        {file ? (
          <div className="space-y-1">
            <p className="text-2xl">🎬</p>
            <p className="text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1_000_000).toFixed(1)} MB · {file.type}</p>
            <p className="text-[10px] text-primary mt-1">Click to change file</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl">📹</p>
            <p className="text-sm font-semibold">Drop video here or click to browse</p>
            <p className="text-xs text-muted-foreground">MP4, WebM, MOV — up to 500 MB</p>
            <p className="text-[10px] text-muted-foreground">Gemini will extract clicks, modals, and hesitation events</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-3">{error}</div>
      )}
      {progress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          {progress}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">← Back</Button>
        <Button onClick={handleAnalyse} disabled={!file || loading} className="flex-1">
          {loading ? 'Analysing...' : '✦ Analyse with Gemini'}
        </Button>
      </div>
    </div>
  )
}
