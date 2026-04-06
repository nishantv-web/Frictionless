export type JTBDType = 'primary' | 'secondary'
export type JourneyType = 'first_time_use' | 'first_time_setup' | 'repeat_use'
export type AnalysisMode = 'live' | 'video'

export interface SessionContext {
  id: string
  productLine: string
  jtbd: string
  jtbdType: JTBDType
  journeyType: JourneyType
  benchmarkTarget?: number
  figmaUrl?: string
  createdAt: number
}

export interface InterruptionEvent {
  id: string
  type: 'modal' | 'new_tab' | 'overlay' | 'guide' | 'redirect' | 'manual'
  timestamp: number
  frame: string
  description: string
  confirmed: boolean
}

export interface HesitationEvent {
  id: string
  timestamp: number
  pauseSeconds: number
  frame: string
  confirmed: boolean
}

export interface ClickEvent {
  id: string
  timestamp: number
  target: string
  frame: string
}

export interface PerformanceMetrics {
  lcp?: number       // ms
  cls?: number       // score
  fid?: number       // ms
  inp?: number       // ms
  ttfb?: number      // ms
  domLoad?: number   // ms
  capturedAt: number
}

export interface SessionData {
  context: SessionContext
  mode: AnalysisMode
  totalClicks: number
  setupClicks: number
  setupTimeSeconds: number
  dependencies: number
  framePath: string[]
  interruptionEvents: InterruptionEvent[]
  hesitationEvents: HesitationEvent[]
  clickEvents: ClickEvent[]
  notes: string
  setupEndTimestamp?: number
  capturePerformance: boolean
  performanceMetrics?: PerformanceMetrics
}

export interface Scores {
  interactionScore: number
  interruptionScore: number
  usageFriction: number
  setupClickScore: number
  setupTimeScore: number
  setupDependencyScore: number
  setupFriction: number
  uxQualityLabel: string
  uxQualityColor: string
}

export interface GeminiInsights {
  topFrictionPoint: string
  quickWin: string
  recommendations: string[]
  overallAssessment: string
}

export interface Report {
  session: SessionData
  scores: Scores
  insights?: GeminiInsights   // optional — only present when API key provided
  generatedAt: number
}
