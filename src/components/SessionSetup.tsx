import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import type { SessionContext, JTBDType, JourneyType } from '../types'

interface Props {
  onStart: (ctx: SessionContext, mode: 'live' | 'video', opts: { capturePerformance: boolean }) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function SessionSetup({ onStart, apiKey, onApiKeyChange }: Props) {
  const [productLine, setProductLine] = useState('')
  const [jtbd, setJtbd] = useState('')
  const [jtbdType, setJtbdType] = useState<JTBDType>('primary')
  const [journeyType, setJourneyType] = useState<JourneyType>('first_time_use')
  const [mode, setMode] = useState<'live' | 'video'>('live')
  const [showKey, setShowKey] = useState(false)
  const [capturePerformance, setCapturePerformance] = useState(false)

  // Gemini key is now optional — session can start without it
  const canStart = productLine.trim() && jtbd.trim()

  function handleStart() {
    if (!canStart) return
    onStart(
      {
        id: crypto.randomUUID(),
        productLine: productLine.trim(),
        jtbd: jtbd.trim(),
        jtbdType,
        journeyType,
        createdAt: Date.now(),
      },
      mode,
      { capturePerformance }
    )
  }

  const modeBtn = (m: 'live' | 'video', icon: string, label: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
        mode === m
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'border-border text-muted-foreground hover:bg-accent bg-background'
      }`}
    >
      <span>{icon}</span>{label}
    </button>
  )

  const typeBtn = (val: JTBDType, label: string, desc: string) => (
    <button
      key={val}
      onClick={() => setJtbdType(val)}
      className={`flex-1 py-2 px-3 rounded-lg text-left border transition-all ${
        jtbdType === val ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-accent'
      }`}
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className={`text-[10px] mt-0.5 ${jtbdType === val ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{desc}</div>
    </button>
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Mode */}
      <div className="flex gap-2">
        {modeBtn('live', '▶', 'Live Prototype')}
        {modeBtn('video', '🎬', 'Upload Video')}
      </div>

      {/* API Key — optional */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="apikey">Gemini API Key</Label>
          <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">Optional</span>
        </div>
        <div className="relative">
          <Input
            id="apikey"
            type={showKey ? 'text' : 'password'}
            placeholder="AIza... (leave blank to skip AI insights)"
            value={apiKey}
            onChange={e => onApiKeyChange(e.target.value)}
            className="pr-16"
          />
          <button
            onClick={() => setShowKey(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {apiKey.trim()
            ? '✓ AI insights will be included in the report.'
            : 'Without a key, you still get full friction scores — just no AI narrative.'}
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* Product + JTBD */}
      <div className="space-y-1.5">
        <Label>Product Line</Label>
        <Input placeholder="e.g. BrowserStack Automate" value={productLine} onChange={e => setProductLine(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Job To Be Done (JTBD)</Label>
        <Input placeholder="e.g. Run my first automated test" value={jtbd} onChange={e => setJtbd(e.target.value)} />
      </div>

      {/* JTBD Type */}
      <div className="space-y-1.5">
        <Label>JTBD Type</Label>
        <div className="flex gap-2">
          {typeBtn('primary', 'Primary', 'Core / frequent tasks')}
          {typeBtn('secondary', 'Secondary', 'Less frequent tasks')}
        </div>
      </div>

      {/* Journey Type */}
      <div className="space-y-1.5">
        <Label>Journey Type</Label>
        <div className="flex flex-col gap-1.5">
          {([
            ['first_time_use', 'First-time use', 'Journey to the AHA moment'],
            ['first_time_setup', 'First-time setup', 'Onboarding & integration'],
            ['repeat_use', 'Repeat use', 'Regular feature usage'],
          ] as const).map(([val, label, desc]) => (
            <button
              key={val}
              onClick={() => setJourneyType(val)}
              className={`py-2 px-3 rounded-lg text-left border transition-all ${
                journeyType === val ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <div className="text-xs font-semibold">{label}</div>
              <div className={`text-[10px] ${journeyType === val ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Performance metrics — optional toggle */}
      <div
        onClick={() => setCapturePerformance(v => !v)}
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
          capturePerformance ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-accent/30'
        }`}
      >
        <div className={`mt-0.5 w-9 h-5 rounded-full flex items-center transition-colors shrink-0 ${capturePerformance ? 'bg-primary' : 'bg-muted'}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${capturePerformance ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <div>
          <p className="text-xs font-semibold leading-tight">Capture Performance Metrics</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Reads Web Vitals (LCP, CLS, FID, INP, TTFB) from the browser — no Lighthouse needed. Only works in Live mode on real pages.
          </p>
        </div>
      </div>

      <Button onClick={handleStart} disabled={!canStart} className="w-full h-10">
        {mode === 'live' ? '▶ Start Recording' : '🎬 Upload & Analyse'}
      </Button>
      {!canStart && (
        <p className="text-[10px] text-center text-muted-foreground">Fill product line + JTBD to continue</p>
      )}
    </div>
  )
}
