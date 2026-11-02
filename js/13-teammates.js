/* ================= TEAMMATES: a planner's own team, working across all of her events =================
   partygames/mates/{id} = {name, t, nudge:{t,msg}}     (the id is the invite link: games.html?mate=ID)
   partygames/mateTasks/{id}/{taskId} = {title, ev, evName, due, note, done, doneAt, by, t}
   A teammate sees only their own tasks. The planner sees every teammate's progress and can send reminders. */
D.mates={};D.mtasks={};D.mateMe=null;
function mateKey(){return new URLSearchParams(location.search).get("mate")||""}
function mateConnect(){const id=mateKey();if(!id){L.loaded=true;renderSoon();return}
 RT(PSP+"mates/"+id).on("value",s=>{D.mateMe=s.val();L.loaded=true;renderSoon()});
 RT(PSP+"mateTasks/"+id).on("value",s=>{D.mtasks=Object.assign({},D.mtasks,{[id]:s.val()||{}});renderSoon()});
 RT(PSP+"mateShifts/"+id).on("value",s=>{D.mshifts=Object.assign({},D.mshifts,{[id]:s.val()||{}});renderSoon()});
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
 ${shMateCard(id)}${mateVendorsCard(id)}
 <p class="small muted tc">You only see your own tasks. Ticking a box tells your planner right away.</p>`}
function mateVendorsCard(id){const evs=new Set(mateTasksOf(id).map(x=>x.ev).filter(Boolean));if(!evs.size)return "";const out=[];
 if(Object.keys(D.tv||{}).length){[...evs].forEach(ev=>{const vs=Object.keys((D.tv||{})[ev]||{}).map(k=>D.tv[ev][k]);const nm=(mateTasksOf(id).find(x=>x.ev===ev)||{}).evName||ev;if(vs.length)out.push(`<section class="card stack"><h3>Vendors · ${esc(nm)}</h3><div class="stack tight">${vs.map(clVendorRow).join("")}</div></section>`)});return out.join("")}
Object.keys(D.clients||{}).forEach(cid=>{const c=D.clients[cid];if(!evs.has(c.ev))return;const vs=clVendors(cid).filter(v=>v.team);if(vs.length)out.push(`<section class="card stack"><h3>Vendors · ${esc(c.evName||c.ev)}</h3><div class="stack tight">${vs.map(clVendorRow).join("")}</div></section>`)});return out.join("")}

/* ---- the planner's Teammates tab ---- */
function hTeam(){
 const ms=D.mates||{},ids2=Object.keys(ms).sort((a,b)=>(ms[a].t||0)-(ms[b].t||0)),ev=D.events||{};
 const evOpts=`<option value="">No event (general)</option>${Object.keys(ev).map(k=>`<option value="${esc(k)}" ${dv("mt_ev","")===k?"selected":""}>${esc(ev[k].name||k)}</option>`).join("")}`;
 const card=id=>{const m=ms[id],s2=mateStats(id),open=L.mateOpen===id,l=mateTasksOf(id);const late=l.filter(mateLate).length;
  return `<section class="card stack"><div class="row between"><div class="mw0"><h3>${esc(m.name)}</h3><div class="small muted">${s2.total?`${s2.done} of ${s2.total} done${late?` · <span class="bad">${late} overdue</span>`:""}`:"No tasks yet"}${(()=>{const n=shUpcoming(id)[0];return n?` · next shift ${esc(mateDue(n.date))}, ${esc(shTimes(n))}`:""})()}</div></div>
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
 ${shPlanCard()}
 ${ids2.map(card).join("")||'<section class="card"><p class="small muted m0">No teammates yet. Add the first one above, then copy their link and text it to them.</p></section>'}`}

Object.assign(ACT,{
 mateAdd:async()=>{const n=dv("mt_name","").trim().slice(0,40);if(!n)return toast("Type a name first");const r=RT(PSP+"mates").push();await r.set({name:n,t:Date.now()});L.drafts.mt_name="";L.mateOpen=r.key;toast("Added. Copy their link and send it.");render(true)},
 mateOpen:el=>{L.mateOpen=L.mateOpen===el.dataset.k?null:el.dataset.k;render(true)},
 mateDelete:async el=>{const id=el.dataset.k;if(L.confirm!=="md"+id){L.confirm="md"+id;return render(true)}L.confirm=null;await RT(PSP+"mateTasks/"+id).remove();await RT(PSP+"mateShifts/"+id).remove();await RT(PSP+"mates/"+id).remove();toast("Removed")},
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


/* ---- shifts: who works which event day, from when to when, and their hourly pay (tracking only) ----
   partygames/planners/{uid}/mateShifts/{mateId}/{k} = {date, start, end, role, pay, ev, evName, note, t}
   A teammate reads only their own shifts (their link is the key). Host Mode never pays anyone; it only adds up hours and pay. */
D.mshifts={};
const SH_ROLES=["Coordinator","Setup","Server","Bartender","Greeter","Runner","Teardown","Other"];
const shMins=t=>{const [h,m]=String(t||"").split(":").map(Number);return isNaN(h)?null:h*60+(m||0)};
const shHrs=s=>{const a=shMins(s.start),b=shMins(s.end);if(a==null||b==null)return 0;return Math.round(((b>a?b-a:b+1440-a)/60)*100)/100};
const shPay=s=>Math.round(shHrs(s)*(+s.pay||0)*100)/100;
const shTimes=s=>s.start||s.end?[s.start?clFmtTime(s.start):"",s.end?clFmtTime(s.end):""].filter(Boolean).join(" to "):"Time to be set";
const shiftsOf=id=>{const t=(D.mshifts||{})[id]||{};return Object.keys(t).map(k=>Object.assign({k,mid:id},t[k])).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start||"").localeCompare(String(b.start||"")))};
const shAll=()=>Object.keys(D.mshifts||{}).filter(id=>(D.mates||{})[id]).flatMap(shiftsOf).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start||"").localeCompare(String(b.start||"")));
const shUpcoming=id=>(id?shiftsOf(id):shAll()).filter(s=>s.date>=mateToday());
/* same teammate, same day, times that overlap */
function shClash(id,rec,skip){const a=shMins(rec.start),b0=shMins(rec.end);if(a==null||b0==null)return null;const b=b0>a?b0:b0+1440;
 return shiftsOf(id).find(s=>{if(s.k===skip||s.date!==rec.date)return false;const x=shMins(s.start),y0=shMins(s.end);if(x==null||y0==null)return false;const y=y0>x?y0:y0+1440;return a<y&&x<b})||null}
const shSum=l=>({n:l.length,h:Math.round(l.reduce((n,s)=>n+shHrs(s),0)*100)/100,pay:Math.round(l.reduce((n,s)=>n+shPay(s),0)*100)/100});
const shRow=(s,who)=>`<div class="row between small clrow"><span class="mw0"><b>${esc(clFmtDate(s.date))}</b> · ${esc(shTimes(s))}${who===1?` · <b>${esc(((D.mates||{})[s.mid]||{}).name||"Teammate")}</b>`:""}<span class="db muted">${[s.role,s.evName,shHrs(s)?shHrs(s)+" hours":"",+s.pay?clMoney(s.pay)+"/hour · "+clMoney(shPay(s)):"",s.note].filter(Boolean).map(esc).join(" · ")}</span></span>${who===2?"":`<button class="btn xs" data-act="shDel" data-m="${esc(s.mid)}" data-k="${esc(s.k)}">${L.confirm==="shx"+s.k?"Tap again to delete":"Delete"}</button>`}</div>`;
/* the planner's form and schedule, shown in the Teammates tab */
function shPlanCard(){const ms=D.mates||{},ids=Object.keys(ms).sort((a,b)=>(ms[a].t||0)-(ms[b].t||0));if(!ids.length)return "";
 const ev=D.events||{},open=L.shOpen,up=shUpcoming(),m30=up.filter(s=>s.date<=dayAdd(mateToday(),30)),sm=shSum(m30),by={};up.slice(0,40).forEach(s=>(by[s.date]=by[s.date]||[]).push(s));
 const form=open?`<div class="grid2 g8"><label class="stack tight"><span class="small">Who</span><select data-draft="sh_who"><option value="">Choose a teammate</option>${ids.map(id=>`<option value="${id}" ${dv("sh_who","")===id?"selected":""}>${esc(ms[id].name)}</option>`).join("")}</select></label>
  <label class="stack tight"><span class="small">Event</span><select data-draft="sh_ev"><option value="">No event</option>${Object.keys(ev).map(k=>`<option value="${esc(k)}" ${dv("sh_ev","")===k?"selected":""}>${esc(ev[k].name||k)}</option>`).join("")}</select></label>
  <label class="stack tight"><span class="small">Date</span><input type="date" data-draft="sh_date" value="${esc(dv("sh_date",""))}"></label>
  <label class="stack tight"><span class="small">Role</span><select data-draft="sh_role">${SH_ROLES.map(r=>`<option ${dv("sh_role","Setup")===r?"selected":""}>${r}</option>`).join("")}</select></label>
  <label class="stack tight"><span class="small">Starts</span><input type="time" data-draft="sh_start" value="${esc(dv("sh_start",""))}"></label>
  <label class="stack tight"><span class="small">Ends</span><input type="time" data-draft="sh_end" value="${esc(dv("sh_end",""))}"></label>
  <label class="stack tight"><span class="small">Hourly pay ($, optional)</span><input type="text" inputmode="decimal" data-draft="sh_pay" value="${esc(dv("sh_pay",""))}" placeholder="20"></label>
  <label class="stack tight"><span class="small">Note (optional)</span><input type="text" data-draft="sh_note" maxlength="160" value="${esc(dv("sh_note",""))}" placeholder="Wear all black"></label></div>
  <button class="btn primary as" data-act="shSave">Add shift</button><span class="small muted">They see it on their teammate page right away. Host Mode adds up hours and pay for you; it never pays anyone.</span>`:"";
 return `<section class="card stack" id="shCard"><div class="row between"><h3>Event-day shifts</h3><button class="btn sm" data-act="shToggle">${open?"Close":"Schedule a shift"}</button></div>
 ${m30.length?`<div class="small"><b>Next 30 days:</b> ${sm.n} shift${sm.n===1?"":"s"} · ${sm.h} hours${sm.pay?` · ${clMoney(sm.pay)} in pay`:""}</div>`:'<p class="small muted m0">Plan who works each event day: their role, start and end times and hourly pay.</p>'}
 ${form}
 ${up.length?`<div class="stack tight">${Object.keys(by).map(d=>{const l=by[d],s2=shSum(l);return `<div class="stack tight"><div class="small muted">${esc(clFmtDate(d))} · ${s2.n} on shift · ${s2.h} hours${s2.pay?" · "+clMoney(s2.pay):""}</div>${l.map(s=>shRow(s,1)).join("")}</div>`}).join("")}</div>`:""}</section>`}
/* the teammate's own shifts, on their page */
function shMateCard(id){const up=shUpcoming(id);if(!up.length)return "";const sm=shSum(up);
 return `<section class="card stack"><h3>Your shifts</h3><div class="stack tight">${up.map(s=>shRow(s,2)).join("")}</div>${sm.pay?`<div class="small muted">${sm.h} hours coming up · about ${clMoney(sm.pay)} before any tips. Your planner pays you directly.</div>`:""}</section>`}
Object.assign(ACT,{
 shToggle:()=>{L.shOpen=!L.shOpen;render(true)},
 shSave:async()=>{const who=dv("sh_who",""),date=dv("sh_date",""),start=dv("sh_start",""),end=dv("sh_end",""),ps=String(dv("sh_pay","")).trim(),pay=ps?invParse(ps):0;
  if(!who||!(D.mates||{})[who])return toast("Choose who's working");if(!date)return toast("Pick the date");if(!start||!end)return toast("Add the start and end times");if(pay==null||pay<0)return toast("Type the hourly pay as a number, like 20");
  const evc=dv("sh_ev",""),rec={date,start,end,role:SH_ROLES.includes(dv("sh_role","Setup"))?dv("sh_role","Setup"):"Other",pay:pay||0,ev:evc&&(D.events||{})[evc]?evc:"",evName:evc&&(D.events||{})[evc]?String(D.events[evc].name||evc).slice(0,80):"",note:String(dv("sh_note","")).trim().slice(0,160),t:Date.now()};
  const c=shClash(who,rec);if(c)return toast(`${D.mates[who].name} already works ${shTimes(c)} that day`);
  await RT(PSP+"mateShifts/"+who).push().set(rec);["sh_start","sh_end","sh_note"].forEach(k=>delete L.drafts[k]);toast("Shift added for "+D.mates[who].name);render(true)},
 shDel:async el=>{const k=el.dataset.k;if(L.confirm!=="shx"+k){L.confirm="shx"+k;return render(true)}L.confirm=null;await RT(PSP+`mateShifts/${el.dataset.m}/${k}`).remove();toast("Shift deleted")}});
