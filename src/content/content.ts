// Injected into figma.com/proto/* — vanilla TS, no React
declare const chrome: any

let isRecording = false
let clickCount = 0
let interruptionCount = 0
let startTime: number | null = null
let lastClickTime: number | null = null
let currentFrame = 'Start'
let sessionId: string | null = null
let setupEndClickCount: number | null = null
let shouldCapturePerformance = false

interface PerformanceCapture {
  lcp?: number; cls?: number; fid?: number; inp?: number; ttfb?: number; domLoad?: number; capturedAt: number
}
let perfMetrics: PerformanceCapture = { capturedAt: 0 }
const perfObservers: PerformanceObserver[] = []

function startPerformanceCapture() {
  perfMetrics = { capturedAt: Date.now() }

  // TTFB + DOM load from Navigation Timing
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (navEntry) {
    perfMetrics.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart)
    perfMetrics.domLoad = Math.round(navEntry.domContentLoadedEventEnd - navEntry.startTime)
  }

  // LCP
  try {
    const lcpObs = new PerformanceObserver(list => {
      const entries = list.getEntries()
      if (entries.length) perfMetrics.lcp = Math.round(entries[entries.length - 1].startTime)
    })
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true })
    perfObservers.push(lcpObs)
  } catch (_) {}

  // CLS
  try {
    let clsTotal = 0
    const clsObs = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) clsTotal += (entry as any).value
      }
      perfMetrics.cls = parseFloat(clsTotal.toFixed(4))
    })
    clsObs.observe({ type: 'layout-shift', buffered: true })
    perfObservers.push(clsObs)
  } catch (_) {}

  // FID
  try {
    const fidObs = new PerformanceObserver(list => {
      const entry = list.getEntries()[0] as any
      if (entry) perfMetrics.fid = Math.round(entry.processingStart - entry.startTime)
    })
    fidObs.observe({ type: 'first-input', buffered: true })
    perfObservers.push(fidObs)
  } catch (_) {}

  // INP
  try {
    const inpObs = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const duration = (entry as any).duration ?? 0
        if (!perfMetrics.inp || duration > perfMetrics.inp) perfMetrics.inp = Math.round(duration)
      }
    })
    inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any)
    perfObservers.push(inpObs)
  } catch (_) {}
}

function stopPerformanceCapture() {
  perfObservers.forEach(o => { try { o.disconnect() } catch (_) {} })
  perfObservers.length = 0
  perfMetrics.capturedAt = Date.now()
}

interface ContentEvent {
  type: 'click' | 'interruption' | 'hesitation' | 'frame_change'
  timestamp: number
  frame: string
  description: string
}

const events: ContentEvent[] = []

// Detect modals / overlays being injected into DOM
const observer = new MutationObserver((mutations) => {
  if (!isRecording) return
  for (const m of mutations) {
    for (const node of Array.from(m.addedNodes)) {
      if (!(node instanceof HTMLElement)) continue
      const role = node.getAttribute('role')
      const isModal = role === 'dialog' || node.getAttribute('aria-modal') === 'true'
      const isOverlay = node.classList.contains('modal') || node.classList.contains('overlay')
        || node.classList.contains('popup') || node.classList.contains('tooltip')
      if (isModal || isOverlay) {
        interruptionCount++
        events.push({
          type: 'interruption',
          timestamp: Date.now(),
          frame: currentFrame,
          description: `${role ?? node.tagName} overlay: ${(node.textContent ?? '').slice(0, 60)}`,
        })
        broadcastState()
      }
    }
  }
})
observer.observe(document.body, { childList: true, subtree: true })

// Click tracking with hesitation detection
document.addEventListener('pointerdown', (e) => {
  if (!isRecording) return
  const now = Date.now()
  if (lastClickTime && now - lastClickTime > 5000) {
    events.push({
      type: 'hesitation',
      timestamp: lastClickTime,
      frame: currentFrame,
      description: `${Math.round((now - lastClickTime) / 1000)}s pause`,
    })
  }
  lastClickTime = now
  clickCount++
  const target = e.target as HTMLElement
  events.push({
    type: 'click',
    timestamp: now,
    frame: currentFrame,
    description: target.getAttribute('aria-label') || target.getAttribute('title') || target.tagName,
  })
  updateOverlayStats()
}, true)

// New tab opened = context switch
chrome.runtime.onMessage.addListener((msg: any) => {
  if (!isRecording) return
  if (msg.type === 'NEW_TAB_OPENED') {
    interruptionCount++
    events.push({ type: 'interruption', timestamp: Date.now(), frame: currentFrame, description: 'New tab opened (context switch)' })
    broadcastState()
  }
})

// Frame navigation detection
const origPushState = history.pushState.bind(history)
history.pushState = function (...args: Parameters<typeof history.pushState>) {
  origPushState(...args)
  handleUrlChange()
}
window.addEventListener('popstate', handleUrlChange)

function handleUrlChange() {
  if (!isRecording) return
  const newFrame = window.location.hash || window.location.pathname.split('/').pop() || 'Frame'
  if (newFrame !== currentFrame) {
    currentFrame = newFrame
    events.push({ type: 'frame_change', timestamp: Date.now(), frame: newFrame, description: `Navigated to ${newFrame}` })
    broadcastState()
  }
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: 'SESSION_UPDATE',
    payload: { sessionId, clickCount, interruptionCount, elapsedSeconds: startTime ? Math.round((Date.now() - startTime) / 1000) : 0, events },
  }).catch(() => {})
}

// Listen for commands from side panel
chrome.runtime.onMessage.addListener((msg: any) => {
  if (msg.type === 'START_RECORDING') {
    isRecording = true
    clickCount = 0
    interruptionCount = 0
    startTime = Date.now()
    lastClickTime = null
    setupEndClickCount = null
    events.length = 0
    sessionId = msg.sessionId
    currentFrame = 'Start'
    shouldCapturePerformance = !!msg.capturePerformance
    if (shouldCapturePerformance) startPerformanceCapture()
    injectOverlay()
  }
  if (msg.type === 'STOP_RECORDING') {
    isRecording = false
    if (shouldCapturePerformance) stopPerformanceCapture()
    removeOverlay()
    chrome.runtime.sendMessage({
      type: 'RECORDING_STOPPED',
      payload: {
        sessionId, clickCount, interruptionCount, events,
        elapsedSeconds: startTime ? Math.round((Date.now() - startTime) / 1000) : 0,
        setupEndClickCount,
        performanceMetrics: shouldCapturePerformance ? perfMetrics : undefined,
      },
    }).catch(() => {})
  }
  if (msg.type === 'MARK_SETUP_END') {
    setupEndClickCount = clickCount
    chrome.runtime.sendMessage({ type: 'SETUP_END_MARKED', payload: { clickCount, timestamp: Date.now() } }).catch(() => {})
  }
})

// ── Floating overlay ──────────────────────────────────────────────────────────

function updateOverlayStats() {
  const el = document.getElementById('fl-stats')
  if (el && startTime) {
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const s = (elapsed % 60).toString().padStart(2, '0')
    el.textContent = `${clickCount} clicks · ${interruptionCount} int · ${m}:${s}`
  }
}

function injectOverlay() {
  if (document.getElementById('fl-overlay')) return

  const style = document.createElement('style')
  style.textContent = `
    @keyframes fl-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    #fl-overlay { position:fixed;bottom:24px;right:24px;z-index:2147483647;
      background:rgba(15,23,42,0.94);color:#fff;padding:8px 14px;border-radius:999px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;
      display:flex;align-items:center;gap:10px;backdrop-filter:blur(10px);
      box-shadow:0 4px 24px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);
      user-select:none;cursor:default; }
    #fl-overlay button { background:rgba(255,255,255,0.12);border:none;color:#fff;
      padding:3px 10px;border-radius:999px;font-size:11px;cursor:pointer;font-family:inherit; }
    #fl-overlay button:hover { background:rgba(255,255,255,0.2); }
    #fl-stop { background:#ef4444 !important;font-weight:600; }
    #fl-stop:hover { background:#dc2626 !important; }
    #fl-dot { width:8px;height:8px;background:#ef4444;border-radius:50%;
      animation:fl-pulse 1.2s ease-in-out infinite;flex-shrink:0; }
  `
  document.head.appendChild(style)

  const el = document.createElement('div')
  el.id = 'fl-overlay'
  el.innerHTML = `
    <div id="fl-dot"></div>
    <span id="fl-stats">0 clicks · 0 int · 00:00</span>
    <button id="fl-setup-end">Mark Setup End</button>
    <button id="fl-stop">Stop</button>
  `
  document.body.appendChild(el)

  document.getElementById('fl-stop')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
  })
  document.getElementById('fl-setup-end')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MARK_SETUP_END' })
    const btn = document.getElementById('fl-setup-end')
    if (btn) { btn.textContent = '✓ Marked'; btn.style.background = 'rgba(34,197,94,0.35)' }
  })

  setInterval(updateOverlayStats, 1000)
}

function removeOverlay() {
  document.getElementById('fl-overlay')?.remove()
}
