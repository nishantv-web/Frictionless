import { useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import type { Report as ReportType } from '../types'

interface Props {
  report: ReportType
  onNewSession: () => void
}

const QUALITY_STYLES: Record<string, { bg: string; text: string; bar: string }> = {
  green:  { bg: 'bg-green-50 border-green-200',  text: 'text-green-700',  bar: '[&>div]:bg-green-500'  },
  blue:   { bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-700',   bar: '[&>div]:bg-blue-500'   },
  yellow: { bg: 'bg-yellow-50 border-yellow-200',text: 'text-yellow-700', bar: '[&>div]:bg-yellow-500' },
  orange: { bg: 'bg-orange-50 border-orange-200',text: 'text-orange-700', bar: '[&>div]:bg-orange-500' },
  red:    { bg: 'bg-red-50 border-red-200',      text: 'text-red-700',    bar: '[&>div]:bg-red-500'    },
}

function ScoreRow({ label, score, colorKey }: { label: string; score: number; colorKey: string }) {
  const style = QUALITY_STYLES[colorKey] ?? QUALITY_STYLES.red
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold tabular-nums">{score}<span className="text-muted-foreground font-normal">/5</span></span>
      </div>
      <Progress value={score} max={5} className={style.bar} />
    </div>
  )
}

export function Report({ report, onNewSession }: Props) {
  const { session, scores, insights } = report
  const [copiedMd, setCopiedMd] = useState(false)
  const colorKey = scores.uxQualityColor
  const style = QUALITY_STYLES[colorKey] ?? QUALITY_STYLES.red

  function copyMarkdown() {
    const md = `| Product Flow | Interaction Score | Interruption Score | Weighted Avg | Usage Friction |
|---|---|---|---|---|
| ${session.context.jtbd} | ${scores.interactionScore} | ${scores.interruptionScore} | ${scores.usageFriction} | ${scores.usageFriction} |`
    navigator.clipboard.writeText(md)
    setCopiedMd(true)
    setTimeout(() => setCopiedMd(false), 2000)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frictionless-${session.context.jtbd.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm leading-tight">{session.context.jtbd}</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{session.context.productLine}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${style.bg} ${style.text}`}>
            {scores.uxQualityLabel}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[9px] h-5">{session.context.jtbdType}</Badge>
          <Badge variant="outline" className="text-[9px] h-5">{session.context.journeyType.replace(/_/g, ' ')}</Badge>
          <Badge variant="outline" className="text-[9px] h-5">{session.mode === 'video' ? '🎬 video' : '▶ live'}</Badge>
        </div>
      </div>

      {/* Score card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Friction Scores</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">Usage Friction</p>
              <span className={`text-xs font-bold ${style.text}`}>{scores.usageFriction}/5</span>
            </div>
            <ScoreRow label="Interactions" score={scores.interactionScore} colorKey={colorKey} />
            <ScoreRow label="Interruptions" score={scores.interruptionScore} colorKey={colorKey} />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">Setup Friction</p>
              <span className="text-xs font-bold text-foreground">{scores.setupFriction}/5</span>
            </div>
            <ScoreRow label="Setup clicks" score={scores.setupClickScore} colorKey="blue" />
            <ScoreRow label="Setup time" score={scores.setupTimeScore} colorKey="blue" />
            <ScoreRow label="Dependencies" score={scores.setupDependencyScore} colorKey="blue" />
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Clicks', session.totalClicks],
          ['Setup', `${session.setupClicks}c`],
          ['Interruptions', session.interruptionEvents.filter(e => e.confirmed).length],
          ['Time', `${Math.floor(session.setupTimeSeconds / 60)}m`],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-muted/50 rounded-xl p-2 text-center">
            <p className="text-base font-bold">{val}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Frame path */}
      {session.framePath.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Frame Path</p>
          <div className="flex flex-wrap items-center gap-1">
            {session.framePath.map((f, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground text-[10px]">›</span>}
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md font-medium">{f}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gemini insights — only when AI key was provided */}
      {insights ? (
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <span className="text-primary">✦</span> Gemini Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Overall</p>
              <p className="text-xs leading-relaxed">{insights.overallAssessment}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Top Friction Point</p>
              <p className="text-xs text-destructive font-medium leading-relaxed">{insights.topFrictionPoint}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Quick Win</p>
              <p className="text-xs text-green-700 font-medium leading-relaxed">{insights.quickWin}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Recommendations</p>
              <ul className="space-y-2">
                {insights.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="text-primary font-bold shrink-0 w-4">{i + 1}.</span>
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="px-4 py-5 text-center space-y-1">
            <p className="text-xs text-muted-foreground font-medium">No AI Insights</p>
            <p className="text-[10px] text-muted-foreground">Add a Gemini API key in Setup to get narrative analysis and recommendations.</p>
          </CardContent>
        </Card>
      )}

      {/* Performance metrics — only when captured */}
      {session.performanceMetrics && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Web Vitals</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {([
                ['LCP', session.performanceMetrics.lcp, 'ms'],
                ['CLS', session.performanceMetrics.cls, ''],
                ['FID', session.performanceMetrics.fid, 'ms'],
                ['INP', session.performanceMetrics.inp, 'ms'],
                ['TTFB', session.performanceMetrics.ttfb, 'ms'],
                ['DOM', session.performanceMetrics.domLoad, 'ms'],
              ] as [string, number | undefined, string][]).filter(([, v]) => v !== undefined).map(([label, val, unit]) => (
                <div key={label} className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-xs font-bold tabular-nums">{typeof val === 'number' && unit === '' ? val.toFixed(3) : Math.round(val as number)}{unit}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={copyMarkdown} className="flex-1 text-[11px]">
          {copiedMd ? '✓ Copied!' : '📋 PM Template'}
        </Button>
        <Button variant="outline" size="sm" onClick={exportJson} className="flex-1 text-[11px]">⬇ JSON</Button>
        <Button size="sm" onClick={onNewSession} className="flex-1 text-[11px]">+ New</Button>
      </div>
    </div>
  )
}
