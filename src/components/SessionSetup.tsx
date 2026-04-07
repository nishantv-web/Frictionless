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
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [capturePerformance, setCapturePerformance] = useState(false)
  const [touched, setTouched] = useState({ productLine: false, jtbd: false })

  const missingProduct = !productLine.trim()
  const missingJtbd = !jtbd.trim()
  const canStart = !missingProduct && !missingJtbd

  function handleStart() {
    if (!canStart) {
      setTouched({ productLine: true, jtbd: true })
      return
    }
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

  return (
    <div className="flex flex-col gap-5 p-4 pb-6">

      {/* Mode selector — Live is primary, Video is secondary */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('live')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
            mode === 'live'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'border-border text-muted-foreground hover:bg-accent bg-background'
          }`}
        >
          ▶ Live Prototype
        </button>
        <button
          onClick={() => setMode('video')}
          className={`flex-[0.75] py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
            mode === 'video'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'border-border text-muted-foreground hover:bg-accent bg-background'
          }`}
        >
          🎬 Upload Video
        </button>
      </div>

      {/* Product + JTBD — primary fields, left-aligned labels */}
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Product Line</p>
          <Input
            id="product"
            placeholder="e.g. BrowserStack Automate"
            value={productLine}
            onChange={e => setProductLine(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, productLine: true }))}
            className={touched.productLine && missingProduct ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {touched.productLine && missingProduct && (
            <p className="text-[10px] text-destructive">Required to continue</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Job To Be Done (JTBD)</p>
          <Input
            id="jtbd"
            placeholder="e.g. Run my first automated test"
            value={jtbd}
            onChange={e => setJtbd(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, jtbd: true }))}
            className={touched.jtbd && missingJtbd ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {touched.jtbd && missingJtbd && (
            <p className="text-[10px] text-destructive">Required to continue</p>
          )}
        </div>
      </div>

      {/* JTBD Type — cards with subtle background on unselected */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">JTBD Type</p>
        <div className="flex gap-2">
          {([
            ['primary', 'Primary', 'Core / frequent'] as const,
            ['secondary', 'Secondary', 'Less frequent'] as const,
          ]).map(([val, label, desc]) => (
            <button
              key={val}
              onClick={() => setJtbdType(val)}
              className={`flex-1 py-2 px-3 rounded-lg text-left border transition-all ${
                jtbdType === val
                  ? 'bg-primary text-white border-primary'
                  : 'border-border bg-muted/40 text-foreground hover:bg-muted/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{label}</span>
                {jtbdType === val && <span className="text-[10px] opacity-80">✓</span>}
              </div>
              <div className={`text-[10px] mt-0.5 ${jtbdType === val ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Journey Type — compact radio rows */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Journey Type</p>
        <div className="flex flex-col gap-1.5">
          {([
            ['first_time_use', 'First-time use', 'Journey to the AHA moment'],
            ['first_time_setup', 'First-time setup', 'Onboarding & integration'],
            ['repeat_use', 'Repeat use', 'Regular feature usage'],
          ] as const).map(([val, label, desc]) => (
            <button
              key={val}
              onClick={() => setJourneyType(val)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                journeyType === val
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/20 hover:bg-muted/50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                journeyType === val ? 'border-primary' : 'border-muted-foreground/40'
              }`}>
                {journeyType === val && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className={`text-xs font-semibold leading-tight ${journeyType === val ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Performance toggle */}
      <button
        onClick={() => setCapturePerformance(v => !v)}
        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
          capturePerformance ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-accent/30'
        }`}
      >
        <div className={`w-9 h-5 rounded-full flex items-center transition-colors shrink-0 ${capturePerformance ? 'bg-primary' : 'bg-muted'}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${capturePerformance ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <div>
          <p className="text-xs font-semibold leading-tight">Capture Performance Metrics</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Web Vitals (LCP, CLS, FID, INP, TTFB) — Live mode only, no Lighthouse.
          </p>
        </div>
      </button>

      {/* AI Config — collapsed by default to keep main flow clean */}
      <div className="border border-dashed border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowApiConfig(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:bg-accent/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙</span>
            <span className="font-medium text-foreground">AI Configuration</span>
            {apiKey.trim()
              ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Key set</span>
              : <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-medium">Optional</span>
            }
          </span>
          <span>{showApiConfig ? '▲' : '▼'}</span>
        </button>

        {showApiConfig && (
          <div className="px-3 pb-3 space-y-1.5 border-t border-border/60">
            <Label htmlFor="apikey" className="text-xs font-medium block pt-2">Gemini API Key</Label>
            <div className="relative">
              <Input
                id="apikey"
                type={showKey ? 'text' : 'password'}
                placeholder="AIza... (leave blank to skip AI insights)"
                value={apiKey}
                onChange={e => onApiKeyChange(e.target.value)}
                className="pr-16 text-xs"
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
                ? '✓ AI narrative will be included in the report.'
                : 'Without a key you still get full friction scores — just no AI narrative.'}
            </p>
          </div>
        )}
      </div>

      {/* CTA — always clickable, shows validation on click if fields missing */}
      <Button onClick={handleStart} className="w-full h-10 font-semibold">
        {mode === 'live' ? '▶ Start Recording' : '🎬 Upload & Analyse'}
      </Button>
    </div>
  )
}
