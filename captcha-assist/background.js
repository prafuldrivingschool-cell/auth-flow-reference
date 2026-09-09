"use strict";

chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    enabled: true,
    showControls: true,
    dynamicDetection: true,
    zoom: true,
    grayscale: true,
    contrast: true,
    sharpen: true,
    invert: true,
    ocr: false,
    showConfidence: true,
    manualConfirmation: true
  };
  const current = await chrome.storage.sync.get(defaults);
  await chrome.storage.sync.set(current);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "open-options") {
    chrome.runtime.openOptionsPage();
    sendResponse({ok: true});
  }
  return true;
});
