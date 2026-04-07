import { useState, useEffect } from 'react'
import { SessionSetup } from './SessionSetup'
import { VideoUpload } from './VideoUpload'
import { ReviewTweak } from './ReviewTweak'
import { Report } from './Report'
import { SessionHistory } from './SessionHistory'
import { computeScores } from '../lib/scorer'
import { getInsights } from '../lib/gemini'
import { getApiKey, setApiKey as persistApiKey, getReports, saveReport } from '../lib/storage'
import type { SessionContext, SessionData, Report as ReportType, InterruptionEvent, HesitationEvent, ClickEvent } from '../types'

declare const chrome: any

type Screen = 'setup' | 'recording' | 'video_upload' | 'review' | 'generating' | 'report' | 'history'

interface LivePayload {
  sessionId: string
  clickCount: number
  interruptionCount: number
  elapsedSeconds: number
  setupEndClickCount: number | null
  events: Array<{ type: string; timestamp: number; frame: string; description: string }>
}

interface VideoResult {
  totalClicks: number
  interruptionEvents: InterruptionEvent[]
  hesitationEvents: HesitationEvent[]
  clickEvents: ClickEvent[]
  durationSeconds: number
}

export function SidePanelApp() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [apiKey, setApiKey] = useState('')
  const [context, setContext] = useState<SessionContext | null>(null)
  const [mode, setMode] = useState<'live' | 'video'>('live')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [report, setReport] = useState<ReportType | null>(null)
  const [reports, setReports] = useState<ReportType[]>([])
  const [error, setError] = useState('')
  const [capturePerformance, setCapturePerformance] = useState(false)

  useEffect(() => {
    getApiKey().then(setApiKey)
    getReports().then(setReports)
  }, [])

  useEffect(() => {
    if (apiKey) persistApiKey(apiKey)
  }, [apiKey])

  // Listen for messages from content script relayed by background
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === 'RECORDING_STOPPED' && screen === 'recording' && context) {
        const data = buildSessionDataFromLive(msg.payload as LivePayload, context)
        setSessionData(data)
        setScreen('review')
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [screen, context])

  function buildSessionDataFromLive(payload: LivePayload, ctx: SessionContext): SessionData {
    const interruptions: InterruptionEvent[] = payload.events
      .filter(e => e.type === 'interruption')
      .map((e, i) => ({
        id: `i${i}`, type: 'modal' as const, timestamp: e.timestamp,
        frame: e.frame, description: e.description, confirmed: true,
      }))
    const hesitations: HesitationEvent[] = payload.events
      .filter(e => e.type === 'hesitation')
      .map((e, i) => ({
        id: `h${i}`, timestamp: e.timestamp, frame: e.frame,
        pauseSeconds: parseInt(e.description) || 10, confirmed: true,
      }))
    const clicks: ClickEvent[] = payload.events
      .filter(e => e.type === 'click')
      .map((e, i) => ({ id: `c${i}`, timestamp: e.timestamp, target: e.description, frame: e.frame }))
    const frames = [...new Set(payload.events.filter(e => e.type === 'frame_change').map(e => e.frame))]
    const setupEnd = payload.setupEndClickCount ?? Math.round(payload.clickCount * 0.6)

    return {
      context: ctx, mode: 'live',
      totalClicks: payload.clickCount,
      setupClicks: setupEnd,
      setupTimeSeconds: Math.round(payload.elapsedSeconds * 0.6),
      dependencies: 0,
      framePath: frames,
      interruptionEvents: interruptions,
      hesitationEvents: hesitations,
      clickEvents: clicks,
      notes: '',
      capturePerformance,
      performanceMetrics: (payload as any).performanceMetrics ?? undefined,
    }
  }

  async function handleStart(ctx: SessionContext, selectedMode: 'live' | 'video', opts: { capturePerformance: boolean }) {
    setContext(ctx)
    setMode(selectedMode)
    setCapturePerformance(opts.capturePerformance)
    if (selectedMode === 'live') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING', sessionId: ctx.id, capturePerformance: opts.capturePerformance })
      }
      setScreen('recording')
    } else {
      setScreen('video_upload')
    }
  }

  function handleVideoComplete(data: VideoResult) {
    if (!context) return
    setSessionData({
      context, mode: 'video',
      totalClicks: data.totalClicks,
      setupClicks: Math.round(data.totalClicks * 0.5),
      setupTimeSeconds: data.durationSeconds,
      dependencies: 0,
      framePath: [],
      interruptionEvents: data.interruptionEvents,
      hesitationEvents: data.hesitationEvents,
      clickEvents: data.clickEvents,
      notes: '',
      capturePerformance: false,
    })
    setScreen('review')
  }

  async function handleGenerate(updated: SessionData) {
    setScreen('generating')
    setError('')
    try {
      const scores = computeScores(updated)
      const insights = apiKey.trim() ? await getInsights(apiKey, updated, scores) : undefined
      const newReport: ReportType = { session: updated, scores, insights, generatedAt: Date.now() }
      await saveReport(newReport)
      setReport(newReport)
      setReports(await getReports())
      setScreen('report')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
      setScreen('review')
    }
  }

  async function stopLiveRecording() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => setScreen('setup')} className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight">Frictionless</span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">UX</span>
        </button>
        <div className="flex gap-1">
          {screen !== 'setup' && (
            <button
              onClick={() => setScreen('setup')}
              className="text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium text-muted-foreground hover:bg-accent"
            >
              + New
            </button>
          )}
          <button
            onClick={() => setScreen('history')}
            className={`text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium ${
              screen === 'history' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            History
          </button>

        </div>
      </div>

      {/* Screens */}
      {screen === 'setup' && (
        <SessionSetup onStart={handleStart} apiKey={apiKey} onApiKeyChange={setApiKey} />
      )}

      {screen === 'recording' && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 p-8 text-center">
          <div className="relative">
            <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-5 h-5 bg-red-400 rounded-full animate-ping opacity-40" />
          </div>
          <div className="space-y-2">
            <p className="font-bold text-sm">Recording</p>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Interact with the Figma prototype. The floating overlay shows live stats.
            </p>
            <p className="text-xs text-muted-foreground">
              Press <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">Stop</span> in the overlay when done.
            </p>
          </div>
          <button
            onClick={stopLiveRecording}
            className="mt-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Stop Recording
          </button>
        </div>
      )}

      {screen === 'video_upload' && context && (
        <VideoUpload context={context} apiKey={apiKey} onComplete={handleVideoComplete} onBack={() => setScreen('setup')} />
      )}

      {screen === 'review' && sessionData && (
        <ReviewTweak session={sessionData} onGenerate={handleGenerate} onBack={() => setScreen('setup')} />
      )}

      {screen === 'generating' && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 p-8 text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1.5">
            <p className="font-bold text-sm">Generating Report</p>
            <p className="text-xs text-muted-foreground">
            {apiKey.trim() ? 'Computing scores and consulting Gemini...' : 'Computing scores...'}
          </p>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3 max-w-[260px]">{error}</p>}
        </div>
      )}

      {screen === 'report' && report && (
        <Report report={report} onNewSession={() => setScreen('setup')} />
      )}

      {screen === 'history' && (
        <SessionHistory reports={reports} onSelect={r => { setReport(r); setScreen('report') }} />
      )}
    </div>
  )
}
