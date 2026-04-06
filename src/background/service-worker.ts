declare const chrome: any

chrome.runtime.onInstalled.addListener(() => {
  console.log('Frictionless UX Evaluator installed')
})

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      if (tabs[0]?.id) chrome.sidePanel.open({ tabId: tabs[0].id })
    })
    sendResponse({ ok: true })
  }
  // Relay content script events to side panel
  if (message.type === 'RECORDING_STOPPED' || message.type === 'SETUP_END_MARKED' || message.type === 'SESSION_UPDATE') {
    chrome.runtime.sendMessage(message).catch(() => {})
    sendResponse({ ok: true })
  }
  return true
})
