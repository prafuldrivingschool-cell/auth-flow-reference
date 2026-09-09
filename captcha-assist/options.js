"use strict";
const defaults={enabled:true,showControls:true,dynamicDetection:true,zoom:true,grayscale:true,contrast:true,sharpen:true,invert:true,ocr:false,showConfidence:true,manualConfirmation:true};
const ids=Object.keys(defaults);const $=id=>document.getElementById(id);
async function load(){const s=await chrome.storage.sync.get(defaults);ids.forEach(id=>$(id).checked=!!s[id]);}
ids.forEach(id=>$(id).addEventListener("change",async()=>{await chrome.storage.sync.set({[id]:$(id).checked});$("saved").textContent="Saved.";setTimeout(()=>$("saved").textContent="",900);}));load();
