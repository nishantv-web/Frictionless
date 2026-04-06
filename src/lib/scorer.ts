import config from '../scoring-config.json'
import type { SessionData, Scores } from '../types'

function lookupScore(
  value: number,
  table: Array<{ score: number; min: number; max: number }>
): number {
  for (const row of table) {
    if (value >= row.min && value <= row.max) return row.score
  }
  return 0
}

function getQualityLabel(score: number) {
  for (const q of config.uxQualityLabels) {
    if (score >= q.min && score <= q.max) return { label: q.label, color: q.color }
  }
  return { label: 'Not Usable', color: 'red' }
}

export function computeScores(data: SessionData): Scores {
  const { jtbdType } = data.context
  const confirmedInterruptions = data.interruptionEvents.filter(e => e.confirmed).length

  const interactionScore = lookupScore(data.totalClicks, config.interactionScores[jtbdType])
  const interruptionScore = lookupScore(confirmedInterruptions, config.interruptionScores)
  const usageFriction =
    interactionScore * config.weights.usageFriction.interactions +
    interruptionScore * config.weights.usageFriction.interruptions

  const setupClickScore = lookupScore(data.setupClicks, config.setupClickScores[jtbdType])
  const setupTimeScore = lookupScore(data.setupTimeSeconds, config.setupTimeScores)
  const setupDependencyScore = lookupScore(data.dependencies, config.setupDependencyScores)
  const setupFriction =
    setupClickScore * config.weights.setupFriction.clicks +
    setupTimeScore * config.weights.setupFriction.time +
    setupDependencyScore * config.weights.setupFriction.dependencies

  const { label: uxQualityLabel, color: uxQualityColor } = getQualityLabel(usageFriction)

  return {
    interactionScore,
    interruptionScore,
    usageFriction: Math.round(usageFriction * 10) / 10,
    setupClickScore,
    setupTimeScore,
    setupDependencyScore,
    setupFriction: Math.round(setupFriction * 10) / 10,
    uxQualityLabel,
    uxQualityColor,
  }
}
