import type { Report } from '../types'

const KEYS = {
  API_KEY: 'gemini_api_key',
  REPORTS: 'reports',
}

declare const chrome: any

export async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(KEYS.API_KEY)
  return result[KEYS.API_KEY] ?? ''
}

export async function setApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [KEYS.API_KEY]: key })
}

export async function getReports(): Promise<Report[]> {
  const result = await chrome.storage.local.get(KEYS.REPORTS)
  return result[KEYS.REPORTS] ?? []
}

export async function saveReport(report: Report): Promise<void> {
  const existing = await getReports()
  existing.unshift(report)
  await chrome.storage.local.set({ [KEYS.REPORTS]: existing.slice(0, 50) })
}
