/* ================= MENU: typed or photo, fixed or guests choose, notes, kitchen list ================= */
const DEFAULT_MENU={mode:"fixed",title:"Dinner menu",text:"",image:null,notes:true,locked:false,groups:[{name:"Entrées",picks:1,items:[{n:"Chicken"},{n:"Fish"},{n:"Vegetarian"}]},{name:"Sides",picks:2,items:[{n:"Mac and cheese"},{n:"Green beans"},{n:"Salad"}]},{name:"Drinks",picks:1,items:[{n:"Lemonade"},{n:"Iced tea"},{n:"Water"}]}]};
const menuCfg=()=>{const m=C().menu;if(!m)return null;return Object.assign({},DEFAULT_MENU,m,{groups:arr(m.groups).map(g=>Object.assign({},g,{items:arr(g.items)}))})};
const menuOn=()=>{const m=menuCfg();return !!m&&(m.text||m.image||m.groups.some(g=>g.items.length))};
function menuBody(m,guest){let h="";
 if(m.image)h+=`<button class="ph menuimg" data-act="menuZoom" aria-label="Open the menu picture"><img src="${m.image}" alt="Menu"></button>`;
 if(m.text)h+=`<div class="menutext">${esc(m.text)}</div>`;
 if(m.mode==="fixed"&&m.groups.some(g=>g.items.length))h+=m.groups.filter(g=>g.items.length).map(g=>`<div class="stack tight"><h3>${esc(g.name)}</h3>${g.items.map(i=>`<div><b>${esc(i.n)}</b>${i.d?` <span class="small muted">· ${esc(i.d)}</span>`:""}</div>`).join("")}</div>`).join("");
 return h}
function pMenu(){const m=menuCfg();if(!m)return `<div class="card muted">${t("The menu isn't ready yet.")}</div>`;
 let h=`<section class="card stack"><div class="eyebrow">${esc(C().title||"")}</div><h2>${esc(m.title||t("Menu"))}</h2>${menuBody(m,true)}</section>`;
 if(m.mode==="choose"){const mine=(D.mine.order)||{},picks=L.menuPicks||(L.menuPicks=clone(mine.picks||{}));
  const locked=m.locked;const saved=!!mine.t;
  h+=`<section class="card stack"><h2>${t("Choose your meal")}</h2>${locked?`<div class="banner soft"><span>${t("Orders are closed.")}</span></div>`:""}
  ${m.groups.map((g,gi)=>{const sel=arr(picks[gi]);const lim=Math.max(1,+g.picks||1);return `<div class="stack tight"><div class="row between"><h3>${esc(g.name)}</h3><span class="small muted">${t("Pick {n}",{n:lim})} · ${sel.length}/${lim}</span></div>
   ${g.items.map((it,ii)=>{const on=sel.includes(ii);return `<button class="choice ${on?"selected":""}" data-act="menuPick" data-g="${gi}" data-i="${ii}" aria-pressed="${on}" ${locked?"disabled":""}><span><b>${esc(it.n)}</b>${it.d?`<span class="small muted db">${esc(it.d)}</span>`:""}</span>${on?"✓":""}</button>`}).join("")}</div>`}).join("")}
  ${m.notes?`<label class="stack tight"><span class="small"><b>${t("Notes for the kitchen")}</b> ${t("(allergies, no onions…)")}</span><textarea data-draft="menuNote" rows="2" maxlength="200" ${locked?"disabled":""}>${esc(dv("menuNote",mine.note||""))}</textarea></label>`:""}
  ${locked?"":`<button class="btn primary" data-act="menuSave">${saved?t("Update my order"):t("Save my order")}</button>`}${saved?`<p class="pill ok as">${t("Your order is saved")}</p>`:""}</section>`}
 return h}
function mMenu(){markSetup("menu");const m=menuCfg()||clone(DEFAULT_MENU),on=!!C().menu;const orders=D.orders||{};const oks=Object.keys(orders).filter(k=>D.players[k]||orders[k]);
 const counts=m.groups.map(g=>g.items.map(()=>0));oks.forEach(k=>{const p=orders[k].picks||{};Object.keys(p).forEach(gi=>arr(p[gi]).forEach(ii=>{if(counts[gi]&&counts[gi][ii]!=null)counts[gi][ii]++}))});
 const gtxt=g=>g.items.map(i=>i.n+(i.d?" | "+i.d:"")).join("\n");
 return `<section class="card stack"><div class="row between"><h2>Menu ${hint("menu")}</h2>${on?`<span class="pill ok">Showing on guests' phones</span>`:`<button class="btn sm primary" data-act="menuOn">Turn on the menu</button>`}</div>
 <div class="seg" role="group" aria-label="Menu type"><button data-act="menuMode" data-v="fixed" aria-pressed="${m.mode==="fixed"}">Fixed menu</button><button data-act="menuMode" data-v="choose" aria-pressed="${m.mode==="choose"}">Guests choose</button></div>
 <p class="small muted m0">${m.mode==="fixed"?"Guests see what's being served.":"Guests pick from each group on their phones, with an optional note. You get counts and a kitchen list."}</p>
 <label class="stack tight"><span class="small"><b>Menu title</b></span><input type="text" data-draft="mn_title" value="${esc(dv("mn_title",m.title))}"></label>
 <label class="stack tight"><span class="small"><b>Typed menu</b> (optional)</span><textarea rows="5" data-draft="mn_text" placeholder="Perlou, chicken wings, meatballs…">${esc(dv("mn_text",m.text||""))}</textarea></label>
 <div class="row top g16">${m.image?`<img class="invite" src="${m.image}" alt="Menu picture">`:'<div class="invite ph0">Menu picture</div>'}<div class="stack grow mw200"><p class="small muted m0">Upload a picture of the menu. Guests can tap it to zoom in.</p><div class="row"><label class="btn upl">Upload a menu picture<input type="file" accept="image/*" data-act="menuImg"></label>${m.image?'<button class="btn sm" data-act="menuImgDel">Remove</button>':""}</div></div></div>
 <h3>Menu groups</h3><p class="small muted m0">One item per line. Add a description after a | sign, like <i>Chicken | grilled, with herbs</i>.${m.mode==="choose"?" Set how many picks each guest gets from each group.":""}</p>
 <div class="grid2 g8">${m.groups.map((g,gi)=>`<div class="stack tight qs"><div class="row"><input type="text" class="grow" data-draft="mn_g${gi}_name" value="${esc(dv("mn_g"+gi+"_name",g.name))}" aria-label="Group name">${m.mode==="choose"?`<label class="row small">Picks <input type="number" min="1" max="10" data-draft="mn_g${gi}_picks" value="${esc(dv("mn_g"+gi+"_picks",g.picks||1))}"></label>`:""}<button class="btn xs" data-act="menuGDel" data-g="${gi}">Remove</button></div><textarea rows="4" data-draft="mn_g${gi}_items">${esc(dv("mn_g"+gi+"_items",gtxt(g)))}</textarea></div>`).join("")}</div>
 <div class="row"><button class="btn sm" data-act="menuGAdd">Add a group</button><label class="row small"><input type="checkbox" data-draft="mn_notes" ${(dv("mn_notes",m.notes?"1":"0"))==="1"?"checked":""}> Let guests add a note</label></div>
 <div class="row"><button class="btn primary" data-act="menuSaveCfg">Save the menu</button></div></section>
 ${m.mode==="choose"?`<section class="card stack"><div class="row between"><h2>Orders</h2><div class="row">${m.locked?`<span class="pill warn">Orders locked</span><button class="btn sm" data-act="menuLock">Unlock</button>`:`<button class="btn sm gold" data-act="menuLock">Lock orders</button>`}<a class="btn sm" href="${esc(eventURL(EV,"print"))}" target="_blank" rel="noopener">Print the kitchen list</a></div></div>
 <p class="small muted m0">${oks.length} of ${ids().length} guests have ordered.</p>
 <div class="grid2 g8">${m.groups.map((g,gi)=>`<div class="stack tight"><h3>${esc(g.name)}</h3>${g.items.map((it,ii)=>`<div class="row between small"><span>${esc(it.n)}</span><b class="num">${counts[gi][ii]}</b></div>`).join("")}</div>`).join("")}</div>
 ${kitchenTable()}</section>`:""}`}
function kitchenTable(){const m=menuCfg();if(!m)return "";const orders=D.orders||{};const ks=Object.keys(orders).sort((a,b)=>P(a).name.localeCompare(P(b).name));
 return `<div class="tscroll"><table><thead><tr><th>Guest</th>${m.groups.map(g=>`<th>${esc(g.name)}</th>`).join("")}<th>Note</th></tr></thead><tbody>${ks.map(k=>{const p=orders[k].picks||{};return `<tr><td>${esc(orders[k].name||P(k).name)}</td>${m.groups.map((g,gi)=>`<td>${arr(p[gi]).map(ii=>esc((g.items[ii]||{}).n||"")).join(", ")}</td>`).join("")}<td>${esc(orders[k].note||"")}</td></tr>`}).join("")||`<tr><td colspan="${m.groups.length+2}" class="muted">No orders yet.</td></tr>`}</tbody></table></div>`}
function menuSlide(){const m=menuCfg();if(!m)return null;if(m.image)return `<div class="mo-photo"><img src="${m.image}" alt=""><div class="mo-cap">${esc(m.title||"Menu")}</div></div>`;
 const items=m.groups.filter(g=>g.items.length).map(g=>`<div><div class="mo-sub">${esc(g.name)}</div><div class="mo-menuitems">${g.items.map(i=>esc(i.n)).join(" · ")}</div></div>`).join("");
 return `<div class="mo-wish"><div class="mo-title" style="font-size:clamp(2.4rem,7vw,5rem)">${esc(m.title||"Menu")}</div>${m.text?`<div class="mo-menuitems">${esc(m.text)}</div>`:""}${items}</div>`}
Object.assign(ACT,{
 menuZoom:()=>{const m=menuCfg();if(m&&m.image){L.lightbox={key:"menu",name:m.title,full:m.image};render(true)}},
 menuPick:el=>{const m=menuCfg();if(!m||m.locked)return;const gi=+el.dataset.g,ii=+el.dataset.i,lim=Math.max(1,+m.groups[gi].picks||1);const p=L.menuPicks||(L.menuPicks={});let sel=arr(p[gi]);
  if(sel.includes(ii))sel=sel.filter(x=>x!==ii);else{if(sel.length>=lim){if(lim===1)sel=[];else return toast(t("You can pick {n} from this group",{n:lim}))}sel.push(ii)}p[gi]=sel;render(true)},
 menuSave:()=>{const m=menuCfg();if(!m||m.locked)return toast(t("Orders are closed."));const p=L.menuPicks||{};const miss=m.groups.findIndex((g,gi)=>arr(p[gi]).length<Math.max(1,+g.picks||1));
  if(miss>=0&&L.confirm!=="menuShort"){L.confirm="menuShort";toast(t("You haven't picked everything in {g}. Tap save again to send it anyway.",{g:m.groups[miss].name}));return}
  L.confirm=null;ER("orders/"+L.me).set({picks:p,note:(L.drafts.menuNote||"").slice(0,200),name:P(L.me).name,t:SERVER_TS()}).then(()=>{toast(t("Your order is saved"));SND.ding()})},
 menuOn:()=>ER("content/menu").set(clone(DEFAULT_MENU)),
 menuMode:el=>{const m=menuCfg()||clone(DEFAULT_MENU);m.mode=el.dataset.v;ER("content/menu").set(m)},
 menuImg:el=>{const f=el.files[0];if(!f)return;shrinkImage(f,1400,.75,img=>{const m=menuCfg()||clone(DEFAULT_MENU);m.image=img;ER("content/menu").set(m).then(()=>toast("Menu picture added"))})},
 menuImgDel:()=>ER("content/menu/image").remove(),
 menuGAdd:()=>{const m=menuCfg()||clone(DEFAULT_MENU);m.groups.push({name:"New group",picks:1,items:[]});ER("content/menu").set(m)},
 menuGDel:el=>{const m=menuCfg();if(!m)return;m.groups.splice(+el.dataset.g,1);Object.keys(L.drafts).filter(k=>k.startsWith("mn_g")).forEach(k=>delete L.drafts[k]);ER("content/menu").set(m)},
 menuSaveCfg:()=>{const m=menuCfg()||clone(DEFAULT_MENU);const d=(k,v)=>L.drafts[k]!=null?L.drafts[k]:v;m.title=d("mn_title",m.title);m.text=d("mn_text",m.text||"");m.notes=d("mn_notes",m.notes?"1":"0")==="1";
  m.groups=m.groups.map((g,gi)=>({name:d("mn_g"+gi+"_name",g.name),picks:Math.max(1,Math.min(10,+d("mn_g"+gi+"_picks",g.picks||1)||1)),items:String(d("mn_g"+gi+"_items",g.items.map(i=>i.n+(i.d?" | "+i.d:"")).join("\n"))).split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const [n,...r]=l.split("|");return r.length?{n:n.trim(),d:r.join("|").trim()}:{n:n.trim()}})}));
  ER("content/menu").set(m).then(()=>{Object.keys(L.drafts).filter(k=>k.startsWith("mn_")).forEach(k=>delete L.drafts[k]);toast("Menu saved");render(true)})},
 menuLock:()=>{const m=menuCfg();if(m)ER("content/menu/locked").set(!m.locked)}
});

/* ================= MOMENTS v2: QR on welcome, menu slide, music; REVEAL v2: kinds, packaging, AI design ================= */
const RV_KINDS={
 gender:{label:"Boy or girl",q:"Boy or girl?",sub:""},
 date:{label:"Wedding or engagement date",q:"When's the big day?",sub:"Save the date!"},
 age:{label:"Birthday age",q:"How old?",sub:""},
 number:{label:"A number (years, count…)",q:"How many years together?",sub:"years together"},
 surprise:{label:"Surprise guest",q:"Our surprise guest is…",sub:"",photo:true},
 honor:{label:"Honoring someone",q:"And the honor goes to…",sub:"",photo:true},
 custom:{label:"Custom message",q:"The big reveal",sub:""}};
const RV_PACKS={gift:"Gift box",balloon:"Balloon pop",envelope:"Envelope",curtain:"Stage curtains",ai:"Your own design (AI)"};
const rvKind=k=>({text:"custom",award:"honor"}[k]||(RV_KINDS[k]?k:"custom"));
const rvPack=p=>RV_PACKS[p]?p:"gift";

/* ---------- moments ---------- */
const moQR=m=>m.qr!=null?!!m.qr:m.id==="welcome";
const moMenu=m=>(m.menu!=null?!!m.menu:m.id==="dinner")&&menuOn();
function momentSlides(m){const base=[{t:"msg"}];if(moMenu(m))base.push({t:"menu"});const out=[];
 if(m.album){const a=D.album||{};Object.keys(a).sort((x,y)=>(a[y].t||0)-(a[x].t||0)).slice(0,30).forEach(k=>out.push({t:"photo",src:"album",k,name:a[k].name||""}))}
 if(m.honor){const h=D.honor||{};Object.keys(h).sort((x,y)=>(h[x].t||0)-(h[y].t||0)).forEach(k=>out.push({t:"photo",src:"honor",k,name:h[k].cap||""}))}
 if(m.wishes){const w=D.wishes||{};Object.keys(w).slice(-20).forEach(k=>out.push({t:"wish",text:w[k].text,name:w[k].name}))}
 const mixed=base.slice();out.forEach((p,i)=>{mixed.push(p);if((i+1)%4===0)mixed.push(...base)});return mixed}
function updateMoment(){if(VIEW!=="screen")return;const m=st().moment;const key=m?m.id+"|"+m.t:null;const el=$("#mo");updateMusic();if(!el||key===MO.key)return;MO.key=key;clearInterval(MO.timer);
 if(!m){el.classList.remove("on");setTimeout(()=>{if(!MO.key)el.innerHTML=""},800);return}
 const mo=momentsList().find(x=>x.id===m.id)||{title:m.title||"",sub:""};const qr=moQR(mo);
 el.innerHTML=`<div class="mo-bg"></div><div class="mo-orbs"><i></i><i></i><i></i><i></i></div><div class="mo-stage"><div class="mo-slide a"></div><div class="mo-slide b"></div></div><div class="mo-foot">${esc(C().title||"")}${qr?"":` · <span>${t("Scan to join the games")}</span>`}</div>`;
 el.classList.add("on");MO.i=0;let flip=false;
 const show=async()=>{const slides=momentSlides(mo);const sl=slides[MO.i%slides.length];MO.i++;let html;
  if(sl.t==="msg")html=`<div class="mo-msg ${qr?"withqr":""}"><div class="mo-msgtxt">${C().image?`<img class="mo-art" src="${C().image}" alt="">`:""}<div class="mo-title">${esc(fillH(mo.title))}</div>${mo.sub?`<div class="mo-sub">${esc(fillH(mo.sub))}</div>`:""}</div>${qr?`<div class="mo-qrbox"><div class="mo-qr"></div><div class="mo-qrcap">${t("Scan to join the games")}</div><div class="mo-qrurl">${esc(eventURL(EV).replace(/^https?:\/\//,""))}</div></div>`:""}</div>`;
  else if(sl.t==="menu"){html=menuSlide();if(!html)return show()}
  else if(sl.t==="wish")html=`<div class="mo-wish"><div class="mo-q">“${esc(sl.text)}”</div><div class="mo-sub">${esc(sl.name||"")}</div></div>`;
  else{const src=await slideSrc(sl);if(!src){return show()}html=`<div class="mo-photo"><img src="${src}" alt=""><div class="mo-cap">${esc(sl.name||"")}</div></div>`}
  const layers=el.querySelectorAll(".mo-slide");if(layers.length<2)return;flip=!flip;const on=layers[flip?0:1],off=layers[flip?1:0];on.innerHTML=html;const q=on.querySelector(".mo-qr");if(q)qrInto(q,eventURL(EV),Math.round(Math.min(innerWidth,innerHeight)*.3));on.classList.add("show");off.classList.remove("show")};
 show();MO.timer=setInterval(show,8000)}

/* ---------- music on the TV ---------- */
const MU={key:null,audio:null,cache:{},unlocked:false,blocked:false};
function fadeAudio(a,to,ms,done){if(!a)return done&&done();clearInterval(a._fade);const from=a.volume,steps=Math.max(1,Math.round(ms/50));let i=0;a._fade=setInterval(()=>{i++;a.volume=Math.max(0,Math.min(1,from+(to-from)*i/steps));if(i>=steps){clearInterval(a._fade);done&&done()}},50)}
async function updateMusic(){if(VIEW!=="screen")return;sndBtn();const m=st().moment;const cfg=m&&(D.music||{})[m.id];const key=cfg?m.id+"|"+m.t+"|"+cfg.t:null;
 if(MU.audio&&cfg&&MU.key===key){const v=Math.max(0,Math.min(1,cfg.vol!=null?+cfg.vol:.8));if(!MU.audio._fade)MU.audio.volume=v;MU.audio.loop=cfg.loop!==false;return}
 if(key===MU.key)return;MU.key=key;
 const old=MU.audio;MU.audio=null;if(old)fadeAudio(old,0,2000,()=>{old.pause();old.src=""});
 if(!cfg)return;let data=MU.cache[m.id+"|"+cfg.t];
 if(!data){data=(await ER("musicData/"+m.id).once("value")).val();if(!data||MU.key!==key)return;MU.cache[m.id+"|"+cfg.t]=data}
 const a=new Audio(data);a.loop=cfg.loop!==false;a.volume=0;MU.audio=a;const vol=Math.max(0,Math.min(1,cfg.vol!=null?+cfg.vol:.8));
 a.play().then(()=>{MU.blocked=false;sndBtn();fadeAudio(a,vol,2500)}).catch(()=>{MU.blocked=true;a._want=vol;sndBtn()})}
function sndBtn(){if(VIEW!=="screen")return;let b=$("#snd");const any=Object.keys(D.music||{}).length>0;const need=any&&(!MU.unlocked||MU.blocked);
 if(!b){b=document.createElement("button");b.id="snd";b.className="sndbtn";b.textContent="🔊 "+t("Tap to enable sound");b.onclick=()=>{MU.unlocked=true;MU.blocked=false;
  if(MU.audio){MU.audio.play().then(()=>fadeAudio(MU.audio,MU.audio._want!=null?MU.audio._want:.8,2000)).catch(()=>{})}else{try{const c=new (window.AudioContext||window.webkitAudioContext)();c.resume();const o=c.createOscillator(),g=c.createGain();g.gain.value=0;o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.05)}catch(e){}}sndBtn()};document.body.appendChild(b)}
 b.classList.toggle("on",need)}

/* ---------- reveal markup ---------- */
function rvContent(r,photo,inline){const kind=rvKind(r.kind);const col=rvColor(r);const big=`font-family:var(--f-caps),Georgia,serif;font-size:min(30vw,22vh);line-height:1;color:${col};text-shadow:0 8px 30px rgba(0,0,0,.2)`;
 if(r.placeholder)return `<div class="rv-big" style="${inline?big:""}">?</div>`;
 if(kind==="gender")return babySVG(r.style);
 if(kind==="age"||kind==="number")return `<div class="rv-big" style="${inline?big:""}">${esc(r.answer)}</div>`;
 if(kind==="date"){const d=parseDay(r.answer);if(!d)return `<div class="rv-big" style="${inline?big:""}">★</div>`;
  return `<div class="rv-cal" ${inline?`style="width:70%;margin:auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.25);font-family:Georgia,serif;text-align:center"`:""}><div class="rv-calm" ${inline?`style="background:${col};color:#fff;font-size:min(7vw,5vh);padding:4% 0;letter-spacing:.1em;text-transform:uppercase"`:""}>${esc(d.toLocaleDateString(L.lang==="es"?"es":"en-US",{month:"long"}))}</div><div class="rv-cald" ${inline?`style="font-size:min(24vw,18vh);color:#2a1530;line-height:1.1"`:""}>${d.getDate()}</div></div>`}
 if((kind==="surprise"||kind==="honor")&&photo)return `<img class="rv-photo" src="${photo}" alt="" ${inline?`style="width:78%;aspect-ratio:1;object-fit:cover;border-radius:50%;border:6px solid #fff;box-shadow:0 14px 40px rgba(0,0,0,.25);display:block;margin:auto"`:""}>`;
 return `<div class="rv-big" style="${inline?big:""}">★</div>`}
const parseDay=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const rvColor=r=>rvKind(r.kind)==="gender"?(r.style==="boy"?"#3d8bff":"#ff5fa8"):"var(--rose)";
function rvAnswer(r){const kind=rvKind(r.kind);if(r.placeholder)return t("The answer appears here");
 if(kind==="gender")return r.style==="boy"?t("It's a boy!"):t("It's a girl!");
 if(kind==="age")return L.lang==="es"?`¡Feliz cumpleaños número ${esc(r.answer)}!`:`Happy ${ordinal(r.answer)} birthday!`;
 if(kind==="number")return `${esc(r.answer)} ${esc(r.sub||"")}`;
 if(kind==="date"){const d=parseDay(r.answer);return d?esc(d.toLocaleDateString(L.lang==="es"?"es":"en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})):esc(r.answer)}
 return esc(r.answer)}
const rvSub=r=>{const k=rvKind(r.kind);return k==="gender"||k==="number"||k==="age"?"":esc(r.sub||"")};
function balloonSVG(){return `<svg viewBox="0 0 240 240" class="rv-balloon" aria-hidden="true"><path class="rv-str" d="M120 196 q-8 20 6 44" stroke="var(--muted)" stroke-width="2.5" fill="none"/><g class="rv-bl"><ellipse cx="120" cy="104" rx="78" ry="92" fill="var(--rose)"/><ellipse cx="92" cy="70" rx="16" ry="26" fill="#fff" opacity=".35" transform="rotate(-24 92 70)"/><path d="M112 194 L128 194 L120 182Z" fill="var(--rose)"/></g>
 <g class="rv-burst">${Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;return `<line x1="${120+Math.cos(a)*60}" y1="${104+Math.sin(a)*60}" x2="${120+Math.cos(a)*112}" y2="${104+Math.sin(a)*112}" stroke="var(--gold)" stroke-width="6" stroke-linecap="round"/>`}).join("")}</g></svg>`}
function envelopeSVG(){return `<svg viewBox="0 0 240 240" class="rv-env" aria-hidden="true"><rect x="22" y="96" width="196" height="124" rx="10" fill="var(--violet)"/><g class="rv-flap"><path d="M22 100 L120 166 L218 100 L218 96 Q218 92 214 92 L26 92 Q22 92 22 96Z" fill="color-mix(in srgb,var(--violet) 80%,#000)"/><circle cx="120" cy="150" r="14" fill="var(--rose)"/><path d="M114 146 q6 -6 12 0 q-6 10 -6 10 q0 0 -6 -10Z" fill="#fff"/></g><path class="rv-front" d="M22 220 L22 104 L120 172 L218 104 L218 220Z" fill="color-mix(in srgb,var(--violet) 88%,#fff)"/></svg>`}
function curtainHTML(){return `<div class="rv-curt"><i class="l"></i><i class="r"></i><b></b></div>`}
function aiFrame(html,inner,lead,cls){const doc=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'unsafe-inline'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}.pk-content{pointer-events:none}</style></head><body>${html}<script>(function(){var c=document.querySelector('.pk-content');if(c)c.innerHTML=${JSON.stringify(inner).replace(/</g,"\\u003c")};setTimeout(function(){document.body.classList.add('open')},${Math.max(0,lead|0)})})()<\/script></body></html>`;
 return `<iframe class="rv-ai ${cls||""}" sandbox="allow-scripts" title="Reveal" srcdoc="${esc(doc)}"></iframe>`}
function revealMarkup(r,lead,photo,ai){const pack=rvPack(r.pack);const col=rvColor(r);const content=rvContent(r,photo,pack==="ai");let box;
 if(pack==="ai"&&ai&&ai.html)box=aiFrame(ai.html,content,lead);
 else if(pack==="balloon")box=`${balloonSVG()}<div class="rv-pop">${content}</div>`;
 else if(pack==="envelope")box=`<div class="rv-card"><div class="rv-cardin">${content}</div></div>${envelopeSVG()}`;
 else if(pack==="curtain")box=`<div class="rv-pop rv-stagepop">${content}</div>${curtainHTML()}`;
 else box=`${giftSVG()}<div class="rv-pop">${content}</div>`;
 const sub=rvSub(r);
 return `<div class="rv-bg" style="--rc:${col}"></div><div class="rv-in pk-${pack}" style="--lead:${lead}ms;--rc:${col}"><div class="rv-q">${esc(r.label||"")}</div><div class="rv-box">${box}</div><div class="rv-ans">${rvAnswer(r)}</div>${sub?`<div class="rv-sub">${sub}</div>`:""}${VIEW==="guest"?`<div class="rv-tap">${t("Tap anywhere to close")}</div>`:""}</div>`}
const RVP={};
async function revealPhoto(r){if(!r.photo)return null;if(RVP[r.t])return RVP[r.t];const v=(await ER("revealPhoto").once("value")).val();if(v)RVP[r.t]=v;return v}
function updateReveal(){let r=st().reveal;const el=$("#rv");if(!el||VIEW==="host"||VIEW==="print"||VIEW==="album"||VIEW==="keepsake"||VIEW==="moderator"||VIEW==="new")return;
 if(r&&C().reveal&&C().reveal.enabled===false)r=null;
 if(r&&now()-r.at>20*60000)r=null;
 if(r&&VIEW==="guest"&&store.get("rvx_"+EV,0)===r.t)r=null;
 const key=r?String(r.t):null;if(key===RV.key)return;RV.key=key;clearTimeout(RV.to);(RV.ticks||[]).forEach(clearTimeout);RV.ticks=[];
 if(!r){el.classList.remove("on","rv-done");el.innerHTML="";return}
 const raw=r.at-now(),done=raw<=0,lead=Math.max(0,raw);
 revealPhoto(r).then(photo=>{if(RV.key!==key)return;const lead2=Math.max(0,r.at-now());
  el.innerHTML=revealMarkup(r,done?0:lead2,photo,(C().reveal||{}).ai);el.classList.toggle("rv-done",done);el.classList.add("on");
  if(done)return;
  [3,2,1].forEach((n,i)=>RV.ticks.push(setTimeout(()=>{SND.tick();buzz(60)},Math.max(0,lead2-3000+i*1000))));
  RV.to=setTimeout(()=>{SND.win();buzz([120,60,240]);const g=rvKind(r.kind)==="gender";const c=g?(r.style==="boy"?["#3d8bff","#7cb8ff","#d6e9ff"]:["#ff5fa8","#ff8fc4","#ffd1e8"]):null;confettiColors(c,240)},lead2)})}

/* ---------- AI packaging ---------- */
function aiPrompt(desc){const cs=getComputedStyle(document.documentElement);const v=k=>cs.getPropertyValue(k).trim();
 return `Please design a reveal "package" for a party web app. It will be shown on a TV and on guests' phones.

What I want: ${desc||"(describe the packaging here)"}

Rules (please follow them exactly):
1. Reply with ONE code block of HTML that includes a <style> tag. Nothing else is needed.
2. No <script>, no onclick or other event attributes, no links, no external images, fonts or URLs. Draw everything with HTML, CSS and inline SVG.
3. The design fills a square box: make the outer element width:100% and height:100% of the page (the page has no margin).
4. Include exactly one empty element: <div class="pk-content"></div>. The app puts the answer inside it (a picture, a number or a star). Center it and keep it hidden or covered at first.
5. Closed state by default. When the app adds the class "open" to <body>, animate the opening with CSS only (transitions or keyframes, about 1 to 2 seconds), so that .pk-content becomes visible, larger and on top. Example selector: body.open .lid { transform: ... }
6. Use these party colors where they fit: ${["--rose","--violet","--gold","--leaf","--flame","--ground"].map(k=>v(k)).filter(Boolean).join(", ")}.
7. Keep it under 20 KB.`}
function aiClean(src){let s=String(src||"");const notes=[];const fence=/```(?:html)?\s*([\s\S]*?)```/i.exec(s);if(fence)s=fence[1];s=s.trim();
 const strip=(re,msg)=>{if(re.test(s)){s=s.replace(re,"");notes.push(msg)}};
 strip(/<script[\s\S]*?<\/script\s*>/gi,"Removed a script");strip(/<script[^>]*>/gi,"Removed a script");
 strip(/<\/?(iframe|object|embed|link|meta|base|form|input|button|textarea|frame|frameset|audio|video|source|portal)\b[^>]*>/gi,"Removed tags that aren't allowed");
 strip(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"Removed event attributes");
 strip(/javascript:/gi,"Removed a javascript: link");strip(/@import[^;]*;?/gi,"Removed an @import");
 strip(/url\(\s*['"]?\s*(https?:|\/\/)[^)]*\)/gi,"Removed outside images");strip(/\s(src|href|xlink:href)\s*=\s*("|')\s*(https?:|\/\/)[^"']*\2/gi,"Removed outside links");
 s=s.replace(/<\/?(html|head|body)[^>]*>/gi,"").replace(/<!doctype[^>]*>/gi,"").trim();
 const errs=[];if(!s)errs.push("Nothing to check yet. Paste Claude's reply first.");
 else{if(!/class\s*=\s*["'][^"']*\bpk-content\b/.test(s))errs.push('The design needs an element with class "pk-content" for the answer.');if(s.length>60000)errs.push("The design is too large (over 60 KB). Ask Claude for a simpler version.");
  if(!/\.open\b/.test(s))notes.push('No ".open" style found, so it may not animate when it opens.')}
 return {html:s,notes,errs,ok:!errs.length}}

/* ---------- moderator: Moments tab v2 ---------- */
function musicRow(m){const mu=(D.music||{})[m.id];const mb=x=>(x/1048576).toFixed(1)+" MB";
 return `<div class="stack tight musrow"><span class="small"><b>Song</b> ${hint("music")} (fades in when the moment starts, fades out when you take it off)</span>
 ${mu?`<div class="row"><span class="pill">🎵 ${esc(mu.name||"Song")} · ${mb(mu.size||0)}</span><button class="btn xs" data-act="musPrev" data-id="${esc(m.id)}">${L.musPrev===m.id?"Stop":"Play here"}</button><button class="btn xs" data-act="musDel" data-id="${esc(m.id)}">Remove</button></div>
  <div class="row"><label class="row small grow">Volume <input type="range" min="0" max="100" value="${Math.round((mu.vol!=null?mu.vol:.8)*100)}" data-act="musVol" data-id="${esc(m.id)}" aria-label="Volume"></label><label class="row small"><input type="checkbox" data-act="musLoop" data-id="${esc(m.id)}" ${mu.loop!==false?"checked":""}> Loop</label></div>`
 :`<div class="row"><label class="btn sm upl">${L.musUp===m.id?"Uploading…":"Upload a song"}<input type="file" accept="audio/*" data-act="musUp" data-id="${esc(m.id)}" aria-label="Upload a song"></label><span class="small muted">MP3 or M4A, best under 5 MB</span></div>`}</div>`}
function mMoments(){markSetup("moments");const ms=momentsList(),cur=st().moment;const h=D.honor||{};const hk=Object.keys(h).sort((a,b)=>(h[a].t||0)-(h[b].t||0));
 const card=(m,i)=>{const on=cur&&cur.id===m.id,ed=L.moEdit===i;const mu=(D.music||{})[m.id];const chk=(k,d)=>L.drafts["mo_"+k+"_"+i]!=null?L.drafts["mo_"+k+"_"+i]==="1":d;
  return `<div class="gamerow evrow mo-row ${on?"on":""}"><span class="gnum">${i+1}</span><div class="mw0"><b>${esc(m.name)}</b><div class="small muted">“${esc(fillH(m.title))}”${m.sub?` · ${esc(fillH(m.sub))}`:""}</div><div class="row small">${m.album?'<span class="pill">Guest photos</span>':""}${m.honor?'<span class="pill">Your photos</span>':""}${m.wishes?'<span class="pill">Wishes</span>':""}${moQR(m)?'<span class="pill">Join QR</span>':""}${moMenu(m)?'<span class="pill">Menu</span>':""}${mu?'<span class="pill">🎵 Song</span>':""}</div></div>
  <div class="row">${on?`<button class="btn sm" data-act="moStop">Take off the TV</button>`:`<button class="btn sm primary" data-act="moShow" data-id="${esc(m.id)}">Show on TV</button>`}<button class="btn sm" data-act="moEdit" data-i="${i}">${ed?"Close":"Edit"}</button></div>
  ${ed?`<div class="stack evfull qs"><div class="grid2 g8"><label class="stack tight"><span class="small"><b>Name</b> (for you)</span><input type="text" data-draft="mo_name_${i}" value="${esc(dv("mo_name_"+i,m.name))}"></label><label class="stack tight"><span class="small"><b>Big message on the TV</b></span><input type="text" data-draft="mo_title_${i}" value="${esc(dv("mo_title_"+i,m.title))}"></label></div>
   <label class="stack tight"><span class="small"><b>Smaller line</b> ({honorees} becomes the guests of honor)</span><input type="text" data-draft="mo_sub_${i}" value="${esc(dv("mo_sub_"+i,m.sub))}"></label>
   <div class="row">${[["album","Guest photos",m.album],["honor","Your photos",m.honor],["wishes","Wishes",m.wishes],["qr","Join QR code",moQR(m)],["menu","Menu",m.menu!=null?!!m.menu:m.id==="dinner"]].map(([k,l,d])=>`<label class="row small"><input type="checkbox" data-draft="mo_${k}_${i}" ${chk(k,d)?"checked":""}> ${l}</label>`).join("")}</div>
   ${musicRow(m)}
   <div class="row"><button class="btn primary" data-act="moSave" data-i="${i}">Save</button><button class="btn" data-act="moDel" data-i="${i}">Delete this moment</button></div></div>`:""}</div>`};
 return `<section class="card stack"><div class="row between"><h2>Moments ${hint("moments")}</h2><span class="small muted">${esc(typeDef().label)}</span></div>
 ${cur?`<div class="banner"><span>On the TV now: <b>${esc((ms.find(x=>x.id===cur.id)||{name:""}).name)}</b></span><button class="btn sm" data-act="moStop">Take it off</button></div>`:""}
 ${Object.keys(D.music||{}).length?`<p class="small muted m0">Songs play from the TV. When you open the big screen, tap <b>Tap to enable sound</b> once so the browser allows music.</p>`:""}
 ${ms.map(card).join("")}<button class="btn as" data-act="moAdd">Add a moment</button></section>
 <section class="card stack"><div class="row between"><h2>Your photos ${hint("honor")}</h2><label class="btn sm primary upl">${L.hUp?"Adding…":"Add photos"}<input type="file" accept="image/*" multiple data-act="honorUp" aria-label="Add photos"></label></div>
 ${hk.length?`<div class="album">${hk.map(k=>`<div class="hph"><img src="${h[k].thumb}" alt=""><button class="btn xs" data-act="honorDel" data-k="${k}">Remove</button></div>`).join("")}</div>`:'<p class="small muted m0">Add photos from the guests of honor, like baby pictures or engagement photos. They play in the TV slideshows.</p>'}</section>
 ${revealPanel()}
 <section class="card stack"><div class="row between"><h2>Evening order</h2><a class="btn sm" href="${esc(eventURL(EV,"print"))}" target="_blank" rel="noopener" data-act="markShare">Print the night-of cheat sheet</a></div><p class="small muted m0">A suggested order for a ${esc(typeDef().label.toLowerCase())}. Follow it top to bottom, or jump around.</p>
 <ol class="cheatlist">${orderSteps().map(s=>`<li><b>${esc(s.label)}</b><span class="small muted">${esc(s.how)}</span></li>`).join("")}</ol></section>`}
function revealPanel(){const rv=revealCfg(),sec=D.secret||{},live=st().reveal;const kind=rvKind(rv.kind),pack=rvPack(rv.pack),K=RV_KINDS[kind];const ans=sec.revealAnswer!=null?sec.revealAnswer:(rv.answer||"");
 let ansIn;
 if(kind==="gender")ansIn=`<select data-draft="rv_answer"><option value="girl" ${(dv("rv_answer",ans||"girl"))==="girl"?"selected":""}>It's a girl</option><option value="boy" ${(dv("rv_answer",ans))==="boy"?"selected":""}>It's a boy</option></select>`;
 else if(kind==="date")ansIn=`<input type="date" data-draft="rv_answer" value="${esc(dv("rv_answer",ans))}">`;
 else if(kind==="age"||kind==="number")ansIn=`<input type="number" data-draft="rv_answer" value="${esc(dv("rv_answer",ans))}">`;
 else ansIn=`<input type="text" data-draft="rv_answer" maxlength="80" value="${esc(dv("rv_answer",ans))}" placeholder="${kind==="surprise"||kind==="honor"?"Their name":"Your message"}">`;
 const ai=rv.ai||null,chk=L.rvAi;
 return `<section class="card stack"><div class="row between"><h2>The big reveal ${hint("reveal")}</h2><button class="toggle tg-sm" data-act="rvToggle" aria-pressed="${!!rv.enabled}"><span>${rv.enabled?"On":"Off"}</span><i></i></button></div>
 ${evType()==="baby"&&kind==="gender"?`<p class="small muted m0">Only use boy or girl if the parents-to-be haven't already shared it.</p>`:""}
 ${live&&!rv.enabled?`<div class="banner soft"><span>An old reveal is still saved.</span><button class="btn sm" data-act="rvStop">Clear it</button></div>`:""}
 ${rv.enabled?`<div class="grid2 g8"><label class="stack tight"><span class="small"><b>What are you revealing?</b></span><select data-act="rvKind">${Object.keys(RV_KINDS).map(k=>`<option value="${k}" ${k===kind?"selected":""}>${RV_KINDS[k].label}</option>`).join("")}</select></label>
  <label class="stack tight"><span class="small"><b>Question on the TV</b></span><input type="text" data-draft="rv_label" value="${esc(dv("rv_label",rv.label))}"></label>
  <label class="stack tight"><span class="small"><b>${kind==="date"?"The date":kind==="age"?"The age":kind==="number"?"The number":kind==="gender"?"The answer":kind==="custom"?"The message":"Their name"}</b> (hidden from guests)</span>${ansIn}</label>
  ${kind==="gender"||kind==="age"?"":`<label class="stack tight"><span class="small"><b>${kind==="number"?"Words after the number":"Smaller line"}</b></span><input type="text" data-draft="rv_sub" value="${esc(dv("rv_sub",rv.sub||""))}" placeholder="${esc(K.sub||"")}"></label>`}</div>
  ${K.photo?`<div class="row">${sec.revealPhoto?`<img class="rvthumb" src="${sec.revealPhoto}" alt="">`:""}<label class="btn sm upl">${sec.revealPhoto?"Change the photo":"Add their photo"}<input type="file" accept="image/*" data-act="rvPhoto"></label>${sec.revealPhoto?'<button class="btn xs" data-act="rvPhotoDel">Remove</button>':""}<span class="small muted">Hidden until the reveal starts.</span></div>`:""}
  <div class="stack tight"><span class="small"><b>Packaging</b></span><div class="row">${Object.keys(RV_PACKS).map(p=>`<button class="chip ${p===pack?"on":""}" data-act="rvPack" data-v="${p}" aria-pressed="${p===pack}">${RV_PACKS[p]}</button>`).join("")}</div></div>
  ${pack==="ai"?`<div class="stack tight qs aibox"><p class="small m0"><b>Design your own packaging with Claude.</b> Describe it, copy the request into Claude, then paste Claude's reply below. The app checks it and plays it safely in a sealed frame.</p>
   <textarea rows="2" data-draft="rv_aidesc" placeholder="A treasure chest that creaks open with gold sparkles">${esc(dv("rv_aidesc",(ai&&ai.desc)||""))}</textarea>
   <div class="row"><button class="btn sm" data-act="rvAiCopy">Copy the request for Claude</button><a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a></div>
   <textarea rows="4" class="mono" data-draft="rv_aipaste" placeholder="Paste Claude's reply here">${esc(dv("rv_aipaste",""))}</textarea>
   <div class="row"><button class="btn sm primary" data-act="rvAiCheck">Check it</button>${ai&&ai.html?`<span class="pill ok">Saved design${ai.desc?": "+esc(ai.desc.slice(0,40)):""}</span>`:""}</div>
   ${chk?`${chk.errs.map(e=>`<div class="banner warn"><span>${esc(e)}</span></div>`).join("")}${chk.notes.map(e=>`<p class="small muted m0">• ${esc(e)}</p>`).join("")}${chk.ok?`<div class="rvprev small">${aiFrame(chk.html,rvContent({kind:"custom",placeholder:true},null,true),1200,"prev")}</div><div class="row"><button class="btn sm" data-act="rvAiCheck">Play again</button><button class="btn sm primary" data-act="rvAiSave">Use this design</button></div>`:""}`:""}
   ${!ai||!ai.html?`<p class="small muted m0">Until you save a design, the gift box is used.</p>`:""}</div>`:""}
  <div class="row"><button class="btn sm" data-act="rvPreview">${L.rvPrev?"Close preview":"Preview the packaging"}</button><span class="small muted">The preview hides the answer.</span></div>
  ${L.rvPrev?`<div class="rvprev" id="rvprev">${revealMarkup({kind,label:dv("rv_label",rv.label),pack,placeholder:true,sub:""},1500,null,pack==="ai"?ai:null)}</div>`:""}
  ${live?`<div class="banner"><span>The reveal is showing on the TV and every phone now.</span></div>`:""}<div class="row"><button class="btn" data-act="rvSave">Save</button>${live?`<button class="btn" data-act="rvStop">Hide the reveal</button>`:L.confirm==="reveal"?`<span class="small">Everyone will see it now.</span><button class="btn gold" data-act="rvStart">Yes, reveal it!</button><button class="btn sm" data-act="cancelConfirm">Not yet</button>`:`<button class="btn primary" data-act="rvAsk">Start the reveal</button>`}</div>`:'<p class="small muted m0">Turn it on to set up a reveal for the TV and every phone: boy or girl, a wedding date, a birthday age, a surprise guest, someone you\'re honoring, or your own message.</p>'}</section>`}

/* ---------- actions ---------- */
const rvDraft=(k,d)=>L.drafts[k]!=null?L.drafts[k]:d;
Object.assign(ACT,{
 moSave:el=>{const i=+el.dataset.i,list=momentsList();const m=list[i];if(!m)return;const g=(k,d)=>L.drafts[`mo_${k}_${i}`]!=null?L.drafts[`mo_${k}_${i}`]:d;const b=(k,d)=>g(k,d?"1":"0")==="1";
  list[i]=Object.assign({},m,{name:g("name",m.name).trim()||m.name,title:g("title",m.title),sub:g("sub",m.sub),album:b("album",m.album),honor:b("honor",m.honor),wishes:b("wishes",m.wishes),qr:b("qr",moQR(m)),menu:b("menu",m.menu!=null?!!m.menu:m.id==="dinner")});
  ER("content/moments").set(list).then(()=>{L.moEdit=null;Object.keys(L.drafts).filter(k=>/^mo_/.test(k)).forEach(k=>delete L.drafts[k]);toast("Moment saved");render(true)})},
 musUp:el=>{const f=el.files[0],id=el.dataset.id;if(!f)return;if(!/^audio\//.test(f.type)&&!/\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name))return toast("Pick a song file (MP3 or M4A)");
  if(f.size>7*1048576)return toast("That song is over 7 MB. Pick a shorter song or a smaller file.");
  if(f.size>4*1048576)toast("Big song. It may take a few seconds to start on the TV.");
  L.musUp=id;render(true);const rd=new FileReader();rd.onload=()=>{ER("musicData/"+id).set(rd.result).then(()=>ER("music/"+id).set({name:f.name.replace(/\.[^.]+$/,"").slice(0,60),size:f.size,t:Date.now(),vol:.8,loop:true})).then(()=>{L.musUp=null;toast("Song added");render(true)}).catch(()=>{L.musUp=null;toast("The song didn't upload. Try a smaller file.");render(true)})};rd.readAsDataURL(f)},
 musDel:el=>{const id=el.dataset.id;ER("music/"+id).remove();ER("musicData/"+id).remove();if(L.musPrev===id){musStopPrev()}},
 musVol:el=>{ER("music/"+el.dataset.id+"/vol").set(Math.max(0,Math.min(1,(+el.value||0)/100)));if(window._musA)window._musA.volume=(+el.value||0)/100},
 musLoop:el=>ER("music/"+el.dataset.id+"/loop").set(!!el.checked),
 musPrev:async el=>{const id=el.dataset.id;if(L.musPrev===id){musStopPrev();return render(true)}musStopPrev();L.musPrev=id;render(true);const d=(await ER("musicData/"+id).once("value")).val();if(!d||L.musPrev!==id)return;const a=new Audio(d);a.volume=((D.music||{})[id]||{}).vol||.8;window._musA=a;a.play().catch(()=>{});a.onended=()=>{musStopPrev();render(true)}},
 rvToggle:()=>{const r=revealCfg();const on=!r.enabled;ER("content/reveal").update({enabled:on,kind:rvKind(r.kind),label:r.label,sub:r.sub||""}).then(()=>{if(!on){setState({reveal:null});ER("revealPhoto").remove();L.confirm=null}})},
 rvKind:el=>{const k=el.value,K=RV_KINDS[k];["rv_label","rv_sub","rv_answer"].forEach(x=>delete L.drafts[x]);ER("content/reveal").update({kind:k,label:K.q,sub:K.sub||""});ER("secret/revealAnswer").set(k==="gender"?"girl":"")},
 rvPack:el=>ER("content/reveal/pack").set(el.dataset.v),
 rvPhoto:el=>{const f=el.files[0];if(!f)return;shrinkImage(f,700,.75,img=>ER("secret/revealPhoto").set(img).then(()=>toast("Photo saved, hidden until the reveal")))},
 rvPhotoDel:()=>ER("secret/revealPhoto").remove(),
 rvPreview:()=>{L.rvPrev=!L.rvPrev;render(true)},
 rvAiCopy:()=>{const txt=aiPrompt((L.drafts.rv_aidesc||"").trim());const done=()=>toast("Copied. Paste it into Claude.");if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>{L.rvAiTxt=txt;render(true)});else{L.rvAiTxt=txt;render(true)}},
 rvAiCheck:()=>{L.rvAi=aiClean(L.drafts.rv_aipaste||"");render(true)},
 rvAiSave:()=>{const c=L.rvAi;if(!c||!c.ok)return;ER("content/reveal/ai").set({html:c.html,desc:(L.drafts.rv_aidesc||"").slice(0,120),t:Date.now()}).then(()=>{L.rvAi=null;delete L.drafts.rv_aipaste;toast("Design saved");render(true)})},
 rvSave:async()=>{const r=revealCfg();const kind=rvKind(r.kind);const label=String(rvDraft("rv_label",r.label)).trim()||r.label;const sub=rvDraft("rv_sub",r.sub||"");
  const ans=rvDraft("rv_answer",(D.secret||{}).revealAnswer!=null?D.secret.revealAnswer:(r.answer||(kind==="gender"?"girl":"")));
  await ER("content/reveal").update({enabled:true,kind,label,sub});await ER("secret/revealAnswer").set(String(ans==null?"":ans));toast("Reveal saved")},
 rvStart:async()=>{const r=revealCfg();const kind=rvKind(r.kind);const sec=D.secret||{};
  const ans=String(rvDraft("rv_answer",sec.revealAnswer!=null?sec.revealAnswer:(r.answer||(kind==="gender"?"girl":""))));
  if(!ans&&kind!=="gender")return toast("Enter the answer first");if(kind==="date"&&!parseDay(ans))return toast("Pick the date first");
  const label=rvDraft("rv_label",r.label);const sub=rvDraft("rv_sub",r.sub||"");const photo=RV_KINDS[kind].photo&&sec.revealPhoto?sec.revealPhoto:null;
  await ER("secret/revealAnswer").set(ans);if(photo)await ER("revealPhoto").set(photo);else await ER("revealPhoto").remove();
  L.confirm=null;const lead=rvPack(r.pack)==="balloon"?5000:4500;
  setState({moment:null,reveal:{t:now(),at:now()+lead,kind,label,answer:kind==="gender"?"":ans,style:kind==="gender"?(ans==="boy"?"boy":"girl"):null,sub,pack:rvPack(r.pack),photo:!!photo}});toast("Revealing on every screen!")},
 rvStop:()=>{setState({reveal:null});ER("revealPhoto").remove()}
});
function musStopPrev(){if(window._musA){window._musA.pause();window._musA=null}L.musPrev=null}
document.addEventListener("click",e=>{const r=e.target.closest&&e.target.closest("#rv");if(r&&VIEW==="guest"){const s=st().reveal;if(s&&now()>s.at+1500){store.set("rvx_"+EV,s.t)}}},true);

