"use strict";
const D={enabled:true,showControls:true,ocr:false};
const $=id=>document.getElementById(id);
async function load(){const s=await chrome.storage.sync.get(D);$("enabled").checked=s.enabled;$("enhance").checked=true;$("ocr").checked=s.ocr;$("controls").checked=s.showControls;try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(tab?.id){chrome.tabs.sendMessage(tab.id,{type:"status"},r=>{if(chrome.runtime.lastError){$("status").textContent="Open a normal webpage and reload it after installing the extension.";}else $("status").textContent=r?.count?`CAPTCHA detected (${r.count})`:`No CAPTCHA detected`;});}}catch{}}
$("scan").addEventListener("click",async()=>{try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});chrome.tabs.sendMessage(tab.id,{type:"scan"},r=>{$("status").textContent=chrome.runtime.lastError?"This page cannot be scanned by an extension content script.":`${r?.count||0} CAPTCHA candidate(s) detected`;});}catch{$("status").textContent="Could not scan this page.";}});
$("settings").addEventListener("click",()=>chrome.runtime.openOptionsPage());
$("enabled").addEventListener("change",e=>chrome.storage.sync.set({enabled:e.target.checked}));$("ocr").addEventListener("change",e=>chrome.storage.sync.set({ocr:e.target.checked}));$("controls").addEventListener("change",e=>chrome.storage.sync.set({showControls:e.target.checked}));
load();
