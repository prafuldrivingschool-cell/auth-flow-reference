"use strict";

const DEFAULTS = {enabled:true,showControls:true,dynamicDetection:true,zoom:true,grayscale:true,contrast:true,sharpen:true,invert:true,ocr:false,showConfidence:true,manualConfirmation:true};
const state = {settings:{...DEFAULTS}, candidates:[], processed:new WeakSet(), overlay:null, active:null, scanTimer:null};

const text = el => (el?.textContent || el?.getAttribute?.("aria-label") || el?.getAttribute?.("title") || "").trim().toLowerCase();
const hint = el => [el?.id, el?.className, el?.getAttribute?.("placeholder"), el?.getAttribute?.("name"), el?.getAttribute?.("alt"), el?.getAttribute?.("aria-label"), el?.getAttribute?.("data-testid")].filter(v => typeof v === "string").join(" ").toLowerCase();
const rect = el => el?.getBoundingClientRect?.() || {top:0,left:0,width:0,height:0};
const visible = el => { const r=rect(el), s=getComputedStyle(el); return r.width>20 && r.height>15 && s.display!=="none" && s.visibility!=="hidden" && s.opacity!=="0"; };
const captchaWord = s => /captcha|security code|verification code|verify code|verification image|security image|challenge/i.test(String(s||""));

function scoreInput(input) {
  if (!(input instanceof HTMLInputElement)) return 0;
  const h = hint(input);
  let score = 0;
  if (/captcha|enter captcha|verification code|security code|verify code/.test(h)) score += 6;
  const label = input.labels?.[0];
  if (label && captchaWord(text(label)) ) score += 4;
  const parent = input.closest("form,fieldset,section,article,td,tr,li,div") || input.parentElement;
  if (parent && captchaWord(text(parent))) score += 2;
  return score;
}

function distance(a,b) {
  const ar=rect(a), br=rect(b);
  const ac={x:ar.left+ar.width/2,y:ar.top+ar.height/2}, bc={x:br.left+br.width/2,y:br.top+br.height/2};
  return Math.hypot(ac.x-bc.x,ac.y-bc.y);
}

function mediaScore(el,input) {
  if (!visible(el)) return -Infinity;
  const h=hint(el), t=text(el);
  let score=0;
  if (captchaWord(h)) score += 100;
  if (/captcha|verification|security/.test(t)) score += 60;
  if (el.tagName === "IMG") score += 20;
  if (el.tagName === "CANVAS") score += 18;
  if (getComputedStyle(el).backgroundImage !== "none") score += 12;
  const r=rect(el), ir=rect(input);
  const sizePenalty=Math.max(0, Math.abs(r.width-ir.width)*0.08 + Math.abs(r.height-ir.height)*0.05);
  score -= Math.min(80,distance(el,input)/8 + sizePenalty);
  return score;
}

function getBackgroundUrl(el) {
  if (!el) return null;
  const bg=getComputedStyle(el).backgroundImage || "";
  const m=bg.match(/url\\(["']?(.*?)["']?\\)/i);
  return m ? m[1] : null;
}

function findMedia(input) {
  const roots=[];
  let node=input;
  for(let i=0;node && i<7;i++,node=node.parentElement){ roots.push(node); if(node.matches?.("form,fieldset,section,article,main")) break; }
  const selectors="img,canvas,svg,[style*='background-image'],[class*='captcha' i],[id*='captcha' i],[class*='verification' i],[id*='verification' i]";
  const pool=new Set();
  roots.forEach(root=>{ if(root.matches?.(selectors)) pool.add(root); root.querySelectorAll?.(selectors).forEach(el=>pool.add(el)); });
  document.querySelectorAll("img,canvas,[class*='captcha' i],[id*='captcha' i],[class*='verification' i],[id*='verification' i]").forEach(el=>pool.add(el));
  let best=null,bestScore=-Infinity;
  for(const el of pool){ const score=mediaScore(el,input); if(score>bestScore){bestScore=score;best=el;} }
  if(best && bestScore>-20) return {element:best, backgroundUrl:getBackgroundUrl(best)};

  for(const root of roots){
    const url=getBackgroundUrl(root);
    if(url) return {element:root,backgroundUrl:url};
  }
  return null;
}

function findRefresh(input) {
  const root = input.closest("form,fieldset,section,article,main,td,tr,li,div") || input.parentElement || document.body;
  const controls=[...root.querySelectorAll("button,input[type=button],input[type=submit],[role=button],a")];
  return controls.sort((a,b)=>refreshScore(b,input)-refreshScore(a,input))[0] || null;
}
function refreshScore(el,input){
  const s=hint(el)+" "+text(el); let n=0;
  if(/refresh|reload|new captcha|change captcha|another captcha|different captcha|recaptcha/i.test(s)) n+=100;
  n-=distance(el,input)/20; return n;
}

function scan() {
  if (!state.settings.enabled) return [];
  const found = [];
  const inputs=[...document.querySelectorAll("input:not([type=hidden]):not([type=password]),textarea")];
  for (const input of inputs) {
    const confidence = scoreInput(input);
    if (confidence < 4) continue;
    const media = findMedia(input);
    const container = input.closest("form,fieldset,section,article,main,td,tr,li,div") || input.parentElement || input;
    const candidate = {inputElement:input,mediaElement:media?.element||null,backgroundUrl:media?.backgroundUrl||null,containerElement:container,refreshElement:findRefresh(input),confidence};
    found.push(candidate);
    if (state.settings.showControls && !state.processed.has(input)) addControl(candidate);
    state.processed.add(input);
  }

  // Catch pages where the CAPTCHA image itself carries the useful hint but the input does not.
  const hintedMedia=[...document.querySelectorAll("img,canvas,[class*='captcha' i],[id*='captcha' i],[class*='verification' i],[id*='verification' i]")].filter(el=>visible(el)&&captchaWord(hint(el)+" "+text(el)));
  for(const media of hintedMedia){
    const input=inputs.filter(i=>visible(i)).sort((a,b)=>distance(a,media)-distance(b,media))[0];
    if(input && !found.some(c=>c.inputElement===input)){
      const m={element:media,backgroundUrl:getBackgroundUrl(media)};
      const candidate={inputElement:input,mediaElement:m.element,backgroundUrl:m.backgroundUrl,containerElement:input.parentElement,refreshElement:findRefresh(input),confidence:Math.max(4,scoreInput(input))};
      found.push(candidate);
      if(state.settings.showControls&&!state.processed.has(input)) addControl(candidate);
      state.processed.add(input);
    }
  }
  state.candidates=found;
  return found;
}

function addControl(c) {
  if (!c.inputElement?.parentElement || c.inputElement.dataset.captchaAssistControl === "1") return;
  c.inputElement.dataset.captchaAssistControl = "1";
  const b = document.createElement("button");
  b.type="button"; b.className="ca-open"; b.textContent="✓ Captcha Assist"; b.setAttribute("aria-label","Open Captcha Assist");
  b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openOverlay(c);});
  c.inputElement.insertAdjacentElement("afterend",b);
}

function canvasFromImage(img) {
  return new Promise((resolve,reject)=>{
    if(!img) return reject(new Error("CAPTCHA image unavailable"));
    if(!img.complete || img.naturalWidth===0){ img.addEventListener("load",()=>canvasFromImage(img).then(resolve,reject),{once:true}); img.addEventListener("error",()=>reject(new Error("image failed to load")),{once:true}); return; }
    const canvas=document.createElement("canvas"); canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
    try{const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);ctx.getImageData(0,0,1,1);resolve(canvas);}catch(e){reject(e);}
  });
}

function canvasFromMedia(el) {
  if(!el) return Promise.reject(new Error("CAPTCHA media unavailable"));
  if(el.tagName==="IMG") return canvasFromImage(el);
  if(el.tagName==="CANVAS"){
    const out=document.createElement("canvas"); out.width=el.width||rect(el).width; out.height=el.height||rect(el).height;
    try{out.getContext("2d").drawImage(el,0,0,out.width,out.height);return Promise.resolve(out);}catch(e){return Promise.reject(e);}
  }
  return Promise.reject(new Error("Element is not directly processable"));
}

function transform(source,mode){
  const out=document.createElement("canvas");out.width=source.width;out.height=source.height;const ctx=out.getContext("2d",{willReadFrequently:true});ctx.drawImage(source,0,0);
  if(mode==="original")return out;
  const d=ctx.getImageData(0,0,out.width,out.height),p=d.data;
  if(mode==="grayscale"||mode==="contrast"||mode==="invert"||mode==="sharpen"){
    if(mode!=="sharpen") for(let i=0;i<p.length;i+=4){const g=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];if(mode==="grayscale")p[i]=p[i+1]=p[i+2]=g;else if(mode==="invert"){p[i]=255-p[i];p[i+1]=255-p[i+1];p[i+2]=255-p[i+2];}else{const f=(259*(160+255))/(255*(259-160));p[i]=Math.max(0,Math.min(255,f*(p[i]-128)+128));p[i+1]=Math.max(0,Math.min(255,f*(p[i+1]-128)+128));p[i+2]=Math.max(0,Math.min(255,f*(p[i+2]-128)+128));}}
    else{const copy=new Uint8ClampedArray(p),w=out.width,h=out.height,k=[0,-1,0,-1,5,-1,0,-1,0];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)for(let c=0;c<3;c++){let sum=0;for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++)sum+=copy[((y+ky)*w+x+kx)*4+c]*k[(ky+1)*3+kx+1];p[(y*w+x)*4+c]=Math.max(0,Math.min(255,sum));}}
    ctx.putImageData(d,0,0);
  }
  return out;
}

function cssFilter(mode){
  if(mode==="grayscale")return "grayscale(1)";
  if(mode==="contrast")return "contrast(1.8)";
  if(mode==="invert")return "invert(1)";
  if(mode==="sharpen")return "contrast(1.35) brightness(1.05)";
  return "none";
}

function openOverlay(c){
  if(state.overlay)state.overlay.remove();state.active=c;
  const wrap=document.createElement("div");wrap.className="ca-overlay";wrap.setAttribute("role","dialog");wrap.setAttribute("aria-modal","true");wrap.setAttribute("aria-label","Captcha Assist");
  wrap.innerHTML='<div class="ca-panel"><header><h2>Captcha Assist</h2><button type="button" class="ca-close" aria-label="Close">×</button></header><p class="ca-instruction">Read the characters from the CAPTCHA image and enter them in the field.</p><div class="ca-preview"><canvas class="ca-canvas"></canvas><img class="ca-image" alt="CAPTCHA preview"><div class="ca-empty">No CAPTCHA image available.</div></div><div class="ca-row"><button data-zoom="-">−</button><output class="ca-zoom">100%</output><button data-zoom="+">+</button><button data-zoom="reset">Reset zoom</button></div><div class="ca-row ca-tools"><span>Enhancement:</span><button data-mode="original">Original</button><button data-mode="grayscale">Grayscale</button><button data-mode="contrast">Contrast</button><button data-mode="sharpen">Sharpen</button><button data-mode="invert">Invert</button></div><div class="ca-ocr"><strong>OCR assistance</strong><p>Local OCR is disabled in this build. No CAPTCHA text is sent to a remote OCR service.</p></div><div class="ca-status" aria-live="polite"></div><footer><button type="button" class="ca-refresh">Refresh CAPTCHA</button><button type="button" class="ca-close">Close</button></footer></div>';
  document.documentElement.appendChild(wrap);state.overlay=wrap;
  const canvas=wrap.querySelector("canvas"),image=wrap.querySelector(".ca-image"),empty=wrap.querySelector(".ca-empty"),status=wrap.querySelector(".ca-status");let source=null,mode="original",zoom=1,usingDirect=false;
  const render=()=>{
    wrap.querySelector(".ca-zoom").value=Math.round(zoom*100)+"%";
    if(usingDirect){canvas.hidden=true;image.hidden=false;empty.hidden=true;image.style.transform=`scale(${zoom})`;image.style.filter=cssFilter(mode);image.style.transformOrigin="center center";return;}
    if(!source){canvas.hidden=true;image.hidden=true;empty.hidden=false;return;}
    empty.hidden=true;image.hidden=true;canvas.hidden=false;const out=transform(source,mode);canvas.width=out.width;canvas.height=out.height;canvas.style.width=(out.width*zoom)+"px";canvas.style.height=(out.height*zoom)+"px";canvas.getContext("2d").drawImage(out,0,0);
  };

  const loadMedia=()=>{
    source=null;usingDirect=false;
    if(c.mediaElement){
      canvasFromMedia(c.mediaElement).then(v=>{source=v;render();}).catch(()=>{
        if(c.mediaElement.tagName==="IMG" && c.mediaElement.src){image.src=c.mediaElement.currentSrc||c.mediaElement.src;usingDirect=true;render();status.textContent="Using the original CAPTCHA image. Some image-processing effects are unavailable because the page blocks pixel access.";}
        else if(c.backgroundUrl){image.src=c.backgroundUrl;usingDirect=true;render();status.textContent="Using the original CAPTCHA image. Some image-processing effects are unavailable.";}
        else {render();status.textContent="CAPTCHA was detected, but the page blocks local image processing.";}
      });
    } else if(c.backgroundUrl){image.src=c.backgroundUrl;usingDirect=true;render();}
    else render();
  };
  loadMedia();
  wrap.querySelectorAll(".ca-close").forEach(b=>b.addEventListener("click",closeOverlay));
  wrap.querySelectorAll("[data-zoom]").forEach(b=>b.addEventListener("click",()=>{const z=b.dataset.zoom;if(z==="+")zoom=Math.min(4,zoom+.25);else if(z==="-")zoom=Math.max(.5,zoom-.25);else zoom=1;render();}));
  wrap.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;render();}));
  wrap.querySelector(".ca-refresh").addEventListener("click",()=>{if(!c.refreshElement){status.textContent="No webpage refresh control was detected.";return;}c.refreshElement.click();status.textContent="Refresh requested. Waiting for the new CAPTCHA image...";setTimeout(()=>{const fresh=scan().find(x=>x.inputElement===c.inputElement);if(fresh){state.active=fresh;c=fresh;loadMedia();status.textContent="New CAPTCHA loaded.";}},800);});
  wrap.addEventListener("keydown",e=>{if(e.key==="Escape")closeOverlay();});wrap.querySelector(".ca-close").focus();
}
function closeOverlay(){if(state.overlay){state.overlay.remove();state.overlay=null;state.active=null;}}

async function init(){state.settings=await chrome.storage.sync.get(DEFAULTS);scan();if(state.settings.dynamicDetection){const obs=new MutationObserver(()=>{clearTimeout(state.scanTimer);state.scanTimer=setTimeout(scan,350);});obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["src","class","id","placeholder","style"]});}}
chrome.runtime.onMessage.addListener((m,_s,send)=>{if(m?.type==="scan")send({count:scan().length});if(m?.type==="status")send({count:state.candidates.length});return true;});
chrome.storage.onChanged.addListener(ch=>{for(const k of Object.keys(ch))if(k in state.settings)state.settings[k]=ch[k].newValue;scan();});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
