/* ================= INVENTORY AND VENUE BOOKINGS =================
   planners/{uid}/gear/{k}    = {name, cat, qty, rep (in repair), color, spot, cost, low, note, t}    a thing the business owns
   planners/{uid}/gearRes/{k} = {label, ref ("c:<client>" | "b:<booking>" | ""), from, to, items:{gearKey:qty},
                                 status: held|out|back, back:{gearKey:{lost,dmg}}, note, t,
                                 pics:{p:{stage: out|back, th (small preview), t}}}             a pull list for one event
   planners/{uid}/gresImg/{k}/{p} = the full photo, loaded only when someone opens it (proof for damage claims)
   planners/{uid}/venue       = {on}                                                              venue bookings turned on
   planners/{uid}/spaces/{k}  = {name, cap, rate, minSpend, note, t}   rooms or areas of the venue (minSpend: least a booking spends on fee plus food and drink)
   planners/{uid}/bookings/{k}= {space ("" = whole venue), date, start, end, name, ref, kind, guests, status: hold|confirmed|cancelled,
                                 holdUntil, price, spend (food and drink), deposit, depPaid, phone, email, note, t}
   planners/{uid}/blocks/{k}  = {from, to, space ("" = whole venue), reason, t}                   days the venue can't be booked
   Everything here is private to the planner. */
D.gear={};D.gres={};D.vset=null;D.spaces={};D.bks={};D.vblk={};
// Same groups as the 3D designer's Add tab (3d/scene.js CAT_ORDER), plus the things that are not 3D pieces. Older saved names map to the new ones.
const GEAR_CATS=["Tables","Seating","Linens","Tableware","Centerpieces","Florals & greenery","Balloons","Backdrops & drapery","Lighting & candles","Lounge & accents","Stage & floor","Audio & video","Photo & effects","Food & drink","Signs","Tents & shade","Site & power","Structure","Other"];
const GEAR_OLD={Chairs:"Seating",Lighting:"Lighting & candles",Draping:"Backdrops & drapery",Decor:"Lounge & accents"};
const gearCatOf=c=>GEAR_OLD[c]||(GEAR_CATS.includes(c)?c:"Other");
const BK_KINDS=["Wedding","Reception","Baby shower","Birthday","Anniversary","Corporate event","Meeting","Tour or tasting","Other"];
const BK_ST={hold:["On hold","warn"],confirmed:["Confirmed","ok"],cancelled:["Cancelled",""]};
const GR_ST={held:["Reserved",""],out:["Out","warn"],back:["Returned","ok"]};
const ymdOf=t=>`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
const dayAdd=(ds,n)=>{const t=new Date(ds+"T12:00:00");t.setDate(t.getDate()+n);return ymdOf(t)};
const dayRange=(a,b)=>{const out=[];if(!a)return out;b=b&&b>=a?b:a;for(let d=a,i=0;d<=b&&i<62;d=dayAdd(d,1),i++)out.push(d);return out};
const numIn=(k,def)=>{const v=String(dv(k,def==null?"":def)).trim();if(!v)return 0;const n=Math.floor(+v);return isFinite(n)&&n>=0?n:NaN};
const keyList=o=>Object.keys(o||{}).map(k=>Object.assign({k},o[k]));

/* ---- inventory math ---- */
const gearList=()=>keyList(D.gear).map(it=>Object.assign({},it,{cat:gearCatOf(it.cat)})).sort((a,b)=>GEAR_CATS.indexOf(a.cat)-GEAR_CATS.indexOf(b.cat)||String(a.name).localeCompare(String(b.name)));
const gresList=()=>keyList(D.gres).sort((a,b)=>String(a.from||"").localeCompare(String(b.from||""))||(a.t||0)-(b.t||0));
const gearAvail=it=>Math.max(0,(+it.qty||0)-(+it.rep||0));
const gresTo=r=>r.to&&r.to>=r.from?r.to:r.from;
const gresCovers=(r,d)=>r.status!=="back"&&r.from&&r.from<=d&&gresTo(r)>=d;
function gearUseOn(gk,d,except){return gresList().reduce((n,r)=>n+(r.k!==except&&gresCovers(r,d)?(+((r.items||{})[gk])||0):0),0)}
function gearPeak(gk,from,to,except){return dayRange(from,to).reduce((m,d)=>Math.max(m,gearUseOn(gk,d,except)),0)}
function gearFree(it,from,to,except){return gearAvail(it)-gearPeak(it.k,from,to||from,except)}
/* a pull list is short when, on one of its days, everything reserved that day is more than the business has */
function gresShort(r){if(r.status==="back")return [];const out=[];
 Object.keys(r.items||{}).forEach(gk=>{const it=(D.gear||{})[gk];if(!it)return;const peak=gearPeak(gk,r.from,gresTo(r),null),have=gearAvail(Object.assign({k:gk},it));if(peak>have)out.push({name:it.name,short:peak-have})});return out}
const gresLate=r=>r.status==="out"&&gresTo(r)<mateToday();
const gresWhat=r=>Object.keys(r.items||{}).filter(gk=>(D.gear||{})[gk]&&+r.items[gk]>0).map(gk=>`${+r.items[gk]} ${D.gear[gk].name}`);
const gearIssues=()=>gresList().filter(r=>gresTo(r)>=mateToday()&&gresShort(r).length).length+gresList().filter(gresLate).length;
function refOpts(sel){const cs=D.clients||{},today=mateToday();
 const cl=Object.keys(cs).filter(id=>!cs[id].date||cs[id].date>=dayAdd(today,-7)).map(id=>[`c:${id}`,(cs[id].evName||cs[id].name||"Client")+(cs[id].date?" · "+clFmtDate(cs[id].date):"")]);
 const bk=bkList().filter(b=>b.status!=="cancelled"&&b.date>=dayAdd(today,-7)).map(b=>[`b:${b.k}`,(b.name||"Venue booking")+" · "+clFmtDate(b.date)]);
 return `<option value="">Something else (type a name)</option>${cl.length?`<optgroup label="Clients">${cl.map(([v,l])=>`<option value="${esc(v)}" ${sel===v?"selected":""}>${esc(l)}</option>`).join("")}</optgroup>`:""}${bk.length?`<optgroup label="Venue bookings">${bk.map(([v,l])=>`<option value="${esc(v)}" ${sel===v?"selected":""}>${esc(l)}</option>`).join("")}</optgroup>`:""}`}
function refInfo(ref){const [t,id]=String(ref||"").split(":");if(t==="c"){const c=(D.clients||{})[id];return c?{name:c.evName||c.name||"",date:c.date||""}:null}if(t==="b"){const b=(D.bks||{})[id];return b?{name:b.name||"",date:b.date||""}:null}return null}

/* ---- planner: Inventory tab ---- */
const GR_F=["gr_label","gr_ref","gr_from","gr_to","gr_note"];
function gearForm(it){const p="gi_",v=(k,d)=>esc(dv(p+k,it?(it[k]==null?"":it[k]):(d||"")));
 return `<div class="card stack tight"><div class="row between"><b>${it?"Edit "+esc(it.name):"New item"}</b><button class="btn xs" data-act="gearClose">Close</button></div><div class="grid2 g8">
 <label class="stack tight" style="grid-column:1/-1"><span class="small">What is it?</span><input type="text" data-draft="gi_name" maxlength="80" value="${v("name")}" placeholder="Ivory 120&quot; round tablecloth"></label>
 <label class="stack tight"><span class="small">Category</span><select data-draft="gi_cat">${GEAR_CATS.map(c=>`<option ${dv("gi_cat",it?gearCatOf(it.cat):"Tables")===c?"selected":""}>${c}</option>`).join("")}</select></label>
 <label class="stack tight"><span class="small">How many you own</span><input type="number" min="0" inputmode="numeric" data-draft="gi_qty" value="${v("qty")}" placeholder="40"></label>
 <label class="stack tight"><span class="small">Color, size or style</span><input type="text" data-draft="gi_color" maxlength="80" value="${v("color")}" placeholder="Ivory, fits 60&quot; rounds"></label>
 <label class="stack tight"><span class="small">Where it's stored</span><input type="text" data-draft="gi_spot" maxlength="80" value="${v("spot")}" placeholder="Storage unit, shelf B"></label>
 <label class="stack tight"><span class="small">In repair or cleaning</span><input type="number" min="0" inputmode="numeric" data-draft="gi_rep" value="${v("rep","0")}" placeholder="0"></label>
 <label class="stack tight"><span class="small">Replacement cost each ($)</span><input type="text" inputmode="decimal" data-draft="gi_cost" value="${v("cost")}" placeholder="18"></label>
 <label class="stack tight"><span class="small">Warn me when fewer than</span><input type="number" min="0" inputmode="numeric" data-draft="gi_low" value="${v("low")}" placeholder="Leave blank for no warning"></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Notes</span><input type="text" data-draft="gi_note" maxlength="300" value="${v("note")}" placeholder="Steam before use"></label></div>
 <button class="btn primary as" data-act="gearSave" data-k="${it?esc(it.k):""}">${it?"Save changes":"Add to inventory"}</button></div>`}
function gresForm(r){const items=gearList(),from=dv("gr_from",r?r.from:""),to=dv("gr_to",r?gresTo(r):""),ri=refInfo(dv("gr_ref",r?r.ref:"")),f=from||(ri&&ri.date)||"";
 return `<div class="card stack tight" id="grForm"><div class="row between"><b>${r?"Edit pull list":"Reserve items for an event"}</b><button class="btn xs" data-act="gresClose">Close</button></div><div class="grid2 g8">
 <label class="stack tight" style="grid-column:1/-1"><span class="small">For</span><select data-draft="gr_ref">${refOpts(dv("gr_ref",r?r.ref:""))}</select></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Name on the pull list</span><input type="text" data-draft="gr_label" maxlength="80" value="${esc(dv("gr_label",r?r.label:""))}" placeholder="${esc(ri&&ri.name||"Johnson wedding")}"></label>
 <label class="stack tight"><span class="small">Goes out</span><input type="date" data-draft="gr_from" value="${esc(from)}"></label>
 <label class="stack tight"><span class="small">Comes back</span><input type="date" data-draft="gr_to" value="${esc(to)}"></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Notes for the crew</span><input type="text" data-draft="gr_note" maxlength="300" value="${esc(dv("gr_note",r?r.note:""))}" placeholder="Load the van by 9am"></label></div>
 <span class="small muted">Leave the dates blank to use the event's date. ${f?"Free counts are for "+esc(clFmtDate(f))+(to&&to>f?" to "+esc(clFmtDate(to)):"")+".":"Pick a date to see what's free."} <button class="btn xs" data-act="gresCheck">Update free counts</button></span>
 ${items.length?`<div class="stack tight">${items.map(it=>{const fr=f?gearFree(it,f,to||f,r&&r.k):gearAvail(it),q=dv("grq_"+it.k,r&&r.items&&r.items[it.k]?r.items[it.k]:"");
  return `<div class="row between small clrow"><span class="mw0"><b>${esc(it.name)}</b><span class="db ${fr<=0?"bad":"muted"}">${esc(it.cat||"")}${it.color?" · "+esc(it.color):""} · ${fr<0?"over by "+(-fr):fr+" free"}</span></span><input type="number" min="0" inputmode="numeric" style="width:5.5em" data-draft="grq_${esc(it.k)}" value="${esc(q)}" placeholder="0" aria-label="How many ${esc(it.name)}"></div>`}).join("")}</div>`:'<span class="small muted">Add items to your inventory first.</span>'}
 <button class="btn primary as" data-act="gresSave" data-k="${r?esc(r.k):""}">${r?"Save pull list":"Reserve these"}</button></div>`}
/* photos when it goes out and when it comes back, for damage claims */
const GR_MAX_PH=12;
const gresPics=r=>Object.keys(r.pics||{}).map(p=>Object.assign({p},r.pics[p])).sort((a,b)=>(a.t||0)-(b.t||0));
function gresPicRow(r,stage){const l=gresPics(r),n=l.length;
 return `${n?`<div class="row">${l.map(x=>`<span class="shthumb"><button class="gpic" data-act="gresPicView" data-k="${esc(r.k)}" data-n="${esc(x.p)}" aria-label="Open the ${x.stage==="back"?"check-in":"going-out"} photo from ${esc(new Date(x.t||0).toLocaleDateString())}"><img src="${esc(x.th||"")}" alt=""></button><span class="gpst">${x.stage==="back"?"Back":"Out"}</span><button class="btn xs" data-act="gresPicDel" data-k="${esc(r.k)}" data-n="${esc(x.p)}" aria-label="Remove photo">${L.confirm==="gp"+x.p?"Sure?":"×"}</button></span>`).join("")}</div>`:""}
 ${n<GR_MAX_PH?`<label class="btn xs upl as">${stage==="back"?"Add photos of damage":"Add photos before it goes out"}<input type="file" accept="image/*" multiple data-act="gresPic" data-k="${esc(r.k)}" data-s="${stage}"></label>`:""}`}
function gresBackForm(r){return `<div class="card stack tight"><b>Check in: ${esc(r.label)}</b><span class="small muted">Count what came back. Missing pieces come off your totals; damaged ones go under repair until you fix them.</span>
 ${Object.keys(r.items||{}).filter(gk=>(D.gear||{})[gk]&&+r.items[gk]>0).map(gk=>`<div class="row between small clrow"><span class="mw0"><b>${esc(D.gear[gk].name)}</b><span class="db muted">${+r.items[gk]} went out</span></span><span class="row" style="gap:6px"><label class="stack tight"><span class="small">Missing</span><input type="number" min="0" style="width:4.5em" data-draft="gb_lost_${esc(gk)}" value="${esc(dv("gb_lost_"+gk,""))}" placeholder="0"></label><label class="stack tight"><span class="small">Damaged</span><input type="number" min="0" style="width:4.5em" data-draft="gb_dmg_${esc(gk)}" value="${esc(dv("gb_dmg_"+gk,""))}" placeholder="0"></label></span></div>`).join("")}
 <span class="small muted">Photos are dated, so you have proof if you need to charge for damage.</span>${gresPicRow(r,"back")}
 <div class="row"><button class="btn primary" data-act="gresBackSave" data-k="${esc(r.k)}">Everything else came back</button><button class="btn" data-act="gresBackClose">Not yet</button></div></div>`}
function gresRow(r){const st=r.status||"held",sh=gresShort(r),late=gresLate(r),what=gresWhat(r),cf=L.confirm==="gd"+r.k;
 if(L.gresBack===r.k)return gresBackForm(r);
 return `<div class="mrow2 small"><div class="row between"><span class="mw0"><b>${esc(r.label||"Event")}</b> <span class="pill ${GR_ST[st][1]}">${GR_ST[st][0]}</span><span class="db muted">${esc(clFmtDate(r.from))}${gresTo(r)>r.from?" to "+esc(clFmtDate(gresTo(r))):""}</span></span></div>
 ${what.length?`<div class="muted">${what.map(esc).join(" · ")}</div>`:""}${r.note?`<div class="muted">${esc(r.note)}</div>`:""}
 ${sh.length?`<div class="bad">Not enough: ${sh.map(x=>`${esc(x.name)} (short ${x.short})`).join(", ")}</div>`:""}${late?`<div class="bad">Was due back ${esc(clFmtDate(gresTo(r)))}</div>`:""}
 ${r.status==="back"&&r.back?`<div class="muted">${Object.keys(r.back).filter(gk=>(D.gear||{})[gk]).map(gk=>{const b=r.back[gk];return [b.lost?`${b.lost} ${D.gear[gk].name} missing`:"",b.dmg?`${b.dmg} damaged`:""].filter(Boolean).join(", ")}).filter(Boolean).map(esc).join(" · ")||"All back in good shape"}</div>`:""}
 ${st!=="back"||gresPics(r).length?gresPicRow(r,st==="back"?"back":"out"):""}
 <div class="row">${st==="held"?`<button class="btn xs" data-act="gresOut" data-k="${esc(r.k)}">Packed and out</button>`:""}${st==="out"?`<button class="btn xs" data-act="gresBack" data-k="${esc(r.k)}">Check it back in</button>`:""}
 <button class="btn xs" data-act="gresPrint" data-k="${esc(r.k)}">Print pull list</button>${st!=="back"?`<button class="btn xs" data-act="gresEdit" data-k="${esc(r.k)}">Edit</button>`:""}<button class="btn xs" data-act="gresDel" data-k="${esc(r.k)}">${cf?"Tap again to delete":"Delete"}</button></div></div>`}
function plGearTab(){const items=gearList(),today=mateToday(),q=String(dv("gear_q","")).toLowerCase().trim(),cat=L.gearCat||"",res=gresList();
 const outNow=res.filter(r=>r.status==="out"),pieces=items.reduce((n,it)=>n+(+it.qty||0),0),value=items.reduce((n,it)=>n+(+it.qty||0)*(+it.cost||0),0);
 const low=items.filter(it=>it.low!==""&&it.low!=null&&+it.low>0&&gearAvail(it)<+it.low);
 const cats=GEAR_CATS.filter(c=>items.some(it=>it.cat===c)),shown=items.filter(it=>(!cat||it.cat===cat)&&(!q||[it.name,it.color,it.spot,it.note,it.cat].join(" ").toLowerCase().includes(q)));
 const cf=L.gearCheck||{},cfFrom=dv("gc_from",today),cfTo=dv("gc_to","");
 const upcoming=res.filter(r=>r.status!=="back"),past=res.filter(r=>r.status==="back").reverse().slice(0,10);
 const editIt=L.gearEdit&&L.gearEdit!=="new"?Object.assign({k:L.gearEdit},(D.gear||{})[L.gearEdit]||{}):null;
 return `<section class="card stack"><div class="row between"><h2 class="m0">Inventory</h2><div class="row"><button class="btn sm primary" data-act="gearNew">Add an item</button><button class="btn sm" data-act="gresNew">Reserve for an event</button></div></div>
 <p class="small muted m0">Everything you own and rent out: tablecloths, centerpieces, chairs, tables, lights and more. Reserve items for an event and Host Mode warns you before you double-book them.</p>
 <div class="stats"><div class="stat"><b>${items.length}</b><span>Items · ${pieces.toLocaleString()} pieces</span></div><div class="stat"><b>${outNow.length}</b><span>Pull lists out now</span></div><div class="stat ${gearIssues()?"hot":""}"><b>${gearIssues()}</b><span>Shortages or late returns</span></div><div class="stat"><b>${clMoney(value)}</b><span>Replacement value</span></div></div>
 ${low.length?`<div class="small bad">Running low: ${low.map(it=>`${esc(it.name)} (${gearAvail(it)} ready)`).join(", ")}</div>`:""}
 ${L.gearEdit?gearForm(editIt):""}</section>
 ${L.gresEdit?`<section class="card stack">${gresForm(L.gresEdit==="new"?null:Object.assign({k:L.gresEdit},(D.gres||{})[L.gresEdit]||{}))}</section>`:""}
 <section class="card stack"><h3>Check availability</h3><div class="grid2 g8"><label class="stack tight"><span class="small">From</span><input type="date" data-draft="gc_from" value="${esc(cfFrom)}"></label><label class="stack tight"><span class="small">To (optional)</span><input type="date" data-draft="gc_to" value="${esc(cfTo)}"></label></div>
 <button class="btn sm as" data-act="gearCheck">Show what's free</button>
 ${cf.from&&items.length?`<div class="stack tight">${items.map(it=>{const fr=gearFree(it,cf.from,cf.to||cf.from,null);return `<div class="row between small clrow"><span class="mw0">${esc(it.name)}<span class="db muted">${esc(it.cat||"")} · own ${+it.qty||0}${+it.rep?`, ${+it.rep} in repair`:""}</span></span><b class="${fr<=0?"bad":""}">${fr} free</b></div>`}).join("")}</div><span class="small muted">For ${esc(clFmtDate(cf.from))}${cf.to&&cf.to>cf.from?" to "+esc(clFmtDate(cf.to)):""}.</span>`:""}</section>
 <section class="card stack"><div class="row between"><h3>Your items</h3>${items.length?`<button class="btn xs" data-act="gearCsv">Download as a spreadsheet</button>`:""}</div>
 ${items.length?`<input type="search" data-draft="gear_q" value="${esc(dv("gear_q",""))}" placeholder="Search by name, color or where it's stored" aria-label="Search inventory"><div class="row small">${cat?`<button class="btn xs" data-act="gearCat" data-k="">&larr; All categories</button><b>${esc(cat)}</b> `:""}<button class="btn xs" data-act="gearFind">Search</button></div>
 ${!cat&&!q?`<div class="row small" style="flex-wrap:wrap;gap:8px">${cats.map(c=>{const n=items.filter(it=>it.cat===c);return `<button class="btn" data-act="gearCat" data-k="${esc(c)}"><b>${esc(c)}</b><br><span class="small muted">${n.length} item${n.length===1?"":"s"} &middot; ${n.reduce((a,it)=>a+(+it.qty||0),0)} pieces</span></button>`}).join("")}</div>`:`<div class="stack tight">${shown.map(it=>{const freeToday=gearFree(it,today,today,null),cf2=L.confirm==="gx"+it.k;return `<div class="mrow2 small"><div class="row between"><span class="mw0"><b>${esc(it.name)}</b> <span class="pill">${esc(it.cat||"Other")}</span><span class="db muted">${[it.color,it.spot?"Stored: "+it.spot:"",+it.cost?clMoney(it.cost)+" each":""].filter(Boolean).map(esc).join(" · ")}</span></span><span class="a"><b>${+it.qty||0}</b> <span class="muted">owned</span></span></div>
  <div class="muted">${freeToday} free today${+it.rep?` · ${+it.rep} in repair or cleaning`:""}${it.note?" · "+esc(it.note):""}</div>
  <div class="row">${+it.rep?`<button class="btn xs" data-act="gearFixed" data-k="${esc(it.k)}">Repaired, all ready</button>`:""}<button class="btn xs" data-act="gearEdit" data-k="${esc(it.k)}">Edit</button><button class="btn xs" data-act="gearDel" data-k="${esc(it.k)}">${cf2?"Tap again to delete":"Delete"}</button></div></div>`}).join("")||'<p class="small muted m0">Nothing matches.</p>'}</div>`}`
 :'<p class="small muted m0">No items yet. Tap Add an item, or bring in a spreadsheet from Import &amp; export.</p>'}</section>
 <section class="card stack"><h3>Pull lists</h3><p class="small muted m0">What's reserved for each event. Mark it out when it leaves and check it in when it's back.</p>
 ${upcoming.length?`<div class="stack tight">${upcoming.map(gresRow).join("")}</div>`:'<p class="small muted m0">Nothing reserved. Tap Reserve for an event.</p>'}
 ${past.length?`<details><summary class="small">Returned (${past.length})</summary><div class="stack tight">${past.map(gresRow).join("")}</div></details>`:""}</section>`}
function gresHTML(r){const f=invFrom(),rows=Object.keys(r.items||{}).filter(gk=>(D.gear||{})[gk]&&+r.items[gk]>0).map(gk=>Object.assign({k:gk,n:+r.items[gk]},D.gear[gk])).sort((a,b)=>GEAR_CATS.indexOf(a.cat)-GEAR_CATS.indexOf(b.cat)||String(a.spot||"").localeCompare(String(b.spot||"")));
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pull list · ${esc(r.label||"Event")}</title>
<style>body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2433;background:#f4f1ea}.pg{max-width:760px;margin:24px auto;background:#fff;padding:36px 40px;border-radius:14px}
h1{margin:0 0 4px;font-size:26px;color:${esc(f.color)}}.m{color:#6b7385}table{width:100%;border-collapse:collapse;margin-top:18px}th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7385;border-bottom:2px solid ${esc(f.color)};padding:8px 6px}td{padding:10px 6px;border-bottom:1px solid #eee;vertical-align:top}td.n{font-weight:800;text-align:right}.bx{width:18px;height:18px;border:2px solid #999;border-radius:4px;display:inline-block}
@media print{body{background:#fff}.pg{margin:0;box-shadow:none;padding:0}}</style></head><body><div class="pg">
<div class="m">${esc(f.name)}</div><h1>Pull list: ${esc(r.label||"Event")}</h1><div class="m">Out ${esc(clFmtDate(r.from))}${gresTo(r)>r.from?" · back "+esc(clFmtDate(gresTo(r))):""}</div>${r.note?`<p>${esc(r.note)}</p>`:""}
<table><thead><tr><th>Packed</th><th>Item</th><th>Where it's stored</th><th style="text-align:right">How many</th><th>Back</th></tr></thead><tbody>${rows.map(x=>`<tr><td><span class="bx"></span></td><td><b>${esc(x.name)}</b>${x.color?`<div class="m">${esc(x.color)}</div>`:""}</td><td>${esc(x.spot||"")}</td><td class="n">${x.n}</td><td><span class="bx"></span></td></tr>`).join("")}</tbody></table>
<p class="m">Made with Host Mode</p></div></body></html>`}
function gearClearForm(){Object.keys(L.drafts).filter(k=>/^g[ib]_|^grq_/.test(k)||GR_F.includes(k)).forEach(k=>delete L.drafts[k])}
Object.assign(ACT,{
 gearNew:()=>{gearClearForm();L.gearEdit="new";L.gresEdit=null;render(true)},
 gearEdit:el=>{gearClearForm();L.gearEdit=el.dataset.k;L.gresEdit=null;render(true);scrollTo(0,0)},
 gearClose:()=>{L.gearEdit=null;gearClearForm();render(true)},
 gearCat:el=>{L.gearCat=el.dataset.k;render(true)},
 gearFind:()=>render(true),
 gearCheck:()=>{const from=dv("gc_from",mateToday()),to=dv("gc_to","");if(!from)return toast("Pick a date");L.gearCheck={from,to:to&&to>=from?to:""};render(true)},
 gearSave:async el=>{const k=el.dataset.k,old=k?(D.gear||{})[k]||{}:{},g=(f,d)=>dv("gi_"+f,old[f]==null?(d==null?"":d):old[f]);
  const name=String(g("name")).trim().slice(0,80),qty=numIn("gi_qty",old.qty),rep=numIn("gi_rep",old.rep||0),cost=String(g("cost")).trim()?invParse(String(g("cost"))):0,lowS=String(g("low")).trim();
  if(!name)return toast("Give the item a name");if(isNaN(qty)||!String(g("qty")).trim())return toast("Type how many you own, like 40");if(isNaN(rep))return toast("Type how many are in repair as a number");if(rep>qty)return toast("More can't be in repair than you own");if(cost==null||cost<0)return toast("Type the cost as a number, like 18");
  const low=lowS?Math.floor(+lowS):"";if(lowS&&!(low>=0))return toast("Type the warning level as a number");
  const rec={name,cat:GEAR_CATS.includes(g("cat","Tables"))?g("cat","Tables"):"Other",qty,rep,cost:cost||0,low,color:String(g("color")).trim().slice(0,80),spot:String(g("spot")).trim().slice(0,80),note:String(g("note")).trim().slice(0,300),t:old.t||Date.now()};
  await (k?RT(PSP+"gear/"+k).set(rec):RT(PSP+"gear").push().set(rec));L.gearEdit=null;gearClearForm();toast(k?"Saved":"Added to inventory");render(true)},
 gearDel:async el=>{const k=el.dataset.k;if(L.confirm!=="gx"+k){L.confirm="gx"+k;return render(true)}L.confirm=null;
  const used=gresList().filter(r=>r.status!=="back"&&(r.items||{})[k]).length;await RT(PSP+"gear/"+k).remove();toast(used?`Deleted. It came off ${used} pull list${used===1?"":"s"}.`:"Deleted")},
 gearFixed:async el=>{await RT(PSP+"gear/"+el.dataset.k+"/rep").set(0);toast("Marked ready")},
 gearCsv:()=>{const q=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`,rows=[["Item","Category","Owned","In repair","Color or size","Stored","Cost each","Notes"]].concat(gearList().map(it=>[it.name,it.cat,+it.qty||0,+it.rep||0,it.color,it.spot,+it.cost||0,it.note]));
  download("inventory.csv",new Blob([rows.map(r=>r.map(q).join(",")).join("\n")],{type:"text/csv"}))},
 gresNew:el=>{gearClearForm();if(el&&el.dataset.m){L.drafts.gr_ref=el.dataset.m}L.gresEdit="new";L.gearEdit=null;L.plTab="inv";render(true);plLand(document.getElementById("grForm"),true)},
 gresEdit:el=>{gearClearForm();L.gresEdit=el.dataset.k;L.gearEdit=null;render(true);plLand(document.getElementById("grForm"),true)},
 gresClose:()=>{L.gresEdit=null;gearClearForm();render(true)},
 gresCheck:()=>render(true),
 gresSave:async el=>{const k=el.dataset.k,old=k?(D.gres||{})[k]||{}:{},ref=dv("gr_ref",old.ref||""),ri=refInfo(ref);
  const label=String(dv("gr_label",old.label||"")).trim().slice(0,80)||(ri&&ri.name)||"",from=dv("gr_from",old.from||"")||(ri&&ri.date)||"",to0=dv("gr_to",old.to||""),to=to0&&to0>=from?to0:from;
  if(!label)return toast("Name the pull list, or pick who it's for");if(!from)return toast("Pick the date it goes out");if(dayRange(from,to).length>=62&&dayAdd(from,61)<to)return toast("Keep a pull list under two months");
  const items={};let bad=false;gearList().forEach(it=>{const v=String(dv("grq_"+it.k,old.items&&old.items[it.k]?old.items[it.k]:"")).trim();if(!v)return;const n=Math.floor(+v);if(!(n>=0))bad=true;else if(n>0)items[it.k]=n});
  if(bad)return toast("Type each amount as a number");if(!Object.keys(items).length)return toast("Type how many of at least one item");
  const rec={label,ref,from,to,items,note:String(dv("gr_note",old.note||"")).trim().slice(0,300),status:old.status||"held",t:old.t||Date.now()};
  const ref2=k?RT(PSP+"gearRes/"+k):RT(PSP+"gearRes").push();await ref2.set(rec);
  L.gresEdit=null;gearClearForm();const sh=gresShort(Object.assign({k:ref2.key},rec));toast(sh.length?"Saved, but you're short on "+sh.map(x=>x.name).join(", "):"Reserved");render(true)},
 gresOut:async el=>{await RT(PSP+"gearRes/"+el.dataset.k+"/status").set("out");toast("Marked out")},
 gresBack:el=>{L.gresBack=el.dataset.k;render(true)},
 gresBackClose:()=>{L.gresBack=null;render(true)},
 gresBackSave:async el=>{const k=el.dataset.k,r=(D.gres||{})[k];if(!r)return;const back={},u={};let bad="";
  Object.keys(r.items||{}).forEach(gk=>{const it=(D.gear||{})[gk];if(!it)return;const lost=numIn("gb_lost_"+gk),dmg=numIn("gb_dmg_"+gk);if(isNaN(lost)||isNaN(dmg))return bad="Type the counts as numbers";if(lost+dmg>+r.items[gk])return bad=`More ${it.name} can't be missing or damaged than went out`;
   if(lost||dmg){back[gk]={lost,dmg};const qty=Math.max(0,(+it.qty||0)-lost);u[`gear/${gk}/qty`]=qty;u[`gear/${gk}/rep`]=Math.min(qty,(+it.rep||0)+dmg)}});
  if(bad)return toast(bad);u[`gearRes/${k}/status`]="back";u[`gearRes/${k}/back`]=back;u[`gearRes/${k}/backAt`]=Date.now();
  await RT(PSP.replace(/\/$/,"")).update(u);Object.keys(L.drafts).filter(x=>/^gb_/.test(x)).forEach(x=>delete L.drafts[x]);L.gresBack=null;toast("Checked in");render(true)},
 gresDel:async el=>{const k=el.dataset.k;if(L.confirm!=="gd"+k){L.confirm="gd"+k;return render(true)}L.confirm=null;await RT(PSP+"gearRes/"+k).remove();await RT(PSP+"gresImg/"+k).remove();toast("Pull list deleted")},
 gresPic:async el=>{const k=el.dataset.k,stage=el.dataset.s==="back"?"back":"out",fs=[...(el.files||[])].filter(f=>/^image\//.test(f.type));el.value="";const r=(D.gres||{})[k];if(!r)return;if(!fs.length)return toast("Pick a photo");
  const room=GR_MAX_PH-gresPics(r).length;if(room<=0)return toast(`Up to ${GR_MAX_PH} photos per pull list`);toast(fs.length>1?`Adding ${Math.min(fs.length,room)} photos…`:"Adding the photo…");let n=0;
  for(const f of fs.slice(0,room)){try{let big=await clShrink(f,1400,.78);if(big.data.length>420000)big=await clShrink(f,1000,.7);const th=(await clShrink(f,160,.65)).data,p="p"+Date.now().toString(36)+n;
   await RT(PSP+`gresImg/${k}/${p}`).set(big.data);await RT(PSP+`gearRes/${k}/pics/${p}`).set({stage,th,t:Date.now()});n++}catch(e){}}
  toast(n?(n===1?"Photo added":n+" photos added"):"Couldn't add that photo")},
 gresPicView:async el=>{const k=el.dataset.k,p=el.dataset.n,r=(D.gres||{})[k]||{},x=(r.pics||{})[p]||{},w=window.open("","_blank");
  let src=x.th||"";try{src=(await RT(PSP+`gresImg/${k}/${p}`).once("value")).val()||src}catch(e){}
  const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.label||"Pull list")} photo</title><body style="margin:0;background:#111;color:#eee;font:14px system-ui;text-align:center"><img src="${esc(src)}" alt="" style="max-width:100%;max-height:90vh"><p>${esc(r.label||"Pull list")} · ${x.stage==="back"?"when it came back":"before it went out"} · ${esc(new Date(x.t||0).toLocaleString())}</p></body>`;
  if(w){w.document.open();w.document.write(html);w.document.close()}else download("pull-list-photo.html",new Blob([html],{type:"text/html"}))},
 gresPicDel:async el=>{const k=el.dataset.k,p=el.dataset.n;if(L.confirm!=="gp"+p){L.confirm="gp"+p;return render(true)}L.confirm=null;await RT(PSP+`gearRes/${k}/pics/${p}`).remove();await RT(PSP+`gresImg/${k}/${p}`).remove();toast("Photo removed")},
 gresPrint:el=>{const r=(D.gres||{})[el.dataset.k];if(!r)return;const html=gresHTML(r),w=window.open("","_blank");if(w){w.document.open();w.document.write(html);w.document.close()}else download("pull-list.html",new Blob([html],{type:"text/html"}))}
});

/* ---- venue math ---- */
const venueOn=()=>!!(D.vset&&D.vset.on);
const spaceList=()=>keyList(D.spaces).sort((a,b)=>(a.t||0)-(b.t||0));
const spaceName=k=>k?((D.spaces||{})[k]||{}).name||"A removed space":"Whole venue";
const bkList=()=>keyList(D.bks).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))||String(a.start||"").localeCompare(String(b.start||"")));
const blkList=()=>keyList(D.vblk).sort((a,b)=>String(a.from||"").localeCompare(String(b.from||"")));
const tMin=t=>{const m=/^(\d{1,2}):(\d{2})/.exec(t||"");return m?(+m[1])*60+(+m[2]):null};
const bkSpan=b=>{const s=tMin(b.start)==null?0:tMin(b.start);let e=tMin(b.end)==null?1440:tMin(b.end);if(e<=s)e=1440;return [s,e]};
const spaceHit=(a,b)=>!a||!b||a===b;
const blkTo=x=>x.to&&x.to>=x.from?x.to:x.from;
const blocksOn=(d,space)=>blkList().filter(x=>x.from<=d&&blkTo(x)>=d&&spaceHit(x.space||"",space==null?"":space));
function bkClashes(b,except){const [s,e]=bkSpan(b);return bkList().filter(o=>o.k!==except&&o.status!=="cancelled"&&o.date===b.date&&spaceHit(o.space||"",b.space||"")&&(([s2,e2])=>s<e2&&s2<e)(bkSpan(o)))}
const bkTimes=b=>b.start||b.end?[b.start&&clFmtTime(b.start),b.end&&clFmtTime(b.end)].filter(Boolean).join(" to "):"All day";
/* busy days for the public inquiry form: dates only, "full" or "some", for the next 18 months */
let busyT=null;function busySyncSoon(){clearTimeout(busyT);busyT=setTimeout(busySync,900)}
function busySync(){if(!PSP||VIEW!=="planner"||L.viewOnly||!D.show)return;const on=venueOn()&&!(D.vset&&D.vset.showBusy===false);let out=null;
 if(on){out={};const today=mateToday(),end=dayAdd(today,540),sp=spaceList().map(s=>s.k),per={};
  const add=(d,space)=>{if(d<today||d>end)return;(per[d]=per[d]||new Set()).add(space||"")};
  bkList().filter(b=>b.status!=="cancelled"&&b.date).forEach(b=>add(b.date,b.space));blkList().forEach(x=>dayRange(x.from,blkTo(x)).forEach(d=>add(d,x.space)));
  Object.keys(per).forEach(d=>{const s=per[d];out[d]=s.has("")||(sp.length&&sp.every(k=>s.has(k)))?"full":"some"});if(!Object.keys(out).length)out=null}
 if(JSON.stringify(out)===JSON.stringify((D.show||{}).busy||null))return;RT(PSP+"showcase/busy").set(out).catch(()=>{})}
const holdsDue=()=>bkList().filter(b=>b.status==="hold"&&b.date>=mateToday()&&b.holdUntil&&b.holdUntil<=dayAdd(mateToday(),2));

/* ---- planner: Venue tab ---- */
const BK_F=["bk_space","bk_date","bk_start","bk_end","bk_name","bk_ref","bk_kind","bk_guests","bk_status","bk_hold","bk_price","bk_spend","bk_dep","bk_depPaid","bk_phone","bk_email","bk_note"];
const VB_F=["vb_from","vb_to","vb_space","vb_reason"];
function bkForm(b){const sp=spaceList(),g=(f,k,d)=>dv(f,b?(b[k]==null?"":b[k]):(d==null?"":d)),fld=(f,k,l,tp,ph,mx,d)=>`<label class="stack tight"><span class="small">${l}</span><input type="${tp}" data-draft="${f}" ${mx?`maxlength="${mx}"`:""} ${tp==="number"?'min="0" inputmode="numeric"':""} value="${esc(g(f,k,d))}" placeholder="${esc(ph||"")}"></label>`;
 const st=g("bk_status","status","hold"),ann=L.bkWarn?`<div class="small bad">${L.bkWarn.map(esc).join("<br>")}</div>`:"";
 return `<div class="card stack tight" id="bkForm"><div class="row between"><b>${b?"Edit booking":"New booking"}</b><button class="btn xs" data-act="bkClose">Close</button></div><div class="grid2 g8">
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Event or client name</span><input type="text" data-draft="bk_name" maxlength="80" value="${esc(g("bk_name","name"))}" placeholder="Johnson wedding reception"></label>
 <label class="stack tight"><span class="small">Space</span><select data-draft="bk_space"><option value="">Whole venue</option>${sp.map(s=>`<option value="${esc(s.k)}" ${g("bk_space","space")===s.k?"selected":""}>${esc(s.name)}${s.cap?" · up to "+(+s.cap):""}</option>`).join("")}</select></label>
 <label class="stack tight"><span class="small">Type of event</span><select data-draft="bk_kind">${BK_KINDS.map(x=>`<option ${g("bk_kind","kind","Wedding")===x?"selected":""}>${x}</option>`).join("")}</select></label>
 ${fld("bk_date","date","Date","date","","",L.vSel||"")}${fld("bk_guests","guests","Guests","number","120")}
 ${fld("bk_start","start","Starts (include setup)","time","")}${fld("bk_end","end","Ends (include cleanup)","time","")}
 <label class="stack tight"><span class="small">Status</span><select data-draft="bk_status"><option value="hold" ${st==="hold"?"selected":""}>On hold (penciled in)</option><option value="confirmed" ${st==="confirmed"?"selected":""}>Confirmed</option></select></label>
 ${fld("bk_hold","holdUntil","Hold until","date","","",dayAdd(mateToday(),7))}
 ${fld("bk_price","price","Rental fee ($)","text","3500",12)}${fld("bk_spend","spend","Food and drink ($)","text","6000",12)}${fld("bk_dep","deposit","Deposit ($)","text","1000",12)}
 ${(()=>{const s=(D.spaces||{})[g("bk_space","space")];return s&&+s.minSpend?`<span class="small muted" style="grid-column:1/-1">${esc(s.name)} has a ${clMoney(s.minSpend)} minimum spend (rental fee plus food and drink).</span>`:""})()}
 <label class="row small" style="grid-column:1/-1"><input type="checkbox" data-draft="bk_depPaid" ${g("bk_depPaid","depPaid","")===true||g("bk_depPaid","depPaid","")==="1"?"checked":""}> Deposit paid</label>
 ${fld("bk_phone","phone","Contact phone","tel","704-555-0100",30)}${fld("bk_email","email","Contact email","email","name@example.com",120)}
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Link to a client (optional)</span><select data-draft="bk_ref"><option value="">No client</option>${Object.keys(D.clients||{}).map(id=>`<option value="c:${esc(id)}" ${g("bk_ref","ref")==="c:"+id?"selected":""}>${esc(D.clients[id].name||"Client")}</option>`).join("")}</select></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Notes</span><input type="text" data-draft="bk_note" maxlength="400" value="${esc(g("bk_note","note"))}" placeholder="Ceremony on the lawn, rain plan in the ballroom"></label></div>
 ${ann}<button class="btn primary as" data-act="bkSave" data-k="${b?esc(b.k):""}">${L.bkWarn?"Save anyway":b?"Save changes":"Save booking"}</button></div>`}
function vblkForm(){const sp=spaceList();
 return `<div class="card stack tight" id="vbForm"><div class="row between"><b>Block off days</b><button class="btn xs" data-act="vbClose">Close</button></div><span class="small muted">Blocked days can't be booked: maintenance, holidays, private use or a day off.</span><div class="grid2 g8">
 <label class="stack tight"><span class="small">From</span><input type="date" data-draft="vb_from" value="${esc(dv("vb_from",L.vSel||mateToday()))}"></label>
 <label class="stack tight"><span class="small">Through (optional)</span><input type="date" data-draft="vb_to" value="${esc(dv("vb_to",""))}"></label>
 <label class="stack tight"><span class="small">What's blocked</span><select data-draft="vb_space"><option value="">Whole venue</option>${sp.map(s=>`<option value="${esc(s.k)}" ${dv("vb_space","")===s.k?"selected":""}>${esc(s.name)}</option>`).join("")}</select></label>
 <label class="stack tight"><span class="small">Reason</span><input type="text" data-draft="vb_reason" maxlength="80" value="${esc(dv("vb_reason",""))}" placeholder="Floor refinishing"></label></div>
 <button class="btn primary as" data-act="vbSave">Block these days</button></div>`}
function spaceForm(s){const g=(f,k)=>esc(dv(f,s?(s[k]==null?"":s[k]):""));
 return `<div class="card stack tight"><div class="grid2 g8"><label class="stack tight" style="grid-column:1/-1"><span class="small">Name</span><input type="text" data-draft="sp_name" maxlength="60" value="${g("sp_name","name")}" placeholder="Grand Ballroom"></label>
 <label class="stack tight"><span class="small">Holds up to (guests)</span><input type="number" min="0" inputmode="numeric" data-draft="sp_cap" value="${g("sp_cap","cap")}" placeholder="250"></label>
 <label class="stack tight"><span class="small">Usual fee ($)</span><input type="text" inputmode="decimal" data-draft="sp_rate" value="${g("sp_rate","rate")}" placeholder="3500"></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Minimum spend ($, optional)</span><input type="text" inputmode="decimal" data-draft="sp_min" value="${g("sp_min","minSpend")}" placeholder="12000"><span class="small muted">The least a booking must spend on the rental fee plus food and drink. Bookings under it are flagged.</span></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Notes</span><input type="text" data-draft="sp_note" maxlength="200" value="${g("sp_note","note")}" placeholder="Dance floor, stage, bridal suite"></label></div>
 <div class="row"><button class="btn primary" data-act="spSave" data-k="${s?esc(s.k):""}">${s?"Save space":"Add space"}</button><button class="btn" data-act="spClose">Close</button></div></div>`}
const bkShort=b=>{const sp=(D.spaces||{})[b.space],m=sp&&b.kind!=="Tour or tasting"?+sp.minSpend||0:0;return m?{m,have:(+b.price||0)+(+b.spend||0),short:Math.max(0,Math.round((m-(+b.price||0)-(+b.spend||0))*100)/100),sp}:null};
function bkRow(b){const st=b.status||"hold",cf=L.confirm==="bx"+b.k,cl=st!=="cancelled"?bkClashes(b,b.k):[],blk=st!=="cancelled"?blocksOn(b.date,b.space||""):[],sp=(D.spaces||{})[b.space],over=sp&&+sp.cap&&+b.guests>+sp.cap,today=mateToday();
 const holdLate=st==="hold"&&b.holdUntil&&b.holdUntil<today,gr=gresList().filter(r=>r.ref==="b:"+b.k);
 return `<div class="mrow2 small"><div class="row between"><span class="mw0"><b>${esc(b.name||"Booking")}</b> <span class="pill ${BK_ST[st][1]}">${BK_ST[st][0]}</span><span class="db muted">${esc(clFmtDate(b.date))} · ${esc(bkTimes(b))} · ${esc(spaceName(b.space))}</span></span>${+b.price?`<span class="a">${clMoney(b.price)}</span>`:""}</div>
 <div class="muted">${[b.kind,+b.guests?b.guests+" guests":"",+b.spend?clMoney(b.spend)+" food and drink":"",+b.deposit?clMoney(b.deposit)+" deposit "+(b.depPaid?"paid":"not paid yet"):"",st==="hold"&&b.holdUntil?"held until "+clFmtDate(b.holdUntil):"",b.phone,b.email].filter(Boolean).map(esc).join(" · ")}</div>${b.note?`<div class="muted">${esc(b.note)}</div>`:""}
 ${cl.length?`<div class="bad">Overlaps ${cl.map(o=>esc(o.name||"another booking")+" ("+esc(bkTimes(o))+")").join(", ")}</div>`:""}${blk.length?`<div class="bad">That day is blocked: ${blk.map(x=>esc(x.reason||"blocked")).join(", ")}</div>`:""}${over?`<div class="bad">${+b.guests} guests is more than ${esc(sp.name)} holds (${+sp.cap})</div>`:""}${holdLate?`<div class="bad">The hold ran out ${esc(clFmtDate(b.holdUntil))}</div>`:""}${(()=>{const ms=st!=="cancelled"&&bkShort(b);return ms?ms.short?`<div class="${st==="confirmed"?"bad":"muted"}">${clMoney(ms.short)} under the ${clMoney(ms.m)} minimum spend (${clMoney(ms.have)} so far)</div>`:`<div class="muted">Meets the ${clMoney(ms.m)} minimum spend</div>`:""})()}
 ${gr.length?`<div class="muted">Rentals: ${gr.map(r=>esc(r.label)+" ("+GR_ST[r.status||"held"][0].toLowerCase()+")").join(", ")}</div>`:""}
 <div class="row">${st==="hold"?`<button class="btn xs" data-act="bkSet" data-k="${esc(b.k)}" data-s="confirmed">Confirm</button>`:""}${st!=="cancelled"?`<button class="btn xs" data-act="bkEdit" data-k="${esc(b.k)}">Edit</button><button class="btn xs" data-act="gresNew" data-m="b:${esc(b.k)}">Reserve rentals</button>${+b.deposit&&!b.depPaid?`<button class="btn xs" data-act="bkDep" data-k="${esc(b.k)}">Deposit paid</button>`:""}<button class="btn xs" data-act="bkSet" data-k="${esc(b.k)}" data-s="cancelled">Cancel</button>`:`<button class="btn xs" data-act="bkSet" data-k="${esc(b.k)}" data-s="hold">Restore as a hold</button>`}
 <button class="btn xs" data-act="bkDel" data-k="${esc(b.k)}">${cf?"Tap again to delete":"Delete"}</button></div></div>`}
function plVenueTab(){
 if(!venueOn())return `<section class="card stack"><h2>Venue bookings</h2><p class="m0">Do you own, manage or work for a venue? Turn this on to keep the venue's calendar here: rooms and spaces, holds, confirmed bookings, deposits and days you've blocked off. Host Mode warns you before anything is double-booked.</p>
  <button class="btn primary as" data-act="vOn">Turn on venue bookings</button><p class="small muted m0">Planners who don't work for a venue can leave this off. Your inventory is in its own tab either way.</p></section>`;
 const today=mateToday(),bks=bkList(),live=bks.filter(b=>b.status!=="cancelled"),sp=spaceList(),f=L.bkF||"up";
 const by={};live.forEach(b=>(by[b.date]=by[b.date]||[]).push(b));
 const ym=L.vYM||today.slice(0,7),[y,m]=ym.split("-").map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),lead=first.getDay();
 const sel=L.vSel&&L.vSel.slice(0,7)===ym?L.vSel:(ym===today.slice(0,7)?today:ym+"-01"),cells=[];for(let i=0;i<lead;i++)cells.push("<div></div>");
 for(let d=1;d<=days;d++){const ds=`${ym}-${String(d).padStart(2,"0")}`,l=by[ds]||[],bl=blocksOn(ds,null),whole=bl.some(x=>!x.space),dots=[l.some(b=>b.status==="confirmed")&&"vbk",l.some(b=>b.status==="hold")&&"vhold",bl.length&&"vblk"].filter(Boolean);
  cells.push(`<button class="calday${ds===today?" today":""}${ds===sel?" sel":""}${whole?" blkd":""}" data-act="vSel" data-k="${ds}" aria-label="${esc(clFmtDate(ds))}, ${l.length} booking${l.length===1?"":"s"}${bl.length?", blocked":""}"><span>${d}</span><i>${dots.map(k=>`<b class="cd-${k}"></b>`).join("")}</i></button>`)}
 const dayB=by[sel]||[],dayBl=blocksOn(sel,null),spaces=sp.length?sp:[{k:"",name:"Whole venue"}];
 const avail=spaces.map(s=>{const bl=blocksOn(sel,s.k),bb=dayB.filter(b=>spaceHit(b.space||"",s.k));return `<div class="row between small clrow"><span class="mw0"><b>${esc(s.name)}</b>${s.cap?`<span class="muted"> · up to ${+s.cap}</span>`:""}</span><span class="${bl.length||bb.length?"bad":"okt"}">${bl.length?"Blocked":bb.length?bb.map(b=>esc(bkTimes(b))).join(", "):"Free"}</span></div>`}).join("");
 const next30=live.filter(b=>b.date>=today&&b.date<=dayAdd(today,30)).length,holds=live.filter(b=>b.status==="hold"&&b.date>=today).length,booked=live.filter(b=>b.status==="confirmed"&&b.date>=today).reduce((n,b)=>n+(+b.price||0),0);
 const shown=bks.filter(b=>f==="up"?b.status!=="cancelled"&&b.date>=today:f==="hold"?b.status==="hold"&&b.date>=today:f==="past"?b.status!=="cancelled"&&b.date<today:b.status==="cancelled");if(f==="past")shown.reverse();
 const blks=blkList().filter(x=>blkTo(x)>=today),editB=L.bkEdit&&L.bkEdit!=="new"?Object.assign({k:L.bkEdit},(D.bks||{})[L.bkEdit]||{}):null,editS=L.spEdit&&L.spEdit!=="new"?Object.assign({k:L.spEdit},(D.spaces||{})[L.spEdit]||{}):null;
 return `<section class="card stack"><div class="row between"><h2 class="m0">Venue bookings</h2><div class="row"><button class="btn sm primary" data-act="bkNew">New booking</button><button class="btn sm" data-act="vbNew">Block off days</button></div></div>
 <div class="stats"><div class="stat"><b>${next30}</b><span>Bookings in the next 30 days</span></div><button class="stat ${holdsDue().length?"hot":""}" data-act="bkFilter" data-k="hold"><b>${holds}</b><span>Holds waiting to confirm</span></button><div class="stat"><b>${blks.length}</b><span>Blocked periods ahead</span></div><div class="stat"><b>${clMoney(booked)}</b><span>Confirmed fees ahead</span></div></div>
 ${L.bkEdit?bkForm(editB):""}${L.vbOpen?vblkForm():""}</section>
 <section class="card stack"><div class="row between"><button class="btn sm" data-act="vMove" data-k="-1" aria-label="Previous month">‹</button><h3 class="m0">${esc(first.toLocaleDateString(undefined,{month:"long",year:"numeric"}))}</h3><button class="btn sm" data-act="vMove" data-k="1" aria-label="Next month">›</button></div>
 <div class="calgrid">${["S","M","T","W","T","F","S"].map(x=>`<div class="calhd">${x}</div>`).join("")}${cells.join("")}</div>
 <div class="row small muted"><span><b class="cd-vbk caldot"></b> Confirmed</span><span><b class="cd-vhold caldot"></b> On hold</span><span><b class="cd-vblk caldot"></b> Blocked</span>${ym!==today.slice(0,7)?`<button class="btn xs" data-act="vMove" data-k="0">Back to today</button>`:""}</div></section>
 <section class="card stack"><h3>${esc(clFmtDate(sel))}</h3>
 ${dayBl.length?`<div class="stack tight">${dayBl.map(x=>`<div class="row between small clrow"><span class="mw0">⛔ <b>${esc(spaceName(x.space))} blocked</b>${x.reason?" · "+esc(x.reason):""}<span class="db muted">${esc(clFmtDate(x.from))}${blkTo(x)>x.from?" through "+esc(clFmtDate(blkTo(x))):""}</span></span><button class="btn xs" data-act="vbDel" data-k="${esc(x.k)}">${L.confirm==="vbx"+x.k?"Tap again to unblock":"Unblock"}</button></div>`).join("")}</div>`:""}
 <div class="stack tight">${avail}</div>
 ${dayB.length?`<div class="stack tight">${dayB.map(bkRow).join("")}</div>`:""}
 ${sel>=today?`<div class="row"><button class="btn sm" data-act="bkNew" data-k="${esc(sel)}">Book this day</button><button class="btn sm" data-act="vbNew" data-k="${esc(sel)}">Block this day</button></div>`:""}</section>
 <section class="card stack"><h3>Bookings</h3><div class="row small">${[["up","Upcoming"],["hold","Holds"],["past","Past"],["cx","Cancelled"]].map(([k,l])=>`<button class="btn xs ${f===k?"primary":""}" data-act="bkFilter" data-k="${k}">${l}</button>`).join("")}</div>
 ${shown.length?`<div class="stack tight">${shown.slice(0,40).map(bkRow).join("")}</div>`:'<p class="small muted m0">Nothing here.</p>'}</section>
 <section class="card stack"><div class="row between"><h3>Blocked days</h3><button class="btn xs" data-act="vbNew">Block off days</button></div>
 ${blks.length?`<div class="stack tight">${blks.map(x=>`<div class="row between small clrow"><span class="mw0"><b>${esc(clFmtDate(x.from))}${blkTo(x)>x.from?" through "+esc(clFmtDate(blkTo(x))):""}</b><span class="db muted">${esc(spaceName(x.space))}${x.reason?" · "+esc(x.reason):""}</span></span><button class="btn xs" data-act="vbDel" data-k="${esc(x.k)}">${L.confirm==="vbx"+x.k?"Tap again to unblock":"Unblock"}</button></div>`).join("")}</div>`:'<p class="small muted m0">No days blocked off.</p>'}</section>
 <section class="card stack"><div class="row between"><h3>Spaces</h3>${L.spEdit?"":`<button class="btn xs" data-act="spNew">Add a space</button>`}</div><p class="small muted m0">The rooms or areas you book separately, like a ballroom, a garden and a terrace. Booking the whole venue takes all of them.</p>
 ${L.spEdit?spaceForm(editS):""}
 ${sp.length?`<div class="stack tight">${sp.map(s=>`<div class="row between small clrow"><span class="mw0"><b>${esc(s.name)}</b><span class="db muted">${[s.cap?"up to "+(+s.cap)+" guests":"",+s.rate?clMoney(s.rate):"",+s.minSpend?clMoney(s.minSpend)+" minimum spend":"",s.note].filter(Boolean).map(esc).join(" · ")}</span></span><span class="row"><button class="btn xs" data-act="spEdit" data-k="${esc(s.k)}">Edit</button><button class="btn xs" data-act="spDel" data-k="${esc(s.k)}">${L.confirm==="spx"+s.k?"Tap again to delete":"Delete"}</button></span></div>`).join("")}</div>`:'<p class="small muted m0">No spaces yet, so every booking is for the whole venue.</p>'}</section>
 <section class="card stack"><label class="row small"><input type="checkbox" data-act="vShowBusy" ${D.vset&&D.vset.showBusy===false?"":"checked"}> Show which dates are taken on your inquiry form</label><span class="small muted">People see only "booked" or "open" for each date, never who booked it, so they can pick a day that works.</span></section>
 <p class="small muted center"><button class="btn xs" data-act="vOff">${L.confirm==="voff"?"Tap again to hide venue bookings":"Turn off venue bookings"}</button> Your bookings are kept if you turn it back on.</p>`}
const bkClear=()=>BK_F.concat(VB_F,["sp_name","sp_cap","sp_rate","sp_min","sp_note"]).forEach(k=>delete L.drafts[k]);
Object.assign(ACT,{
 vShowBusy:async el=>{await RT(PSP+"venue/showBusy").set(!!el.checked);toast(el.checked?"Your inquiry form shows taken dates":"Your inquiry form no longer shows taken dates");busySyncSoon()},
 vOn:async()=>{await RT(PSP+"venue/on").set(true);toast("Venue bookings are on")},
 vOff:async()=>{if(L.confirm!=="voff"){L.confirm="voff";return render(true)}L.confirm=null;await RT(PSP+"venue/on").set(false);L.plTab="home";toast("Venue bookings hidden");render(true)},
 vSel:el=>{L.vSel=el.dataset.k;render(true)},
 vMove:el=>{const d=+el.dataset.k,t=mateToday().slice(0,7);if(!d){L.vYM=t;L.vSel=null;return render(true)}const [y,m]=(L.vYM||t).split("-").map(Number),n=new Date(y,m-1+d,1);L.vYM=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;L.vSel=null;render(true)},
 bkFilter:el=>{L.bkF=el.dataset.k;render(true)},
 bkNew:el=>{bkClear();L.bkWarn=null;if(el&&el.dataset.k)L.drafts.bk_date=el.dataset.k;L.bkEdit="new";L.vbOpen=false;render(true);plLand(document.getElementById("bkForm"),true)},
 bkEdit:el=>{bkClear();L.bkWarn=null;L.bkEdit=el.dataset.k;L.vbOpen=false;render(true);plLand(document.getElementById("bkForm"),true)},
 bkClose:()=>{L.bkEdit=null;L.bkWarn=null;bkClear();render(true)},
 bkSave:async el=>{const k=el.dataset.k,old=k?(D.bks||{})[k]||{}:{},g=(f,key,d)=>dv(f,old[key]==null?(d==null?"":d):old[key]);
  const name=String(g("bk_name","name")).trim().slice(0,80),date=g("bk_date","date",L.vSel||""),guests=numIn("bk_guests",old.guests==null?"":old.guests),priceS=String(g("bk_price","price")).trim(),depS=String(g("bk_dep","deposit")).trim(),spS=String(g("bk_spend","spend")).trim(),spend=spS?invParse(spS):0;
  const price=priceS?invParse(priceS):0,dep=depS?invParse(depS):0,status=g("bk_status","status","hold"),space=g("bk_space","space","");
  if(!name)return toast("Add the event or client name");if(!date)return toast("Pick the date");if(isNaN(guests))return toast("Type the guest count as a number");if(price==null||price<0)return toast("Type the fee as a number, like 3500");if(dep==null||dep<0)return toast("Type the deposit as a number, like 1000");if(spend==null||spend<0)return toast("Type food and drink as a number, like 6000");
  const dp=g("bk_depPaid","depPaid","");
  const rec={name,date,space:space&&(D.spaces||{})[space]?space:"",start:g("bk_start","start"),end:g("bk_end","end"),kind:g("bk_kind","kind","Wedding"),guests:guests||0,status:status==="confirmed"?"confirmed":"hold",holdUntil:status==="confirmed"?"":g("bk_hold","holdUntil",dayAdd(mateToday(),7)),
   price:price||0,spend:spend||0,deposit:dep||0,depPaid:dp===true||dp==="1",phone:String(g("bk_phone","phone")).trim().slice(0,30),email:String(g("bk_email","email")).trim().slice(0,120),ref:g("bk_ref","ref"),note:String(g("bk_note","note")).trim().slice(0,400),t:old.t||Date.now()};
  if(old.status==="cancelled")rec.status="cancelled";
  const warn=[],cl=bkClashes(rec,k),bl=blocksOn(date,rec.space),sp=(D.spaces||{})[rec.space];
  cl.forEach(o=>warn.push(`Overlaps ${o.name||"another booking"} in ${spaceName(o.space)} (${bkTimes(o)}).`));bl.forEach(x=>warn.push(`${spaceName(x.space)} is blocked that day${x.reason?": "+x.reason:""}.`));
  if(sp&&+sp.cap&&rec.guests>+sp.cap)warn.push(`${rec.guests} guests is more than ${sp.name} holds (${+sp.cap}).`);
  const ms=rec.status==="confirmed"&&bkShort(rec);if(ms&&ms.short)warn.push(`This is ${clMoney(ms.short)} under ${sp.name}'s ${clMoney(ms.m)} minimum spend.`);
  const sig=JSON.stringify(Object.assign({},rec,{t:0}));if(warn.length&&L.bkWarnSig!==sig){L.bkWarn=warn;L.bkWarnSig=sig;return render(true)}
  await (k?RT(PSP+"bookings/"+k).set(rec):RT(PSP+"bookings").push().set(rec));L.bkEdit=null;L.bkWarn=null;L.bkWarnSig=null;L.vSel=date;L.vYM=date.slice(0,7);bkClear();toast(k?"Booking saved":rec.status==="hold"?"Hold saved":"Booking saved");render(true)},
 bkSet:async el=>{const k=el.dataset.k,s=el.dataset.s,u={status:s};if(s==="confirmed")u.holdUntil="";await RT(PSP+"bookings/"+k).update(u);toast(s==="confirmed"?"Confirmed":s==="cancelled"?"Cancelled":"Restored as a hold")},
 bkDep:async el=>{await RT(PSP+"bookings/"+el.dataset.k+"/depPaid").set(true);toast("Deposit marked paid")},
 bkDel:async el=>{const k=el.dataset.k;if(L.confirm!=="bx"+k){L.confirm="bx"+k;return render(true)}L.confirm=null;await RT(PSP+"bookings/"+k).remove();toast("Booking deleted")},
 vbNew:el=>{bkClear();if(el&&el.dataset.k)L.drafts.vb_from=el.dataset.k;L.vbOpen=true;L.bkEdit=null;render(true);plLand(document.getElementById("vbForm"),true)},
 vbClose:()=>{L.vbOpen=false;render(true)},
 vbSave:async()=>{const from=dv("vb_from",L.vSel||mateToday()),to0=dv("vb_to",""),space=dv("vb_space","");if(!from)return toast("Pick the first day");if(to0&&to0<from)return toast("The last day can't be before the first");
  const to=to0||from,hit=bkList().filter(b=>b.status!=="cancelled"&&b.date>=from&&b.date<=to&&spaceHit(b.space||"",space));
  await RT(PSP+"blocks").push().set({from,to,space:space&&(D.spaces||{})[space]?space:"",reason:String(dv("vb_reason","")).trim().slice(0,80),t:Date.now()});
  L.vbOpen=false;bkClear();toast(hit.length?`Blocked. Heads up: ${hit.length} booking${hit.length===1?" is":"s are"} already on those days.`:"Days blocked off");render(true)},
 vbDel:async el=>{const k=el.dataset.k;if(L.confirm!=="vbx"+k){L.confirm="vbx"+k;return render(true)}L.confirm=null;await RT(PSP+"blocks/"+k).remove();toast("Unblocked")},
 spNew:()=>{["sp_name","sp_cap","sp_rate","sp_min","sp_note"].forEach(k=>delete L.drafts[k]);L.spEdit="new";render(true)},
 spEdit:el=>{["sp_name","sp_cap","sp_rate","sp_min","sp_note"].forEach(k=>delete L.drafts[k]);L.spEdit=el.dataset.k;render(true)},
 spClose:()=>{L.spEdit=null;render(true)},
 spSave:async el=>{const k=el.dataset.k,old=k?(D.spaces||{})[k]||{}:{},name=String(dv("sp_name",old.name||"")).trim().slice(0,60),cap=numIn("sp_cap",old.cap==null?"":old.cap),rs=String(dv("sp_rate",old.rate==null?"":old.rate)).trim(),rate=rs?invParse(rs):0,ms=String(dv("sp_min",old.minSpend==null?"":old.minSpend)).trim(),minSpend=ms?invParse(ms):0;
  if(!name)return toast("Name the space");if(isNaN(cap))return toast("Type how many guests it holds as a number");if(rate==null||rate<0)return toast("Type the fee as a number");if(minSpend==null||minSpend<0)return toast("Type the minimum spend as a number, like 12000");
  const rec={name,cap:cap||0,rate:rate||0,minSpend:minSpend||0,note:String(dv("sp_note",old.note||"")).trim().slice(0,200),t:old.t||Date.now()};
  await (k?RT(PSP+"spaces/"+k).set(rec):RT(PSP+"spaces").push().set(rec));L.spEdit=null;["sp_name","sp_cap","sp_rate","sp_min","sp_note"].forEach(x=>delete L.drafts[x]);toast("Space saved");render(true)},
 spDel:async el=>{const k=el.dataset.k;if(L.confirm!=="spx"+k){L.confirm="spx"+k;return render(true)}L.confirm=null;const n=bkList().filter(b=>b.space===k&&b.status!=="cancelled"&&b.date>=mateToday()).length;
  if(n){return toast(`${n} upcoming booking${n===1?" uses":"s use"} this space. Move or cancel ${n===1?"it":"them"} first.`)}await RT(PSP+"spaces/"+k).remove();toast("Space deleted")}
});

/* ---- 3D designer tab: the designer page (venue3d.html, files in 3d/) shown inside the portal.
   It's the same website, so it uses the planner's sign-in and saves to planners/{uid}/venue3d. In the demo it saves on the device only. ---- */
function pl3dTab(){const demo=!!window.__HMPDEMO,src="venue3d.html"+(demo?"?demo=1":"");
 if(L.viewAs)return `<section class="card stack"><h2>3D designer</h2><p class="small muted m0">Designs open under the account that's signed in, so they can't be viewed from here while you're looking at someone else's portal.</p></section>`;
 return `<section class="card stack"><div class="row between"><div class="mw0"><h2 class="m0">3D designer</h2><p class="small muted m0">Lay out the room, the tables and the decor in 3D.${demo?" In the demo, designs stay on this device.":" Designs save to your account."}</p></div><a class="btn sm" href="${esc(src)}" target="_blank" rel="noopener">Open full screen ↗</a></div>
 <div id="pl3dSlot" class="pl3d hmfloat" data-key="d3" data-src="${esc(src)}" data-title="3D venue designer"></div></section>`}
/* Screens redraw the whole page on every change, which would reload a 3D window and lose what's on it. So each kind of
   window (the 3D designer, the agent office) lives once outside the redraw, lined up over its tab's empty slot
   (<div class="hmfloat" data-key data-src data-title>), and hidden and paused while its tab isn't showing.
   FLOAT_HOOKS run after each placing (the agent office sends its news from one). */
const FLOATS={},FLOAT_HOOKS=[];
const floatPause=(f,on)=>{try{f.contentWindow.HM3D_PAUSED=on}catch(e){}};
function floatPlace(){const seen=new Set();
 document.querySelectorAll(".hmfloat[data-key]").forEach(slot=>{const k=slot.dataset.key;seen.add(k);let f=FLOATS[k];
  if(!f){f=FLOATS[k]=document.createElement("iframe");f.className="pl3dfloat";f.title=slot.dataset.title||"";f.allow="fullscreen; microphone";f.src=slot.dataset.src;document.body.appendChild(f)}
  if(f.style.display==="none")floatPause(f,false);const r=slot.getBoundingClientRect();Object.assign(f.style,{display:"block",left:(r.left+scrollX)+"px",top:(r.top+scrollY)+"px",width:r.width+"px",height:r.height+"px"})});
 Object.keys(FLOATS).forEach(k=>{const f=FLOATS[k];if(!seen.has(k)&&f.style.display!=="none"){f.style.display="none";floatPause(f,true)}});
 FLOAT_HOOKS.forEach(h=>{try{h()}catch(e){}})}
const _renderFloat=render;render=function(f){_renderFloat(f);floatPlace()};
addEventListener("resize",floatPlace);setInterval(floatPlace,400);
function plTabBody(k){return ({home:plHome,clients:hClients,leads:plLeadsTab,events:plEvents,cal:plCal,inv:plGearTab,venue:plVenueTab,d3:pl3dTab,stay:sgTab,team:hTeam,pkg:plPkgTab,show:plShowTab,rep:plReports,tpl:plTplTab,data:plDataTab,brand:hBrandCard,fb:hFeedbackCard,set:()=>(plIsHost()?hostSettings():plSettings())+privacyCard(),help:plHelp}[k]||plHome)()}
function plTabBadge(k){const n=k==="home"?0:k==="leads"?inqNew():k==="clients"?clAttention():k==="team"?mateBehind():k==="inv"?gearIssues():k==="venue"?(venueOn()?holdsDue().length:0):k==="stay"?sgBadge():k==="pkg"?Object.keys(D.clients||{}).reduce((s,id)=>s+invList(id).filter(x=>invStatus(id,x)==="Overdue").length,0):0;return n?` <span class="pill warn">${n}</span>`:""}
