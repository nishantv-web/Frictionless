import type { SessionData, Scores, GeminiInsights } from '../types'

const GEMINI_FLASH = 'gemini-1.5-flash-latest'
const GEMINI_PRO = 'gemini-1.5-pro-latest'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function buildInsightPrompt(data: SessionData, scores: Scores): string {
  return `You are a UX expert evaluating a product flow using the Frictionless UX Framework (0-5 scale, higher = less friction).

CONTEXT:
- Product: ${data.context.productLine}
- JTBD: ${data.context.jtbd}
- JTBD Type: ${data.context.jtbdType} (primary = stricter thresholds)
- Journey Type: ${data.context.journeyType.replace(/_/g, ' ')}
- Evaluator Notes: ${data.notes || 'None'}

SCORES:
- Interaction Score: ${scores.interactionScore}/5 (${data.totalClicks} total clicks)
- Interruption Score: ${scores.interruptionScore}/5 (${data.interruptionEvents.filter(e => e.confirmed).length} interruptions)
- Usage Friction: ${scores.usageFriction}/5 — ${scores.uxQualityLabel}
- Setup Friction: ${scores.setupFriction}/5 (${data.setupClicks} setup clicks, ${Math.round(data.setupTimeSeconds / 60)}m ${data.setupTimeSeconds % 60}s, ${data.dependencies} external dependencies)

SESSION DETAILS:
- Frame path: ${data.framePath.length ? data.framePath.join(' → ') : 'Not recorded'}
- Interruptions: ${JSON.stringify(data.interruptionEvents.filter(e => e.confirmed).map(e => ({ type: e.type, frame: e.frame, description: e.description })))}
- Hesitation events: ${JSON.stringify(data.hesitationEvents.filter(e => e.confirmed).map(e => ({ frame: e.frame, pauseSeconds: e.pauseSeconds })))}

Respond ONLY with valid JSON matching this exact shape:
{
  "topFrictionPoint": "<one sentence identifying the #1 friction moment with specific frame/step reference>",
  "quickWin": "<one concrete, specific action to improve the score the most>",
  "recommendations": ["<specific rec 1>", "<specific rec 2>", "<specific rec 3>"],
  "overallAssessment": "<2-3 sentence assessment grounded in the JTBD context and scores>"
}`
}

export async function getInsights(
  apiKey: string,
  data: SessionData,
  scores: Scores
): Promise<GeminiInsights> {
  const res = await fetch(
    `${BASE_URL}/models/${GEMINI_FLASH}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildInsightPrompt(data, scores) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text)
}

export async function extractVideoEvents(
  apiKey: string,
  videoBase64: string,
  mimeType: string
): Promise<Array<{ type: string; timestamp: number; description: string }>> {
  const prompt = `Analyze this screen recording of a user interacting with a software product.
Extract every meaningful interaction event. Return ONLY a valid JSON array:
[{"type":"click|interruption|hesitation|context_switch","timestamp":<seconds>,"description":"<what happened>"}]

Rules:
- "click": any deliberate tap/click on a UI element (button, link, input)
- "interruption": modal, dialog, overlay, or guide that appeared without user clicking
- "hesitation": pause > 5s where user is idle or confused (estimate duration)
- "context_switch": new tab/window opened, or app/page switch
Sort by timestamp ascending.`

  const res = await fetch(
    `${BASE_URL}/models/${GEMINI_PRO}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: videoBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini video error ${res.status}: ${err}`)
  }
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  return JSON.parse(text)
}
