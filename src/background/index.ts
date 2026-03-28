chrome.runtime.onInstalled.addListener(() => {
  console.log("Warden installed.");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  const tabUrl = tab.url;

  chrome.storage.local.get("session", (data) => {
    if (!data.session?.active) return;

    const allowed: string[] = data.session.allowedHosts ?? [];
    const url = new URL(tabUrl);

    if (url.protocol === "chrome-extension:" || url.protocol === "chrome:") return;

    if (!allowed.includes(url.hostname)) {
      const blockedPage = chrome.runtime.getURL("blocked/index.html");
      chrome.tabs.update(tabId, {
        url: `${blockedPage}?url=${encodeURIComponent(tabUrl)}`,
      });
    }
  });
});
