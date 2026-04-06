import { useEffect } from 'react'

declare const chrome: any

export function App() {
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
        window.close()
      }
    })
  }, [])

  return (
    <div className="w-56 p-5 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
        <span className="text-lg">⚡</span>
      </div>
      <div>
        <p className="font-bold text-sm">Frictionless UX</p>
        <p className="text-xs text-muted-foreground mt-0.5">Opening side panel...</p>
      </div>
    </div>
  )
}
