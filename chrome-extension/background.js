// Open the side panel when the action icon is clicked
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

// Allow the floating button in content.js to open the side panel too
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'OPEN_POPUP' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {})
  }
})
