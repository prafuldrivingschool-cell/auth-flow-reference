"use strict";

const DEFAULTS = {enabled:true,showControls:true,dynamicDetection:true,zoom:true,grayscale:true,contrast:true,sharpen:true,invert:true,ocr:false,showConfidence:true,manualConfirmation:true};
const state = {settings:{...DEFAULTS}, candidates:[], processed:new WeakSet(), overlay:null, active:null, scanTimer:null};

const esc = s => String(s || "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const text = el => (el?.textContent || el?.getAttribute?.("aria-label") || el?.getAttribute?.("title") || "").trim().toLowerCase();
const hint = el => [el?.id, el?.className, el?.getAttribute?.("placeholder"), el?.getAttribute?.("name"), el?.getAttribute?.("alt"), el?.getAttribute?.("aria-label")].filter(v => typeof v === "string").join(" ").toLowerCase();

function scoreInput(input) {
  if (!(input instanceof HTMLInputElement)) return 0;
  const h = hint(input);
  let score = 0;
  if (/captcha|enter captcha|verification code|security code/.test(h)) score += 5;
  const label = input.labels?.[0];
  if (label && /captcha|verification code|security code/.test(text(label))) score += 4;
  const parent = input.closest("form,fieldset,div,section,td,tr,li") || input.parentElement;
  if (parent && /captcha|verification code|security code/.test(text(parent))) score += 2;
  return score;
}

function nearestImage(input) {
  const root = input.closest("form,fieldset,section,article,td,tr,li,div") || input.parentElement || document.body;
  const imgs = [...root.querySelectorAll("img")];
  return imgs.sort((a,b) => {
    const ai = /captcha/.test(hint(a)) ? -1000 : 0;
    const bi = /captcha/.test(hint(b)) ? -1000 : 0;
    return (Math.abs(a.getBoundingClientRect().top-input.getBoundingClientRect().top)+ai) - (Math.abs(b.getBoundingClientRect().top-input.getBoundingClientRect().top)+bi);
  })[0] || null;
}

function findRefresh(input) {
  const root = input.closest("form,fieldset,section,article,td,tr,li,div") || input.parentElement || document.body;
  return [...root.querySelectorAll("button,input[type=button],input[type=submit],[role=button],a")].find(el => /refresh|reload|new captcha|change captcha|recaptcha/i.test(hint(el)+" "+text(el))) || null;
}

function scan() {
  if (!state.settings.enabled) return [];
  const found = [];
  for (const input of document.querySelectorAll("input:not([type=hidden]):not([type=password])")) {
    const confidence = scoreInput(input);
    if (confidence < 4) continue;
    const image = nearestImage(input);
    const container = input.closest("form,fieldset,section,article,td,tr,li,div") || input.parentElement || input;
    const candidate = {inputElement:input,imageElement:image,containerElement:container,refreshElement:findRefresh(input),confidence};
    found.push(candidate);
    if (state.settings.showControls && !state.processed.has(input)) addControl(candidate);
    state.processed.add(input);
  }
  for (const img of document.querySelectorAll("img")) {
    if (!/captcha/.test(hint(img))) continue;
    const input = [...document.querySelectorAll("input:not([type=hidden])")].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-img.getBoundingClientRect().top)-Math.abs(b.getBoundingClientRect().top-img.getBoundingClientRect().top))[0];
    if (input && !found.some(c=>c.inputElement===input)) found.push({inputElement:input,imageElement:img,containerElement:input.parentElement,refreshElement:findRefresh(input),confidence:4});
  }
  state.candidates = found;
  return found;
}

function addControl(c) {
  if (!c.inputElement?.parentElement || c.inputElement.dataset.captchaAssistControl === "1") return;
  c.inputElement.dataset.captchaAssistControl = "1";
  const b = document.createElement("button");
  b.type = "button"; b.className = "ca-open"; b.textContent = "✓ Captcha Assist";
  b.setAttribute("aria-label", "Open Captcha Assist");
  b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); openOverlay(c); });
  c.inputElement.insertAdjacentElement("afterend", b);
}

function canvasFromImage(img) {
  return new Promise((resolve,reject)=>{
    if (!img) return reject(new Error("CAPTCHA image unavailable"));
    if (!img.complete || img.naturalWidth === 0) { img.addEventListener("load",()=>canvasFromImage(img).then(resolve,reject),{once:true}); img.addEventListener("error",()=>reject(new Error("image failed to load")),{once:true}); return; }
    const canvas=document.createElement("canvas"); canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
    try { const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0); resolve(canvas); } catch(e) { reject(e); }
  });
}

function transform(source, mode) {
  const out=document.createElement("canvas"); out.width=source.width; out.height=source.height;
  const ctx=out.getContext("2d",{willReadFrequently:true}); ctx.drawImage(source,0,0);
  if (mode === "original") return out;
  const d=ctx.getImageData(0,0,out.width,out.height), p=d.data;
  if (mode === "grayscale" || mode === "contrast" || mode === "invert" || mode === "sharpen") {
    if (mode !== "sharpen") for(let i=0;i<p.length;i+=4){ const g=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2]; if(mode==="grayscale"){p[i]=p[i+1]=p[i+2]=g;} else if(mode==="invert"){p[i]=255-p[i];p[i+1]=255-p[i+1];p[i+2]=255-p[i+2];} else {const f=(259*(160+255))/(255*(259-160));p[i]=Math.max(0,Math.min(255,f*(p[i]-128)+128));p[i+1]=Math.max(0,Math.min(255,f*(p[i+1]-128)+128));p[i+2]=Math.max(0,Math.min(255,f*(p[i+2]-128)+128));} }
    else {
      const copy=new Uint8ClampedArray(p), w=out.width,h=out.height,k=[0,-1,0,-1,5,-1,0,-1,0];
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){for(let c=0;c<3;c++){let sum=0;for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++)sum+=copy[((y+ky)*w+x+kx)*4+c]*k[(ky+1)*3+kx+1];p[(y*w+x)*4+c]=Math.max(0,Math.min(255,sum));}} }
    ctx.putImageData(d,0,0);
  }
  return out;
}

function openOverlay(c) {
  if (state.overlay) state.overlay.remove(); state.active=c;
  const wrap=document.createElement("div"); wrap.className="ca-overlay"; wrap.setAttribute("role","dialog"); wrap.setAttribute("aria-modal","true"); wrap.setAttribute("aria-label","Captcha Assist");
  wrap.innerHTML='<div class="ca-panel"><header><h2>Captcha Assist</h2><button type="button" class="ca-close" aria-label="Close">×</button></header><p class="ca-instruction">Read the characters from the CAPTCHA image and enter them in the field.</p><div class="ca-preview"><canvas class="ca-canvas"></canvas><div class="ca-empty">No CAPTCHA image available.</div></div><div class="ca-row"><button data-zoom="-">−</button><output class="ca-zoom">100%</output><button data-zoom="+">+</button><button data-zoom="reset">Reset zoom</button></div><div class="ca-row ca-tools"><span>Enhancement:</span><button data-mode="original">Original</button><button data-mode="grayscale">Grayscale</button><button data-mode="contrast">Contrast</button><button data-mode="sharpen">Sharpen</button><button data-mode="invert">Invert</button></div><div class="ca-ocr"><strong>OCR assistance</strong><p>Local OCR is disabled in this build. No CAPTCHA text is sent to a remote OCR service.</p></div><div class="ca-status" aria-live="polite"></div><footer><button type="button" class="ca-refresh">Refresh CAPTCHA</button><button type="button" class="ca-close">Close</button></footer></div>';
  document.documentElement.appendChild(wrap); state.overlay=wrap;
  const canvas=wrap.querySelector("canvas"), empty=wrap.querySelector(".ca-empty"), status=wrap.querySelector(".ca-status"); let source=null,mode="original",zoom=1;
  const render=()=>{ if(!source){canvas.hidden=true;empty.hidden=false;return;} empty.hidden=true;canvas.hidden=false;const out=transform(source,mode);canvas.width=out.width;canvas.height=out.height;canvas.style.width=(out.width*zoom)+"px";canvas.style.height=(out.height*zoom)+"px";canvas.getContext("2d").drawImage(out,0,0);wrap.querySelector(".ca-zoom").value=Math.round(zoom*100)+"%"; };
  canvasFromImage(c.imageElement).then(v=>{source=v;render();}).catch(e=>{status.textContent="Captcha image could not be processed. Please use the original image.";});
  wrap.querySelectorAll(".ca-close").forEach(b=>b.addEventListener("click",closeOverlay));
  wrap.querySelectorAll("[data-zoom]").forEach(b=>b.addEventListener("click",()=>{const z=b.dataset.zoom;if(z==="+")zoom=Math.min(4,zoom+.25);else if(z==="-")zoom=Math.max(.5,zoom-.25);else zoom=1;render();}));
  wrap.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;render();}));
  wrap.querySelector(".ca-refresh").addEventListener("click",()=>{if(c.refreshElement){c.refreshElement.click();status.textContent="Refresh requested. Waiting for the new CAPTCHA image...";setTimeout(()=>{const fresh=scan().find(x=>x.inputElement===c.inputElement);if(fresh){state.active=fresh;canvasFromImage(fresh.imageElement).then(v=>{source=v;mode="original";render();status.textContent="New CAPTCHA loaded.";}).catch(()=>{});}},700);}else status.textContent="No webpage refresh control was detected.";});
  wrap.addEventListener("keydown",e=>{if(e.key==="Escape")closeOverlay();}); wrap.querySelector(".ca-close").focus();
}
function closeOverlay(){if(state.overlay){state.overlay.remove();state.overlay=null;state.active=null;}}

async function init(){state.settings=await chrome.storage.sync.get(DEFAULTS);scan(); if(state.settings.dynamicDetection){const obs=new MutationObserver(()=>{clearTimeout(state.scanTimer);state.scanTimer=setTimeout(scan,350);});obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["src","class","id","placeholder"]});}}
chrome.runtime.onMessage.addListener((m,_s,send)=>{if(m?.type==="scan")send({count:scan().length});if(m?.type==="status")send({count:state.candidates.length});return true;});
chrome.storage.onChanged.addListener(ch=>{for(const k of Object.keys(ch))if(k in state.settings)state.settings[k]=ch[k].newValue;scan();});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
