/* ================= TEAMMATES: a planner's own team, working across all of her events =================
   partygames/mates/{id} = {name, t, nudge:{t,msg}}     (the id is the invite link: games.html?mate=ID)
   partygames/mateTasks/{id}/{taskId} = {title, ev, evName, due, note, done, doneAt, by, t}
   A teammate sees only their own tasks. The planner sees every teammate's progress and can send reminders. */
D.mates={};D.mtasks={};D.mateMe=null;
function mateKey(){return new URLSearchParams(location.search).get("mate")||""}
function mateConnect(){const id=mateKey();if(!id){L.loaded=true;renderSoon();return}
 RT(PSP+"mates/"+id).on("value",s=>{D.mateMe=s.val();L.loaded=true;renderSoon()});
 RT(PSP+"mateTasks/"+id).on("value",s=>{D.mtasks=Object.assign({},D.mtasks,{[id]:s.val()||{}});renderSoon()});
 RT(PSP+"brand").on("value",s=>{D.brand=s.val();applyTheme();renderSoon()});RT(PSP+"dayOf").on("value",s=>{D.dayOf=!!s.val();renderSoon()});
 if(PSP){const seen={};const watch=()=>mateTasksOf(id).forEach(x=>{if(x.ev&&!seen[x.ev]){seen[x.ev]=1;RT(PSP+"tv/"+x.ev).on("value",s=>{D.tv=Object.assign({},D.tv,{[x.ev]:s.val()||{}});renderSoon()})}});RT(PSP+"mateTasks/"+id).on("value",watch)}
 else{RT("clients").on("value",s=>{D.clients=s.val()||{};renderSoon()});RT("clientVendors").on("value",s=>{D.cven=s.val()||{};renderSoon()})}}
const mateTasksOf=id=>{const t=(D.mtasks||{})[id]||{};return Object.keys(t).map(k=>Object.assign({k},t[k])).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||String(a.due||"9999").localeCompare(String(b.due||"9999"))||(a.t||0)-(b.t||0))};
const mateStats=id=>{const l=mateTasksOf(id),d=l.filter(x=>x.done).length;return {total:l.length,done:d,open:l.length-d,pct:l.length?Math.round(d/l.length*100):0}};
const mateToday=()=>new Date().toISOString().slice(0,10);
const mateLate=x=>!x.done&&x.due&&x.due<mateToday();
const mateBehind=()=>Object.keys(D.mates||{}).filter(id=>mateTasksOf(id).some(mateLate)).length;
const mateDue=d=>{if(!d)return "";const t=new Date(d+"T12:00:00");return isNaN(t)?d:t.toLocaleDateString(undefined,{month:"short",day:"numeric"})};
const mateBar=pct=>`<div class="mbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
function mateLink(id){return location.origin+location.pathname.replace(/[^/]*$/,"")+"games.html?mate="+encodeURIComponent(id)+(PLID()?"&p="+encodeURIComponent(PLID()):"")}

/* ---- the teammate's own portal ---- */
function mateView(){
 const id=mateKey();
 if(!id||(L.loaded&&!D.mateMe))return `<section class="card stack narrow"><h2>This link isn't working</h2><p class="muted m0">Ask your planner to send you your personal link again.</p></section>`;
 if(!L.loaded)return loadingView();
 const me=D.mateMe,l=mateTasksOf(id),st2=mateStats(id),nz=me.nudge||{};
 const seen=+(store.get("mateSeen_"+id,0)||0),showNudge=nz.t&&nz.t>seen&&st2.open>0;
 const groups={};l.forEach(x=>{const g=x.evName||x.ev||"General";(groups[g]=groups[g]||[]).push(x)});
 const row=x=>`<label class="mrow ${x.done?"done":""} ${mateLate(x)?"late":""}"><input type="checkbox" data-act="mateTick" data-k="${x.k}" ${x.done?"checked":""} aria-label="Done: ${esc(x.title)}"><span class="mw0"><b>${esc(x.title)}</b>${x.note?`<span class="small muted db">${esc(x.note)}</span>`:""}${x.due?`<span class="small ${mateLate(x)?"bad":"muted"} db">${mateLate(x)?"Overdue · ":"Due "}${esc(mateDue(x.due))}</span>`:""}</span></label>`;
 return `${showNudge?`<section class="banner"><span><b>Reminder from your planner:</b> ${esc(nz.msg||"You have open tasks.")}</span><button class="btn xs" data-act="mateSeen">Got it</button></section>`:""}
 <section class="card stack"><div class="eyebrow">Teammate</div><h2>Hi ${esc(me.name||"there")}</h2>
 ${st2.total?`<div class="row between small"><span>${st2.done} of ${st2.total} done</span><span class="muted">${st2.open?st2.open+" to go":"All done. Thank you!"}</span></div>${mateBar(st2.pct)}`:`<p class="muted m0">No tasks yet. Your planner will add them here.</p>`}</section>
 ${Object.keys(groups).map(g=>`<section class="card stack"><h3>${esc(g)}</h3><div class="stack tight">${groups[g].map(row).join("")}</div></section>`).join("")}
 ${mateVendorsCard(id)}
 <p class="small muted tc">You only see your own tasks. Ticking a box tells your planner right away.</p>`}
function mateVendorsCard(id){const evs=new Set(mateTasksOf(id).map(x=>x.ev).filter(Boolean));if(!evs.size)return "";const out=[];
 if(Object.keys(D.tv||{}).length){[...evs].forEach(ev=>{const vs=Object.keys((D.tv||{})[ev]||{}).map(k=>D.tv[ev][k]);const nm=(mateTasksOf(id).find(x=>x.ev===ev)||{}).evName||ev;if(vs.length)out.push(`<section class="card stack"><h3>Vendors · ${esc(nm)}</h3><div class="stack tight">${vs.map(clVendorRow).join("")}</div></section>`)});return out.join("")}
Object.keys(D.clients||{}).forEach(cid=>{const c=D.clients[cid];if(!evs.has(c.ev))return;const vs=clVendors(cid).filter(v=>v.team);if(vs.length)out.push(`<section class="card stack"><h3>Vendors · ${esc(c.evName||c.ev)}</h3><div class="stack tight">${vs.map(clVendorRow).join("")}</div></section>`)});return out.join("")}

/* ---- the planner's Teammates tab ---- */
function hTeam(){
 const ms=D.mates||{},ids2=Object.keys(ms).sort((a,b)=>(ms[a].t||0)-(ms[b].t||0)),ev=D.events||{};
 const evOpts=`<option value="">No event (general)</option>${Object.keys(ev).map(k=>`<option value="${esc(k)}" ${dv("mt_ev","")===k?"selected":""}>${esc(ev[k].name||k)}</option>`).join("")}`;
 const card=id=>{const m=ms[id],s2=mateStats(id),open=L.mateOpen===id,l=mateTasksOf(id);const late=l.filter(mateLate).length;
  return `<section class="card stack"><div class="row between"><div class="mw0"><h3>${esc(m.name)}</h3><div class="small muted">${s2.total?`${s2.done} of ${s2.total} done${late?` · <span class="bad">${late} overdue</span>`:""}`:"No tasks yet"}</div></div>
  <div class="row"><button class="btn sm" data-act="copyLink" data-url="${esc(mateLink(id))}">Copy link</button><a class="btn sm" href="${esc(mateLink(id))}" target="_blank" rel="noopener">Preview as teammate</a><button class="btn sm" data-act="mateRemind" data-k="${id}" ${s2.open?"":"disabled"}>Remind</button><button class="btn sm" data-act="mateOpen" data-k="${id}" aria-expanded="${open}">${open?"Hide":"Tasks"}</button></div></div>
  ${s2.total?mateBar(s2.pct):""}
  ${open?`<div class="stack tight">${l.map(x=>`<div class="row between small mrow2 ${x.done?"done":""}"><span class="mw0"><button class="btn xs" data-act="matePlanTick" data-m="${id}" data-k="${x.k}" aria-label="${x.done?"Mark open":"Mark done"}">${x.done?"✓":"○"}</button> <b>${esc(x.title)}</b>${x.evName?` <span class="muted">· ${esc(x.evName)}</span>`:""}${x.due?` <span class="${mateLate(x)?"bad":"muted"}">· ${mateLate(x)?"overdue ":""}${esc(mateDue(x.due))}</span>`:""}${x.done&&x.by==="mate"?' <span class="pill ok">checked by '+esc(m.name)+'</span>':""}</span><button class="btn xs" data-act="mateTaskDel" data-m="${id}" data-k="${x.k}" aria-label="Delete task">×</button></div>`).join("")||'<span class="small muted">Nothing assigned yet.</span>'}
  <div class="row small"><button class="btn xs" data-act="mateDelete" data-k="${id}">${L.confirm==="md"+id?"Tap again to remove "+esc(m.name):"Remove teammate"}</button></div></div>`:""}</section>`};
 const behind=ids2.filter(id=>mateStats(id).open>0&&mateTasksOf(id).some(mateLate));
 return `<section class="card stack"><div class="row between"><h2>Your teammates</h2>${behind.length?`<button class="btn sm gold" data-act="mateRemindBehind">Remind everyone behind (${behind.length})</button>`:""}</div>
 <p class="small muted m0">Build your team once. Each teammate gets their own link with a personal checklist, and can work across all your events. They only see their own tasks.</p>
 <div class="row"><input type="text" class="grow" data-draft="mt_name" maxlength="40" value="${esc(dv("mt_name",""))}" placeholder="Teammate's name"><button class="btn primary" data-act="mateAdd">Add teammate</button></div></section>
 ${ids2.length?`<section class="card stack"><h3>Give someone a task</h3><div class="grid2 g8"><label class="stack tight"><span class="small">Who</span><select data-draft="mt_who"><option value="">Choose a teammate</option>${ids2.map(id=>`<option value="${id}" ${dv("mt_who","")===id?"selected":""}>${esc(ms[id].name)}</option>`).join("")}<option value="*" ${dv("mt_who","")==="*"?"selected":""}>Everyone</option></select></label>
 <label class="stack tight"><span class="small">Event</span><select data-draft="mt_ev">${evOpts}</select></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Task</span><input type="text" data-draft="mt_title" maxlength="120" value="${esc(dv("mt_title",""))}" placeholder="Set up the welcome table"></label>
 <label class="stack tight"><span class="small">Due date (optional)</span><input type="date" data-draft="mt_due" value="${esc(dv("mt_due",""))}"></label>
 <label class="stack tight"><span class="small">Note (optional)</span><input type="text" data-draft="mt_note" maxlength="160" value="${esc(dv("mt_note",""))}" placeholder="Bring the extension cords"></label></div>
 <button class="btn primary as" data-act="mateTaskAdd">Add task</button></section>`:""}
 ${ids2.map(card).join("")||'<section class="card"><p class="small muted m0">No teammates yet. Add the first one above, then copy their link and text it to them.</p></section>'}`}

Object.assign(ACT,{
 mateAdd:async()=>{const n=dv("mt_name","").trim().slice(0,40);if(!n)return toast("Type a name first");const r=RT(PSP+"mates").push();await r.set({name:n,t:Date.now()});L.drafts.mt_name="";L.mateOpen=r.key;toast("Added. Copy their link and send it.");render(true)},
 mateOpen:el=>{L.mateOpen=L.mateOpen===el.dataset.k?null:el.dataset.k;render(true)},
 mateDelete:async el=>{const id=el.dataset.k;if(L.confirm!=="md"+id){L.confirm="md"+id;return render(true)}L.confirm=null;await RT(PSP+"mateTasks/"+id).remove();await RT(PSP+"mates/"+id).remove();toast("Removed")},
 mateTaskAdd:async()=>{const who=dv("mt_who",""),title=dv("mt_title","").trim().slice(0,120);if(!who)return toast("Choose who it's for");if(!title)return toast("Type the task");
  const evc=dv("mt_ev",""),evn=evc&&(D.events||{})[evc]?(D.events[evc].name||evc):"";const base={title,ev:evc||"",evName:evn,due:dv("mt_due",""),note:dv("mt_note","").trim().slice(0,160),done:false,t:Date.now()};
  const targets=who==="*"?Object.keys(D.mates||{}):[who];const u={};targets.forEach((id,i)=>{u[id+"/"+RT(PSP+"mateTasks/"+id).push().key]=base});
  await RT(PSP+"mateTasks").update(u);["mt_title","mt_note","mt_due"].forEach(k=>delete L.drafts[k]);toast(targets.length>1?"Task added for everyone":"Task added");render(true)},
 matePlanTick:async el=>{const m=el.dataset.m,k=el.dataset.k,x=((D.mtasks||{})[m]||{})[k]||{};await RT(PSP+`mateTasks/${m}/${k}`).update({done:!x.done,doneAt:x.done?null:Date.now(),by:x.done?null:"planner"})},
 mateTaskDel:async el=>{await RT(PSP+`mateTasks/${el.dataset.m}/${el.dataset.k}`).remove()},
 mateRemind:async el=>{const id=el.dataset.k,s2=mateStats(id);await RT(PSP+"mates/"+id+"/nudge").set({t:Date.now(),msg:`You have ${s2.open} open task${s2.open===1?"":"s"}.`});toast("Reminder sent to "+((D.mates[id]||{}).name||"them"))},
 mateRemindBehind:async()=>{const u={};Object.keys(D.mates||{}).forEach(id=>{if(mateStats(id).open&&mateTasksOf(id).some(mateLate))u[id+"/nudge"]={t:Date.now(),msg:`You have ${mateTasksOf(id).filter(mateLate).length} overdue task(s).`}});await RT(PSP+"mates").update(u);toast("Reminders sent")},
 mateTick:async el=>{const id=mateKey(),k=el.dataset.k,on=el.checked;await RT(PSP+`mateTasks/${id}/${k}`).update({done:on,doneAt:on?Date.now():null,by:on?"mate":null});buzz(20)},
 mateSeen:()=>{store.set("mateSeen_"+mateKey(),Date.now());render(true)}});

