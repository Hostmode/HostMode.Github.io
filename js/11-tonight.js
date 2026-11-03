/* ================= TONIGHT TAB: run of show, diaper raffle, gift log ================= */
D.raf={};D.rafWins={};D.gifts={};D.rosDone={};D.rosShifts={};D.rosFlags={};
const normName=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");
const _subTonight=subscribeEvent;
subscribeEvent=function(){_subTonight();
 if(VIEW==="moderator"||VIEW==="screen"){ER("raffle").on("value",s=>{D.raf=s.val()||{};renderSoon()});ER("rafWins").on("value",s=>{D.rafWins=s.val()||{};renderSoon()})}
 if(VIEW==="moderator"){ER("gifts").on("value",s=>{D.gifts=s.val()||{};renderSoon()});ER("rosDone").on("value",s=>{D.rosDone=s.val()||{};renderSoon()});ER("rosShifts").on("value",s=>{D.rosShifts=s.val()||{};renderSoon()});ER("rosFlags").on("value",s=>{D.rosFlags=s.val()||{};renderSoon()})}};
let guestNames=()=>ids().filter(i=>!P(i).bot).map(i=>P(i).name).filter(Boolean);
const nameList=id=>`<datalist id="${id}">${[...new Set(guestNames())].sort().map(n=>`<option value="${esc(n)}"></option>`).join("")}</datalist>`;
const helperName=id=>id&&String(id).startsWith("v:")?(((D.evVen||{})[String(id).slice(2)]||{}).name||"A vendor")+" (vendor)":id&&(D.mods||{})[id]?D.mods[id].name:"Everyone";

/* ---- run of show ---- */
function rosDefault(){const baby=evType()==="baby",raf=rafCfg(),ord=C().order||[],moms=C().moments||[];
 const has=id=>Array.isArray(moms)?moms.some(m=>m&&m.id===id):!!moms[id];const out=[];const add=(t,n,x)=>out.push([t,n,x||""]);
 add("15:00","Doors open",raf.on?(baby?"Greet guests. Check diaper packs and add them to the raffle.":"Greet guests and add raffle entries."):"Greet guests.");
 add("15:15","Team Splitter and Long Word Wins","Icebreakers. Start them from the Live tab.");add("15:30","Open the Scavenger Hunt","It runs in the background all night.");add("15:45","Trivia");
 if(has("dinner"))add("16:15","Dinner is served","Show the Dinner moment on the big screen.");
 if(giftOn())add("16:45","Gift opening","Log each gift on the Tonight tab for the thank-you notes.");else if(has("gifts"))add("16:45","Gift opening");
 add("17:15","Crossword and Superlatives");if(ord.includes("reveal"))add("17:40","The reveal");
 if(raf.on)add("17:50",raf.name+" draw","Draw the winner on the big screen.");
 add("18:00","Bingo, then crown the winners");add("18:30","Farewell and cleanup","Collect decorations"+(giftOn()?" and the gift list.":"."));return out}
const rosItems=()=>{const r=C().ros||{};return Object.keys(r).map(k=>Object.assign({k},r[k])).sort((a,b)=>(a.time||"").localeCompare(b.time||"")||(a.t||0)-(b.t||0))};
const fmtTime=t=>{if(!t)return "";const [h,m]=t.split(":").map(Number);if(isNaN(h))return t;return `${(h%12)||12}:${String(m||0).padStart(2,"0")} ${h<12?"AM":"PM"}`};
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
function rosIsToday(){const d=C().date;return !!d&&d===todayISO()}
function rosLate(x){if(!x.time||(D.rosDone||{})[x.k]||!rosIsToday())return false;const [h,m]=x.time.split(":").map(Number);const n=new Date();return n.getHours()*60+n.getMinutes()>h*60+m+10}
const rosMine=x=>!x.who||x.who===L.modId;
function rosRow(x,i,next){const done=(D.rosDone||{})[x.k],late=rosLate(x),ed=L.rosEdit===x.k;
 if(ed)return `<div class="gamerow evrow on stack"><div class="grid2 g8"><label class="stack tight"><span class="small">Time</span><input type="time" data-draft="re_time" value="${esc(dv("re_time",x.time||""))}"></label>
  <label class="stack tight"><span class="small">Who</span><select data-draft="re_who">${rosWhoOpts(dv("re_who",x.who||""))}</select></label>
  <label class="stack tight"><span class="small">What</span><input type="text" data-draft="re_title" value="${esc(dv("re_title",x.title||""))}"></label>
  <label class="stack tight"><span class="small">Note (optional)</span><input type="text" data-draft="re_note" value="${esc(dv("re_note",x.note||""))}"></label></div>
  <div class="row"><button class="btn sm primary" data-act="rosSave" data-k="${x.k}">Save</button><button class="btn sm" data-act="rosCancel">Cancel</button><button class="btn sm" data-act="rosDel" data-k="${x.k}">Delete</button></div></div>`;
 return `<div class="gamerow evrow ${done?"dim":""} ${next?"on":""}"><span class="gnum rostime">${esc(fmtTime(x.time))||"·"}</span><div class="mw0"><b>${esc(x.title||"")}</b> ${done?`<span class="pill ok">✓ Done</span>`:late?'<span class="pill warn">Running late</span>':next?'<span class="pill live">Up next</span>':""}
  <div class="small muted">${esc(helperName(x.who))}${x.note?" · "+esc(x.note):""}${done?` · checked off by ${esc(done.by||"a teammate")}`:""}</div></div>
  ${rosFlagList(x.k)}${L.rosFlag===x.k?`<div class="row"><input type="text" class="grow" data-draft="rf_text" maxlength="200" value="${esc(dv("rf_text",""))}" placeholder="Cake hasn't arrived" aria-label="What's wrong"><button class="btn xs primary" data-act="rosFlagSave" data-k="${x.k}">Flag it</button><button class="btn xs" data-act="rosFlagOpen" data-k="">Cancel</button></div>`:""}</div>
  <div class="row"><button class="btn sm ${done?"":"primary"}" data-act="rosDone" data-k="${x.k}">${done?"Undo":"Done"}</button><button class="btn sm" data-act="rosEditOpen" data-k="${x.k}" aria-label="Edit ${esc(x.title||"")}">Edit</button>${done?"":`<button class="btn sm" data-act="rosFlagOpen" data-k="${x.k}" aria-label="Flag a problem with ${esc(x.title||"")}">Flag</button>`}</div></div>`}
function rosWhoOpts(sel){const m=D.mods||{},vs=D.evVen||{};return `<option value="">Everyone</option>${Object.keys(m).map(id=>`<option value="${id}" ${sel===id?"selected":""}>${esc(m[id].name)}</option>`).join("")}${Object.keys(vs).length?`<optgroup label="Vendors">${Object.keys(vs).map(k=>`<option value="v:${esc(k)}" ${sel==="v:"+k?"selected":""}>${esc(vs[k].name||"Vendor")}${vs[k].role?" · "+esc(vs[k].role):""}</option>`).join("")}</optgroup>`:""}`}
function rosSection(){const items=rosItems(),nextI=items.findIndex(x=>!(D.rosDone||{})[x.k]);const done=items.filter(x=>(D.rosDone||{})[x.k]).length;
 const mine=L.modId?items.filter(x=>x.who===L.modId&&!(D.rosDone||{})[x.k]):[];
 return `<section class="card stack gilt"><div class="row between"><h2>Run of show</h2>${items.length?`<span class="pill">${done} of ${items.length} done</span>`:""}</div>
 ${mine.length?`<div class="nudge"><b>Your jobs:</b> ${mine.map(x=>`${esc(fmtTime(x.time))} ${esc(x.title)}`).join(" · ")}</div>`:""}
 ${items.length&&nextI>=0?rosLateBox():""}
 ${items.length?`<div class="stack tight">${items.map((x,i)=>rosRow(x,i,i===nextI)).join("")}</div>`:`<p class="small muted m0">Plan the evening hour by hour and give each job to a teammate. Start from the suggested plan and change anything.</p><button class="btn primary as" data-act="rosStarter">Use the suggested plan</button>`}
 <details class="stack"><summary class="small"><b>Add a step</b></summary><div class="grid2 g8"><label class="stack tight"><span class="small">Time</span><input type="time" data-draft="rn_time" value="${esc(dv("rn_time",""))}"></label>
  <label class="stack tight"><span class="small">Who</span><select data-draft="rn_who">${rosWhoOpts(dv("rn_who",""))}</select></label>
  <label class="stack tight"><span class="small">What</span><input type="text" data-draft="rn_title" value="${esc(dv("rn_title",""))}" placeholder="Cut the cake"></label>
  <label class="stack tight"><span class="small">Note (optional)</span><input type="text" data-draft="rn_note" value="${esc(dv("rn_note",""))}"></label></div><button class="btn sm primary as" data-act="rosAdd">Add step</button></details>
 ${Object.keys(D.mods||{}).length?"":`<p class="small muted m0">Add teammates on the Event tab, then assign them steps here. Each teammate sees their own jobs when they sign in.</p>`}</section>${done?rosRecord():""}`}
/* ---- running late, flags and the after-event record ----
   events/{EV}/rosShifts/{k} = {mins, by, t, prev:{stepKey:"HH:MM"}}   a "running late" shift of every step not done yet; prev undoes it
   events/{EV}/rosFlags/{step}/{k} = {text, by, t, ok}                 a problem on one step
   Vendor pages read the same steps, so moved times show on every vendor's phone right away. */
const rosAdd=(t,m)=>{if(!/^\d{1,2}:\d{2}/.test(t||""))return t;const [h,mi]=t.split(":").map(Number),v=Math.min(23*60+59,Math.max(0,h*60+mi+m));return String(Math.floor(v/60)).padStart(2,"0")+":"+String(v%60).padStart(2,"0")};
const rosMin=t=>{const [h,m]=String(t||"").split(":").map(Number);return isNaN(h)?null:h*60+(m||0)};
const rosShiftList=()=>Object.keys(D.rosShifts||{}).map(k=>Object.assign({k},D.rosShifts[k])).sort((a,b)=>(a.t||0)-(b.t||0));
const rosFlagsOf=k=>Object.keys((D.rosFlags||{})[k]||{}).map(f=>Object.assign({f},D.rosFlags[k][f])).sort((a,b)=>(a.t||0)-(b.t||0));
const rosFlagList=k=>{const l=rosFlagsOf(k);return l.length?`<div class="stack tight">${l.map(f=>`<div class="small ${f.ok?"muted":"bad"}">🚩 ${esc(f.text)} <span class="muted">· ${esc(f.by||"")}</span>${f.ok?" · handled":` <button class="btn xs" data-act="rosFlagOk" data-k="${k}" data-f="${esc(f.f)}">Handled</button>`}</div>`).join("")}</div>`:""};
/* the time a step was first planned for, before any running-late shifts */
/* lateness only counts for steps ticked off on the event day itself (not practice runs) */
const rosOnDay=t=>{const d=new Date(t);return C().date===`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const rosPlanned=x=>{const s=rosShiftList().find(z=>z.prev&&z.prev[x.k]);return s?s.prev[x.k]:x.time};
function rosLateBox(){const sh=rosShiftList(),last=sh[sh.length-1],total=sh.reduce((n,z)=>n+(+z.mins||0),0);
 return `<div class="row rosLate"><span class="small"><b>Running late?</b></span><select data-draft="rl_mins" aria-label="How many minutes late">${[5,10,15,20,30,45,60].map(m=>`<option value="${m}" ${String(dv("rl_mins","15"))===String(m)?"selected":""}>${m} minutes</option>`).join("")}</select><button class="btn sm" data-act="rosShift">Move the rest later</button>
 ${last?`<span class="small muted">${total>0?`Running ${total} min behind`:"Back on the plan"} · last moved ${esc(supTime(last.t))} by ${esc(last.by||"a teammate")}</span><button class="btn xs" data-act="rosShiftUndo" data-k="${esc(last.k)}">Undo that</button>`:`<span class="small muted">Every step not done yet moves, and vendors see the new times on their phones.</span>`}</div>`}
function rosRecord(){const items=rosItems(),done=D.rosDone||{},rows=items.map(x=>{const d=done[x.k],p=rosPlanned(x),pm=rosMin(p);let diff=null;if(d&&d.t&&pm!=null&&rosOnDay(d.t)){const t=new Date(d.t);diff=t.getHours()*60+t.getMinutes()-pm}return {x,d,p,diff}});
 const timed=rows.filter(r=>r.diff!=null),late=timed.filter(r=>r.diff>5),flags=items.reduce((n,x)=>n+rosFlagsOf(x.k).length,0),sh=rosShiftList();
 const lbl=r=>r.diff==null?(r.d?"done":"not done"):r.diff>5?`${r.diff} min late`:r.diff<-5?`${-r.diff} min early`:"on time";
 return `<section class="card stack"><div class="row between"><h3>How the event ran</h3><button class="btn xs" data-act="rosRecordCopy">Copy for the debrief</button></div>
 <div class="row">${imPill(timed.length-late.length,"on time","ok")}${imPill(late.length,"ran late","warn")}${imPill(sh.length,sh.length===1?"time the schedule moved":"times the schedule moved","gold")}${imPill(flags,flags===1?"problem flagged":"problems flagged","")}</div>
 <div class="stack tight">${rows.map(r=>`<div class="row between small clrow"><span class="mw0"><b>${esc(r.x.title||"")}</b><span class="db muted">Planned ${esc(fmtTime(r.p)||"—")}${r.d&&r.d.t?" · done "+esc(new Date(r.d.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}))+(r.d.by?" by "+esc(r.d.by):""):""}</span></span><span class="pill ${r.diff!=null&&r.diff>5?"warn":r.d?"ok":""}">${lbl(r)}</span></div>`).join("")}</div>
 ${sh.length?`<div class="small muted">${sh.map(z=>`${+z.mins>0?"Moved "+z.mins+" min later":"Moved "+(-z.mins)+" min earlier"} at ${esc(new Date(z.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}))} by ${esc(z.by||"a teammate")}`).join(" · ")}</div>`:""}</section>`}
function rosRecordText(){const items=rosItems(),done=D.rosDone||{};
 return `How ${C().title||"the event"} ran\n\n`+items.map(x=>{const d=done[x.k],p=rosPlanned(x),pm=rosMin(p);let s=`- ${x.title} (planned ${fmtTime(p)||"no time"})`;if(d&&d.t){const t=new Date(d.t),diff=pm==null||!rosOnDay(d.t)?null:t.getHours()*60+t.getMinutes()-pm;s+=`: done ${t.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`+(diff==null?"":diff>5?`, ${diff} min late`:diff<-5?`, ${-diff} min early`:", on time")}else s+=": not done";
  rosFlagsOf(x.k).forEach(f=>s+=`\n  Problem: ${f.text}`);return s}).join("\n")+(rosShiftList().length?`\n\nSchedule moves: `+rosShiftList().map(z=>`${z.mins} min at ${new Date(z.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`).join(", "):"")}
Object.assign(ACT,{
 rosShift:async()=>{const mins=+dv("rl_mins","15")||15,prev={},u={};rosItems().filter(x=>!(D.rosDone||{})[x.k]&&x.time).forEach(x=>{prev[x.k]=x.time;u[x.k+"/time"]=rosAdd(x.time,mins)});
  if(!Object.keys(prev).length)return toast("Every step with a time is already done");await ER("content/ros").update(u);await ER("rosShifts").push().set({mins,by:L.modName||"A teammate",t:Date.now(),prev});toast(`Moved ${Object.keys(prev).length} steps ${mins} minutes later`)},
 rosShiftUndo:async el=>{const z=(D.rosShifts||{})[el.dataset.k];if(!z)return;const u={};Object.keys(z.prev||{}).forEach(k=>{if((C().ros||{})[k])u[k+"/time"]=z.prev[k]});if(Object.keys(u).length)await ER("content/ros").update(u);await ER("rosShifts/"+el.dataset.k).remove();toast("Put the times back")},
 rosFlagOpen:el=>{L.rosFlag=el.dataset.k||null;delete L.drafts.rf_text;render(true)},
 rosFlagSave:async el=>{const text=String(dv("rf_text","")).trim().slice(0,200);if(!text)return toast("Say what's wrong");await ER("rosFlags/"+el.dataset.k).push().set({text,by:L.modName||"A teammate",t:Date.now(),ok:false});delete L.drafts.rf_text;L.rosFlag=null;buzz(30);render(true)},
 rosFlagOk:async el=>{await ER(`rosFlags/${el.dataset.k}/${el.dataset.f}/ok`).set(true)},
 rosRecordCopy:async()=>{const t=rosRecordText();try{await navigator.clipboard.writeText(t);toast("Copied")}catch(e){prompt("Copy this",t)}}
});

/* ---- diaper raffle ---- */
/* Baby showers start with the diaper raffle on. Every other event gets a general raffle, off until someone turns it on. */
function rafCfg(){const r=C().raffle||{},baby=evType()==="baby",min=+(C().raffleMin||70);
 const base=baby?{name:"Diaper raffle",rule:`Only guests who bring a pack of ${min} or more diapers. One entry each, however many packs.`,gift:`Diapers (pack of ${min}+)`}:{name:"Raffle",rule:"One entry per guest.",gift:""};
 return {on:r.on!=null?!!r.on:baby,name:r.name||base.name,rule:r.rule!=null?r.rule:base.rule,gift:giftOn()?(r.gift!=null?r.gift:base.gift):"",giftSet:r.gift!=null?r.gift:base.gift,baby}}
const rafList=()=>Object.keys(D.raf||{}).map(k=>Object.assign({k},D.raf[k])).sort((a,b)=>(a.t||0)-(b.t||0));
const rafWon=()=>Object.keys(D.rafWins||{}).map(k=>D.rafWins[k]).sort((a,b)=>(a.t||0)-(b.t||0));
function rafSection(){const cfg=rafCfg();
 if(!cfg.on)return `<section class="card row between"><div><h2>Raffle</h2><p class="small muted m0">Optional. Teammates enter guests by name, one entry each, and you draw the winner on the big screen.</p></div><button class="btn sm" data-act="rafOn">Add a raffle</button></section>`;
 const list=rafList(),won=rafWon(),wonSet=new Set(won.map(w=>normName(w.name))),left=list.filter(x=>!wonSet.has(normName(x.name))).length;const r=st().raffle,onTv=r&&typeof r==="object"&&r.show;
 return `<section class="card stack gilt"><div class="row between"><h2>${esc(cfg.name)}</h2><span class="pill gold">${list.length} entered</span></div>
 ${cfg.rule?`<p class="small muted m0">${esc(cfg.rule)}</p>`:""}
 <div class="row"><input type="text" class="grow" list="rafNames" data-draft="raf_name" value="${esc(dv("raf_name",""))}" placeholder="Guest's name" aria-label="Guest's name" autocomplete="off">${nameList("rafNames")}<button class="btn primary" data-act="rafAdd">Add to raffle</button></div>
 ${cfg.gift?`<label class="row small"><input type="checkbox" data-draft="raf_log" ${dv("raf_log","1")==="1"?"checked":""}> Also add “${esc(cfg.gift)}” to the gift log</label>`:""}
 ${list.length?`<div class="chips">${list.map(x=>`<span class="pill ${wonSet.has(normName(x.name))?"gold":""}">${wonSet.has(normName(x.name))?"🏆 ":""}${esc(x.name)} <button class="x" data-act="rafDel" data-k="${x.k}" aria-label="Remove ${esc(x.name)}">×</button></span>`).join("")}</div>`:'<p class="small muted m0">No entries yet.</p>'}
 <div class="row">${onTv?`<button class="btn" data-act="rafHide">Take it off the big screen</button>`:`<button class="btn gold" data-act="rafDraw" ${left?"":"disabled"}>${won.length?"Draw another winner":"Draw the winner on the big screen"}</button>`}</div>
 ${won.length?`<p class="m0">Winner${won.length>1?"s":""}: ${won.map(w=>`<b>${esc(w.name)}</b>`).join(", ")}</p>`:""}
 <details><summary class="small">Raffle settings</summary><div class="stack tight">
  <label class="stack tight"><span class="small">Name</span><input type="text" data-draft="rs_name" value="${esc(dv("rs_name",cfg.name))}" placeholder="Raffle"></label>
  <label class="stack tight"><span class="small">Who can enter (shown to teammates)</span><input type="text" data-draft="rs_rule" value="${esc(dv("rs_rule",cfg.rule))}" placeholder="One entry per guest."></label>
  <label class="stack tight"><span class="small">Also log as a gift (optional)</span><input type="text" data-draft="rs_gift" value="${esc(dv("rs_gift",cfg.giftSet))}" placeholder="Leave blank to skip"></label>${giftOn()?"":`<span class="small muted">Turn on the gift log to use this.</span>`}
  <div class="row"><button class="btn sm primary" data-act="rafCfgSave">Save</button><button class="btn sm" data-act="rafOff">Turn the raffle off</button></div></div></details></section>`}
const RAF_MS=5200;
function rafStage(r){const names=r.names&&r.names.length?r.names:[r.winner];const done=now()-r.t>RAF_MS;
 if(!done)setTimeout(()=>renderSoon(),Math.max(50,RAF_MS-(now()-r.t)+60));
 const cfg=rafCfg();return `<div class="eyebrow">${esc(cfg.name)}</div>${done?`<div class="winner gilt-text pop">${esc(r.winner)}</div><p class="muted">Congratulations!${cfg.baby&&/diaper/i.test(cfg.name)?" Thank you to everyone who brought diapers.":""}</p>`:`<div class="rafreel" id="rafReel">${esc(names[0])}</div><p class="muted">${names.length} guest${names.length===1?"":"s"} in the draw</p>`}`}
const _bsTonight=bigscreen;
bigscreen=function(){const r=st().raffle;if(r&&typeof r==="object"&&r.show)return `<div class="tv one"><section class="stage rafstage">${rafStage(r)}</section></div>`;return _bsTonight()};
if(VIEW==="screen")setInterval(()=>{const r=st().raffle;if(!r||typeof r!=="object"||!r.show)return;const el=$("#rafReel"),el2=document.querySelector(".rafstage .winner");
 if(el){const names=r.names&&r.names.length?r.names:[r.winner];const p=(now()-r.t)/RAF_MS,step=Math.floor(Math.pow(Math.min(p,1),.55)*names.length*6);el.textContent=names[step%names.length]}
 if(el2&&L.rafCel!==r.t){L.rafCel=r.t;confetti(200);try{SND.win()}catch(e){}}},80);

/* ---- gift log ---- */
const giftList=()=>Object.keys(D.gifts||{}).map(k=>Object.assign({k},D.gifts[k])).sort((a,b)=>(a.t||0)-(b.t||0));
const giftOn=()=>{const c=C().giftLog||{};return c.on!=null?!!c.on:Object.keys(D.gifts||{}).length>0};
function giftSection(){if(!giftOn())return `<section class="card row between"><div><h2>Gift log</h2><p class="small muted m0">Optional. Teammates note who gave what as gifts are opened, and you get a list for thank-you notes.</p></div><button class="btn sm" data-act="gfOn">Add a gift log</button></section>`;
 const g=giftList(),thanked=g.filter(x=>x.thanked).length;const hon=C().honorees||"the guests of honor";
 return `<section class="card stack"><div class="row between"><h2>Gift log</h2><span class="pill">${g.length} gift${g.length===1?"":"s"}</span></div>
 <p class="small muted m0">Jot down each gift as it's opened. ${esc(hon)} gets a tidy list for the thank-you notes.</p>
 <div class="grid2 g8"><label class="stack tight"><span class="small">From</span><input type="text" list="giftNames" data-draft="gf_from" value="${esc(dv("gf_from",""))}" placeholder="Guest's name" autocomplete="off">${nameList("giftNames")}</label>
 <label class="stack tight"><span class="small">Gift</span><input type="text" data-draft="gf_gift" value="${esc(dv("gf_gift",""))}" placeholder="Stroller, books, a quilt…"></label></div>
 <button class="btn primary as" data-act="gfAdd">Add gift</button>
 ${g.length?`<div class="stack tight">${g.map(x=>`<div class="gamerow evrow ${x.thanked?"dim":""}"><span class="gnum">🎁</span><div class="mw0"><b>${esc(x.from)}</b><div class="small muted">${esc(x.gift)}</div></div><div class="row"><label class="row small"><input type="checkbox" data-act="gfThank" data-k="${x.k}" ${x.thanked?"checked":""}> Thanked</label><button class="btn sm" data-act="gfDel" data-k="${x.k}" aria-label="Remove gift from ${esc(x.from)}">Remove</button></div></div>`).join("")}</div>
  <div class="row"><button class="btn sm" data-act="gfCopy">Copy the list</button><button class="btn sm" data-act="gfCsv">Download for thank-you notes</button><span class="small muted">${thanked} of ${g.length} thanked</span></div>`:'<p class="small muted m0">No gifts logged yet.</p>'}<button class="btn sm as" data-act="gfOff">Turn the gift log off</button></section>`}
const giftText=()=>giftList().map(x=>`${x.from}: ${x.gift}`).join("\n");
const csvCell=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`;

function mTonight(){return rosSection()+rafSection()+giftSection()}

Object.assign(ACT,{
 rosStarter:async()=>{const u={},tm=Date.now();rosDefault().forEach((x,i)=>{u["k"+tm.toString(36)+i]={time:x[0],title:x[1],note:x[2],who:"",t:tm+i}});await ER("content/ros").update(u);toast("Suggested plan added. Change anything you like.")},
 rosAdd:async()=>{const title=dv("rn_title","").trim();if(!title)return toast("Say what happens");await ER("content/ros").push({time:dv("rn_time",""),title:title.slice(0,80),note:dv("rn_note","").trim().slice(0,140),who:dv("rn_who",""),t:Date.now()});["rn_time","rn_title","rn_note","rn_who"].forEach(k=>delete L.drafts[k]);render(true)},
 rosEditOpen:el=>{L.rosEdit=el.dataset.k;["re_time","re_title","re_note","re_who"].forEach(k=>delete L.drafts[k]);render(true)},
 rosCancel:()=>{L.rosEdit=null;render(true)},
 rosSave:async el=>{const k=el.dataset.k,x=(C().ros||{})[k]||{};const title=dv("re_title",x.title||"").trim();if(!title)return toast("Say what happens");await ER("content/ros/"+k).update({time:dv("re_time",x.time||""),title:title.slice(0,80),note:dv("re_note",x.note||"").trim().slice(0,140),who:dv("re_who",x.who||"")});L.rosEdit=null;render(true)},
 rosDel:async el=>{await ER("content/ros/"+el.dataset.k).remove();await ER("rosDone/"+el.dataset.k).remove();L.rosEdit=null;render(true)},
 rosDone:el=>{const k=el.dataset.k;if((D.rosDone||{})[k])ER("rosDone/"+k).remove();else{ER("rosDone/"+k).set({by:L.modName||"A teammate",t:Date.now()});buzz(30)}},
 rafAdd:async()=>{const cfg=rafCfg();const name=dv("raf_name","").trim().slice(0,40);if(!name)return toast("Type the guest's name");
  const n=normName(name);if(rafList().some(x=>normName(x.name)===n))return toast(name+" is already in. One entry per guest.");
  const pid=ids().find(i=>normName(P(i).name)===n)||null;const tm=Date.now();
  const e={name,pid,by:L.modName||"",t:tm},r1=ER("raffle").push(e);D.raf=Object.assign({},D.raf,{[r1.key]:e});
  let r2=null;if(cfg.gift&&dv("raf_log","1")==="1"){const g={from:name,gift:cfg.gift,t:tm,by:L.modName||"",raffle:true};r2=ER("gifts").push(g);D.gifts=Object.assign({},D.gifts,{[r2.key]:g})}
  delete L.drafts.raf_name;toast(name+" is in the raffle");buzz(30);render(true);await r1;if(r2)await r2},
 rafOn:()=>ER("content/raffle/on").set(true),
 rafOff:()=>ER("content/raffle/on").set(false),
 rafCfgSave:async()=>{const c=rafCfg();await ER("content/raffle").update({on:true,name:dv("rs_name",c.name).trim().slice(0,40)||"Raffle",rule:dv("rs_rule",c.rule).trim().slice(0,200),gift:dv("rs_gift",c.giftSet).trim().slice(0,80)});["rs_name","rs_rule","rs_gift"].forEach(k=>delete L.drafts[k]);toast("Raffle settings saved")},
 rafDel:el=>{ER("raffle/"+el.dataset.k).remove()},
 rafDraw:async()=>{const list=rafList(),wonSet=new Set(rafWon().map(w=>normName(w.name)));const pool=list.filter(x=>!wonSet.has(normName(x.name)));if(!pool.length)return toast("Everyone in the raffle has already won");
  const w=pool[rnd(pool.length)],tm=now();const names=pool.map(x=>x.name);for(let i=names.length-1;i>0;i--){const j=rnd(i+1);[names[i],names[j]]=[names[j],names[i]]}
  await ER("rafWins").push({name:w.name,t:Date.now()});setState({raffle:{t:tm,winner:w.name,names:names.slice(0,40),show:true}});toast("Drawing on the big screen…")},
 rafHide:()=>setState({raffle:null}),
 gfAdd:async()=>{const from=dv("gf_from","").trim().slice(0,40),gift=dv("gf_gift","").trim().slice(0,120);if(!from)return toast("Who is it from?");if(!gift)return toast("What's the gift?");
  const g={from,gift,t:Date.now(),by:L.modName||""},r=ER("gifts").push(g);D.gifts=Object.assign({},D.gifts,{[r.key]:g});delete L.drafts.gf_from;delete L.drafts.gf_gift;buzz(30);render(true);const el=document.querySelector('[data-draft="gf_from"]');if(el)el.focus()},
 gfOn:()=>ER("content/giftLog/on").set(true),
 gfOff:()=>ER("content/giftLog/on").set(false),
 gfThank:el=>{ER("gifts/"+el.dataset.k+"/thanked").set(!!el.checked)},
 gfDel:el=>{ER("gifts/"+el.dataset.k).remove()},
 gfCopy:()=>copyText(giftText()),
 gfCsv:()=>{const rows=[["From","Gift","Thank-you sent"]].concat(giftList().map(x=>[x.from,x.gift,x.thanked?"Yes":""]));download(`gift-list-${EV}.csv`,new Blob(["﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv"}))}
});

/* the old raffle on the Scores tab drew from every guest; point it to the Tonight tab */
const _mScoresTonight=mScores;
mScores=function(){return _mScoresTonight().replace(/<section class="card stack"><h3>Prizes<\/h3>[\s\S]*?<\/section>/,`<section class="card row between"><span class="small">The raffle and gift log are on the <b>Tonight</b> tab.</span><button class="btn sm" data-act="mtab" data-k="tonight">Open Tonight</button></section>`)};

/* teammates see their next job on the Live tab */
const _mLiveTonight=mLive;
mLive=function(){const items=rosItems().filter(x=>!(D.rosDone||{})[x.k]);const nx=items.find(rosMine);
 const card=nx?`<section class="card row between gilt"><div><span class="eyebrow">${L.modId&&nx.who===L.modId?"Your next job":"Up next"}</span><div><b>${esc(fmtTime(nx.time))}</b> ${esc(nx.title)}${rosLate(nx)?' <span class="pill warn">Running late</span>':""}</div></div><div class="row"><button class="btn sm primary" data-act="rosDone" data-k="${nx.k}">Done</button><button class="btn sm" data-act="mtab" data-k="tonight">Run of show</button></div></section>`:"";
 return card+_mLiveTonight()};

/* Events made with a host account (meta.host) plan from the host's dashboard: the console has no Plan tab, and the dashboard's
   Plan button opens this page with only=plan, which shows just the Plan screen. Older events keep Plan in the console. */
const modPlanOnly=()=>!!(D.meta&&D.meta.host&&QS.get("only")==="plan");
const planURL=code=>baseURL()+"?"+(window.__HMPDEMO?"pdemo=1&":"")+"e="+encodeURIComponent(code)+"&only=plan#moderator";
moderator=function(){
 if(modPlanOnly()){if(L.mtab!=="plan")L.mtab="plan";if(!document.documentElement.classList.contains("hmbrand"))applyTheme();
  return `${status()}<section class="card row between"><div class="mw0"><div class="eyebrow">Plan</div><b>${esc((D.meta&&D.meta.name)||"Your event")}</b></div><div class="row small"><a class="btn sm" href="${esc(baseURL()+(window.__HMPDEMO?"?pdemo=1&host=1":window.__HMDEMO?"?e=DEMO":"")+"#planner")}">My event dashboard</a><a class="btn sm" href="${esc(eventURL(EV,"moderator"))}">Open the console</a></div></section><div class="stack mw0">${mPlan()}</div>`}
 const tab=(k,l)=>`<button data-act="mtab" data-k="${k}" aria-pressed="${L.mtab===k}">${l}</button>`;
 const body=({live:mLive,plan:mPlan,tonight:mTonight,pres:mPres,moments:mMoments,teams:mTeams,scores:mScores,content:mContent,custom:mCustom,event:mEvent,memories:mMemories,menu:mMenu,party:mParty,help:mHelp}[L.mtab]||mLive)();
 const pr=D.meta&&D.meta.practice?`<div class="banner soft"><span><b>Practice run</b> with pretend guests. Open a <a href="${esc(eventURL(EV))}" target="_blank" rel="noopener">guest view</a> or the <a href="${esc(eventURL(EV,"screen"))}" target="_blank" rel="noopener">big screen</a> to see what they see.</span><button class="btn sm" data-act="endPractice">End practice</button></div>`:"";
 return `${status()}${pr}<div class="console"><nav class="side">${tab("live","Live")}${D.meta&&D.meta.host?"":(()=>{const b=plBadge();return tab("plan","Plan"+(b?` <span class="pill bad">${b}</span>`:""))})()}${tab("tonight","Tonight")}${tab("moments","Moments")}${tab("pres","Presentations")}${tab("teams","Teams")}${tab("scores","Scores")}${tab("content","Content")}${tab("menu","Menu")}${tab("party",adultOn()?"Party & 21+":"Party games")}${tab("custom","Custom games")}${tab("event","Event")}${tab("memories","Memories")}${tab("help","Help desk")}</nav><div class="stack mw0">${body}</div></div>`};

/* ---- guest list: import, check-in, and name suggestions ---- */
D.guests={};
const _subGuests=subscribeEvent;
subscribeEvent=function(){_subGuests();if(VIEW==="moderator")ER("guests").on("value",s=>{D.guests=s.val()||{};renderSoon()})};
const glList=()=>Object.keys(D.guests||{}).map(k=>Object.assign({k},D.guests[k])).sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:"base"}));
const glMembers=g=>String(g.name||"").split(/\s*\/\s*/).map(s=>s.trim()).filter(Boolean);
const glInGames=g=>{const names=new Set(ids().filter(i=>!P(i).bot).map(i=>normName(P(i).name)));return glMembers(g).some(m=>names.has(normName(m)))};
const rsvpOf=v=>{v=normName(v);return /^(y|yes|going|attending|accepted)/.test(v)?"yes":/^(n|no|not going|declined|can't|cant)/.test(v)?"no":v?"maybe":""};
function csvRows(txt){const rows=[];let row=[],cell="",q=false;for(let i=0;i<txt.length;i++){const c=txt[i];
  if(q){if(c==='"'){if(txt[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
  else if(c==='"')q=true;else if(c===","||c==="\t"){row.push(cell);cell=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&txt[i+1]==="\n")i++;row.push(cell);rows.push(row);row=[];cell=""}else cell+=c}
 if(cell||row.length){row.push(cell);rows.push(row)}return rows}
/* Accepts one name per line, or a spreadsheet saved as CSV (a "Name" column is found by its header; RSVP and invite columns are picked up when present). */
function parseGuests(txt){txt=String(txt||"").replace(/^﻿/,"");const rows=csvRows(txt).map(r=>r.map(c=>c.replace(/\s+/g," ").trim()));if(!rows.length)return [];
 let ni=0,ri=-1,ii=-1,pi=-1,start=0;const h=rows[0].map(c=>c.toLowerCase());
 if(h.some(c=>/name|guest/.test(c))){ni=Math.max(0,h.findIndex(c=>/name|guest/.test(c)));ri=h.findIndex(c=>/rsvp|status|going|attend/.test(c)&&!/#/.test(c));ii=h.findIndex(c=>/invit/.test(c));pi=h.findIndex(c=>/plus/.test(c));start=1}
 const out=[];for(const r of rows.slice(start)){const name=(r[ni]||"").trim();if(!name||/^(total|invitations sent)/i.test(name))continue;
  out.push({name:name.slice(0,80),rsvp:ri>=0?rsvpOf(r[ri]):"yes",invited:ii>=0?/^y/i.test(r[ii]||""):null,plusOf:pi>=0&&pi!==ni?(r[pi]||"").trim().slice(0,80):""})}return out}
function glImport(list){const have={};glList().forEach(g=>{const n=normName(g.name);have[n]=(have[n]||0)+1});const seen={},u={},tm=Date.now();let added=0;
 list.forEach((g,i)=>{const n=normName(g.name);seen[n]=(seen[n]||0)+1;if(seen[n]<=(have[n]||0))return;
  const e={name:g.name,t:tm+i};if(g.rsvp)e.rsvp=g.rsvp;if(g.invited!=null)e.invited=g.invited;if(g.plusOf)e.plusOf=g.plusOf;u["g"+tm.toString(36)+i]=e;added++});
 return {u,added,skipped:list.length-added}}
const glConfirmed=g=>g.rsvp==="yes"||!g.rsvp||!!g.arrived;
function glSection(){const all=glList(),list=all.filter(glConfirmed),wait=all.filter(g=>!glConfirmed(g)),here=list.filter(g=>g.arrived).length,f=L.glFilter||"todo";
 const importBox=`<div class="stack tight"><textarea data-draft="gl_paste" rows="5" placeholder="Paste names, one per line, or a spreadsheet copied as CSV">${esc(dv("gl_paste",""))}</textarea>
  <div class="row"><button class="btn sm primary" data-act="glPaste">Import pasted names</button><label class="btn sm upl">Upload a .csv file<input type="file" data-act="glFile"></label></div>
  <p class="small muted m0">From Google Sheets: File → Download → Comma-separated values. Guests who haven't confirmed are kept aside until you confirm them.</p></div>`;
 if(!all.length)return `<section class="card stack"><div class="row between"><h2>Guest list</h2></div><p class="small muted m0">Import your guest list to check people in at the door and see who hasn't joined the games yet. Their names also show up as suggestions in the raffle and gift log.</p>${importBox}</section>`;
 const show=list.filter(g=>f==="all"||f==="todo"&&!g.arrived||f==="here"&&g.arrived||f==="nogames"&&g.arrived&&!glInGames(g));
 const tab=(k,l)=>`<button class="btn sm ${f===k?"primary":""}" data-act="glFilter" data-k="${k}">${l}</button>`;
 return `<section class="card stack"><div class="row between"><h2>Guest list</h2><span class="pill gold">${here} of ${list.length} here</span></div>
 <div class="row">${tab("todo","Not here yet")}${tab("here","Arrived")}${tab("nogames","Here, not in the games")}${tab("all","All confirmed")}</div>
 <div class="stack tight glrows">${show.length?show.map(g=>`<div class="gamerow evrow ${g.arrived?"dim":""}"><span class="gnum">${g.arrived?"✓":"·"}</span><div class="mw0"><b>${esc(g.name)}</b>${g.walkin?' <span class="pill">Walk-in</span>':""}${glInGames(g)?' <span class="pill live">In the games</span>':""}</div>
  <div class="row"><button class="btn sm ${g.arrived?"":"primary"}" data-act="glArrive" data-k="${g.k}">${g.arrived?"Undo":"Here"}</button></div></div>`).join(""):'<p class="small muted m0">Nobody in this list.</p>'}</div>
 <div class="row"><input type="text" class="grow" data-draft="gl_new" value="${esc(dv("gl_new",""))}" placeholder="Add a walk-in guest" aria-label="Add a guest"><button class="btn sm" data-act="glAdd">Add</button></div>
 ${wait.length?`<details ${L.glWaitOpen?"open":""}><summary class="small" data-act="glWaitToggle"><b>Awaiting RSVP · ${wait.length}</b> <span class="muted">· confirm anyone who's coming</span></summary><div class="stack tight glrows">${wait.map(g=>`<div class="gamerow evrow"><span class="gnum">·</span><div class="mw0"><b>${esc(g.name)}</b>${g.rsvp==="no"?' <span class="pill">Said no</span>':""}</div><div class="row"><button class="btn sm" data-act="glConfirm" data-k="${g.k}">Confirm</button></div></div>`).join("")}</div></details>`:""}
 <details><summary class="small">Import more or start over</summary><div class="stack tight">${importBox}
  ${L.confirm==="glClear"?`<div class="row"><span class="small">Remove the whole guest list?</span><button class="btn sm gold" data-act="glClear">Yes, remove it</button><button class="btn sm" data-act="cancelConfirm">No</button></div>`:`<button class="btn sm as" data-act="askGlClear">Remove the guest list</button>`}</div></details></section>`}
async function glDoImport(txt){const list=parseGuests(txt);if(!list.length)return toast("No names found");const r=glImport(list);
 if(r.added){D.guests=Object.assign({},D.guests,r.u);await ER("guests").update(r.u)}
 delete L.drafts.gl_paste;const nc=Object.values(r.u).filter(glConfirmed).length,nw=r.added-nc;toast(r.added?`${nc} confirmed guest${nc===1?"":"s"} added${nw?` · ${nw} awaiting RSVP`:""}`:"Everyone is already on the list");render(true)}
Object.assign(ACT,{
 glPaste:()=>glDoImport(dv("gl_paste","")),
 glFile:el=>{const f=el.files&&el.files[0];if(!f)return toast("No file was picked");if(/\.(xlsx?|pdf|docx?|jpe?g|png|heic)$/i.test(f.name))return toast("That file can't be read here. Pick the .csv file.");toast("Reading "+f.name+"…");const fr=new FileReader();fr.onerror=()=>toast("Couldn't open that file. Try pasting the names instead.");fr.onload=()=>glDoImport(String(fr.result||""));fr.readAsText(f);el.value=""},
 glFilter:el=>{L.glFilter=el.dataset.k;render(true)},
 glWaitToggle:()=>{L.glWaitOpen=!L.glWaitOpen},
 glConfirm:el=>{const k=el.dataset.k,g=(D.guests||{})[k];if(!g)return;D.guests=Object.assign({},D.guests,{[k]:Object.assign({},g,{rsvp:"yes",confirmedBy:L.modName||""})});ER("guests/"+k).update({rsvp:"yes",confirmedBy:L.modName||""});toast(g.name+" confirmed");buzz(30);render(true)},
 glArrive:el=>{const k=el.dataset.k,g=(D.guests||{})[k];if(!g)return;const v=g.arrived?null:{t:Date.now(),by:L.modName||""};D.guests=Object.assign({},D.guests,{[k]:Object.assign({},g,{arrived:v})});ER("guests/"+k+"/arrived").set(v);if(v)buzz(30);render(true)},
 glAdd:async()=>{const n=dv("gl_new","").trim().slice(0,80);if(!n)return toast("Type the guest's name");const k="g"+Date.now().toString(36);const e={name:n,t:Date.now(),walkin:true,rsvp:"yes",arrived:{t:Date.now(),by:L.modName||""}};D.guests=Object.assign({},D.guests,{[k]:e});await ER("guests/"+k).set(e);delete L.drafts.gl_new;toast(n+" added and checked in");render(true)},
 askGlClear:()=>{L.confirm="glClear";render(true)},
 glClear:async()=>{L.confirm=null;D.guests={};await ER("guests").remove();toast("Guest list removed");render(true)}
});
/* suggestions in the raffle and gift log: people in the games plus everyone on the guest list */
const _guestNamesBase=guestNames;
guestNames=function(){return _guestNamesBase().concat(glList().flatMap(g=>{const m=glMembers(g);return m.length>1?m:[g.name]}))};
mTonight=function(){return rosSection()+glSection()+rafSection()+giftSection()};

/* ================= DESIGN: ribbons, title mark, sweep-in, moods, gold ribbon confetti ================= */
/* 1. The flyer stays on the Event page only. The guest home and big-screen welcome no longer show it. */
const _pHomeDL=pHome;pHome=function(){const h=_pHomeDL();const img=C().image;return img?h.replace(`<img class="ev-art" src="${img}" alt="">`,""):h};
const _bsDL=bigscreen;bigscreen=function(){const h=_bsDL();const img=C().image;let out=img?h.replace(`<img class="ev-art big" src="${img}" alt="">`,""):h;
 return out.replace('<div class="winner">Welcome!</div>',`${titleMark(72)?`<div class="tv-mark">${titleMark(72)}</div>`:""}<div class="eyebrow">${esc(C().title||"")}</div><div class="winner">Welcome!</div><div class="gdiv"></div>`)};

/* 2 + 4. Flowing ribbons in the event's own colors, drawn to fit the screen. Still on phones; they drift on the big screen
   and sweep in when it first opens. */
const RIBBONS=[ /* centerline from p0 to p3 (fractions of the screen), max thickness (fraction of the short side), colors, opacity */
 {p:[[-.1,.2],[.25,-.04],[.68,.98],[1.1,.62]],w:.11,c:["--rose","--flame"],o:.2},
 {p:[[-.1,.74],[.3,1.04],[.72,-.06],[1.1,.18]],w:.085,c:["--violet","--rose"],o:.15},
 {p:[[-.1,.92],[.34,.72],[.7,1.12],[1.1,.84]],w:.07,c:["--leaf","--gold"],o:.15},
 {p:[[-.1,.4],[.32,.66],[.7,.08],[1.1,.46]],w:.035,c:["--flame","--gold"],o:.22},
 {p:[[-.1,.56],[.3,.26],[.7,.84],[1.1,.34]],line:true,c:["--gold","--gold"],o:.75}];
const bez=(p,t)=>{const u=1-t;return [0,1].map(i=>u*u*u*p[0][i]+3*u*u*t*p[1][i]+3*u*t*t*p[2][i]+t*t*t*p[3][i])};
const bezD=(p,t)=>{const u=1-t;return [0,1].map(i=>3*u*u*(p[1][i]-p[0][i])+6*u*t*(p[2][i]-p[1][i])+3*t*t*(p[3][i]-p[2][i]))};
function ribbonSVG(r,i,W,H){const S=Math.min(W,H),p=r.p.map(q=>[q[0]*W,q[1]*H]),g="rg"+i;
 const grad=`<defs><linearGradient id="${g}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(${r.c[0]});stop-opacity:0"/><stop offset=".22" style="stop-color:var(${r.c[0]})"/><stop offset=".78" style="stop-color:var(${r.c[1]})"/><stop offset="1" style="stop-color:var(${r.c[1]});stop-opacity:0"/></linearGradient></defs>`;
 if(r.line){let d="";for(let k=0;k<=60;k++){const q=bez(p,k/60);d+=(k?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)}
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${grad}<path d="${d}" fill="none" stroke="url(#${g})" stroke-width="${Math.max(1.2,S*.0022).toFixed(2)}" opacity="${r.o}"/></svg>`}
 const top=[],bot=[],N=80;for(let k=0;k<=N;k++){const t=k/N,q=bez(p,t),dv=bezD(p,t),len=Math.hypot(dv[0],dv[1])||1,nx=-dv[1]/len,ny=dv[0]/len;
  const w=S*r.w*Math.pow(Math.sin(Math.PI*t),.7)*(.55+.45*Math.sin(2*Math.PI*t*1.4+i));top.push([q[0]+nx*w/2,q[1]+ny*w/2]);bot.push([q[0]-nx*w/2,q[1]-ny*w/2])}
 const d="M"+top.map(q=>q[0].toFixed(1)+" "+q[1].toFixed(1)).join("L")+"L"+bot.reverse().map(q=>q[0].toFixed(1)+" "+q[1].toFixed(1)).join("L")+"Z";
 return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${grad}<path d="${d}" fill="url(#${g})" opacity="${r.o}"/></svg>`}
function drawRibbons(){let el=document.getElementById("ribbons");if(!el){el=document.createElement("div");el.id="ribbons";el.setAttribute("aria-hidden","true");document.body.prepend(el)}
 if(VIEW==="print"){el.innerHTML="";return}const W=Math.round(Math.max(320,innerWidth)*1.12),H=Math.round(Math.max(480,innerHeight)*1.12);
 el.innerHTML=RIBBONS.map((r,i)=>`<div class="rb rb${i}">${ribbonSVG(r,i,W,H)}</div>`).join("")}
let ribT=null,ribW=0;addEventListener("resize",()=>{if(Math.abs(innerWidth-ribW)<40&&VIEW!=="screen")return;clearTimeout(ribT);ribT=setTimeout(()=>{ribW=innerWidth;drawRibbons()},250)});
ribW=innerWidth;drawRibbons();
if(VIEW==="screen"&&!reduceMotion()){document.documentElement.classList.add("drift","opening");setTimeout(()=>document.documentElement.classList.remove("opening"),4600)}

/* 3. A small gold mark by the event title: songbird, rose or none, chosen on the Event tab. */
const MARKS={bird:{label:"Songbird",vb:"0 0 48 32",d:"M5 23 L11 20.5 C12 15 17 11.5 23 11.5 C25 9 29 8.5 31.5 10.5 L35.5 11.2 L32 12.8 C33 17 30 22.5 23 24 C17 25.3 12 24.5 9 23.5 Z M14 19 C17 15.5 22 15 25 17 C22 18 18.5 20 16 22.5 M20 24.3 L19.5 26.8 M23.5 23.8 L23.5 26.6 M8 27.8 C17 26.3 28 26.6 42 25.2 M36 25.6 C38 22.5 41.5 22 43 23 C41.5 25 39 26 36 25.6 Z",eye:[29.6,11.3]},
 rose:{label:"Rose",vb:"0 0 32 32",d:"M16 9 C19.5 9 21 11.5 20 14 C19 16.5 15.5 16.8 14 15 C12.5 13.2 13.5 11 15.5 11 C17 11 17.6 12.4 16.8 13.4 M11 11.5 C9.5 15 11 19.5 16 19.5 C21 19.5 23 15.5 21.5 11.5 M12.5 8.5 C14 6.5 18 6.5 19.5 8.5 M16 19.5 C16 23 15.5 26 14.5 29.5 M15.6 24 C18 22 21.5 22.5 22.5 23.5 C20.5 25.5 18 25.5 15.6 24 Z"}};
const markKind=()=>{const m=C().mark;if(m==="none")return null;if(MARKS[m])return m;const ty=evType();return ty==="baby"?"bird":["wedding","engagement","anniversary"].includes(ty)?"rose":null};
function markSVG(k,size){const m=MARKS[k];if(!m)return "";const id="gm"+k+size;
 return `<svg class="tmark" viewBox="${m.vb}" width="${size}" height="${Math.round(size*(+m.vb.split(" ")[3])/(+m.vb.split(" ")[2]))}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f6dc83"/><stop offset=".5" style="stop-color:var(--gold)"/><stop offset="1" stop-color="#9c6b00"/></linearGradient></defs><path d="${m.d}" fill="none" stroke="url(#${id})" stroke-width="${size>=40?1.7:1.4}" stroke-linecap="round" stroke-linejoin="round"/>${m.eye?`<circle cx="${m.eye[0]}" cy="${m.eye[1]}" r=".95" fill="url(#${id})"/>`:""}</svg>`}
const titleMark=size=>{const k=markKind();return k?markSVG(k,size):""};
const _hvDL=headerView;headerView=function(){const h=_hvDL();if(!EV||L.missing||VIEW==="host"||VIEW==="planner"||VIEW==="support"||VIEW==="signin"||VIEW==="vendor"||VIEW==="new"||VIEW==="mate"||VIEW==="client"||VIEW==="fb"||!titleMark(30))return h;return h.replace(/<h1>([\s\S]*?)<\/h1>/,(m,t)=>`<h1><span class="tline">${t}${titleMark(VIEW==="screen"?56:44)}</span></h1>`)};
const _mEventDL=mEvent;mEvent=function(){const cur=markKind()||"none";const b=(k,l)=>`<button class="btn sm ${cur===k?"primary":""}" data-act="setMark" data-k="${k}" aria-pressed="${cur===k}">${k==="none"?"":markSVG(k,22)} ${l}</button>`;
 return _mEventDL()+`<section class="card stack"><h2>Title mark</h2><p class="small muted m0">A small gold drawing beside the event title on guests' phones and the big screen.</p><div class="row">${b("bird","Songbird")}${b("rose","Rose")}${b("none","None")}</div></section>`};
ACT.setMark=el=>{ER("content/mark").set(el.dataset.k);toast(el.dataset.k==="none"?"Title mark off":"Title mark updated")};

/* 5. Guests' screens shift color through the night: warm for dinner and moments, bright for games, gold for winners. */
const WARM_MOMENTS=/dinner|cake|toast|firstdance|gifts|story|years/;
function moodNow(){const s=st();if(s.ended||s.showWinner||(s.raffle&&s.raffle.show)||s.reveal&&now()<(s.reveal.at||0)+15000)return "gold";
 if(s.moment&&WARM_MOMENTS.test(s.moment.id||""))return "warm";if(s.live)return "bright";return "calm"}
const _renderDL=render;render=function(f){_renderDL(f);if(["guest","screen","album","keepsake"].includes(VIEW)){const m=moodNow();if(document.documentElement.dataset.mood!==m)document.documentElement.dataset.mood=m}};

/* 6. Gold ribbon confetti: curling streamers, mostly gold, with a few in the event colors. */
confetti=function(n){if(reduceMotion())return;const c=document.createElement("canvas");c.className="confetti";document.body.appendChild(c);const dpr=Math.min(2,window.devicePixelRatio||1);
 const W=c.width=innerWidth*dpr,H=c.height=innerHeight*dpr;const x=c.getContext("2d");const cs=getComputedStyle(document.documentElement);
 const gold=[cs.getPropertyValue("--gold").trim()||"#e0a826","#f6dc83","#c98f12","#fff1c2"],col=["--rose","--flame","--violet","--leaf"].map(k=>cs.getPropertyValue(k).trim()||"#e8338f");
 const ps=[...Array(Math.round((n||140)*.8))].map(()=>{const rib=Math.random()<.7;return {x:W*(.15+Math.random()*.7),y:H*.62,vx:(Math.random()-.5)*15*dpr,vy:-(Math.random()*16+12)*dpr,
  c:Math.random()<.72?gold[rnd(gold.length)]:col[rnd(col.length)],a:Math.random()*6,va:(Math.random()-.5)*.25,ph:Math.random()*6,len:(Math.random()*18+16)*dpr,wd:(Math.random()*2.2+2.4)*dpr,rib,r:(Math.random()*5+4)*dpr}});
 const t0=performance.now();(function f(tm){x.clearRect(0,0,W,H);const k=(tm-t0)/1000;
  ps.forEach(p=>{p.vy+=.4*dpr;p.vx*=.984;if(p.vy>0)p.vy*=.965;p.x+=p.vx+Math.sin(k*3+p.ph)*.8*dpr;p.y+=p.vy;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);
   if(p.rib){x.strokeStyle=p.c;x.lineWidth=p.wd;x.lineCap="round";x.beginPath();for(let s=0;s<=10;s++){const u=s/10,yy=(u-.5)*p.len,xx=Math.sin(u*Math.PI*2+k*7+p.ph)*p.len*.18;s?x.lineTo(xx,yy):x.moveTo(xx,yy)}x.stroke()}
   else{x.fillStyle=p.c;x.beginPath();x.ellipse(0,0,p.r*.6,p.r*Math.abs(Math.cos(k*6+p.ph))*.6+.5,0,0,7);x.fill()}x.restore()});
  if(tm-t0<3800)requestAnimationFrame(f);else c.remove()})(t0)};

/* ---- moments: put the ribbons behind the glass box ---- */
const _umDL=updateMoment;updateMoment=function(){_umDL();if(VIEW!=="screen")return;const el=$("#mo");if(!el)return;const bg=el.querySelector(".mo-bg");
 if(bg&&!el.querySelector(".mo-rib")){const r=document.getElementById("ribbons");const d=document.createElement("div");d.className="mo-rib";d.innerHTML=r?r.innerHTML.replace(/id="rg(\d)"/g,'id="mrg$1"').replace(/url\(#rg(\d)\)/g,"url(#mrg$1)"):"";bg.after(d)}};

/* ================= REVEAL: clear packaging choices, and a baby that looks like the family ================= */
const RV_PACK_INFO={gift:["🎁","A wrapped box shakes, then bursts open."],balloon:["🎈","A big balloon floats up and pops."],envelope:["✉️","A sealed envelope opens and a card slides out."],curtain:["🎭","Velvet curtains part to show the answer."],ai:["✨","Describe your own look and Claude designs it."]};
const SKIN=[["deep","Deep","#4a2c1d","#33190d"],["dark","Dark brown","#6b3f26","#4e2a17"],["brown","Brown","#8d5a3b","#6c4128"],["tan","Tan","#b97f55","#97603a"],["light","Light","#e2b48f","#c89670"],["fair","Fair","#f6d6bf","#e3b79a"]];
const HAIR=[["coily","Coily"],["curly","Curly"],["wavy","Wavy"],["straight","Straight"],["fuzz","Just a little"]];
const HAIRC=[["black","Black","#1b1210"],["dkbrown","Dark brown","#3b2416"],["brown","Brown","#6b4226"],["auburn","Auburn","#8a3b1e"],["blonde","Blonde","#d9a95a"]];
const ACC=[["none","None"],["bow","Bow"],["wrap","Headwrap"]];
const babyCfg=()=>Object.assign({tone:"brown",hair:"coily",hc:"black",acc:null,ear:null},(C().reveal||{}).baby||{});
let BABY_N=0;
babySVG=function(style,over){const girl=style!=="boy",c=Object.assign(babyCfg(),over||{}),id="bb"+(++BABY_N);
 const sk=SKIN.find(x=>x[0]===c.tone)||SKIN[2],base=sk[2],shade=sk[3],hi=mixHex(base,"#ffffff",.16);
 const hc=(HAIRC.find(x=>x[0]===c.hc)||HAIRC[0])[2],hcl=mixHex(hc,"#ffffff",.22);
 const cloth=girl?"#ff8fc4":"#7cb8ff",trim=girl?"#ffd6ea":"#dcebff",deep=girl?"#e8559b":"#3d7fe6";
 const acc=c.acc||(girl?"bow":"none"),ear=c.ear!=null?!!c.ear:girl,dark=["deep","dark","brown"].includes(sk[0]);
 const blush=dark?"rgba(214,92,104,.34)":"rgba(240,120,140,.4)",S=`url(#${id}s)`;
 const mir=d=>d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,(m,x,y)=>`${200-+x} ${y}`);
 let hair="";const circ=(x,y,r)=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${hc}"/><path d="M${(x-r*.45).toFixed(1)} ${(y+r*.1).toFixed(1)} a${(r*.45).toFixed(1)} ${(r*.45).toFixed(1)} 0 1 1 ${(r*.7).toFixed(1)} ${(r*.25).toFixed(1)}" fill="none" stroke="${hcl}" stroke-width="1.1" opacity=".55"/>`;
 if(c.hair==="coily"){for(let a=196;a<=344;a+=11){const t=a*Math.PI/180;hair+=circ(100+51*Math.cos(t),92+49*Math.sin(t),8.5)}
  for(let a=214;a<=326;a+=14){const t=a*Math.PI/180;hair+=circ(100+41*Math.cos(t),90+41*Math.sin(t),8)}
  [[88,42],[100,39],[112,42],[94,52],[106,52]].forEach(p=>hair+=circ(p[0],p[1],8))}
 else if(c.hair==="curly"){for(let a=200;a<=340;a+=17){const t=a*Math.PI/180;hair+=`<circle cx="${(100+49*Math.cos(t)).toFixed(1)}" cy="${(91+47*Math.sin(t)).toFixed(1)}" r="12" fill="${hc}"/>`}
  hair+=`<path d="M58 66 C66 44 84 38 100 38 C116 38 134 44 142 66 C126 58 74 58 58 66Z" fill="${hc}"/>`;
  [[80,60],[100,56],[120,60]].forEach(p=>hair+=`<path d="M${p[0]-4} ${p[1]} c-2 8 8 12 10 4 c2 -7 -6 -9 -7 -3" fill="none" stroke="${hc}" stroke-width="4" stroke-linecap="round"/><path d="M${p[0]-2} ${p[1]-4} q4 -3 7 0" stroke="${hcl}" stroke-width="1.2" fill="none" opacity=".6"/>`)}
 else if(c.hair==="wavy")hair=`<path d="M47 90 C44 50 70 36 100 36 C130 36 156 50 153 90 C147 76 139 69 129 71 C121 62 111 67 100 64 C89 67 79 62 71 71 C61 69 53 76 47 90 Z" fill="${hc}"/><path d="M66 50 q8 -6 16 0 q8 6 16 0 q8 -6 16 0 q8 6 16 0" fill="none" stroke="${hcl}" stroke-width="1.6" opacity=".5"/>`;
 else if(c.hair==="straight")hair=`<path d="M47 90 C44 48 70 36 100 36 C130 36 156 48 153 90 C150 72 141 63 126 60 L119 73 L112 61 C98 61 80 63 66 69 C56 73 50 80 47 90 Z" fill="${hc}"/><path d="M78 46 C72 54 68 62 66 69 M92 42 C86 50 84 58 84 64 M130 48 C136 56 140 64 141 72" fill="none" stroke="${hcl}" stroke-width="1.4" opacity=".55"/>`;
 else hair=`<path d="M56 68 C66 46 84 40 100 40 C116 40 134 46 144 68 C128 56 72 56 56 68 Z" fill="${hc}" opacity=".45"/><path d="M98 43 c-7 -10 7 -17 11 -8 c3 6 -5 9 -7 4" fill="none" stroke="${hc}" stroke-width="3.2" stroke-linecap="round"/>`;
 let top="";
 if(acc==="bow")top=`<g transform="translate(134 50) rotate(16)"><path d="M0 0 C-10 -16 -26 -12 -22 0 C-26 12 -10 16 0 0Z" fill="${deep}"/><path d="M0 0 C10 -16 26 -12 22 0 C26 12 10 16 0 0Z" fill="${deep}"/><path d="M-6 -2 C-12 -6 -16 -4 -15 0 M6 -2 C12 -6 16 -4 15 0" stroke="${cloth}" stroke-width="1.6" fill="none"/><circle r="5.5" fill="${cloth}"/></g>`;
 else if(acc==="wrap")top=`<path d="M45 84 C42 46 70 30 100 30 C130 30 158 46 155 84 C142 66 122 60 100 60 C78 60 58 66 45 84 Z" fill="${deep}"/><path d="M50 74 C66 58 84 54 100 54 C116 54 134 58 150 74" fill="none" stroke="${trim}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/><path d="M58 52 C74 40 126 40 142 52" fill="none" stroke="${trim}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/><path d="M104 33 C108 12 136 10 136 28 C136 40 116 42 104 33Z" fill="${deep}"/><path d="M104 34 C96 14 72 16 76 32 C80 44 98 42 104 34Z" fill="${mixHex(deep,"#000000",.12)}"/><circle cx="104" cy="34" r="7" fill="${mixHex(deep,"#000000",.2)}"/>`;
 const armL="M62 158 C46 170 44 194 62 199 C74 202 80 192 76 182 C73 174 72 166 70 157 Z",slvL="M52 170 C49 155 59 146 72 148 L77 166 C69 171 58 173 52 170 Z";
 const eyeL=`<ellipse cx="80" cy="93" rx="8.2" ry="9.4" fill="#1a0f0b"/><circle cx="83" cy="89" r="3.1" fill="#fff"/><circle cx="77.4" cy="96.6" r="1.4" fill="#fff" opacity=".8"/>`;
 const lashL=girl?`<path d="M72.5 88 l-4.4 -3.2 M74.6 85 l-3.4 -4.2" stroke="#1a0f0b" stroke-width="1.7" stroke-linecap="round"/>`:"";
 return `<svg viewBox="0 0 200 210" class="rv-baby" aria-hidden="true"><defs><radialGradient id="${id}s" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="${hi}"/><stop offset=".72" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></radialGradient></defs>
 <path d="M46 210 C44 172 60 146 100 144 C140 146 156 172 154 210 Z" fill="${cloth}"/><ellipse cx="100" cy="146" rx="26" ry="7" fill="${shade}" opacity=".35"/>
 <path d="M78 148 Q100 163 122 148" fill="none" stroke="${trim}" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="178" r="3" fill="${trim}"/><circle cx="100" cy="193" r="3" fill="${trim}"/>
 <path d="${armL}" fill="${S}"/><path d="${mir(armL)}" fill="${S}"/><path d="${slvL}" fill="${cloth}"/><path d="${mir(slvL)}" fill="${cloth}"/>
 <ellipse cx="47" cy="95" rx="11" ry="13" fill="${S}"/><ellipse cx="153" cy="95" rx="11" ry="13" fill="${S}"/><path d="M45 90 q-4 5 0 10" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M155 90 q4 5 0 10" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
 ${ear?`<circle cx="46" cy="106.5" r="2.9" fill="#f2cf6b" stroke="#c9952a" stroke-width=".8"/><circle cx="154" cy="106.5" r="2.9" fill="#f2cf6b" stroke="#c9952a" stroke-width=".8"/><circle cx="45.2" cy="105.6" r=".9" fill="#fff"/><circle cx="153.2" cy="105.6" r=".9" fill="#fff"/>`:""}
 <ellipse cx="100" cy="92" rx="54" ry="52" fill="${S}"/>${hair}${top}
 <path d="M70 77 q10 -6 20 -1" stroke="${hc}" stroke-width="2.6" opacity=".5" fill="none" stroke-linecap="round"/><path d="M130 77 q-10 -6 -20 -1" stroke="${hc}" stroke-width="2.6" opacity=".5" fill="none" stroke-linecap="round"/>
 ${eyeL}${lashL}<g transform="translate(200 0) scale(-1 1)">${eyeL.replace('cx="83" cy="89"','cx="83" cy="89"')}${lashL}</g>
 <ellipse cx="66" cy="111" rx="11" ry="8" fill="${blush}"/><ellipse cx="134" cy="111" rx="11" ry="8" fill="${blush}"/>
 <path d="M94 104.5 q6 5 12 0" stroke="${shade}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
 <path d="M83 115 C87 134 113 134 117 115 C109 119.5 91 119.5 83 115 Z" fill="#6b1f24"/><path d="M91 126 C95 120.5 105 120.5 109 126 C105 130.5 95 130.5 91 126 Z" fill="#ff8c9a"/><path d="M86 116.5 C92 118.5 108 118.5 114 116.5" stroke="#fff" stroke-width="1.6" opacity=".55" fill="none"/>
 </svg>`};
function babyPicker(style){const c=babyCfg(),girl=style!=="boy",acc=c.acc||(girl?"bow":"none"),ear=c.ear!=null?!!c.ear:girl;
 const sw=(k,v,label,col,on)=>`<button class="bsw ${on?"on":""}" data-act="babySet" data-k="${k}" data-v="${v}" aria-pressed="${on}" aria-label="${label}" title="${label}" style="--c:${col}"></button>`;
 const opt=(k,v,label,on)=>`<button class="btn sm ${on?"primary":""}" data-act="babySet" data-k="${k}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
 const name=(list,v)=>(list.find(x=>x[0]===v)||[])[1]||"";
 return `<div class="stack tight babypick"><span class="small"><b>The baby</b> · choose a look that matches the family</span><div class="babyrow"><div class="babyprev">${babySVG(style)}</div><div class="stack tight grow mw0">
 <div class="stack tight"><span class="small muted">Skin tone · <b>${name(SKIN,c.tone)}</b></span><div class="row">${SKIN.map(s=>sw("tone",s[0],s[1],s[2],c.tone===s[0])).join("")}</div></div>
 <div class="stack tight"><span class="small muted">Hair</span><div class="row">${HAIR.map(h=>opt("hair",h[0],h[1],c.hair===h[0])).join("")}</div></div>
 <div class="stack tight"><span class="small muted">Hair color · <b>${name(HAIRC,c.hc)}</b></span><div class="row">${HAIRC.map(h=>sw("hc",h[0],h[1],h[2],c.hc===h[0])).join("")}</div></div>
 <div class="stack tight"><span class="small muted">Extras</span><div class="row">${ACC.map(a=>opt("acc",a[0],a[1],acc===a[0])).join("")}${opt("ear",ear?"0":"1",(ear?"✓ ":"")+"Tiny earrings",ear)}</div></div></div></div></div>`}
const _rvPanelDL=revealPanel;revealPanel=function(){const h=_rvPanelDL(),rv=revealCfg(),pack=rvPack(rv.pack),kind=rvKind(rv.kind);
 const sec=D.secret||{},ans=sec.revealAnswer!=null?sec.revealAnswer:(rv.answer||"");
 const rows=`<div class="stack tight"><span class="small"><b>Packaging</b> · how the answer gets unwrapped</span><div class="pkopts">${Object.keys(RV_PACKS).map(p=>{const i=RV_PACK_INFO[p]||["★",""];return `<button class="pkopt ${p===pack?"on":""}" data-act="rvPack" data-v="${p}" aria-pressed="${p===pack}"><span class="pkic" aria-hidden="true">${i[0]}</span><span class="pktx"><b>${esc(RV_PACKS[p])}</b><span class="small muted">${i[1]}</span></span>${p===pack?'<span class="pkck" aria-hidden="true">✓</span>':""}</button>`}).join("")}</div></div>`;
 return h.replace(/<div class="stack tight"><span class="small"><b>Packaging<\/b><\/span><div class="row">[\s\S]*?<\/div><\/div>/,()=>rows+(kind==="gender"?babyPicker(ans==="boy"?"boy":"girl"):""))};
ACT.babySet=el=>{const k=el.dataset.k,v=el.dataset.v;ER("content/reveal/baby/"+k).set(k==="ear"?v==="1":v)};

/* ================= PRESENTATIONS: upload slides, pick a presenter, phone remote, big screen ================= */
/* Slides are stored as pictures: a PDF is turned into one picture per page right in the browser, and images are used as they are.
   decks/<id> = {title,count,total,processing,kind,by,t,notes:{0:"..."}} · deckImg/<id>/<i> = full slide · deckThumb/<id>/<i> = small preview
   state/pres = {did,i,on,pid (guest) or mid (helper),name,t} */
D.decks={};
const PR={cache:{},thumbs:{},pend:{},meta:{},sub:{},key:null};
const PDFJS_SRC=["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/","https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/"];
const PR_MAX=80,PR_W=1600,PR_TW=360;
Object.assign(ES,{"You're presenting":"Estás presentando","Your notes":"Tus notas","No notes for this slide.":"No hay notas para esta diapositiva.","Up next":"Sigue","slide {n}":"diapositiva {n}","This is the last slide.":"Esta es la última diapositiva.","Back":"Atrás","Next":"Siguiente","Current slide":"Diapositiva actual","The moderator will end the presentation when you're done.":"El moderador terminará la presentación cuando acabes."});
const _subPres=subscribeEvent;
subscribeEvent=function(){_subPres();if(VIEW==="moderator")ER("decks").on("value",s=>{D.decks=s.val()||{};renderSoon()})};
const deckList=()=>Object.keys(D.decks||{}).map(k=>Object.assign({k},D.decks[k])).sort((a,b)=>(b.t||0)-(a.t||0));
const deckCount=did=>((D.decks||{})[did]||{}).count||(PR.meta[did]||{}).count||0;
function watchDeck(did){if(!did||PR.sub[did])return;PR.sub[did]=1;ER("decks/"+did).on("value",s=>{D.decks=Object.assign({},D.decks,{[did]:s.val()});renderSoon()})}
function prImg(did,i,kind){const full=kind!=="t",store=full?PR.cache:PR.thumbs,k=did+"/"+i;if(store[k]!==undefined)return Promise.resolve(store[k]);if(PR.pend[kind+k])return PR.pend[kind+k];
 PR.pend[kind+k]=ER(`${full?"deckImg":"deckThumb"}/${did}/${i}`).once("value").then(s=>{store[k]=s.val()||null;delete PR.pend[kind+k];renderSoon();return store[k]});return PR.pend[kind+k]}
function thumbSrc(did,i){const k=did+"/"+i;if(PR.thumbs[k]!==undefined)return PR.thumbs[k];prImg(did,i,"t");return null}
const presOn=()=>{const p=st().pres;return p&&p.on?p:null};
const presMe=()=>{const p=presOn();if(!p)return false;if(p.pid)return VIEW==="guest"&&(p.pid===L.me||(L.profiles||[]).includes(p.pid));return VIEW==="moderator"&&!!p.mid&&(p.mid===L.modId||(p.mid==="admin"&&L.isAdmin&&!L.modId))};
function presStep(d){const p=presOn();if(!p)return;const n=deckCount(p.did)||1;ER("state/pres/i").transaction(v=>Math.max(0,Math.min(n-1,(v||0)+d)));buzz(25)}

/* --- reading files --- */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function loadPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;
 for(const base of PDFJS_SRC){try{await loadScript(base+"pdf.min.js");for(let w=0;w<50&&!window.pdfjsLib;w++)await new Promise(r=>setTimeout(r,100));if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.js";return pdfjsLib}}catch(e){}}
 throw new Error("The PDF reader couldn't load. Check the internet connection and try again.")}
function canvasJPG(src,w,q){const c=document.createElement("canvas"),s=Math.min(1,w/src.width);c.width=Math.max(1,Math.round(src.width*s));c.height=Math.max(1,Math.round(src.height*s));const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(src,0,0,c.width,c.height);return c.toDataURL("image/jpeg",q)}
function fileImage(f){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error("bad image"));im.src=fr.result};fr.readAsDataURL(f)})}
const PR_FIX={ppt:"PowerPoint",pptx:"PowerPoint",key:"Keynote",doc:"Word",docx:"Word",xls:"Excel",xlsx:"Excel",csv:"spreadsheet",pages:"Pages",numbers:"Numbers",odp:"slides",odt:"document",ods:"spreadsheet",gslides:"Google Slides"};
const extOf=f=>(String(f.name||"").split(".").pop()||"").toLowerCase();
const isPdf=f=>f.type==="application/pdf"||extOf(f)==="pdf";
const isImg=f=>/^image\//.test(f.type)&&!/heic|heif/.test(f.type)||["jpg","jpeg","png","gif","webp"].includes(extOf(f));
async function prSaveSlides(did,title,kind,total,make){const by=L.modName||"";L.prBusy={title,i:0,n:total};L.prErr=null;renderSoon();
 await ER("decks/"+did).set({title,count:0,total,processing:true,kind,by,t:Date.now()});
 for(let i=0;i<total;i++){const r=await make(i);await ER(`deckImg/${did}/${i}`).set(r.full);await ER(`deckThumb/${did}/${i}`).set(r.thumb);PR.cache[did+"/"+i]=r.full;PR.thumbs[did+"/"+i]=r.thumb;
  await ER(`decks/${did}/count`).set(i+1);L.prBusy={title,i:i+1,n:total};renderSoon()}
 await ER("decks/"+did).update({processing:false});L.prBusy=null;toast(`“${title}” is ready: ${total} slide${total===1?"":"s"}`);renderSoon()}
async function prFromPdf(f,title){const lib=await loadPdfJs();const pdf=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
 const n=Math.min(pdf.numPages,PR_MAX);if(pdf.numPages>PR_MAX)toast(`Only the first ${PR_MAX} pages are used`);const did="d"+Date.now().toString(36);
 await prSaveSlides(did,title,"pdf",n,async i=>{const page=await pdf.getPage(i+1);const v1=page.getViewport({scale:1});const vp=page.getViewport({scale:Math.min(3,PR_W/v1.width)});
  const c=document.createElement("canvas");c.width=Math.round(vp.width);c.height=Math.round(vp.height);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:x,viewport:vp}).promise;return {full:c.toDataURL("image/jpeg",.8),thumb:canvasJPG(c,PR_TW,.66)}})}
async function prFromImages(fs,title){fs=fs.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{numeric:true})).slice(0,PR_MAX);const did="d"+Date.now().toString(36);
 await prSaveSlides(did,title,"images",fs.length,async i=>{const im=await fileImage(fs[i]);return {full:canvasJPG(im,PR_W,.82),thumb:canvasJPG(im,PR_TW,.66)}})}

/* --- presenter notes --- */
function parseNotes(txt,count){txt=String(txt||"").replace(/\r/g,"");const out=[];const hdr=/^\s*(?:slide|page)\s*#?\s*(\d+)\s*[:.\-–)]?\s*(.*)$/i;const lines=txt.split("\n");
 if(lines.some(l=>hdr.test(l))){let idx=-1;lines.forEach(l=>{const m=hdr.exec(l);if(m){idx=+m[1]-1;out[idx]=m[2]||""}else if(idx>=0)out[idx]=(out[idx]?out[idx]+"\n":"")+l})}
 else{const parts=/^\s*-{3,}\s*$/m.test(txt)?txt.split(/^\s*-{3,}\s*$/m):txt.split(/\n\s*\n/);parts.forEach((p,i)=>out[i]=p)}
 const o={};for(let i=0;i<Math.min(out.length,count||out.length);i++){const s=String(out[i]||"").trim();if(s)o[i]=s.slice(0,2000)}return o}

/* --- who's presenting --- */
function whoOptions(sel){const mods=D.mods||{},pl=ids().filter(i=>!P(i).bot).sort((a,b)=>String(P(a).name).localeCompare(String(P(b).name)));
 const o=(v,l)=>`<option value="${esc(v)}" ${sel===v?"selected":""}>${esc(l)}</option>`;
 return o("me","Me, on this phone")+(Object.keys(mods).filter(k=>k!==L.modId).length?`<optgroup label="Teammates">${Object.keys(mods).filter(k=>k!==L.modId).map(k=>o("m:"+k,mods[k].name)).join("")}</optgroup>`:"")+(pl.length?`<optgroup label="Guests in the games">${pl.map(i=>o("p:"+i,P(i).name)).join("")}</optgroup>`:"")}
function whoObj(v){if(v&&v.startsWith("m:")){const m=(D.mods||{})[v.slice(2)];if(m)return {mid:v.slice(2),pid:null,name:m.name}}
 if(v&&v.startsWith("p:")&&D.players[v.slice(2)])return {pid:v.slice(2),mid:null,name:P(v.slice(2)).name};
 return {mid:L.modId||"admin",pid:null,name:L.modName||"Moderator"}}

/* --- the remote (presenter's phone) --- */
function presRemote(noBtns){const p=presOn();if(!p)return "";watchDeck(p.did);const d=(D.decks||{})[p.did]||{},n=d.count||0,i=p.i||0,note=(d.notes||{})[i]||"";const cur=thumbSrc(p.did,i),nx=i+1<n?thumbSrc(p.did,i+1):null;
 return `<div class="stack prremote">${noBtns?"":`<div class="row between"><span class="eyebrow">${t("You're presenting")}</span><span class="pill live">${i+1} / ${n||"…"}</span></div><h2 class="m0">${esc(d.title||"")}</h2>`}
 <div class="prnow">${cur?`<img src="${cur}" alt="${t("Current slide")}">`:`<div class="prph">${t("Loading…")}</div>`}</div>
 <div class="prnotes"><span class="small muted">${t("Your notes")}</span><div class="prnote">${note?esc(note):`<span class="muted">${t("No notes for this slide.")}</span>`}</div></div>
 <div class="prup small muted">${i+1<n?`${t("Up next")}: ${nx?`<img src="${nx}" alt="">`:""} ${t("slide {n}",{n:i+2})}`:t("This is the last slide.")}</div>
 ${noBtns?"":`<div class="prbtns"><button class="btn big" data-act="presPrev" ${i<=0?"disabled":""}>◀ ${t("Back")}</button><button class="btn primary big" data-act="presNext" ${i>=n-1?"disabled":""}>${t("Next")} ▶</button></div><p class="small muted m0 tc">${t("The moderator will end the presentation when you're done.")}</p>`}</div>`}
const _playerPres=player;player=function(){if(VIEW==="guest"&&presMe())return `<div class="phone">${status()}<section class="card stack gilt">${presRemote()}</section></div>`;return _playerPres()};

/* --- moderator: live card, tab --- */
function presLiveCard(){const p=presOn();if(!p)return "";watchDeck(p.did);const d=(D.decks||{})[p.did]||{},n=d.count||0,i=p.i||0,me=presMe();
 return `<section class="card stack gilt"><div class="row between"><span class="eyebrow">On the big screen now</span><span class="pill live">Slide ${i+1} of ${n||"…"}</span></div>
 <h2 class="m0">${esc(d.title||"Presentation")}</h2><p class="small muted m0">Presenting: <b>${esc(p.name||"")}</b>${me?" (you)":p.pid?" · their phone is the remote":""}. You can always take over here.</p>
 ${me?presRemote(true):""}
 <div class="prbtns"><button class="btn big" data-act="presPrev" ${i<=0?"disabled":""}>◀ Back</button><button class="btn primary big" data-act="presNext" ${i>=n-1?"disabled":""}>Next ▶</button></div>
 <details><summary class="small">Jump to a slide</summary><div class="prstrip jump">${Array.from({length:n},(_,k)=>{const s=thumbSrc(p.did,k);return `<button class="prth ${k===i?"on":""}" data-act="presGo" data-i="${k}" aria-label="Slide ${k+1}">${s?`<img src="${s}" alt="">`:`<span>${k+1}</span>`}</button>`}).join("")}</div></details>
 <div class="row"><select data-draft="pr_hand" aria-label="Hand over to">${whoOptions(dv("pr_hand","me"))}</select><button class="btn sm" data-act="presHand">Hand over</button><button class="btn sm" data-act="presEnd">End presentation</button></div></section>`}
function deckCard(d){const did=d.k,n=d.count||0,open=L.prNotes===did,stale=d.processing&&Date.now()-(d.t||0)>10*60000&&!(L.prBusy&&L.prBusy.title===d.title);
 const strip=Array.from({length:Math.min(n,8)},(_,k)=>{const s=thumbSrc(did,k);return `<span class="prth">${s?`<img src="${s}" alt="">`:`<span>${k+1}</span>`}</span>`}).join("")+(n>8?`<span class="prmore">+${n-8}</span>`:"");
 const nn=Object.keys(d.notes||{}).length;
 return `<section class="card stack"><div class="row between"><div class="mw0"><h3>${esc(d.title||"Untitled")}</h3><span class="small muted">${n} slide${n===1?"":"s"}${nn?` · notes on ${nn}`:""}${d.by?` · added by ${esc(d.by)}`:""}${d.processing?(stale?" · <b>upload didn't finish, delete it and try again</b>":" · still uploading…"):""}</span></div></div>
 ${n?`<div class="prstrip">${strip}</div>`:""}
 ${n&&!d.processing?`<label class="stack tight"><span class="small"><b>Who's presenting?</b> Their phone becomes the remote.</span><select data-draft="pr_who_${did}">${whoOptions(dv("pr_who_"+did,"me"))}</select></label>
 <div class="row"><button class="btn primary" data-act="presStart" data-k="${did}">Present on the big screen</button><button class="btn sm" data-act="prNotesOpen" data-k="${did}">${open?"Close notes":"Presenter notes"}</button>${L.confirm==="prdel:"+did?`<span class="small">Delete this presentation?</span><button class="btn sm gold" data-act="prDel" data-k="${did}">Delete</button><button class="btn sm" data-act="cancelConfirm">Keep</button>`:`<button class="btn sm" data-act="prAskDel" data-k="${did}">Delete</button>`}</div>`:
  `<div class="row">${L.confirm==="prdel:"+did?`<button class="btn sm gold" data-act="prDel" data-k="${did}">Yes, delete</button><button class="btn sm" data-act="cancelConfirm">Keep</button>`:`<button class="btn sm" data-act="prAskDel" data-k="${did}">Delete</button>`}</div>`}
 ${open?notesEditor(d):""}</section>`}
function notesEditor(d){const did=d.k,n=d.count||0,notes=d.notes||{};
 return `<div class="stack tight prnoted"><p class="small m0"><b>Presenter notes</b> show on the presenter's phone, under each slide. Type them below, or paste them all at once.</p>
 <details><summary class="small">Paste or import all the notes</summary><div class="stack tight"><p class="small muted m0">Start each slide's notes with <b>Slide 1:</b>, <b>Slide 2:</b> and so on, or put a line with three dashes (<b>---</b>) between slides.</p>
 <textarea rows="5" data-draft="pn_bulk_${did}" placeholder="Slide 1: Welcome everyone and thank the hosts&#10;Slide 2: How Raveen and Stafford met">${esc(dv("pn_bulk_"+did,""))}</textarea>
 <div class="row"><button class="btn sm primary" data-act="prNotesApply" data-k="${did}">Use these notes</button><label class="btn sm upl">Import a .txt file<input type="file" data-act="prNotesFile" data-k="${did}"></label></div></div></details>
 <div class="stack tight">${Array.from({length:n},(_,k)=>{const s=thumbSrc(did,k);return `<div class="prnrow"><span class="prth">${s?`<img src="${s}" alt="">`:`<span>${k+1}</span>`}</span><label class="stack tight grow"><span class="small muted">Slide ${k+1}</span><textarea rows="2" data-draft="pn_${did}_${k}">${esc(dv(`pn_${did}_${k}`,notes[k]||""))}</textarea></label></div>`}).join("")}</div>
 <button class="btn primary as" data-act="prNotesSave" data-k="${did}">Save notes</button></div>`}
function mPres(){const decks=deckList(),b=L.prBusy;
 return `${presLiveCard()}<section class="card stack"><h2>Presentations</h2><p class="small muted m0">Show slides on the big screen. Pick who's presenting, and their phone becomes the remote, with their notes and a peek at the next slide.</p>
 <div class="nudge stack tight"><b>Ask every presenter to send you their slides as a PDF.</b> PDFs show up exactly as designed. PowerPoint, Word and Excel files can't be shown directly.
  <ul class="small m0 prhow"><li>PowerPoint or Word: File → Save As → PDF</li><li>Google Slides or Docs: File → Download → PDF</li><li>Keynote or Pages: File → Export To → PDF</li><li>Excel: File → Save As → PDF</li><li>Canva: Share → Download → PDF</li></ul>
  <span class="small">Photos and images can be uploaded as they are. Each one becomes a slide, in file-name order.</span>
  <button class="btn sm as" data-act="prCopyAsk">Copy a message to send presenters</button></div>
 <label class="stack tight"><span class="small"><b>Title</b> (optional)</span><input type="text" data-draft="pr_title" value="${esc(dv("pr_title",""))}" placeholder="Our love story"></label>
 ${b?`<div class="stack tight"><span class="small">Preparing “${esc(b.title)}”: slide ${b.i} of ${b.n}…</span><div class="bar"><i style="width:${b.n?Math.round(100*b.i/b.n):0}%"></i></div><span class="small muted">Keep this page open until it finishes.</span></div>`:`<label class="btn primary upl as">Upload a PDF or images<input type="file" multiple data-act="prFile"></label>`}
 ${L.prErr?`<p class="small m0" style="color:var(--bad)">${esc(L.prErr)}</p>`:""}</section>
 ${decks.length?decks.map(deckCard).join(""):`<section class="card"><p class="small muted m0">No presentations yet.</p></section>`}`}
const _mLivePres=mLive;mLive=function(){return presLiveCard()+_mLivePres()};
(function(){const i=TOUR.findIndex(x=>/k=moments/.test(x.sel));TOUR.splice(i<0?TOUR.length:i+1,0,{sel:'[data-act=mtab][data-k=pres]',title:"Presentations",text:"Upload slides as a PDF, pick who's presenting, and their phone becomes the remote with their notes."})})();

/* --- big screen --- */
function updatePres(){if(VIEW!=="screen")return;const p=presOn();let el=$("#pres");
 if(!p){if(el&&el.classList.contains("on")){el.classList.remove("on");PR.key=null;setTimeout(()=>{if(!PR.key&&el)el.innerHTML=""},700)}return}
 if(!el){el=document.createElement("div");el.id="pres";document.body.appendChild(el)}
 if(!el.querySelector(".pr-bg")){const r=document.getElementById("ribbons");el.innerHTML=`<div class="pr-bg"></div><div class="mo-rib pr-rib">${r?r.innerHTML.replace(/id="rg(\d)"/g,'id="prg$1"').replace(/url\(#rg(\d)\)/g,"url(#prg$1)"):""}</div><div class="pr-stage"><div class="pr-frame"><img class="pr-img a" alt=""><img class="pr-img b" alt=""><div class="pr-wait">Loading slide…</div></div></div><div class="pr-foot"></div>`}
 el.classList.add("on");
 if(!PR.meta[p.did]){PR.meta[p.did]={};ER("decks/"+p.did).once("value").then(s=>{const v=s.val()||{};PR.meta[p.did]={title:v.title,count:v.count};renderSoon()})}
 const m=PR.meta[p.did]||{},foot=el.querySelector(".pr-foot");if(foot)foot.textContent=`${m.title||""}${m.count?` · ${(p.i||0)+1} / ${m.count}`:""}`;
 const key=p.did+"|"+(p.i||0);if(key===PR.key)return;PR.key=key;
 prImg(p.did,p.i||0,"f").then(src=>{if(PR.key!==key||!src)return;const a=el.querySelector(".pr-img.a"),b=el.querySelector(".pr-img.b");const on=a.classList.contains("show")?b:a,off=on===a?b:a;
  on.onload=()=>{on.classList.add("show");off.classList.remove("show");el.querySelector(".pr-frame").classList.add("has")};on.src=src});
 prImg(p.did,(p.i||0)+1,"f");if((p.i||0)>0)prImg(p.did,(p.i||0)-1,"f")}
const _renderPres=render;render=function(f){_renderPres(f);try{updatePres()}catch(e){console.warn(e)}};
if(VIEW==="screen")addEventListener("keydown",e=>{if(!presOn())return;if(["ArrowRight","ArrowDown","PageDown"," ","Enter"].includes(e.key)){e.preventDefault();presStep(1)}else if(["ArrowLeft","ArrowUp","PageUp","Backspace"].includes(e.key)){e.preventDefault();presStep(-1)}});

Object.assign(ACT,{
 prFile:async el=>{const fs=[...(el.files||[])];el.value="";try{const ae=document.activeElement;if(ae&&ae.blur&&ae.closest&&ae.closest("#app"))ae.blur()}catch(e){}if(!fs.length)return;if(L.prBusy)return toast("Wait for the current upload to finish");L.prErr=null;
  const bad=fs.find(f=>!isPdf(f)&&!isImg(f));if(bad){const kind=PR_FIX[extOf(bad)];L.prErr=kind?`That's a ${kind} file, which can't be shown directly. Save it as a PDF first (File → Save As or Download → PDF), then upload the PDF.`:`“${bad.name}” can't be shown. Upload a PDF, or images like JPG or PNG.`;render(true);return}
  const title0=dv("pr_title","").trim();delete L.drafts.pr_title;const nameOf=f=>String(f.name||"Slides").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim().slice(0,60)||"Slides";
  try{const pdfs=fs.filter(isPdf),imgs=fs.filter(f=>!isPdf(f));
   for(let k=0;k<pdfs.length;k++)await prFromPdf(pdfs[k],(k===0&&title0)||nameOf(pdfs[k]));
   if(imgs.length)await prFromImages(imgs,(!pdfs.length&&title0)||(imgs.length===1?nameOf(imgs[0]):"Photo slides"))}
  catch(e){console.warn(e);L.prBusy=null;L.prErr=(e&&/PDF reader/.test(e.message))?e.message:"Couldn't read that file. If it's a PDF, try saving it again as a PDF and upload the new copy.";render(true)}},
 prCopyAsk:()=>copyText(`Hi! I'm putting together the slides for ${C().title||"the event"}. Could you send me your presentation as a PDF? PowerPoint or Word: File → Save As → PDF. Google Slides: File → Download → PDF. Keynote: File → Export To → PDF. Thank you!`),
 prNotesOpen:el=>{L.prNotes=L.prNotes===el.dataset.k?null:el.dataset.k;render(true)},
 prNotesApply:async el=>{const did=el.dataset.k,n=deckCount(did),o=parseNotes(dv("pn_bulk_"+did,""),n);if(!Object.keys(o).length)return toast("No notes found");
  await ER(`decks/${did}/notes`).set(o);delete L.drafts["pn_bulk_"+did];for(let k=0;k<n;k++)delete L.drafts[`pn_${did}_${k}`];toast(`Notes added to ${Object.keys(o).length} slide${Object.keys(o).length===1?"":"s"}`);render(true)},
 prNotesFile:el=>{const f=el.files&&el.files[0],did=el.dataset.k;el.value="";if(!f)return;const fr=new FileReader();fr.onload=()=>{L.drafts["pn_bulk_"+did]=String(fr.result||"");ACT.prNotesApply({dataset:{k:did}})};fr.readAsText(f)},
 prNotesSave:async el=>{const did=el.dataset.k,n=deckCount(did),cur=((D.decks||{})[did]||{}).notes||{},o={};for(let k=0;k<n;k++){const v=String(dv(`pn_${did}_${k}`,cur[k]||"")).trim();if(v)o[k]=v.slice(0,2000)}
  await ER(`decks/${did}/notes`).set(o);for(let k=0;k<n;k++)delete L.drafts[`pn_${did}_${k}`];toast("Notes saved");render(true)},
 prAskDel:el=>{L.confirm="prdel:"+el.dataset.k;render(true)},
 prDel:async el=>{const did=el.dataset.k;L.confirm=null;const p=presOn();if(p&&p.did===did)await setState({pres:null});await ER("decks/"+did).remove();await ER("deckImg/"+did).remove();await ER("deckThumb/"+did).remove();toast("Presentation deleted");render(true)},
 presStart:el=>{const did=el.dataset.k,w=whoObj(dv("pr_who_"+did,"me"));setState({moment:null,pres:{did,i:0,on:true,t:now(),pid:w.pid||null,mid:w.mid||null,name:w.name}});toast(`On the big screen. ${w.pid?w.name+"'s phone is the remote.":""}`);L.mtab="pres";render(true)},
 presNext:()=>presStep(1),presPrev:()=>presStep(-1),
 presGo:el=>{ER("state/pres/i").set(+el.dataset.i)},
 presHand:()=>{const w=whoObj(dv("pr_hand","me"));ER("state/pres").update({pid:w.pid||null,mid:w.mid||null,name:w.name});toast(`${w.name} is presenting now`)},
 presEnd:()=>{setState({pres:null});toast("Presentation ended")}
});

/* ---- presentations: play nicely with the rest of the night ---- */
/* Anything else put on the big screen takes over from the slides, so it is never hidden behind them. */
["moShow","goLive","rafDraw","winner","endNight","tbOn","rvStart"].forEach(k=>{const f=ACT[k];if(!f)return;ACT[k]=function(){if(presOn()){setState({pres:null});toast("Presentation closed so this shows on the big screen")}return f.apply(this,arguments)}});
/* Dropdowns stay open: the page waits to refresh while a dropdown is open, then catches up once a choice is made. */
const _holdPR=typingHold;typingHold=function(){const a=document.activeElement;if(a&&a.tagName==="SELECT"&&a.closest&&a.closest("#app"))return true;return _holdPR()};
document.addEventListener("change",e=>{const el=e.target;if(el&&el.tagName==="SELECT"&&el.dataset&&el.dataset.draft)setTimeout(()=>{try{el.blur()}catch(x){}if(L.heldRender&&!typingHold()){L.heldRender=false;render()}},0)});
/* Practice runs get a copy of the presentations. */
async function copyDecks(from,to){for(const k of ["decks","deckImg","deckThumb"]){const v=(await ER(k,from).once("value")).val();if(v)await ER(k,to).set(v)}}

/* A game, the winners, the raffle draw or the tiebreaker take over the big screen from any moment that's showing. */
["goLive","rafDraw","winner","endNight","tbOn"].forEach(k=>{const f=ACT[k];if(!f)return;ACT[k]=function(){const s=st();const on=k==="winner"?!s.showWinner:k==="endNight"?!s.ended:true;if(on&&s.moment)setState({moment:null});return f.apply(this,arguments)}});

/* The host console only animates its cards when you switch tabs, not every time something changes on the night. */
const _vkDL=viewKey;viewKey=function(){return VIEW==="moderator"?["moderator",L.mtab,L.modOK,L.loaded,L.missing].join("|"):_vkDL()};

