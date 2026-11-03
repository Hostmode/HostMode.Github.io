/* ================= STAY & GO: travel for a group =================
   A planner portal tab for booking resources, lodging and rental reservations, the traveling party,
   receipts, who has paid what, and the travel details each guest is sent.
   Guests never sign in. They only receive the messages the planner chooses to send them.
   Host Mode only records money paid elsewhere. It never takes or sends payments.
   Money is whole cents (integers) and balances are always worked out from the records, never typed in.
   Everything lives under planners/{uid}/stay/ (private to the planner; the admin and support can view it):
   stay/trips/{k}  = {name, client, place, cur, from, to, note, arch, t}
   stay/prov/{id}  = {name, cat, url, note, off, gone, t}  starter providers keep fixed ids (SG_PROV0); a planner's own use push keys
   stay/res/{k}    = {trip, cat, prov, name, conf, booked, start, end, inT, outT, addr, phone, email,
                      total, due (balance due to the company), status: pending|confirmed|cancelled,
                      who:{mid:1}, split: even|custom|none, owe:{mid:cents}, oweDue (when travelers owe their share),
                      gnote (note for guests, can go in messages), note (private), doc:{name,type,size}, ppay:{k:{amt,date,note}}, t}
   stay/resDoc/{k} = the confirmation file (data URL), loaded only when opened
   stay/exp/{k}    = {trip, title, amt, date, who, split, owe, oweDue, note, t}   shared costs that aren't a reservation
   stay/mem/{k}    = {trip, name, email, phone, room, group, from, to, note, noEmail, noSms, t}
   stay/pay/{k}    = {trip, mid, amt, date, method, ref, note, alloc:{costKey:cents}, rc, t}  a payment a traveler made
   stay/rc/{k}     = {trip, name, type, size, hash, merchant, date, amt, ref, cost, pay, ok, t}  ok = a person checked the details
   stay/rcBlob/{k} = the receipt file (data URL)
   stay/msg/{k}    = {trip, mid, ch: email|sms, kind, subj, body, t, by, status: opened|sent}
   stay/act/{k}    = {trip, ref, text, t, by}   history of changes
   costKey = "r:" + reservation key, or "e:" + shared-cost key. */
D.sgT={};D.sgP={};D.sgR={};D.sgE={};D.sgM={};D.sgPay={};D.sgRc={};D.sgMsg={};D.sgAct={};

/* sg-math:start (pure money math, no screen code: agents/stay_go_test.js runs this part on its own) */
const SG={
 SYM:{USD:"$",CAD:"CA$",EUR:"€",GBP:"£",MXN:"MX$",JMD:"J$"},
 /* "1,234.5" -> 123450 cents. Blank is 0. Anything else (letters, minus signs, 3 decimals) is NaN. */
 cents(v){const s=String(v==null?"":v).replace(/[$,\s]/g,"");if(!s)return 0;const m=/^(\d{1,9})(?:\.(\d{0,2}))?$/.exec(s);if(!m)return NaN;return (+m[1])*100+(+String(m[2]||"").padEnd(2,"0"))},
 plain(c){const n=Math.round(+c||0),a=Math.abs(n);return (n<0?"-":"")+Math.floor(a/100)+"."+String(a%100).padStart(2,"0")},
 fmt(c,cur){const n=Math.round(+c||0),a=Math.abs(n);return (n<0?"-":"")+(SG.SYM[cur]||((cur||"")+" "))+Math.floor(a/100).toLocaleString("en-US")+"."+String(a%100).padStart(2,"0")},
 sum(o){return Object.keys(o||{}).reduce((s,k)=>s+(Math.round(+o[k])||0),0)},
 /* split a total evenly; the leftover cents go one each to the first people, so the shares always add up exactly */
 even(total,mids){const o={},n=mids.length;if(!n||!(total>0))return o;const base=Math.floor(total/n);let r=total-base*n;mids.forEach(m=>{o[m]=base+(r>0?1:0);if(r>0)r--});return o},
 /* costs: [{key,total,owe:{mid:cents},due}]  pays: [{mid,amt,alloc:{costKey:cents}}]
    A payment counts toward a cost only up to that person's share of it; anything beyond is "not applied". */
 ledger(costs,pays,today){const P={},pp=m=>P[m]=P[m]||{owed:0,paid:0,used:0,overdue:0,next:"",rows:[]},got={};
  pays.forEach(p=>{const x=pp(p.mid);x.paid+=Math.round(+p.amt)||0;Object.keys(p.alloc||{}).forEach(k=>{got[k+"|"+p.mid]=(got[k+"|"+p.mid]||0)+(Math.round(+p.alloc[k])||0)})});
  let total=0,split=0;
  const C=costs.map(c=>{const ct=Math.round(+c.total)||0;total+=ct;const sh=[];
   Object.keys(c.owe||{}).forEach(m=>{const owe=Math.round(+c.owe[m])||0;if(owe<=0)return;split+=owe;const x=pp(m),g=Math.min(owe,got[c.key+"|"+m]||0),left=owe-g;x.owed+=owe;x.used+=g;
    const st=left<=0?"paid":c.due&&c.due<today?"overdue":g>0?"part":"none";if(st==="overdue")x.overdue+=left;if(left>0&&c.due&&(!x.next||c.due<x.next))x.next=c.due;
    const row={key:c.key,mid:m,owe,got:g,left,st,due:c.due||""};x.rows.push(row);sh.push(row)});
   return Object.assign({},c,{shares:sh,unsplit:Math.max(0,ct-SG.sum(c.owe))})});
  let out=0,credit=0,paid=0,overdue=0;
  Object.keys(P).forEach(m=>{const x=P[m];x.bal=x.owed-x.paid;x.unapplied=Math.max(0,x.paid-x.used);x.overdue=Math.min(x.overdue,Math.max(0,x.bal));
   x.st=x.owed===0&&x.paid===0?"none":x.bal<=0?"paid":x.overdue>0?"overdue":x.paid>0?"part":"none";
   if(x.bal>0)out+=x.bal;else credit+=-x.bal;paid+=x.paid;overdue+=x.overdue});
  return {people:P,costs:C,total,split,unsplit:Math.max(0,total-split),paid,out,credit,overdue}},
 /* apply a payment to the payer's open shares, soonest due first (no due date last), then in list order */
 auto(costs,pays,mid,amt){const used={};pays.forEach(p=>{if(p.mid!==mid)return;Object.keys(p.alloc||{}).forEach(k=>used[k]=(used[k]||0)+(Math.round(+p.alloc[k])||0))});
  const open=costs.map((c,i)=>({k:c.key,i,due:c.due||"9999-99-99",left:(Math.round(+(c.owe||{})[mid])||0)-(used[c.key]||0)})).filter(x=>x.left>0).sort((a,b)=>a.due.localeCompare(b.due)||a.i-b.i);
  const o={};let r=Math.round(+amt)||0;open.forEach(x=>{if(r<=0)return;const v=Math.min(r,x.left);o[x.k]=v;r-=v});return o},
 /* what a person still owes on one cost, not counting one payment (used when editing that payment) */
 left(costs,pays,mid,key,exceptPay){const c=costs.find(x=>x.key===key);if(!c)return 0;const owe=Math.round(+(c.owe||{})[mid])||0;
  const g=pays.filter(p=>p.mid===mid&&p.k!==exceptPay).reduce((s,p)=>s+(Math.round(+(p.alloc||{})[key])||0),0);return Math.max(0,owe-g)},
 /* paid to the hotel or rental company (separate from what travelers owe the organizer) */
 pstat(total,paid,due,today,cancelled){if(cancelled)return "cancelled";if(!(total>0))return "nocost";if(paid>=total)return "paid";if(due&&due<today)return "overdue";return paid>0?"part":"none"}
};
/* sg-math:end */

const SG_SECS=[["over","Overview"],["prov","Booking resources"],["res","Reservations"],["party","Traveling party"],["money","Receipts & payments"],["msg","Guest messages"],["rep","Reports"]];
const SG_CATS={stay:["🏨","Hotel or lodging"],rental:["🏡","Vacation rental"],car:["🚗","Rental car"],flight:["✈️","Flight"],other:["🧳","Other travel"]};
const SG_PCATS={car:"Car rentals",stay:"Hotels and lodging",flight:"Flights",other:"Other travel"};
const SG_PROV0=[["avis","Avis","car","https://www.avis.com"],["budget","Budget","car","https://www.budget.com"],["enterprise","Enterprise","car","https://www.enterprise.com"],
 ["trivago","Trivago","stay","https://www.trivago.com"],["booking","Booking.com","stay","https://www.booking.com"],["hotels","Hotels.com","stay","https://www.hotels.com"],["airbnb","Airbnb","stay","https://www.airbnb.com"]];
const SG_BK={pending:["Pending","warn"],confirmed:["Confirmed","ok"],cancelled:["Cancelled",""]};
const SG_PST={none:["Not paid","no"],part:["Partially paid","warn"],paid:["Paid","ok"],overdue:["Overdue","bad"],nocost:["No cost added",""],cancelled:["",""]};
const SG_METHODS=["Cash","Zelle","Venmo","Cash App","PayPal","Check","Card","Bank transfer","Other"];
const SG_MK={stay:"Lodging details",car:"Rental car details",trip:"Full travel plan",remind:"Reminder",change:"Change to plans",custom:"Your own message"};
const SG_WHEN={stay:["Check-in","Check-out"],rental:["Check-in","Check-out"],car:["Pick-up","Drop-off"],flight:["Departs","Returns"],other:["Starts","Ends"]};
const SG_EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SG_FILE_MAX=4*1048576;

/* ---- reading the data ---- */
const sgRT=p=>RT(PSP+"stay"+(p?"/"+p:""));
const sgToday=()=>mateToday();
const sgTripList=()=>keyList(D.sgT).sort((a,b)=>(a.arch?1:0)-(b.arch?1:0)||String(a.from||"9").localeCompare(String(b.from||"9"))||(a.t||0)-(b.t||0));
function sgTripK(){const ts=D.sgT||{};let k=L.sgTrip||store.get("sgTrip_"+PLID(),"");if(!ts[k]){const l=sgTripList();k=((l.find(t=>!t.arch)||l[0])||{}).k||""}return k}
const sgTrip=()=>(D.sgT||{})[sgTripK()]?Object.assign({k:sgTripK()},D.sgT[sgTripK()]):null;
const sgOf=(o,tk)=>keyList(o).filter(x=>x.trip===tk);
const sgRes=tk=>sgOf(D.sgR,tk).sort((a,b)=>String(a.start||"9").localeCompare(String(b.start||"9"))||(a.t||0)-(b.t||0));
const sgMem=tk=>sgOf(D.sgM,tk).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
const sgExp=tk=>sgOf(D.sgE,tk).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))||(a.t||0)-(b.t||0));
const sgPays=tk=>sgOf(D.sgPay,tk).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||(b.t||0)-(a.t||0));
const sgRcs=tk=>sgOf(D.sgRc,tk).sort((a,b)=>(b.t||0)-(a.t||0));
const sgMsgs=tk=>sgOf(D.sgMsg,tk).sort((a,b)=>(b.t||0)-(a.t||0));
const sgActs=(tk,ref)=>sgOf(D.sgAct,tk).filter(a=>!ref||a.ref===ref).sort((a,b)=>(b.t||0)-(a.t||0));
const sgM=(c,t)=>SG.fmt(c,(t||sgTrip()||{}).cur||"USD");
const sgName=k=>((D.sgM||{})[k]||{}).name||"Removed traveler";
const sgFirst=n=>String(n||"").trim().split(/\s+/)[0]||"there";
function sgCosts(tk){return sgRes(tk).map(r=>({key:"r:"+r.k,title:r.name||"Reservation",cat:r.cat,total:Math.round(+r.total)||0,owe:r.owe||{},due:r.oweDue||"",res:r}))
 .concat(sgExp(tk).map(e=>({key:"e:"+e.k,title:e.title||"Shared cost",cat:"exp",total:Math.round(+e.amt)||0,owe:e.owe||{},due:e.oweDue||"",exp:e})))}
const sgLedger=tk=>SG.ledger(sgCosts(tk),sgPays(tk),sgToday());
function sgCostTitle(key){const [t,k]=String(key).split(":"),x=t==="r"?(D.sgR||{})[k]:(D.sgE||{})[k];return x?(t==="r"?x.name:x.title)||"Cost":"Removed cost"}
const sgPPaid=r=>Object.keys(r.ppay||{}).reduce((s,k)=>s+(Math.round(+r.ppay[k].amt)||0),0);
const sgPSt=r=>SG.pstat(Math.round(+r.total)||0,sgPPaid(r),r.due,sgToday(),r.status==="cancelled");
const sgPill=(map,k)=>{const x=map[k]||["",""];return x[0]?`<span class="pill ${x[1]}">${esc(x[0])}</span>`:""};
const sgCat=k=>SG_CATS[k]||SG_CATS.other;
function sgDates(r){const w=SG_WHEN[r.cat]||SG_WHEN.other,a=r.start?clFmtDate(r.start)+(r.inT?" "+clFmtTime(r.inT):""):"",b=r.end?clFmtDate(r.end)+(r.outT?" "+clFmtTime(r.outT):""):"";
 return a&&b?`${w[0]} ${a} · ${w[1]} ${b}`:a?`${w[0]} ${a}`:b?`${w[1]} ${b}`:"Dates not added"}
function sgProvs(all){const st=D.sgP||{},out=[];
 SG_PROV0.forEach(([k,name,cat,url])=>{const o=st[k]||{};if(!o.gone)out.push(Object.assign({k,name,cat,url,starter:1},o))});
 Object.keys(st).filter(k=>!SG_PROV0.some(p=>p[0]===k)&&!st[k].gone).forEach(k=>out.push(Object.assign({k},st[k])));
 return out.filter(p=>all||!p.off)}
const sgProvName=k=>(sgProvs(true).find(p=>p.k===k)||{}).name||"";
const sgBy=()=>L.viewAs?"Host Mode admin":((D.plMe&&D.plMe.name)||"Planner");
function sgW(){if(L.viewOnly){toast("This view is read-only, so nothing is saved.");return false}if(!PSP){toast("Open your planner portal first");return false}return true}
/* Promise.resolve: the demo database's push() returns a thenable without .catch */
function sgLog(trip,ref,text){return Promise.resolve().then(()=>sgRT("act").push({trip:trip||"",ref:ref||"",text:String(text).slice(0,300),t:Date.now(),by:sgBy()})).then(()=>{},()=>{})}
const sgClear=pre=>Object.keys(L.drafts).filter(k=>k.startsWith(pre)).forEach(k=>delete L.drafts[k]);
const sgDraftKey=key=>String(key).replace(":","_");
function sgWhen(t){const d=new Date(t);return isNaN(d)?"":d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}

/* ---- small form pieces ---- */
const sgIn=(k,label,val,o={})=>`<label class="stack tight"><span class="small">${esc(label)}${o.req?' <span class="muted">(needed)</span>':""}</span><input type="${o.type||"text"}" data-draft="${k}" value="${esc(dv(k,val==null?"":val))}"${o.ph?` placeholder="${esc(o.ph)}"`:""}${o.max?` maxlength="${o.max}"`:""}${o.mode?` inputmode="${o.mode}"`:""}${o.act?` data-act="${o.act}"`:""}${o.ac?` autocomplete="${o.ac}"`:""}></label>`;
const sgSel=(k,label,val,opts,act)=>`<label class="stack tight"><span class="small">${esc(label)}</span><select data-draft="${k}"${act?` data-act="${act}"`:""}>${opts.map(([v,l])=>`<option value="${esc(v)}"${String(dv(k,val==null?"":val))===String(v)?" selected":""}>${esc(l)}</option>`).join("")}</select></label>`;
const sgTx=(k,label,val,o={})=>`<label class="stack tight"><span class="small">${esc(label)}</span><textarea rows="${o.rows||3}" data-draft="${k}" maxlength="${o.max||1000}"${o.ph?` placeholder="${esc(o.ph)}"`:""}>${esc(dv(k,val||""))}</textarea></label>`;
const sgCk=(k,label,on,act)=>`<label class="row small sgck"><input type="checkbox" data-draft="${k}"${dv(k,on?"1":"0")==="1"?" checked":""}${act?` data-act="${act}"`:""}> <span>${label}</span></label>`;
const sgMoneyIn=(k,label,c,o={})=>sgIn(k,label,c==null||c===""?"":SG.plain(c),Object.assign({mode:"decimal",ph:"0.00",max:14},o));
const sgDel=(id,act,k,label)=>L.confirm===id?`<button class="btn sm gold" data-act="${act}" data-k="${esc(k)}">Tap again to ${label||"delete"}</button><button class="btn sm" data-act="cancelConfirm">Keep</button>`:`<button class="btn sm" data-act="${act}" data-k="${esc(k)}">${label?label[0].toUpperCase()+label.slice(1):"Delete"}</button>`;

/* ================= the tab ================= */
function sgTab(){const trips=sgTripList(),t=sgTrip(),sec=SG_SECS.some(s=>s[0]===L.sgSec)?L.sgSec:"over";
 const head=`<section class="card stack"><div class="row between"><div class="mw0"><div class="eyebrow">Stay &amp; Go</div><h2 class="m0">${t?esc(t.name):"Group travel"}</h2>
  <span class="small muted">${t?esc([t.place,t.from?clFmtDate(t.from)+(t.to&&t.to!==t.from?" to "+clFmtDate(t.to):""):"",t.client&&(D.clients||{})[t.client]?"for "+D.clients[t.client].name:""].filter(Boolean).join(" · ")):"Where everyone stays, how they get around, who has paid, and the details each guest needs."}</span></div>
  ${trips.length?`<label class="stack tight sgpick"><span class="small">Trip</span><select data-act="sgPick" aria-label="Choose a trip">${trips.map(x=>`<option value="${esc(x.k)}"${t&&x.k===t.k?" selected":""}>${esc(x.name)}${x.arch?" (hidden)":""}</option>`).join("")}<option value="__new">+ New trip</option></select></label>`:""}</div>
  ${window.__HMPDEMO?'<div class="banner soft"><span><span class="pill warn">Sample data</span> This is the planner demo. The trip, travelers and money here are made up, and nothing is sent.</span></div>':""}
  <p class="small muted m0">Guests never need an account or a login. You choose what each guest is sent, and they only get the details meant for them.</p></section>`;
 if(L.sgEd&&L.sgEd.kind==="trip")return head+sgTripForm(L.sgEd.k?Object.assign({k:L.sgEd.k},(D.sgT||{})[L.sgEd.k]||{}):null);
 if(!t)return head+`<section class="card stack"><h2>Start your first trip</h2><p class="small muted m0">A trip holds the reservations, travelers, receipts and payments for one group, like a destination wedding weekend or a team retreat.</p></section>`+sgTripForm(null);
 const nav=`<nav class="plchips" aria-label="Stay and Go sections">${SG_SECS.map(([k,l])=>`<button class="plchip" data-act="sgSec" data-k="${k}" aria-pressed="${sec===k}">${l}${sgSecBadge(k,t)}</button>`).join("")}</nav>`;
 const body=({over:sgOverview,prov:sgProvTab,res:sgResTab,party:sgPartyTab,money:sgMoneyTab,msg:sgMsgTab,rep:sgRepTab}[sec])(t);
 return head+nav+body}
function sgSecBadge(k,t){let n=0;if(k==="res")n=sgRes(t.k).filter(r=>r.status==="pending").length;else if(k==="money"){const lg=sgLedger(t.k);n=Object.keys(lg.people).filter(m=>lg.people[m].st==="overdue").length+sgRcs(t.k).filter(r=>!r.ok).length}return n?` <span class="pill warn">${n}</span>`:""}

/* ---- trips ---- */
function sgTripForm(t){t=t||{};const cs=D.clients||{},p="sgt_";
 return `<section class="card stack"><h2>${t.k?"Edit trip":"New trip"}</h2><div class="grid2">
  ${sgIn(p+"name","Trip name",t.name,{req:1,max:80,ph:"Wedding weekend in Asheville"})}
  ${sgSel(p+"client","Client",t.client||"",[["","No client"]].concat(Object.keys(cs).map(id=>[id,cs[id].name||"Client"])))}
  ${sgIn(p+"place","Destination",t.place,{max:80,ph:"City or venue"})}
  ${sgSel(p+"cur","Currency",t.cur||"USD",Object.keys(SG.SYM).map(c=>[c,c]))}
  ${sgIn(p+"from","First day",t.from,{type:"date"})}${sgIn(p+"to","Last day",t.to,{type:"date"})}</div>
  ${sgTx(p+"note","Private notes (only you see these)",t.note)}
  <div class="row"><button class="btn primary" data-act="sgTripSave" data-k="${esc(t.k||"")}">Save trip</button>${sgTripList().length?'<button class="btn" data-act="sgEdClose">Cancel</button>':""}
  ${t.k?`<span class="grow"></span><button class="btn sm" data-act="sgTripArch" data-k="${esc(t.k)}">${t.arch?"Show in the trip list again":"Hide this trip"}</button>${sgDel("sgtx"+t.k,"sgTripDel",t.k)}`:""}</div></section>`}

/* ---- overview ---- */
function sgAlerts(t){const tk=t.k,today=sgToday(),soon=dayAdd(today,7),out=[],res=sgRes(tk),mem=sgMem(tk),lg=sgLedger(tk);
 res.filter(r=>r.status==="pending").forEach(r=>out.push(["warn",`${r.name} is waiting for confirmation.`,"res",r.k]));
 res.filter(r=>r.status!=="cancelled").forEach(r=>{const st=sgPSt(r),left=(Math.round(+r.total)||0)-sgPPaid(r);
  if(st==="overdue")out.push(["bad",`${sgM(left,t)} for ${r.name} was due ${clFmtDate(r.due)}.`,"res",r.k]);
  else if((st==="none"||st==="part")&&r.due&&r.due<=soon)out.push(["warn",`${sgM(left,t)} for ${r.name} is due ${clFmtDate(r.due)}.`,"res",r.k])});
 Object.keys(lg.people).forEach(m=>{const x=lg.people[m];if(x.overdue>0)out.push(["bad",`${sgName(m)} is overdue: ${sgM(x.overdue,t)}.`,"money",m]);if(x.unapplied>0)out.push(["warn",`${sgName(m)} has ${sgM(x.unapplied,t)} paid that isn't applied to a cost yet.`,"money",m])});
 lg.costs.filter(c=>c.unsplit>0&&!(c.res&&(c.res.split==="none"||c.res.status==="cancelled"))&&!(c.exp&&c.exp.split==="none")).forEach(c=>out.push(["warn",`${c.title}: ${sgM(c.unsplit,t)} isn't split among travelers yet.`,c.res?"res":"money",c.res?c.res.k:""]));
 res.filter(r=>r.status==="cancelled"&&SG.sum(r.owe)>0).forEach(r=>out.push(["warn",`${r.name} is cancelled, but travelers still owe ${sgM(SG.sum(r.owe),t)} for it. Change the cost to any cancellation fee, or to 0.`,"res",r.k]));
 const noContact=mem.filter(m=>!m.email&&!m.phone);if(noContact.length)out.push(["warn",`${noContact.length===1?noContact[0].name+" has":noContact.length+" travelers have"} no email or mobile number, so they can't be sent travel details.`,"party",""]);
 const lodg=res.filter(r=>r.status!=="cancelled"&&(r.cat==="stay"||r.cat==="rental"));
 if(lodg.length){const un=mem.filter(m=>!lodg.some(r=>(r.who||{})[m.k]));if(un.length)out.push(["warn",`${un.length} traveler${un.length===1?" isn't":"s aren't"} assigned to lodging yet.`,"party",""])}
 const rv=sgRcs(tk).filter(r=>!r.ok);if(rv.length)out.push(["warn",`${rv.length} receipt${rv.length===1?" needs":"s need"} its details checked.`,"money",""]);
 return out}
function sgOverview(t){const tk=t.k,res=sgRes(tk),live=res.filter(r=>r.status!=="cancelled"),mem=sgMem(tk),lg=sgLedger(tk),today=sgToday();
 const days=t.from?Math.round((new Date(t.from+"T12:00:00")-new Date(today+"T12:00:00"))/864e5):null,ended=t.to&&t.to<today;
 const st=(b,l,sec)=>`<button class="stat" data-act="sgSec" data-k="${sec}"><b>${b}</b><span>${l}</span></button>`;
 const al=sgAlerts(t),acts=sgActs(tk).slice(0,8);
 return `<section class="card stack"><h2>At a glance</h2><div class="stats sgstats">
  ${st(days==null?"—":ended?"Done":days<=0?"Now":days,days==null?"Add the trip dates":ended?"This trip is over":days<=0?"The trip is under way":days===1?"Day until the trip":"Days until the trip","over")}
  ${st(live.filter(r=>r.cat==="stay"||r.cat==="rental").length,"Lodging reservations","res")}${st(live.filter(r=>r.cat==="car").length,"Rental cars","res")}
  ${st(mem.length,"Traveling guests","party")}${st(esc(sgM(lg.total,t)),"Total trip costs","money")}${st(esc(sgM(lg.paid,t)),"Payments recorded","money")}
  ${st(esc(sgM(lg.out,t)),"Still owed by travelers","money")}${st(esc(sgM(lg.overdue,t)),"Overdue","money")}${st(live.filter(r=>r.status==="pending").length,"Waiting for confirmation","res")}</div></section>
 <section class="card stack"><h2>Quick actions</h2><div class="row">
  <button class="btn primary" data-act="sgResNew">Add a reservation</button><button class="btn" data-act="sgResNew" data-up="1">Upload a confirmation</button>
  <button class="btn" data-act="sgGo" data-k="money" data-ed="rcup">Upload a receipt</button><button class="btn" data-act="sgMemNew">Add a traveler</button>
  <button class="btn" data-act="sgPayNew">Record a payment</button><button class="btn" data-act="sgSec" data-k="msg">Send travel details</button></div></section>
 <section class="card stack"><h2>Needs attention</h2>${al.length?`<div class="stack tight">${al.slice(0,12).map(([lvl,txt,sec,k])=>`<div class="row between small clrow"><span class="mw0"><span class="pill ${lvl==="bad"?"bad":"warn"}">${lvl==="bad"?"Overdue":"Check"}</span> ${esc(txt)}</span><button class="btn xs" data-act="sgGo" data-k="${sec}" data-m="${esc(k||"")}">Open</button></div>`).join("")}</div>`:'<p class="small muted m0">Nothing needs your attention right now.</p>'}</section>
 <section class="card stack"><div class="row between"><h2 class="m0">Recent activity</h2><button class="btn xs" data-act="sgEdOpen" data-kind="trip" data-k="${esc(tk)}">Edit trip</button></div>
  ${acts.length?`<div class="stack tight">${acts.map(a=>`<div class="small clrow">${esc(a.text)}<span class="db muted">${esc(sgWhen(a.t))} · ${esc(a.by||"")}</span></div>`).join("")}</div>`:'<p class="small muted m0">No changes yet. Add a reservation or a traveler to get started.</p>'}</section>`}

/* ---- booking resources ---- */
function sgProvTab(t){const all=sgProvs(true),ed=L.sgEd&&L.sgEd.kind==="prov"?L.sgEd:null,p="sgv_";
 const form=pv=>{pv=pv||{};return `<div class="stack tight sgform"><div class="grid2">${sgIn(p+"name","Name",pv.name,{req:1,max:60})}${sgSel(p+"cat","Category",pv.cat||"stay",Object.keys(SG_PCATS).map(k=>[k,SG_PCATS[k]]))}
  ${sgIn(p+"url","Website",pv.url,{type:"url",ph:"https://",max:300})}${sgIn(p+"note","Notes",pv.note,{max:200,ph:"Account number, discount code, who to ask for"})}</div>
  <div class="row"><button class="btn sm primary" data-act="sgProvSave" data-k="${esc(pv.k||"")}">Save</button><button class="btn sm" data-act="sgEdClose">Cancel</button></div></div>`};
 const row=pv=>ed&&ed.k===pv.k?form(pv):`<div class="plrow${pv.off?" dim":""}"><div class="mw0 grow"><b>${esc(pv.name)}</b>${pv.off?' <span class="pill">Turned off</span>':""}<div class="small muted brk">${esc(sgHost(pv.url))}${pv.note?" · "+esc(pv.note):""}</div></div>
  <div class="row small">${pv.url?`<a class="btn xs" href="${esc(pv.url)}" target="_blank" rel="noopener noreferrer">Open site ↗</a>`:""}${pv.off?"":`<button class="btn xs" data-act="sgResNew" data-p="${esc(pv.k)}">Add the reservation</button>`}
  <button class="btn xs" data-act="sgEdOpen" data-kind="prov" data-k="${esc(pv.k)}">Edit</button><button class="btn xs" data-act="sgProvOff" data-k="${esc(pv.k)}">${pv.off?"Turn on":"Turn off"}</button>${L.confirm==="sgpx"+pv.k?`<button class="btn xs gold" data-act="sgProvDel" data-k="${esc(pv.k)}">Tap again to remove</button>`:`<button class="btn xs" data-act="sgProvDel" data-k="${esc(pv.k)}" aria-label="Remove ${esc(pv.name)}">Remove</button>`}</div></div>`;
 const gone=SG_PROV0.some(([k])=>((D.sgP||{})[k]||{}).gone);
 return `<section class="card stack"><h2>Booking resources</h2><p class="small muted m0">These links open each company's own website. Booking there doesn't add anything to Host Mode. When you're done, come back and add the reservation with its confirmation.</p>
  ${Object.keys(SG_PCATS).map(c=>{const l=all.filter(x=>(x.cat||"other")===c);return l.length?`<div class="stack tight"><div class="eyebrow">${SG_PCATS[c]}</div>${l.map(row).join("")}</div>`:""}).join("")}
  ${ed&&!ed.k?form(null):`<div class="row"><button class="btn sm primary" data-act="sgEdOpen" data-kind="prov" data-k="">Add a booking site</button>${gone?'<button class="btn sm" data-act="sgProvBack">Bring back the starter list</button>':""}</div>`}</section>`}
function sgHost(u){try{return new URL(u).host.replace(/^www\./,"")}catch(e){return u||"No website"}}

/* ---- reservations ---- */
function sgResTab(t){const ed=L.sgEd&&L.sgEd.kind==="res"?L.sgEd:null;if(ed)return sgResForm(t,ed.k);
 const open=L.sgOpen&&(D.sgR||{})[L.sgOpen]&&D.sgR[L.sgOpen].trip===t.k?Object.assign({k:L.sgOpen},D.sgR[L.sgOpen]):null;if(open)return sgResDetail(t,open);
 const q=String(dv("sgq","")).trim().toLowerCase(),fc=dv("sgfc",""),fs=dv("sgfs",""),so=dv("sgso","date");
 let l=sgRes(t.k).filter(r=>(!fc||r.cat===fc)&&(!fs||(fs.startsWith("p_")?sgPSt(r)===fs.slice(2):r.status===fs))&&(!q||[r.name,r.conf,sgProvName(r.prov),r.addr,r.note].join(" ").toLowerCase().includes(q)));
 if(so==="cost")l.sort((a,b)=>(+b.total||0)-(+a.total||0));else if(so==="name")l.sort((a,b)=>String(a.name).localeCompare(String(b.name)));else if(so==="status")l.sort((a,b)=>Object.keys(SG_BK).indexOf(a.status)-Object.keys(SG_BK).indexOf(b.status));
 const all=sgRes(t.k).length;
 return `<section class="card stack"><div class="row between"><h2 class="m0">Reservations</h2><button class="btn primary" data-act="sgResNew">Add a reservation</button></div>
  ${all?`<div class="grid2 sgfilters">${sgIn("sgq","Search",dv("sgq",""),{ph:"Name, confirmation number, address",act:"sgRe"})}
  ${sgSel("sgfc","Type",fc,[["","All types"]].concat(Object.keys(SG_CATS).map(k=>[k,SG_CATS[k][1]])),"sgRe")}
  ${sgSel("sgfs","Status",fs,[["","Any status"],["pending","Pending"],["confirmed","Confirmed"],["cancelled","Cancelled"],["p_none","Not paid"],["p_part","Partially paid"],["p_paid","Paid"],["p_overdue","Overdue"]],"sgRe")}
  ${sgSel("sgso","Sort by",so,[["date","Date"],["cost","Cost, highest first"],["name","Name"],["status","Status"]],"sgRe")}</div>`:""}
  ${l.length?`<div class="stack tight">${l.map(r=>{const n=Object.keys(r.who||{}).length;return `<div class="plrow${r.status==="cancelled"?" dim":""}"><span class="gnum" aria-hidden="true">${sgCat(r.cat)[0]}</span><div class="mw0 grow"><b class="brk">${esc(r.name)}</b>
   <div class="small muted">${esc([sgCat(r.cat)[1],sgProvName(r.prov),sgDates(r)].filter(Boolean).join(" · "))}</div>
   <div class="row small">${sgPill(SG_BK,r.status)}${r.status==="cancelled"?"":sgPill(SG_PST,sgPSt(r))}<span class="muted">${esc(sgM(+r.total||0,t))} · ${n} traveler${n===1?"":"s"}${r.doc?" · 📎":""}</span></div></div>
   <button class="btn sm" data-act="sgResOpen" data-k="${esc(r.k)}">Open</button></div>`}).join("")}</div>`:`<p class="small muted m0">${all?"No reservations match. Try clearing the search or filters.":"No reservations yet. Book on a company's website (see Booking resources), then add the reservation here."}</p>`}</section>`}
function sgResForm(t,k){const old=k?Object.assign({k},(D.sgR||{})[k]||{}):{prov:L.sgEd.prov||"",cat:L.sgEd.cat||"stay"},p="sgr_",mem=sgMem(t.k);
 const cat=dv(p+"cat",old.cat||"stay"),provs=sgProvs(false),split=dv(p+"split",old.split||"even"),w=SG_WHEN[cat]||SG_WHEN.other;
 const who=mem.filter(m=>dv(p+"w_"+m.k,(old.who||{})[m.k]?"1":"0")==="1"),total=SG.cents(dv(p+"total",old.total!=null?SG.plain(old.total):""));
 const ev=!isNaN(total)?SG.even(total,who.map(m=>m.k)):{};
 return `<section class="card stack"><div class="row between"><h2 class="m0">${k?"Edit reservation":"Add a reservation"}</h2><button class="btn sm" data-act="sgEdClose">Cancel</button></div>
  <div class="grid2">${sgSel(p+"cat","Type",cat,Object.keys(SG_CATS).map(x=>[x,SG_CATS[x][1]]),"sgRe")}
  ${sgSel(p+"prov","Booked through",old.prov||"",[["","Booked directly or another way"]].concat(provs.map(x=>[x.k,x.name])))}
  ${sgIn(p+"name",cat==="car"?"Rental company and car":cat==="flight"?"Airline and flight":"Hotel or property name",old.name,{req:1,max:100})}
  ${sgIn(p+"conf","Confirmation number",old.conf,{max:60})}
  ${sgIn(p+"start",w[0]+" date",old.start,{type:"date"})}${sgIn(p+"inT",w[0]+" time",old.inT,{type:"time"})}
  ${sgIn(p+"end",w[1]+" date",old.end,{type:"date"})}${sgIn(p+"outT",w[1]+" time",old.outT,{type:"time"})}
  ${sgSel(p+"status","Status",old.status||"pending",[["pending","Pending (not confirmed yet)"],["confirmed","Confirmed"],["cancelled","Cancelled"]])}
  ${sgIn(p+"booked","Booked on",old.booked,{type:"date"})}</div>
  <details${old.addr||old.phone||old.email?" open":""}><summary class="small"><b>Address and contact</b></summary><div class="grid2">${sgIn(p+"addr","Address",old.addr,{max:200})}${sgIn(p+"phone","Phone",old.phone,{type:"tel",max:30})}${sgIn(p+"email","Email",old.email,{type:"email",max:120})}</div></details>
  <div class="eyebrow">Cost</div><div class="grid2">${sgMoneyIn(p+"total","Total cost ("+(t.cur||"USD")+")",old.total!=null?old.total:"",{act:"sgRe"})}${sgIn(p+"due","Balance due to the company by",old.due,{type:"date"})}</div>
  <p class="small muted m0">Record deposits and payments made to the company from the reservation's page after you save.</p>
  <div class="eyebrow">Who's on this reservation</div>
  ${mem.length?`<div class="row">${mem.map(m=>sgCk(p+"w_"+m.k,esc(m.name),(old.who||{})[m.k],"sgRe")).join("")}</div>`:'<p class="small muted m0">Add travelers in Traveling party, then assign them here.</p>'}
  <div class="grid2">${sgSel(p+"split","How travelers share the cost",split,[["even","Split evenly among these travelers"],["custom","Set each person's share"],["none","Don't split (the organizer covers it)"]],"sgRe")}${split==="none"?"":sgIn(p+"oweDue","Travelers pay their share by",old.oweDue,{type:"date"})}</div>
  ${split==="even"&&who.length&&total>0?`<p class="small muted m0">${who.map(m=>esc(m.name)+" "+esc(sgM(ev[m.k],t))).join(" · ")}</p>`:""}
  ${split==="custom"?(who.length?`<div class="grid2">${who.map(m=>sgMoneyIn(p+"o_"+m.k,m.name+"'s share",(old.owe||{})[m.k]!=null?old.owe[m.k]:"",{act:"sgRe"})).join("")}</div>${(()=>{let s=0;who.forEach(m=>{const v=SG.cents(dv(p+"o_"+m.k,(old.owe||{})[m.k]!=null?SG.plain(old.owe[m.k]):""));if(!isNaN(v))s+=v});return `<p class="small ${s>total?"":"muted"} m0">Shares add up to ${esc(sgM(s,t))} of ${esc(sgM(isNaN(total)?0:total,t))}${s<total?" · "+esc(sgM(total-s,t))+" not split yet":s>total?" · that's more than the total":""}</p>`})()}`:'<p class="small muted m0">Tick who is on this reservation first.</p>'):""}
  <div class="eyebrow">Confirmation</div>
  <div class="row"><label class="btn sm upl">${old.doc||L.sgFile?"Replace the confirmation file":"Upload the confirmation"}<input type="file" accept="image/*,application/pdf" data-act="sgResFile"></label>
  <span class="small muted">${L.sgFile?"Ready to save: "+esc(L.sgFile.name):old.doc?"Saved: "+esc(old.doc.name):"PDF or photo, up to 4 MB"}</span></div>
  ${sgTx(p+"gnote","Note for guests (can be included in travel messages)",old.gnote,{max:500,ph:"Parking is free. Ask for the wedding group rate at the front desk."})}
  ${sgTx(p+"note","Private notes (never sent to guests)",old.note)}
  <div class="row"><button class="btn primary" data-act="sgResSave" data-k="${esc(k||"")}">Save reservation</button><button class="btn" data-act="sgEdClose">Cancel</button></div></section>`}
function sgResDetail(t,r){const lg=sgLedger(t.k),c=lg.costs.find(x=>x.key==="r:"+r.k)||{shares:[]},pp=keyList(r.ppay).sort((a,b)=>String(a.date).localeCompare(String(b.date))),paid=sgPPaid(r),total=+r.total||0,p="sgpp_";
 const facts=[["Type",sgCat(r.cat)[1]],["Booked through",sgProvName(r.prov)||"Directly or another way"],["Confirmation number",r.conf],["Booked on",r.booked&&clFmtDate(r.booked)],["Dates",sgDates(r)],["Address",r.addr],["Phone",r.phone],["Email",r.email],["Note for guests",r.gnote],["Private notes",r.note]].filter(x=>x[1]);
 const hist=sgActs(t.k,"r:"+r.k);
 return `<section class="card stack"><div class="row between"><button class="btn sm" data-act="sgResOpen" data-k="">← All reservations</button><button class="btn sm" data-act="sgEdOpen" data-kind="res" data-k="${esc(r.k)}">Edit</button></div>
  <div><span class="gnum" aria-hidden="true">${sgCat(r.cat)[0]}</span> <h2 class="m0 brk" style="display:inline">${esc(r.name)}</h2></div>
  <div class="row small"><span>Booking:</span>${sgPill(SG_BK,r.status)}${r.status==="cancelled"?"":`<span>Paid to the company:</span>${sgPill(SG_PST,sgPSt(r))}`}</div>
  <dl class="sgfacts">${facts.map(([a,b])=>`<dt>${esc(a)}</dt><dd class="brk">${esc(b)}</dd>`).join("")}</dl>
  <div class="row small">${r.doc?`<button class="btn sm" data-act="sgResDoc" data-k="${esc(r.k)}">Open the confirmation (${esc(r.doc.name)})</button>`:'<span class="muted">No confirmation file yet.</span>'}<label class="btn sm upl">${r.doc?"Replace it":"Upload it"}<input type="file" accept="image/*,application/pdf" data-act="sgResFileNow" data-k="${esc(r.k)}"></label></div>
  <div class="row">${r.status==="pending"?`<button class="btn sm primary" data-act="sgResStatus" data-k="${esc(r.k)}" data-s="confirmed">Mark confirmed</button>`:""}${r.status==="cancelled"?`<button class="btn sm" data-act="sgResStatus" data-k="${esc(r.k)}" data-s="pending">Restore (mark pending)</button>`:sgDel("sgrc"+r.k,"sgResCancel",r.k,"cancel this reservation")}${sgDel("sgrx"+r.k,"sgResDel",r.k)}</div></section>
 <section class="card stack"><h2>Paid to the company</h2>
  <div class="stats sgstats"><div class="stat"><b>${esc(sgM(total,t))}</b><span>Total cost</span></div><div class="stat"><b>${esc(sgM(paid,t))}</b><span>Paid so far</span></div><div class="stat"><b>${esc(sgM(Math.max(0,total-paid),t))}</b><span>Left${r.due?" · due "+esc(clFmtDate(r.due)):""}</span></div></div>
  ${pp.length?`<div class="stack tight">${pp.map(x=>`<div class="row between small clrow"><span>${esc(clFmtDate(x.date)||"No date")} · <b>${esc(sgM(x.amt,t))}</b>${x.note?" · "+esc(x.note):""}</span>${L.confirm==="sgppx"+x.k?`<button class="btn xs gold" data-act="sgPPDel" data-k="${esc(r.k)}" data-m="${esc(x.k)}">Tap again to remove</button>`:`<button class="btn xs" data-act="sgPPDel" data-k="${esc(r.k)}" data-m="${esc(x.k)}">Remove</button>`}</div>`).join("")}</div>`:'<p class="small muted m0">No deposits or payments to the company recorded yet.</p>'}
  <div class="grid2">${sgMoneyIn(p+"amt","Amount paid to the company","")}${sgIn(p+"date","Date paid",dv(p+"date",sgToday()),{type:"date"})}${sgIn(p+"note","Note",dv(p+"note",""),{max:120,ph:"Deposit, card ending 4417"})}</div>
  <button class="btn sm as" data-act="sgPPAdd" data-k="${esc(r.k)}">Record a payment to the company</button></section>
 <section class="card stack"><h2>Who owes what for this</h2><p class="small muted m0">${r.split==="none"?"Not split: the organizer covers this cost.":r.split==="custom"?"Each person's share was set by hand.":"Split evenly among the travelers on this reservation."}${r.oweDue?" Shares are due "+esc(clFmtDate(r.oweDue))+".":""}</p>
  ${c.shares.length?`<div class="sgwrap"><table class="sgtbl"><thead><tr><th>Traveler</th><th class="n">Share</th><th class="n">Paid</th><th class="n">Left</th><th>Status</th></tr></thead><tbody>${c.shares.map(s=>`<tr><td>${esc(sgName(s.mid))}</td><td class="n">${esc(sgM(s.owe,t))}</td><td class="n">${esc(sgM(s.got,t))}</td><td class="n">${esc(sgM(s.left,t))}</td><td>${sgPill(SG_PST,s.st)}</td></tr>`).join("")}</tbody></table></div>`:""}
  ${c.unsplit>0&&r.split!=="none"?`<p class="small m0"><span class="pill warn">Check</span> ${esc(sgM(c.unsplit,t))} isn't split among travelers yet.</p>`:""}</section>
 <section class="card stack"><h2>History</h2>${hist.length?hist.map(a=>`<div class="small clrow">${esc(a.text)}<span class="db muted">${esc(sgWhen(a.t))} · ${esc(a.by||"")}</span></div>`).join(""):'<p class="small muted m0">No changes recorded.</p>'}</section>`}

/* ---- traveling party ---- */
function sgPartyTab(t){const ed=L.sgEd&&L.sgEd.kind==="mem"?L.sgEd:null;if(ed)return sgMemForm(t,ed.k);
 const mem=sgMem(t.k),res=sgRes(t.k).filter(r=>r.status!=="cancelled"),lg=sgLedger(t.k),by=dv("sgpg","lodging");
 const groups={};const add=(g,m)=>(groups[g]=groups[g]||[]).push(m);
 mem.forEach(m=>{if(by==="lodging"){const l=res.filter(r=>(r.cat==="stay"||r.cat==="rental")&&(r.who||{})[m.k]);if(l.length)l.forEach(r=>add(r.name,m));else add("Not assigned to lodging",m)}
  else if(by==="car"){const l=res.filter(r=>r.cat==="car"&&(r.who||{})[m.k]);if(l.length)l.forEach(r=>add(r.name,m));else add("No rental car",m)}
  else if(by==="room")add(m.room?"Room "+m.room:"No room set",m);else if(by==="group")add(m.group||"No travel group",m);else add("Everyone",m)});
 const card=m=>{const x=lg.people[m.k],mine=res.filter(r=>(r.who||{})[m.k]);return `<div class="plrow"><div class="mw0 grow"><b>${esc(m.name)}</b>${x?" "+sgPill(SG_PST,x.st):""}
  <div class="small muted brk">${m.email||m.phone?esc([m.email,m.phone].filter(Boolean).join(" · ")):'<span class="pill warn">No contact info</span>'}${m.noEmail||m.noSms?" · "+[m.noEmail?"no emails":"",m.noSms?"no texts":""].filter(Boolean).join(", "):""}</div>
  <div class="small muted">${esc([m.room&&"Room "+m.room,m.group,m.from&&("Travels "+clFmtDate(m.from)+(m.to&&m.to!==m.from?" to "+clFmtDate(m.to):"")),mine.length?mine.map(r=>sgCat(r.cat)[0]+" "+r.name).join(", "):"Not on any reservation"].filter(Boolean).join(" · "))}</div>
  ${x?`<div class="small">Owes ${esc(sgM(x.owed,t))} · Paid ${esc(sgM(x.paid,t))} · <b>Left ${esc(sgM(Math.max(0,x.bal),t))}</b></div>`:""}</div><button class="btn sm" data-act="sgEdOpen" data-kind="mem" data-k="${esc(m.k)}">Edit</button></div>`};
 return `<section class="card stack"><div class="row between"><h2 class="m0">Traveling party · ${mem.length}</h2><button class="btn primary" data-act="sgMemNew">Add a traveler</button></div>
  <p class="small muted m0">Contact details are only used to send each guest their own travel details. Adding someone here doesn't give them an account or access to anything.</p>
  ${mem.length?sgSel("sgpg","Group by",by,[["lodging","Lodging"],["car","Rental car"],["room","Room"],["group","Travel group"],["none","No grouping"]],"sgRe")+Object.keys(groups).sort((a,b)=>(/^(Not|No )/.test(a)?1:0)-(/^(Not|No )/.test(b)?1:0)||a.localeCompare(b)).map(g=>`<div class="stack tight"><div class="eyebrow">${esc(g)} · ${groups[g].length}</div>${groups[g].map(card).join("")}</div>`).join(""):'<p class="small muted m0">No travelers yet. Add each person going on the trip.</p>'}</section>`}
function sgMemForm(t,k){const m=k?Object.assign({k},(D.sgM||{})[k]||{}):{},p="sgg_",res=sgRes(t.k).filter(r=>r.status!=="cancelled");
 return `<section class="card stack"><div class="row between"><h2 class="m0">${k?"Edit traveler":"Add a traveler"}</h2><button class="btn sm" data-act="sgEdClose">Cancel</button></div>
  <div class="grid2">${sgIn(p+"name","Full name",m.name,{req:1,max:80,ac:"off"})}${sgIn(p+"email","Email",m.email,{type:"email",max:120,ac:"off"})}${sgIn(p+"phone","Mobile number",m.phone,{type:"tel",max:30,ac:"off"})}
  ${sgIn(p+"room","Room",m.room,{max:40,ph:"204, or King suite"})}${sgIn(p+"group","Travel group or car",m.group,{max:60,ph:"Bride's family, Car 2"})}
  ${sgIn(p+"from","Arrives",m.from||t.from,{type:"date"})}${sgIn(p+"to","Leaves",m.to||t.to,{type:"date"})}</div>
  ${res.length?`<div class="eyebrow">Reservations</div><div class="row">${res.map(r=>sgCk(p+"r_"+r.k,sgCat(r.cat)[0]+" "+esc(r.name),(r.who||{})[k])).join("")}</div><p class="small muted m0">Evenly split costs are recalculated when you change who's on a reservation.</p>`:""}
  <div class="eyebrow">Messages</div><div class="row">${sgCk(p+"noEmail","Don't send this person emails",m.noEmail)}${sgCk(p+"noSms","Don't send this person texts",m.noSms)}</div>
  ${sgTx(p+"note","Private notes (never sent)",m.note,{max:500})}
  <div class="row"><button class="btn primary" data-act="sgMemSave" data-k="${esc(k||"")}">Save traveler</button><button class="btn" data-act="sgEdClose">Cancel</button>${k?'<span class="grow"></span>'+sgDel("sgmx"+k,"sgMemDel",k,"remove from the trip"):""}</div></section>`}

/* ---- receipts and payments ---- */
function sgMoneyTab(t){const ed=L.sgEd||{};
 if(ed.kind==="pay")return sgPayForm(t,ed.k);if(ed.kind==="exp")return sgExpForm(t,ed.k);if(ed.kind==="rc")return sgRcForm(t,ed.k);
 const lg=sgLedger(t.k),mem=sgMem(t.k),pays=sgPays(t.k),exps=sgExp(t.k),rcs=sgRcs(t.k),op=L.sgPOpen;
 const st=(b,l)=>`<div class="stat"><b>${esc(b)}</b><span>${l}</span></div>`;
 const person=m=>{const x=lg.people[m.k]||{owed:0,paid:0,bal:0,overdue:0,unapplied:0,st:"none",rows:[],next:""},open=op===m.k,mp=pays.filter(p=>p.mid===m.k),mr=rcs.filter(r=>r.pay&&mp.some(p=>p.k===r.pay));
  return `<div class="plrow sgperson"><div class="mw0 grow"><b>${esc(m.name)}</b> ${sgPill(SG_PST,x.st)}
   <div class="small">Owes ${esc(sgM(x.owed,t))} · Paid ${esc(sgM(x.paid,t))} · <b>${x.bal<0?"Credit "+esc(sgM(-x.bal,t)):"Left "+esc(sgM(x.bal,t))}</b>${x.overdue?` · <span class="pill bad">${esc(sgM(x.overdue,t))} overdue</span>`:""}${x.next?` · next due ${esc(clFmtDate(x.next))}`:""}</div>
   ${open?`<div class="stack tight sgdetail"><div class="eyebrow">Their share of each cost</div>${x.rows.length?x.rows.map(s=>`<div class="row between small clrow"><span class="mw0">${esc(sgCostTitle(s.key))}<span class="db muted">Share ${esc(sgM(s.owe,t))} · paid ${esc(sgM(s.got,t))}${s.due?" · due "+esc(clFmtDate(s.due)):""}</span></span><span>${esc(sgM(s.left,t))} left ${sgPill(SG_PST,s.st)}</span></div>`).join(""):'<p class="small muted m0">Not sharing any costs yet.</p>'}
    <div class="eyebrow">Payments</div>${mp.length?mp.map(p=>`<div class="row between small clrow"><span class="mw0"><b>${esc(sgM(p.amt,t))}</b> · ${esc(clFmtDate(p.date))} · ${esc(p.method||"")}${p.ref?" · ref "+esc(p.ref):""}<span class="db muted">${Object.keys(p.alloc||{}).length?"Applied to "+Object.keys(p.alloc).map(k=>esc(sgCostTitle(k))+" "+esc(sgM(p.alloc[k],t))).join(", "):"Not applied to a cost"}${p.rc&&(D.sgRc||{})[p.rc]?" · 🧾 receipt":""}</span></span><button class="btn xs" data-act="sgEdOpen" data-kind="pay" data-k="${esc(p.k)}">Edit</button></div>`).join(""):'<p class="small muted m0">No payments recorded.</p>'}
    ${x.unapplied>0?`<p class="small m0"><span class="pill warn">Check</span> ${esc(sgM(x.unapplied,t))} isn't applied to a cost. Edit the payment and tap Apply automatically, or add the cost it was for.</p>`:""}
    ${mr.length?`<div class="small muted">Receipts: ${mr.map(r=>esc(r.name)).join(", ")}</div>`:""}
    <div class="row"><button class="btn sm primary" data-act="sgPayNew" data-m="${esc(m.k)}">Record a payment from ${esc(sgFirst(m.name))}</button></div></div>`:""}</div>
   <button class="btn sm" data-act="sgPOpen" data-k="${esc(m.k)}" aria-expanded="${open}">${open?"Close":"Details"}</button></div>`};
 return `<section class="card stack"><h2>Group money</h2><p class="small muted m0">Host Mode only records payments made elsewhere (cash, Zelle, card and so on). It doesn't take or send money. Every total here is worked out from the costs and payments below.</p>
  <div class="stats sgstats">${st(sgM(lg.total,t),"Total trip costs")}${st(sgM(lg.split,t),"Split among travelers")}${st(sgM(lg.paid,t),"Payments recorded")}${st(sgM(lg.out,t),"Still owed")}${st(sgM(lg.overdue,t),"Overdue")}${st(sgM(lg.credit,t),"Overpaid (credit)")}</div>
  ${lg.unsplit>0?`<p class="small m0"><span class="pill warn">Check</span> ${esc(sgM(lg.unsplit,t))} of the costs isn't split among travelers (including anything the organizer covers).</p>`:""}
  <div class="row"><button class="btn primary" data-act="sgPayNew">Record a payment</button><button class="btn" data-act="sgEdOpen" data-kind="exp" data-k="">Add a shared cost</button><label class="btn upl">Upload a receipt<input type="file" accept="image/*,application/pdf" data-act="sgRcUp"></label></div>
  ${L.sgDup?`<div class="banner soft"><span>This looks like the same file as <b>${esc(L.sgDup.match.name)}</b>, uploaded ${esc(sgWhen(L.sgDup.match.t))}. Upload it again anyway?</span><span class="row"><button class="btn sm gold" data-act="sgRcDupYes">Upload anyway</button><button class="btn sm" data-act="sgRcDupNo">Don't upload</button></span></div>`:""}</section>
 <section class="card stack"><h2>Who has paid what</h2>${mem.length?`<div class="stack tight">${mem.map(person).join("")}</div>`:'<p class="small muted m0">Add travelers in Traveling party first.</p>'}</section>
 <section class="card stack"><h2>Shared costs</h2><p class="small muted m0">Reservations are costs already. Add anything else the group shares here, like groceries for the rental house or an airport shuttle.</p>
  ${exps.length?exps.map(e=>`<div class="row between small clrow"><span class="mw0"><b>${esc(e.title)}</b> · ${esc(sgM(e.amt,t))}${e.date?" · "+esc(clFmtDate(e.date)):""}<span class="db muted">${e.split==="none"?"Not split":Object.keys(e.owe||{}).map(m=>esc(sgName(m))+" "+esc(sgM(e.owe[m],t))).join(", ")||"Not split yet"}</span></span><button class="btn xs" data-act="sgEdOpen" data-kind="exp" data-k="${esc(e.k)}">Edit</button></div>`).join(""):'<p class="small muted m0">No shared costs yet.</p>'}</section>
 <section class="card stack"><h2>Receipts</h2><p class="small muted m0">Reading receipts automatically isn't set up yet (coming soon), so type the details in from each receipt. Nothing counts as checked until you save it.</p>
  ${rcs.length?rcs.map(r=>`<div class="plrow"><span class="gnum" aria-hidden="true">${/pdf/.test(r.type)?"📄":"🧾"}</span><div class="mw0 grow"><b class="brk">${esc(r.merchant||r.name)}</b> ${r.ok?'<span class="pill ok">Checked</span>':'<span class="pill warn">Needs checking</span>'}<div class="small muted">${esc([r.amt?sgM(r.amt,t):"",r.date&&clFmtDate(r.date),r.cost&&sgCostTitle(r.cost),r.pay&&(D.sgPay||{})[r.pay]?"payment from "+sgName(D.sgPay[r.pay].mid):""].filter(Boolean).join(" · ")||r.name)}</div></div>
   <div class="row small"><button class="btn xs" data-act="sgRcGet" data-k="${esc(r.k)}">Open</button><button class="btn xs" data-act="sgEdOpen" data-kind="rc" data-k="${esc(r.k)}">${r.ok?"Edit":"Check details"}</button></div></div>`).join(""):'<p class="small muted m0">No receipts yet.</p>'}</section>
 <section class="card stack"><h2>Every payment</h2>${pays.length?pays.map(p=>`<div class="row between small clrow"><span class="mw0">${esc(clFmtDate(p.date))} · <b>${esc(sgName(p.mid))}</b> paid ${esc(sgM(p.amt,t))}${p.method?" by "+esc(p.method):""}${p.ref?" · ref "+esc(p.ref):""}</span><button class="btn xs" data-act="sgEdOpen" data-kind="pay" data-k="${esc(p.k)}">Edit</button></div>`).join(""):'<p class="small muted m0">No payments recorded yet.</p>'}</section>`}
function sgPayForm(t,k){const old=k?Object.assign({k},(D.sgPay||{})[k]||{}):{mid:L.sgEd.mid||""},p="sgp_",mem=sgMem(t.k),costs=sgCosts(t.k),pays=sgPays(t.k);
 const mid=dv(p+"mid",old.mid||""),amt=SG.cents(dv(p+"amt",old.amt!=null?SG.plain(old.amt):"")),mode=dv(p+"mode",k?"manual":"auto");
 const others=pays.filter(x=>x.k!==k),open=mid?costs.filter(c=>(Math.round(+(c.owe||{})[mid])||0)>0):[];
 const auto=mid&&amt>0?SG.auto(costs,others,mid,amt):{};
 return `<section class="card stack"><div class="row between"><h2 class="m0">${k?"Edit payment":"Record a payment"}</h2><button class="btn sm" data-act="sgEdClose">Cancel</button></div>
  <p class="small muted m0">Record money a traveler already paid outside Host Mode.</p>
  <div class="grid2">${sgSel(p+"mid","Who paid",mid,[["","Choose a traveler"]].concat(mem.map(m=>[m.k,m.name])),"sgRe")}${sgMoneyIn(p+"amt","Amount ("+(t.cur||"USD")+")",old.amt!=null?old.amt:"",{act:"sgRe",req:1})}
  ${sgIn(p+"date","Date paid",old.date||sgToday(),{type:"date"})}${sgSel(p+"method","How they paid",old.method||"Zelle",SG_METHODS.map(x=>[x,x]))}
  ${sgIn(p+"ref","Reference",old.ref,{max:60,ph:"Confirmation or check number"})}${sgSel(p+"rc","Receipt",old.rc||"",[["","No receipt"]].concat(sgRcs(t.k).map(r=>[r.k,(r.merchant||r.name)+(r.amt?" · "+sgM(r.amt,t):"")])))}</div>
  ${sgTx(p+"note","Notes",old.note,{max:300,rows:2})}
  <div class="eyebrow">What it pays for</div>
  ${!mid?'<p class="small muted m0">Choose who paid first.</p>':!open.length?'<p class="small muted m0">This person isn\'t sharing any costs yet, so the payment is saved as a credit. Assign them to a reservation or shared cost to apply it.</p>':
   `${sgSel(p+"mode","Apply it",mode,[["auto","Automatically, soonest due first"],["manual","I'll choose the amounts"]],"sgRe")}
   ${mode==="auto"?`<div class="small">${Object.keys(auto).length?Object.keys(auto).map(kk=>esc(sgCostTitle(kk))+" "+esc(sgM(auto[kk],t))).join(" · "):"Enter the amount to see where it goes."}${amt>SG.sum(auto)&&amt>0?" · "+esc(sgM(amt-SG.sum(auto),t))+" left over as credit":""}</div>`:
   `<div class="grid2">${open.map(c=>{const lf=SG.left(costs,pays,mid,c.key,k);return sgMoneyIn(p+"a_"+sgDraftKey(c.key),c.title+" ("+sgM(lf,t)+" left)",(old.alloc||{})[c.key]!=null?old.alloc[c.key]:"")}).join("")}</div>`}`}
  <div class="row"><button class="btn primary" data-act="sgPaySave" data-k="${esc(k||"")}">Save payment</button><button class="btn" data-act="sgEdClose">Cancel</button>${k?'<span class="grow"></span>'+sgDel("sgpx"+k,"sgPayDel",k):""}</div></section>`}
function sgExpForm(t,k){const old=k?Object.assign({k},(D.sgE||{})[k]||{}):{},p="sge_",mem=sgMem(t.k),split=dv(p+"split",old.split||"even");
 const who=mem.filter(m=>dv(p+"w_"+m.k,k?((old.who||{})[m.k]?"1":"0"):"1")==="1");
 return `<section class="card stack"><div class="row between"><h2 class="m0">${k?"Edit shared cost":"Add a shared cost"}</h2><button class="btn sm" data-act="sgEdClose">Cancel</button></div>
  <div class="grid2">${sgIn(p+"title","What it's for",old.title,{req:1,max:80,ph:"Groceries for the rental house"})}${sgMoneyIn(p+"amt","Amount ("+(t.cur||"USD")+")",old.amt!=null?old.amt:"",{req:1})}${sgIn(p+"date","Date",old.date||sgToday(),{type:"date"})}${sgIn(p+"oweDue","Travelers pay their share by",old.oweDue,{type:"date"})}</div>
  <div class="eyebrow">Who shares it</div>${mem.length?`<div class="row">${mem.map(m=>sgCk(p+"w_"+m.k,esc(m.name),k?(old.who||{})[m.k]:true,"sgRe")).join("")}</div>`:'<p class="small muted m0">Add travelers first.</p>'}
  ${sgSel(p+"split","How they share it",split,[["even","Split evenly"],["custom","Set each person's share"],["none","Don't split"]],"sgRe")}
  ${split==="custom"&&who.length?`<div class="grid2">${who.map(m=>sgMoneyIn(p+"o_"+m.k,m.name+"'s share",(old.owe||{})[m.k]!=null?old.owe[m.k]:"")).join("")}</div>`:""}
  ${sgTx(p+"note","Private notes",old.note,{max:300,rows:2})}
  <div class="row"><button class="btn primary" data-act="sgExpSave" data-k="${esc(k||"")}">Save shared cost</button><button class="btn" data-act="sgEdClose">Cancel</button>${k?'<span class="grow"></span>'+sgDel("sgex"+k,"sgExpDel",k):""}</div></section>`}
function sgRcForm(t,k){const r=Object.assign({k},(D.sgRc||{})[k]||{}),p="sgc_";
 return `<section class="card stack"><div class="row between"><h2 class="m0">Check the receipt</h2><button class="btn sm" data-act="sgEdClose">Cancel</button></div>
  <div class="row small"><span class="muted brk">${esc(r.name)} · ${(+r.size/1048576).toFixed(2)} MB</span><button class="btn xs" data-act="sgRcGet" data-k="${esc(k)}">Open the file</button></div>
  <p class="small muted m0">Type in what the receipt says. Automatic reading is coming soon.</p>
  <div class="grid2">${sgIn(p+"merchant","Business name",r.merchant,{max:80})}${sgIn(p+"date","Date on the receipt",r.date,{type:"date"})}${sgMoneyIn(p+"amt","Amount",r.amt!=null?r.amt:"")}${sgIn(p+"ref","Reference or order number",r.ref,{max:60})}
  ${sgSel(p+"cost","What it's for",r.cost||"",[["","Not linked to a cost"]].concat(sgCosts(t.k).map(c=>[c.key,c.title])))}${sgSel(p+"pay","Which payment it proves",r.pay||"",[["","Not linked to a payment"]].concat(sgPays(t.k).map(x=>[x.k,sgName(x.mid)+" · "+sgM(x.amt,t)+" · "+clFmtDate(x.date)])))}</div>
  <div class="row"><button class="btn primary" data-act="sgRcSave" data-k="${esc(k)}">Save, the details are right</button><button class="btn" data-act="sgEdClose">Cancel</button><span class="grow"></span>${sgDel("sgcx"+k,"sgRcDel",k)}</div></section>`}

/* ---- guest messages ---- */
function sgMsgBuild(t,m,o){const mine=sgRes(t.k).filter(r=>o.res.includes(r.k)&&r.status!=="cancelled"&&(r.who||{})[m.k]);
 const intro={stay:`Here are your lodging details for ${t.name}.`,car:`Here are your rental car details for ${t.name}.`,trip:`Here's your travel plan for ${t.name}.`,remind:`A quick reminder about ${t.name}.`,change:`There's a change to your travel plans for ${t.name}. Here are the updated details.`,custom:""}[o.kind]||"";
 const L1=[`Hi ${sgFirst(m.name)},`,""];if(intro)L1.push(intro,"");
 if(o.kind!=="custom"&&m.from)L1.push(`Your travel dates: ${clFmtDate(m.from)}${m.to&&m.to!==m.from?" to "+clFmtDate(m.to):""}`,"");
 mine.forEach(r=>{const w=SG_WHEN[r.cat]||SG_WHEN.other;L1.push(`${sgCat(r.cat)[1]}: ${r.name}`);
  if(r.start)L1.push(`${w[0]}: ${clFmtDate(r.start)}${r.inT?" at "+clFmtTime(r.inT):""}`);if(r.end)L1.push(`${w[1]}: ${clFmtDate(r.end)}${r.outT?" at "+clFmtTime(r.outT):""}`);
  if((r.cat==="stay"||r.cat==="rental")&&m.room)L1.push(`Your room: ${m.room}`);if(o.addr&&r.addr)L1.push(`Address: ${r.addr}`);if(o.conf&&r.conf)L1.push(`Confirmation number: ${r.conf}`);if(r.phone)L1.push(`Phone: ${r.phone}`);if(r.gnote)L1.push(r.gnote);L1.push("")});
 if(o.extra)L1.push(o.extra,"");const b=D.brand||{},me=D.plMe||{};L1.push("Thank you,",b.name||me.biz||me.name||"Your planner");
 return {subj:`${t.name}: ${SG_MK[o.kind]||"Travel details"}`,body:L1.join("\n").replace(/\n{3,}/g,"\n\n").trim(),n:mine.length}}
function sgMsgOpts(t){const p="sgm_",kind=dv(p+"kind","stay"),res=sgRes(t.k).filter(r=>r.status!=="cancelled");
 const def=r=>kind==="stay"?(r.cat==="stay"||r.cat==="rental"):kind==="car"?r.cat==="car":kind!=="custom";
 return {kind,ch:dv(p+"ch","email"),res:res.filter(r=>dv(p+"r_"+r.k,def(r)?"1":"0")==="1").map(r=>r.k),conf:dv(p+"conf","1")==="1",addr:dv(p+"addr","1")==="1",extra:String(dv(p+"extra","")).trim().slice(0,800),to:sgMem(t.k).filter(m=>dv(p+"p_"+m.k,"0")==="1").map(m=>m.k)}}
function sgMsgTab(t){const p="sgm_",mem=sgMem(t.k),res=sgRes(t.k).filter(r=>r.status!=="cancelled"),o=sgMsgOpts(t),sig=JSON.stringify(o),ok=L.sgOkSig===sig,log=sgMsgs(t.k);
 const reach=m=>o.ch==="email"?(m.noEmail?"asked for no emails":m.email?"":"no email on file"):(m.noSms?"asked for no texts":m.phone?"":"no mobile number on file");
 const prev=o.to.map(mk=>{const m=Object.assign({k:mk},D.sgM[mk]),x=sgMsgBuild(t,m,o),why=reach(m)||(!x.n&&!o.extra?"nothing selected is assigned to them":""),sent=log.find(l=>l.mid===mk&&l.sig===sig.length+":"+x.body.length&&Date.now()-l.t<36e5);
  return `<details class="sgprev"${o.to[0]===mk?" open":""}><summary class="small"><b>${esc(m.name)}</b> · ${esc(o.ch==="email"?m.email||"no email":m.phone||"no number")} ${why?`<span class="pill warn">Can't send: ${esc(why)}</span>`:sent?'<span class="pill ok">Opened</span>':""}</summary>
   ${o.ch==="email"?`<div class="small"><b>Subject:</b> ${esc(x.subj)}</div>`:""}<pre class="sgpre">${esc(x.body)}</pre>
   ${why?"":ok?`<button class="btn sm primary" data-act="sgSend" data-k="${esc(mk)}">${o.ch==="email"?"Open in my email app":"Open in my texting app"} to send to ${esc(sgFirst(m.name))}</button>`:""}</details>`}).join("");
 return `<section class="card stack"><h2>Send travel details</h2><p class="small muted m0">Each guest gets their own message with only the reservations they're on. Messages never include payments, balances, receipts, other guests' contact details or your private notes.</p>
  <div class="eyebrow">1. Who gets it</div>${mem.length?`<div class="row">${mem.map(m=>sgCk(p+"p_"+m.k,esc(m.name)+(reach(m)?' <span class="muted">('+esc(reach(m))+")</span>":""),false,"sgRe")).join("")}</div><div class="row small"><button class="btn xs" data-act="sgMsgAll" data-k="1">Everyone</button><button class="btn xs" data-act="sgMsgAll" data-k="0">No one</button></div>`:'<p class="small muted m0">Add travelers in Traveling party first.</p>'}
  <div class="eyebrow">2. What to send</div><div class="grid2">${sgSel(p+"kind","Message",o.kind,Object.keys(SG_MK).map(k=>[k,SG_MK[k]]),"sgMsgKind")}${sgSel(p+"ch","Send by",o.ch,[["email","Email"],["sms","Text message"]],"sgRe")}</div>
  ${res.length?`<div class="row">${res.map(r=>sgCk(p+"r_"+r.k,sgCat(r.cat)[0]+" "+esc(r.name),o.res.includes(r.k),"sgRe")).join("")}</div>`:""}
  <div class="row">${sgCk(p+"conf","Include confirmation numbers",o.conf,"sgRe")}${sgCk(p+"addr","Include addresses",o.addr,"sgRe")}</div>
  ${sgTx(p+"extra","Add a note (optional)",o.extra,{max:800,rows:2,ph:"The shuttle leaves the hotel at 4:30 PM."})}<button class="btn sm as" data-act="sgRe">Update the preview</button>
  <div class="eyebrow">3. Check and send</div>${o.to.length?`${prev}${ok?'<p class="small muted m0">Approved. Tap each person to open their message in your app, then press send there. Host Mode can\'t confirm it was delivered.</p>':`<button class="btn primary" data-act="sgMsgOk">These look right, approve them</button>`}`:'<p class="small muted m0">Choose who gets it to see a preview of each message.</p>'}</section>
 <section class="card stack"><h2>Automatic reminders</h2><p class="small muted m0">Coming soon. Sending emails and texts automatically (for example, a check-in reminder the day before) needs an email and text service, which is on hold in the build plan. For now, messages open in your own email or texting app.</p></section>
 <section class="card stack"><h2>Message history</h2>${log.length?log.slice(0,60).map(l=>`<div class="row between small clrow"><span class="mw0"><b>${esc(sgName(l.mid))}</b> · ${l.ch==="sms"?"Text":"Email"} · ${esc(SG_MK[l.kind]||"Message")}<span class="db muted">${esc(sgWhen(l.t))} · ${esc(l.by||"")} · ${l.status==="sent"?"Marked sent":"Opened in "+(l.ch==="sms"?"texting":"email")+" app (delivery not confirmed)"}</span></span>${l.status==="sent"?'<span class="pill ok">Sent</span>':`<button class="btn xs" data-act="sgMsgSent" data-k="${esc(l.k)}">I sent it</button>`}</div>`).join(""):'<p class="small muted m0">No messages yet.</p>'}</section>`}

/* ---- reports and export ---- */
function sgRepTab(t){const lg=sgLedger(t.k),res=sgRes(t.k),log=sgMsgs(t.k),by={};
 res.filter(r=>r.status!=="cancelled").forEach(r=>{const c=sgCat(r.cat)[1];by[c]=by[c]||[0,0];by[c][0]++;by[c][1]+=+r.total||0});sgExp(t.k).forEach(e=>{by["Shared costs"]=by["Shared costs"]||[0,0];by["Shared costs"][0]++;by["Shared costs"][1]+=+e.amt||0});
 const live=res.filter(r=>r.status!=="cancelled"),pt=live.reduce((s,r)=>s+(+r.total||0),0),pp=live.reduce((s,r)=>s+sgPPaid(r),0);
 return `<section class="card stack"><div class="row between"><h2 class="m0">Trip report</h2><button class="btn sm primary" data-act="sgExport">Download this trip</button></div>
  <div class="eyebrow">Costs by type</div><div class="sgwrap"><table class="sgtbl"><thead><tr><th>Type</th><th class="n">How many</th><th class="n">Total</th></tr></thead><tbody>${Object.keys(by).map(c=>`<tr><td>${esc(c)}</td><td class="n">${by[c][0]}</td><td class="n">${esc(sgM(by[c][1],t))}</td></tr>`).join("")||'<tr><td colspan="3" class="muted">No costs yet</td></tr>'}</tbody></table></div>
  <div class="eyebrow">Paid to companies</div><p class="small m0">${esc(sgM(pp,t))} paid of ${esc(sgM(pt,t))} · ${esc(sgM(Math.max(0,pt-pp),t))} left to pay</p>
  <div class="eyebrow">Travelers</div><div class="sgwrap"><table class="sgtbl"><thead><tr><th>Traveler</th><th class="n">Owes</th><th class="n">Paid</th><th class="n">Left</th><th>Status</th></tr></thead><tbody>${sgMem(t.k).map(m=>{const x=lg.people[m.k]||{owed:0,paid:0,bal:0,st:"none"};return `<tr><td>${esc(m.name)}</td><td class="n">${esc(sgM(x.owed,t))}</td><td class="n">${esc(sgM(x.paid,t))}</td><td class="n">${esc(sgM(x.bal,t))}</td><td>${sgPill(SG_PST,x.st)}</td></tr>`}).join("")}<tr><td><b>Group</b></td><td class="n"><b>${esc(sgM(lg.split,t))}</b></td><td class="n"><b>${esc(sgM(lg.paid,t))}</b></td><td class="n"><b>${esc(sgM(lg.out,t))}</b></td><td></td></tr></tbody></table></div>
  <div class="eyebrow">Messages</div><p class="small m0">${log.filter(l=>l.ch==="email").length} emails and ${log.filter(l=>l.ch==="sms").length} texts opened to send · ${log.filter(l=>l.status==="sent").length} marked sent</p></section>`}
function sgSheets(tks){const tn=k=>((D.sgT||{})[k]||{}).name||"",cur=k=>((D.sgT||{})[k]||{}).cur||"USD",n=(c)=>(Math.round(+c||0)/100);
 const R=[["Trip","Type","Name","Booked through","Confirmation number","Status","Start","End","Address","Total cost","Paid to the company","Due to the company","Currency","Travelers","Split","Travelers pay by","Note for guests","Private notes"]],M=[["Trip","Name","Email","Mobile","Room","Travel group","Arrives","Leaves","No emails","No texts","Owes","Paid","Left","Notes"]],
  C=[["Trip","Cost","Traveler","Share","Paid toward it","Left","Due","Status"]],P=[["Trip","Date","Traveler","Amount","Method","Reference","Applied to","Notes"]],G=[["Trip","When","To","By","Type","Status"]],H=[["Trip","When","Who","What changed"]];
 tks.forEach(tk=>{const lg=sgLedger(tk);
  sgRes(tk).forEach(r=>R.push([tn(tk),sgCat(r.cat)[1],r.name||"",sgProvName(r.prov),r.conf||"",SG_BK[r.status||"pending"][0],r.start||"",r.end||"",r.addr||"",n(r.total),n(sgPPaid(r)),r.due||"",cur(tk),Object.keys(r.who||{}).map(sgName).join("; "),r.split||"even",r.oweDue||"",r.gnote||"",r.note||""]));
  sgMem(tk).forEach(m=>{const x=lg.people[m.k]||{owed:0,paid:0,bal:0};M.push([tn(tk),m.name||"",m.email||"",m.phone||"",m.room||"",m.group||"",m.from||"",m.to||"",m.noEmail?"Yes":"No",m.noSms?"Yes":"No",n(x.owed),n(x.paid),n(x.bal),m.note||""])});
  lg.costs.forEach(c=>c.shares.forEach(s=>C.push([tn(tk),c.title,sgName(s.mid),n(s.owe),n(s.got),n(s.left),s.due,SG_PST[s.st][0]])));
  sgPays(tk).forEach(p=>P.push([tn(tk),p.date||"",sgName(p.mid),n(p.amt),p.method||"",p.ref||"",Object.keys(p.alloc||{}).map(k=>sgCostTitle(k)+" "+SG.plain(p.alloc[k])).join("; "),p.note||""]));
  sgMsgs(tk).forEach(l=>G.push([tn(tk),new Date(l.t).toISOString(),sgName(l.mid),l.ch==="sms"?"Text":"Email",SG_MK[l.kind]||"",l.status==="sent"?"Marked sent":"Opened in app"]));
  sgActs(tk).forEach(a=>H.push([tn(tk),new Date(a.t).toISOString(),a.by||"",a.text]))});
 return [{name:"Travel reservations",rows:R},{name:"Travel party",rows:M},{name:"Travel shares",rows:C},{name:"Travel payments",rows:P},{name:"Travel messages",rows:G},{name:"Travel history",rows:H}]}
const sgAllSheets=()=>{const ks=Object.keys(D.sgT||{});return ks.length?sgSheets(ks):[]};

/* ---- calendar entries ---- */
function sgCalItems(){const out=[],today=sgToday();sgTripList().filter(t=>!t.arch).forEach(t=>{
 sgRes(t.k).filter(r=>r.status!=="cancelled").forEach(r=>{const w=SG_WHEN[r.cat]||SG_WHEN.other;
  if(r.start)out.push({date:r.start,time:r.inT||"",kind:"trip",title:`${w[0]}: ${r.name}`,who:t.name,tab:"stay"});
  if(r.end&&r.end!==r.start)out.push({date:r.end,time:r.outT||"",kind:"trip",title:`${w[1]}: ${r.name}`,who:t.name,tab:"stay"});
  const left=(+r.total||0)-sgPPaid(r);if(r.due&&left>0)out.push({date:r.due,kind:"pay",title:`${r.name} balance · ${sgM(left,t)}`,who:t.name,tab:"stay"})});
 sgLedger(t.k).costs.forEach(c=>{const left=c.shares.reduce((s,x)=>s+x.left,0);if(c.due&&left>0&&c.due>=dayAdd(today,-30))out.push({date:c.due,kind:"pay",title:`Travelers' shares for ${c.title} · ${sgM(left,t)} left`,who:t.name,tab:"stay"})})});return out}
const sgBadge=()=>sgTripList().filter(t=>!t.arch).reduce((n,t)=>{const lg=sgLedger(t.k);return n+Object.keys(lg.people).filter(m=>lg.people[m].st==="overdue").length+sgRes(t.k).filter(r=>sgPSt(r)==="overdue").length},0);

/* ---- files ---- */
async function sgReadFile(f){if(!f)return null;if(!/^image\/|^application\/pdf$/.test(f.type||"")){toast("Upload a PDF or a photo");return null}
 let data;try{if(/^image\//.test(f.type)&&f.size>1.5e6)data=await plShrink(f,2000,.85);else{if(f.size>SG_FILE_MAX){toast("That file is over 4 MB. Try a smaller copy or a photo of it.");return null}data=await plDataURL(f)}}catch(e){toast("That file couldn't be read");return null}
 if(!data||data.length>SG_FILE_MAX*1.4){toast("That file is too big to save");return null}
 return {name:String(f.name||"file").slice(0,120),type:(String(data).match(/^data:([^;]+)/)||[])[1]||f.type||"",size:Math.round(data.length*.75),data}}
async function sgHash(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].slice(0,12).map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return "h"+(h>>>0).toString(16)+"_"+s.length}}
async function sgRcSaveFile(t,v,hash){const r=sgRT("rc").push();await sgRT("rcBlob/"+r.key).set(v.data);await r.set({trip:t.k,name:v.name,type:v.type,size:v.size,hash,ok:false,t:Date.now()});await sgLog(t.k,"rc:"+r.key,`Uploaded receipt ${v.name}`);
 L.sgEd={kind:"rc",k:r.key};sgClear("sgc_");L.sgSec="money";toast("Receipt saved. Check its details.");render(true)}

/* ---- saving: which travelers share a cost ---- */
function sgOweFrom(p,who,total,split,old){if(split==="none")return {};if(split==="even")return SG.even(total,who);const o={};let bad=false;
 who.forEach(m=>{const v=SG.cents(dv(p+"o_"+m,old&&old[m]!=null?SG.plain(old[m]):""));if(isNaN(v))bad=true;else if(v>0)o[m]=v});return bad?null:o}
function sgDiff(a,b,t){const ch=[];if((a.status||"pending")!==b.status)ch.push(`status ${SG_BK[a.status||"pending"][0]} → ${SG_BK[b.status][0]}`);
 if((+a.total||0)!==b.total)ch.push(`cost ${sgM(+a.total||0,t)} → ${sgM(b.total,t)}`);if((a.start||"")!==b.start||(a.end||"")!==b.end)ch.push("dates changed");
 const wa=Object.keys(a.who||{}).sort().join(),wb=Object.keys(b.who||{}).sort().join();if(wa!==wb)ch.push(`travelers ${Object.keys(a.who||{}).length} → ${Object.keys(b.who||{}).length}`);
 if(JSON.stringify(a.owe||{})!==JSON.stringify(b.owe||{}))ch.push("shares changed");if((a.conf||"")!==b.conf)ch.push("confirmation number changed");return ch}
/* re-split evenly-shared costs when someone joins or leaves them */
async function sgAssign(t,mk,want,removing){const ups={};
 sgRes(t.k).forEach(r=>{const has=!!(r.who||{})[mk],w=!removing&&want.has(r.k);if(has===w)return;const who=Object.assign({},r.who||{});if(w)who[mk]=1;else delete who[mk];ups["res/"+r.k+"/who"]=Object.keys(who).length?who:null;
  if((r.split||"even")==="even"){const o=SG.even(Math.round(+r.total)||0,Object.keys(who));ups["res/"+r.k+"/owe"]=Object.keys(o).length?o:null}else if(!w&&(r.owe||{})[mk])ups["res/"+r.k+"/owe/"+mk]=null});
 if(removing)sgExp(t.k).forEach(e=>{if(!(e.who||{})[mk]&&!(e.owe||{})[mk])return;const who=Object.assign({},e.who||{});delete who[mk];ups["exp/"+e.k+"/who"]=Object.keys(who).length?who:null;
  if((e.split||"even")==="even"){const o=SG.even(Math.round(+e.amt)||0,Object.keys(who));ups["exp/"+e.k+"/owe"]=Object.keys(o).length?o:null}else ups["exp/"+e.k+"/owe/"+mk]=null});
 if(Object.keys(ups).length)await sgRT().update(ups);return Object.keys(ups).length}
const sgAllocated=key=>keyList(D.sgPay).some(p=>(+(p.alloc||{})[key]||0)>0);

Object.assign(ACT,{
 sgSec:el=>{L.sgSec=el.dataset.k;L.sgEd=null;L.sgOpen=null;L.confirm=null;render(true);window.scrollTo({top:0})},
 sgRe:el=>{if(el&&el.dataset&&el.dataset.draft)L.drafts[el.dataset.draft]=draftVal(el);L.sgOkSig=null;render(true)},
 sgPick:el=>{if(el.value==="__new"){L.sgEd={kind:"trip",k:""};sgClear("sgt_");return render(true)}L.sgTrip=el.value;store.set("sgTrip_"+PLID(),el.value);L.sgEd=null;L.sgOpen=null;L.sgPOpen=null;sgClear("sgm_");L.sgOkSig=null;render(true)},
 sgEdOpen:el=>{const kind=el.dataset.kind,k=el.dataset.k||"";L.sgEd={kind,k};L.confirm=null;L.sgFile=null;sgClear({trip:"sgt_",prov:"sgv_",res:"sgr_",mem:"sgg_",pay:"sgp_",exp:"sge_",rc:"sgc_"}[kind]||"sg__");render(true);window.scrollTo({top:0})},
 sgEdClose:()=>{L.sgEd=null;L.sgFile=null;L.confirm=null;render(true)},
 sgGo:el=>{L.sgSec=el.dataset.k;L.sgEd=null;L.confirm=null;L.sgOpen=el.dataset.k==="res"&&el.dataset.m?el.dataset.m:null;L.sgPOpen=el.dataset.k==="money"&&el.dataset.m?el.dataset.m:L.sgPOpen;render(true);window.scrollTo({top:0});
  if(el.dataset.ed==="rcup")setTimeout(()=>{const i=document.querySelector('[data-act="sgRcUp"]');if(i)i.click()},50)},
 /* trips */
 sgTripSave:async el=>{if(!sgW())return;const k=el.dataset.k,old=k?(D.sgT||{})[k]||{}:{},g=f=>String(dv("sgt_"+f,old[f]||"")).trim();
  const name=g("name").slice(0,80);if(!name)return toast("Give the trip a name");const from=g("from"),to=g("to");if(from&&to&&to<from)return toast("The last day is before the first day");
  const rec={name,client:g("client"),place:g("place").slice(0,80),cur:SG.SYM[g("cur")]?g("cur"):"USD",from,to,note:g("note").slice(0,1000),arch:!!old.arch,t:old.t||Date.now()};
  const ref=k?sgRT("trips/"+k):sgRT("trips").push();await ref.set(rec);L.sgTrip=ref.key;store.set("sgTrip_"+PLID(),ref.key);await sgLog(ref.key,"trip",k?"Edited the trip details":`Created the trip ${name}`);
  L.sgEd=null;sgClear("sgt_");L.sgSec="over";toast("Trip saved");render(true)},
 sgTripArch:async el=>{if(!sgW())return;const k=el.dataset.k,t=(D.sgT||{})[k];if(!t)return;await sgRT("trips/"+k+"/arch").set(!t.arch);toast(t.arch?"Trip shown again":"Trip hidden. Pick it from the trip list to see it.");L.sgEd=null;render(true)},
 sgTripDel:async el=>{if(!sgW())return;const k=el.dataset.k;const n=["sgR","sgM","sgPay","sgE","sgRc"].reduce((s,x)=>s+sgOf(D[x],k).length,0);
  if(n)return toast(`This trip still has ${n} record${n===1?"":"s"}. Hide it instead, or remove its reservations, travelers, payments, costs and receipts first.`);
  if(L.confirm!=="sgtx"+k){L.confirm="sgtx"+k;return render(true)}L.confirm=null;const ups={["trips/"+k]:null};sgOf(D.sgAct,k).forEach(a=>ups["act/"+a.k]=null);sgOf(D.sgMsg,k).forEach(a=>ups["msg/"+a.k]=null);await sgRT().update(ups);L.sgTrip=null;L.sgEd=null;toast("Trip deleted");render(true)},
 /* booking resources */
 sgProvSave:async el=>{if(!sgW())return;const k=el.dataset.k,old=k?sgProvs(true).find(p=>p.k===k)||{}:{},g=f=>String(dv("sgv_"+f,old[f]||"")).trim();
  const name=g("name").slice(0,60);if(!name)return toast("Add the company's name");let url=g("url");if(url&&!/^https?:\/\//i.test(url))url="https://"+url;
  if(url){try{const u=new URL(url);if(!/^https?:$/.test(u.protocol)||!u.host.includes("."))throw 0}catch(e){return toast("That website address doesn't look right")}}
  const rec={name,cat:SG_PCATS[g("cat")]?g("cat"):"other",url:url.slice(0,300),note:g("note").slice(0,200),off:!!old.off,t:old.t||Date.now()};
  await (k?sgRT("prov/"+k).set(rec):sgRT("prov").push().set(rec));L.sgEd=null;sgClear("sgv_");toast("Booking site saved");render(true)},
 sgProvOff:async el=>{if(!sgW())return;const k=el.dataset.k,p=sgProvs(true).find(x=>x.k===k);if(!p)return;const rec={name:p.name,cat:p.cat||"other",url:p.url||"",note:p.note||"",off:!p.off,t:p.t||Date.now()};await sgRT("prov/"+k).set(rec);toast(rec.off?"Turned off. It won't show when adding reservations.":"Turned on")},
 sgProvDel:async el=>{if(!sgW())return;const k=el.dataset.k;if(L.confirm!=="sgpx"+k){L.confirm="sgpx"+k;return render(true)}L.confirm=null;
  await (SG_PROV0.some(p=>p[0]===k)?sgRT("prov/"+k).set({gone:true,t:Date.now()}):sgRT("prov/"+k).remove());toast("Removed")},
 sgProvBack:async()=>{if(!sgW())return;const ups={};SG_PROV0.forEach(([k])=>{if(((D.sgP||{})[k]||{}).gone)ups["prov/"+k]=null});await sgRT().update(ups);toast("Starter list is back")},
 /* reservations */
 sgResNew:el=>{L.sgSec="res";L.sgOpen=null;L.sgFile=null;L.confirm=null;sgClear("sgr_");const pv=el&&el.dataset.p?sgProvs(true).find(x=>x.k===el.dataset.p):null;
  L.sgEd={kind:"res",k:"",prov:pv?pv.k:"",cat:pv?(pv.cat==="stay"?"stay":pv.cat==="car"?"car":pv.cat==="flight"?"flight":"other"):"stay"};
  const t=sgTrip();if(t)sgMem(t.k).forEach(m=>L.drafts["sgr_w_"+m.k]="1");render(true);window.scrollTo({top:0});
  if(el&&el.dataset.up)setTimeout(()=>{const i=document.querySelector('[data-act="sgResFile"]');if(i)i.click()},50)},
 sgResOpen:el=>{L.sgOpen=el.dataset.k||null;L.confirm=null;sgClear("sgpp_");render(true);window.scrollTo({top:0})},
 sgResFile:async el=>{const f=[...(el.files||[])][0];el.value="";const v=await sgReadFile(f);if(!v)return;L.sgFile=v;toast("Attached. It's saved when you save the reservation.");render(true)},
 sgResFileNow:async el=>{if(!sgW())return;const k=el.dataset.k,r=(D.sgR||{})[k];const f=[...(el.files||[])][0];el.value="";if(!r)return;const v=await sgReadFile(f);if(!v)return;
  toast("Uploading…");try{await sgRT("resDoc/"+k).set(v.data);await sgRT("res/"+k+"/doc").set({name:v.name,type:v.type,size:v.size});await sgLog(r.trip,"r:"+k,`Uploaded the confirmation for ${r.name}`);toast("Confirmation saved")}catch(e){toast("Upload failed. Check your connection.")}},
 sgResDoc:async el=>{const k=el.dataset.k,r=(D.sgR||{})[k];if(!r||!r.doc)return;toast("Opening…");const s=await sgRT("resDoc/"+k).once("value");const v=s.val();if(!v)return toast("That file is missing");download(r.doc.name||"confirmation",plBlob(v))},
 sgResSave:async el=>{if(!sgW())return;const t=sgTrip();if(!t)return;const k=el.dataset.k||"",old=k?(D.sgR||{})[k]||{}:{cat:(L.sgEd||{}).cat||"stay",prov:(L.sgEd||{}).prov||""},p="sgr_",g=(f,d)=>String(dv(p+f,d==null?(old[f]==null?"":old[f]):d)).trim();
  const name=g("name").slice(0,100);if(!name)return toast("Add the hotel, property or company name");
  const start=g("start"),end=g("end");if(start&&end&&end<start)return toast("The end date is before the start date");
  const total=SG.cents(g("total",old.total!=null?SG.plain(old.total):""));if(isNaN(total))return toast("Check the total cost: numbers only, like 450 or 450.75");
  const email=g("email");if(email&&!SG_EMAIL.test(email))return toast("That contact email doesn't look right");
  const who={};sgMem(t.k).forEach(m=>{if(dv(p+"w_"+m.k,(old.who||{})[m.k]?"1":"0")==="1")who[m.k]=1});
  const split=["even","custom","none"].includes(g("split",old.split||"even"))?g("split",old.split||"even"):"even",owe=sgOweFrom(p,Object.keys(who),total,split,old.owe);
  if(!owe)return toast("Check each person's share: numbers only");if(SG.sum(owe)>total)return toast(`The shares add up to ${sgM(SG.sum(owe),t)}, more than the ${sgM(total,t)} total`);
  const status=SG_BK[g("status",old.status||"pending")]?g("status",old.status||"pending"):"pending";
  const rec={trip:t.k,cat:SG_CATS[g("cat",old.cat||"stay")]?g("cat",old.cat||"stay"):"other",prov:g("prov"),name,conf:g("conf").slice(0,60),booked:g("booked"),start,end,inT:g("inT"),outT:g("outT"),addr:g("addr").slice(0,200),phone:g("phone").slice(0,30),email:email.slice(0,120),
   total,due:g("due"),status,who,split,owe,oweDue:split==="none"?"":g("oweDue"),gnote:g("gnote").slice(0,500),note:g("note").slice(0,1000),t:old.t||Date.now()};
  if(old.doc)rec.doc=old.doc;if(old.ppay)rec.ppay=old.ppay;
  const ref=k?sgRT("res/"+k):sgRT("res").push();
  try{if(L.sgFile){await sgRT("resDoc/"+ref.key).set(L.sgFile.data);rec.doc={name:L.sgFile.name,type:L.sgFile.type,size:L.sgFile.size}}await ref.set(rec)}catch(e){return toast("Couldn't save. Check your connection and try again.")}
  const ch=k?sgDiff(old,rec,t):[];await sgLog(t.k,"r:"+ref.key,k?`Edited ${name}${ch.length?": "+ch.join(", "):""}`:`Added ${sgCat(rec.cat)[1].toLowerCase()} ${name} (${SG_BK[status][0]}, ${sgM(total,t)})`);
  if(L.sgFile)await sgLog(t.k,"r:"+ref.key,`Uploaded the confirmation for ${name}`);
  L.sgFile=null;L.sgEd=null;sgClear(p);L.sgOpen=ref.key;toast("Reservation saved");render(true);window.scrollTo({top:0})},
 sgResStatus:async el=>{if(!sgW())return;const k=el.dataset.k,s=el.dataset.s,r=(D.sgR||{})[k];if(!r||!SG_BK[s])return;await sgRT("res/"+k+"/status").set(s);await sgLog(r.trip,"r:"+k,`${r.name}: status ${SG_BK[r.status||"pending"][0]} → ${SG_BK[s][0]}`);toast(SG_BK[s][0])},
 sgResCancel:async el=>{if(!sgW())return;const k=el.dataset.k,r=(D.sgR||{})[k];if(!r)return;if(L.confirm!=="sgrc"+k){L.confirm="sgrc"+k;return render(true)}L.confirm=null;
  await sgRT("res/"+k+"/status").set("cancelled");await sgLog(r.trip,"r:"+k,`Cancelled ${r.name}`);toast(SG.sum(r.owe)>0?"Cancelled. Travelers still owe their shares until you change the cost.":"Cancelled")},
 sgResDel:async el=>{if(!sgW())return;const k=el.dataset.k,r=(D.sgR||{})[k];if(!r)return;if(sgAllocated("r:"+k))return toast("Payments are applied to this reservation. Cancel it instead, so the payment history stays right.");
  if(L.confirm!=="sgrx"+k){L.confirm="sgrx"+k;return render(true)}L.confirm=null;await sgRT().update({["res/"+k]:null,["resDoc/"+k]:null});await sgLog(r.trip,"r:"+k,`Deleted the reservation ${r.name}`);L.sgOpen=null;toast("Reservation deleted");render(true)},
 sgPPAdd:async el=>{if(!sgW())return;const k=el.dataset.k,r=(D.sgR||{})[k];if(!r)return;const t=sgTrip(),amt=SG.cents(dv("sgpp_amt",""));
  if(isNaN(amt)||amt<=0)return toast("Enter the amount paid to the company");const date=String(dv("sgpp_date",sgToday()));
  await sgRT("res/"+k+"/ppay").push({amt,date,note:String(dv("sgpp_note","")).trim().slice(0,120),t:Date.now()});await sgLog(r.trip,"r:"+k,`Recorded ${sgM(amt,t)} paid to the company for ${r.name}`);sgClear("sgpp_");toast("Payment to the company recorded");render(true)},
 sgPPDel:async el=>{if(!sgW())return;const k=el.dataset.k,m=el.dataset.m,r=(D.sgR||{})[k];if(!r||!(r.ppay||{})[m])return;if(L.confirm!=="sgppx"+m){L.confirm="sgppx"+m;return render(true)}L.confirm=null;
  await sgRT("res/"+k+"/ppay/"+m).remove();await sgLog(r.trip,"r:"+k,`Removed a ${sgM(r.ppay[m].amt)} payment to the company for ${r.name}`);toast("Removed")},
 /* traveling party */
 sgMemNew:()=>{L.sgSec="party";L.sgEd={kind:"mem",k:""};L.confirm=null;sgClear("sgg_");render(true);window.scrollTo({top:0})},
 sgMemSave:async el=>{if(!sgW())return;const t=sgTrip();if(!t)return;const k=el.dataset.k||"",old=k?(D.sgM||{})[k]||{}:{},p="sgg_",g=(f,d)=>String(dv(p+f,d!=null?d:old[f]==null?"":old[f])).trim();
  const name=g("name").slice(0,80);if(!name)return toast("Add the traveler's name");const email=g("email"),phone=g("phone");
  if(email&&!SG_EMAIL.test(email))return toast("That email doesn't look right");if(phone&&!/^[+()\d\s.-]{7,30}$/.test(phone))return toast("That mobile number doesn't look right");
  const from=g("from",old.from||t.from||""),to=g("to",old.to||t.to||"");if(from&&to&&to<from)return toast("Leaves is before Arrives");
  const rec={trip:t.k,name,email:email.slice(0,120),phone:phone.slice(0,30),room:g("room").slice(0,40),group:g("group").slice(0,60),from,to,note:g("note").slice(0,500),noEmail:dv(p+"noEmail",old.noEmail?"1":"0")==="1",noSms:dv(p+"noSms",old.noSms?"1":"0")==="1",t:old.t||Date.now()};
  const ref=k?sgRT("mem/"+k):sgRT("mem").push();await ref.set(rec);
  const want=new Set(sgRes(t.k).filter(r=>r.status!=="cancelled"&&dv(p+"r_"+r.k,(r.who||{})[ref.key]?"1":"0")==="1").map(r=>r.k));sgRes(t.k).filter(r=>r.status==="cancelled"&&(r.who||{})[ref.key]).forEach(r=>want.add(r.k));
  const n=await sgAssign(t,ref.key,want,false);await sgLog(t.k,"m:"+ref.key,k?`Edited traveler ${name}${n?" and their reservations":""}`:`Added traveler ${name}`);
  L.sgEd=null;sgClear(p);toast("Traveler saved");render(true)},
 sgMemDel:async el=>{if(!sgW())return;const k=el.dataset.k,m=(D.sgM||{})[k],t=sgTrip();if(!m||!t)return;if(keyList(D.sgPay).some(p=>p.mid===k))return toast(`${m.name} has payments recorded. Remove those payments first, so the money history stays right.`);
  if(L.confirm!=="sgmx"+k){L.confirm="sgmx"+k;return render(true)}L.confirm=null;await sgAssign(t,k,new Set(),true);await sgRT("mem/"+k).remove();await sgLog(t.k,"m:"+k,`Removed traveler ${m.name} from the trip`);L.sgEd=null;toast("Removed from the trip");render(true)},
 /* payments */
 sgPayNew:el=>{L.sgSec="money";L.sgEd={kind:"pay",k:"",mid:el&&el.dataset.m||""};L.confirm=null;sgClear("sgp_");render(true);window.scrollTo({top:0})},
 sgPOpen:el=>{L.sgPOpen=L.sgPOpen===el.dataset.k?null:el.dataset.k;render(true)},
 sgPaySave:async el=>{if(!sgW())return;const t=sgTrip();if(!t)return;const k=el.dataset.k||"",old=k?(D.sgPay||{})[k]||{}:{},p="sgp_",g=(f,d)=>String(dv(p+f,d!=null?d:old[f]==null?"":old[f])).trim();
  const mid=g("mid");if(!mid||!(D.sgM||{})[mid])return toast("Choose who paid");const amt=SG.cents(g("amt",old.amt!=null?SG.plain(old.amt):""));if(isNaN(amt)||amt<=0)return toast("Enter the amount they paid");
  const date=g("date",old.date||sgToday());if(!date)return toast("Add the date they paid");
  const costs=sgCosts(t.k),pays=sgPays(t.k),others=pays.filter(x=>x.k!==k),mode=dv(p+"mode",k?"manual":"auto");let alloc={};
  if(mode==="auto")alloc=SG.auto(costs,others,mid,amt);
  else{let bad="";costs.filter(c=>(Math.round(+(c.owe||{})[mid])||0)>0).forEach(c=>{const v=SG.cents(dv(p+"a_"+sgDraftKey(c.key),(old.alloc||{})[c.key]!=null?SG.plain(old.alloc[c.key]):""));if(isNaN(v)){bad="Check the amounts: numbers only";return}
    const lf=SG.left(costs,pays,mid,c.key,k);if(v>lf){bad=`${c.title}: ${sgM(v,t)} is more than the ${sgM(lf,t)} left of their share`;return}if(v>0)alloc[c.key]=v});
   if(bad)return toast(bad);if(SG.sum(alloc)>amt)return toast(`The amounts add up to ${sgM(SG.sum(alloc),t)}, more than the ${sgM(amt,t)} paid`)}
  const rc=g("rc");const rec={trip:t.k,mid,amt,date,method:SG_METHODS.includes(g("method","Zelle"))?g("method","Zelle"):"Other",ref:g("ref").slice(0,60),note:g("note").slice(0,300),alloc,rc:rc&&(D.sgRc||{})[rc]?rc:"",t:old.t||Date.now()};
  const ref=k?sgRT("pay/"+k):sgRT("pay").push();await ref.set(rec);if(rec.rc)await sgRT("rc/"+rec.rc+"/pay").set(ref.key);if(old.rc&&old.rc!==rec.rc&&(D.sgRc||{})[old.rc])await sgRT("rc/"+old.rc+"/pay").remove();
  const where=Object.keys(alloc).map(x=>sgCostTitle(x)+" "+sgM(alloc[x],t)).join(", ");
  await sgLog(t.k,"p:"+ref.key,`${k?"Edited payment":"Recorded payment"}: ${sgName(mid)} paid ${sgM(amt,t)} by ${rec.method}${where?" (applied to "+where+")":" (not applied to a cost)"}`);
  L.sgEd=null;sgClear(p);L.sgPOpen=mid;toast("Payment saved");render(true)},
 sgPayDel:async el=>{if(!sgW())return;const k=el.dataset.k,x=(D.sgPay||{})[k];if(!x)return;if(L.confirm!=="sgpx"+k){L.confirm="sgpx"+k;return render(true)}L.confirm=null;
  const ups={["pay/"+k]:null};if(x.rc&&(D.sgRc||{})[x.rc])ups["rc/"+x.rc+"/pay"]=null;await sgRT().update(ups);await sgLog(x.trip,"p:"+k,`Deleted a payment: ${sgName(x.mid)} ${sgM(x.amt)} on ${clFmtDate(x.date)}`);L.sgEd=null;toast("Payment deleted");render(true)},
 /* shared costs */
 sgExpSave:async el=>{if(!sgW())return;const t=sgTrip();if(!t)return;const k=el.dataset.k||"",old=k?(D.sgE||{})[k]||{}:{},p="sge_",g=(f,d)=>String(dv(p+f,d!=null?d:old[f]==null?"":old[f])).trim();
  const title=g("title").slice(0,80);if(!title)return toast("Say what the cost is for");const amt=SG.cents(g("amt",old.amt!=null?SG.plain(old.amt):""));if(isNaN(amt)||amt<=0)return toast("Enter the amount");
  const who={};sgMem(t.k).forEach(m=>{if(dv(p+"w_"+m.k,k?((old.who||{})[m.k]?"1":"0"):"1")==="1")who[m.k]=1});
  const split=["even","custom","none"].includes(g("split",old.split||"even"))?g("split",old.split||"even"):"even",owe=sgOweFrom(p,Object.keys(who),amt,split,old.owe);
  if(!owe)return toast("Check each person's share: numbers only");if(SG.sum(owe)>amt)return toast(`The shares add up to more than ${sgM(amt,t)}`);
  const rec={trip:t.k,title,amt,date:g("date",old.date||sgToday()),who,split,owe,oweDue:split==="none"?"":g("oweDue"),note:g("note").slice(0,300),t:old.t||Date.now()};
  const ref=k?sgRT("exp/"+k):sgRT("exp").push();await ref.set(rec);await sgLog(t.k,"e:"+ref.key,`${k?"Edited":"Added"} shared cost ${title} (${sgM(amt,t)}${split==="none"?", not split":", "+Object.keys(owe).length+" people"})`);
  L.sgEd=null;sgClear(p);toast("Shared cost saved");render(true)},
 sgExpDel:async el=>{if(!sgW())return;const k=el.dataset.k,e=(D.sgE||{})[k];if(!e)return;if(sgAllocated("e:"+k))return toast("Payments are applied to this cost. Edit those payments first, or set this cost's amount to what's still right.");
  if(L.confirm!=="sgex"+k){L.confirm="sgex"+k;return render(true)}L.confirm=null;await sgRT("exp/"+k).remove();await sgLog(e.trip,"e:"+k,`Deleted shared cost ${e.title}`);L.sgEd=null;toast("Deleted");render(true)},
 /* receipts */
 sgRcUp:async el=>{if(!sgW())return;const t=sgTrip();const f=[...(el.files||[])][0];el.value="";if(!t||!f)return;const v=await sgReadFile(f);if(!v)return;
  const hash=await sgHash(v.data),match=keyList(D.sgRc).find(r=>r.hash===hash);if(match){L.sgDup={v,hash,match};L.sgSec="money";L.sgEd=null;return render(true)}
  toast("Uploading…");try{await sgRcSaveFile(t,v,hash)}catch(e){toast("Upload failed. Check your connection.")}},
 sgRcDupYes:async()=>{const d=L.sgDup,t=sgTrip();L.sgDup=null;if(!d||!t||!sgW())return render(true);try{await sgRcSaveFile(t,d.v,d.hash)}catch(e){toast("Upload failed. Check your connection.")}},
 sgRcDupNo:()=>{L.sgDup=null;toast("Not uploaded");render(true)},
 sgRcGet:async el=>{const k=el.dataset.k,r=(D.sgRc||{})[k];if(!r)return;toast("Opening…");const s=await sgRT("rcBlob/"+k).once("value");const v=s.val();if(!v)return toast("That file is missing");download(r.name||"receipt",plBlob(v))},
 sgRcSave:async el=>{if(!sgW())return;const k=el.dataset.k,r=(D.sgRc||{})[k],t=sgTrip();if(!r||!t)return;const p="sgc_",g=(f,d)=>String(dv(p+f,d!=null?d:r[f]==null?"":r[f])).trim();
  const amt=SG.cents(g("amt",r.amt!=null?SG.plain(r.amt):""));if(isNaN(amt))return toast("Check the amount: numbers only");
  const cost=g("cost"),pay=g("pay");const u={merchant:g("merchant").slice(0,80),date:g("date"),amt,ref:g("ref").slice(0,60),cost:sgCosts(t.k).some(c=>c.key===cost)?cost:"",pay:pay&&(D.sgPay||{})[pay]?pay:"",ok:true};
  await sgRT("rc/"+k).update(u);if(u.pay)await sgRT("pay/"+u.pay+"/rc").set(k);if(r.pay&&r.pay!==u.pay&&(D.sgPay||{})[r.pay]&&D.sgPay[r.pay].rc===k)await sgRT("pay/"+r.pay+"/rc").set("");
  await sgLog(t.k,"rc:"+k,`Checked receipt ${u.merchant||r.name}${amt?" ("+sgM(amt,t)+")":""}`);L.sgEd=null;sgClear(p);toast("Receipt saved");render(true)},
 sgRcDel:async el=>{if(!sgW())return;const k=el.dataset.k,r=(D.sgRc||{})[k];if(!r)return;if(L.confirm!=="sgcx"+k){L.confirm="sgcx"+k;return render(true)}L.confirm=null;
  const ups={["rc/"+k]:null,["rcBlob/"+k]:null};if(r.pay&&(D.sgPay||{})[r.pay]&&D.sgPay[r.pay].rc===k)ups["pay/"+r.pay+"/rc"]="";await sgRT().update(ups);await sgLog(r.trip,"rc:"+k,`Deleted receipt ${r.merchant||r.name}`);L.sgEd=null;toast("Receipt deleted");render(true)},
 /* guest messages */
 sgMsgKind:el=>{L.drafts.sgm_kind=el.value;Object.keys(L.drafts).filter(x=>x.startsWith("sgm_r_")).forEach(x=>delete L.drafts[x]);L.sgOkSig=null;render(true)},
 sgMsgAll:el=>{const t=sgTrip();if(!t)return;sgMem(t.k).forEach(m=>L.drafts["sgm_p_"+m.k]=el.dataset.k);L.sgOkSig=null;render(true)},
 sgMsgOk:()=>{const t=sgTrip();if(!t)return;L.sgOkSig=JSON.stringify(sgMsgOpts(t));render(true)},
 sgSend:async el=>{if(!sgW())return;const t=sgTrip();if(!t)return;const o=sgMsgOpts(t),sig=JSON.stringify(o);if(L.sgOkSig!==sig)return toast("Something changed. Check the messages and approve them again.");
  const mk=el.dataset.k,m=Object.assign({k:mk},(D.sgM||{})[mk]||{});if(!o.to.includes(mk))return;const x=sgMsgBuild(t,m,o);
  if(o.ch==="email"&&(m.noEmail||!m.email))return toast("This person can't be emailed");if(o.ch==="sms"&&(m.noSms||!m.phone))return toast("This person can't be texted");
  const url=o.ch==="email"?`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(x.subj)}&body=${encodeURIComponent(x.body)}`:`sms:${encodeURIComponent(m.phone.replace(/[^\d+]/g,""))}?&body=${encodeURIComponent(x.body)}`;
  await sgRT("msg").push({trip:t.k,mid:mk,ch:o.ch,kind:o.kind,subj:x.subj.slice(0,200),body:x.body.slice(0,4000),sig:sig.length+":"+x.body.length,t:Date.now(),by:sgBy(),status:"opened"});
  await sgLog(t.k,"m:"+mk,`Opened ${o.ch==="sms"?"a text":"an email"} (${SG_MK[o.kind]}) to ${m.name}`);
  if(window.__HMPDEMO){toast("Demo: nothing is sent. In a real portal, your "+(o.ch==="sms"?"texting":"email")+" app opens with this message.");return}
  try{location.href=url}catch(e){toast("Your phone couldn't open the app")}},
 sgMsgSent:async el=>{if(!sgW())return;const k=el.dataset.k,l=(D.sgMsg||{})[k];if(!l)return;await sgRT("msg/"+k+"/status").set("sent");await sgLog(l.trip,"m:"+l.mid,`Marked the message to ${sgName(l.mid)} as sent`);toast("Marked sent")},
 /* export */
 sgExport:async()=>{const t=sgTrip();if(!t)return;try{download(xFile(t.name)+" - Stay and Go.xlsx",await xlsxBlob(sgSheets([t.k])));toast("Downloaded")}catch(e){toast("Couldn't make the download: "+e.message)}}
});

/* Help desk */
HELP.pl.push(
 ["Plan travel for a group","Stay & Go → New trip. Add the reservations, the traveling party, costs and payments for one group, like a destination wedding weekend.","stay","travel trip hotel lodging airbnb rental car flight stay go group weekend destination"],
 ["Book a hotel or rental car","Stay & Go → Booking resources opens each company's own website. Book there, then come back and add the reservation with its confirmation.","stay","book booking hotel car rental avis budget enterprise trivago airbnb hotels.com booking.com link website"],
 ["Track who paid for the trip","Stay & Go → Receipts & payments shows what each traveler owes, has paid and has left, worked out from each cost and payment you record.","stay","split share owe paid balance traveler payment receipt trip money who paid"],
 ["Send guests their travel details","Stay & Go → Guest messages. Choose the guests and what to send, check each message, then open it in your email or texting app. Each guest only gets their own details.","stay","send email text sms guest travel details hotel address check in itinerary reminder"]);
