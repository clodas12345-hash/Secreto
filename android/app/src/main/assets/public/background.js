chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "save_pending_credentials") {
    // Save to local storage for the popup to read later
    chrome.storage.local.set({ pending_credentials: request.data });
  }
});
