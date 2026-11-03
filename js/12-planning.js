/* ================= PLANNING WORKSTATION ================= */
/* Everything for the weeks before the party lives under events/<EV>/plan. Big files (inspiration photos, documents) live beside it in planImg / planDoc so the plan itself stays light. */
D.plan={};
const _subPlan=subscribeEvent;
subscribeEvent=function(){_subPlan();if(VIEW==="moderator")ER("plan").on("value",s=>{D.plan=s.val()||{};L.planLoaded=true;renderSoon()})};
const PLN=()=>D.plan||{};
const pad2=n=>String(n).padStart(2,"0");
const plIso=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
function plDate(s){if(!s)return null;const m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s));if(m)return new Date(+m[1],m[2]-1,+m[3]);const t=Date.parse(s);if(isNaN(t))return null;const d=new Date(t);d.setHours(0,0,0,0);return d}
const plToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const plDays=s=>{const d=plDate(s);return d?Math.round((d-plToday())/864e5):null};
const plEvDays=()=>plDays(C().date);
const plAddDays=(s,n)=>{const d=plDate(s);if(!d)return "";d.setDate(d.getDate()+n);return plIso(d)};
const plFmtD=s=>{const d=plDate(s);if(!d)return "";return d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})};
const plWhen=s=>{const n=plDays(s);if(n==null)return "";return n===0?"today":n===1?"tomorrow":n===-1?"yesterday":n<0?`${-n} days ago`:n<14?`in ${n} days`:plFmtD(s)};
const plNum=v=>{const n=parseFloat(String(v==null?"":v).replace(/[^0-9.\-]/g,""));return isNaN(n)?0:n};
const plMoney=v=>{const n=plNum(v);return (n<0?"-$":"$")+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})};
const plHost=()=>!!(L.isAdmin||L.isOwner);
const plMoneyOK=()=>plHost()||!!(PLN().share||{}).money;
const plKey=s=>normName(s).replace(/[.#$\[\]\/]/g,"_").slice(0,80)||"x";
function plItems(list){const o=PLN()[list]||{};const a=Object.keys(o).filter(k=>o[k]&&typeof o[k]==="object").map(k=>Object.assign({k},o[k]));
 const cfg=PL_CFG[list];return a.sort(cfg&&cfg.sort||((x,y)=>(x.t||0)-(y.t||0)))}
const plByDue=(a,b)=>(!!a.done-!!b.done)||((a.due||"9999")<(b.due||"9999")?-1:(a.due||"9999")>(b.due||"9999")?1:(a.t||0)-(b.t||0));
const plHelperName=id=>{const m=(D.mods||{})[id];return m?m.name:""};

/* ---- one schema per list, so adding, editing and deleting work the same everywhere ---- */
const VEND_KINDS=["Venue","Food & catering","Cake & desserts","Drinks & bar","DJ & music","Photo & video","Decor & flowers","Rentals","Entertainment","Hair & makeup","Officiant","Transportation","Other"];
const BUD_CATS=["Venue","Food & drink","Cake & desserts","Decor","Rentals","Entertainment","Favors & gifts","Invitations & paper","Attire","Other"];
const COURSES=["Appetizers","Mains","Sides","Desserts","Drinks"];
const DOC_KINDS=["Contract","Receipt","Venue rules","Permit or insurance","Invoice","Other"];
const PL_CFG={
 tasks:{noun:"to-do",sort:plByDue,check:"done",fields:[
  {k:"title",l:"To-do",req:1,ph:"Book the caterer"},{k:"due",l:"Due",type:"date"},{k:"who",l:"Who's on it",type:"who"},
  {k:"time",l:"Happens on the day at (optional)",type:"time",hint:"Give it a time and it goes into the night's run of show."},{k:"note",l:"Notes",type:"area"}]},
 budget:{noun:"expense",sort:(a,b)=>String(a.cat||"").localeCompare(String(b.cat||""))||(a.t||0)-(b.t||0),fields:[
  {k:"item",l:"What",req:1,ph:"Balloon arch"},{k:"cat",l:"Category",type:"select",opts:BUD_CATS},
  {k:"est",l:"Planned",type:"money"},{k:"spent",l:"Spent so far",type:"money"},{k:"note",l:"Notes",type:"text"}]},
 vendors:{noun:"vendor",sort:(a,b)=>(["Booked","Contacted","Considering"].indexOf(a.status)-["Booked","Contacted","Considering"].indexOf(b.status))||String(a.name).localeCompare(String(b.name)),fields:[
  {k:"name",l:"Business or person",req:1,ph:"Sweet Treats Bakery"},{k:"kind",l:"What they do",type:"select",opts:VEND_KINDS},
  {k:"status",l:"Status",type:"select",opts:["Considering","Contacted","Booked"]},{k:"contact",l:"Contact person"},
  {k:"phone",l:"Phone",type:"tel"},{k:"email",l:"Email",type:"email"},
  {k:"cost",l:"Total cost",type:"money",money:1},{k:"deposit",l:"Deposit",type:"money",money:1},{k:"depDue",l:"Deposit due",type:"date",money:1},{k:"depPaid",l:"Deposit paid",type:"check",money:1},
  {k:"balDue",l:"Balance due",type:"date",money:1},{k:"balPaid",l:"Balance paid",type:"check",money:1},
  {k:"arrive",l:"Arrives on the day at",type:"time",hint:"Goes into the run of show with the day-of handoff."},{k:"note",l:"Notes",type:"area"}]},
 shop:{noun:"item",check:"got",sort:(a,b)=>(!!a.got-!!b.got)||String(a.who||"~").localeCompare(String(b.who||"~"))||(a.t||0)-(b.t||0),fields:[
  {k:"item",l:"Item",req:1,ph:"Paper plates"},{k:"qty",l:"How many",ph:"100"},{k:"who",l:"Who's buying",type:"person"},{k:"where",l:"Where",ph:"Costco"},{k:"cost",l:"Cost",type:"money",money:1}]},
 rentals:{noun:"rental",sort:(a,b)=>(!!a.returned-!!b.returned)||((a.pickup||"9")<(b.pickup||"9")?-1:1),fields:[
  {k:"item",l:"Item",req:1,ph:"6 round tables"},{k:"from",l:"Rented from",type:"vendor"},{k:"qty",l:"How many"},
  {k:"pickup",l:"Pick up or delivery",type:"date"},{k:"ret",l:"Return by",type:"date"},{k:"who",l:"Who's handling it",type:"person"},{k:"cost",l:"Cost",type:"money",money:1},
  {k:"picked",l:"Picked up",type:"check"},{k:"returned",l:"Returned",type:"check"}]},
 dishes:{noun:"dish",sort:(a,b)=>(COURSES.indexOf(a.course)-COURSES.indexOf(b.course))||(a.t||0)-(b.t||0),fields:[
  {k:"dish",l:"Dish or drink",req:1,ph:"Baked mac and cheese"},{k:"course",l:"Course",type:"select",opts:COURSES},
  {k:"from",l:"Who's making or bringing it",type:"person",ph:"Caterer, Aunt Pearl…"},{k:"serves",l:"Serves",type:"num",ph:"40"},
  {k:"contains",l:"Contains",ph:"dairy, gluten",hint:"Allergens. These are checked against guests' dietary needs."}]},
 diet:{noun:"dietary need",fields:[{k:"name",l:"Guest",type:"guest",req:1},{k:"need",l:"Need",req:1,ph:"Peanut allergy, vegetarian…"},{k:"note",l:"Notes"}]},
 tables:{noun:"table",sort:(a,b)=>String(a.name).localeCompare(String(b.name),undefined,{numeric:true}),fields:[{k:"name",l:"Table name",req:1,ph:"Table 1"},{k:"seats",l:"Seats",type:"num",ph:"8"},{k:"note",l:"Notes",ph:"Family, near the cake"}]},
 thanks:{noun:"person to thank",check:"done",fields:[{k:"name",l:"Name",type:"person",req:1},{k:"for",l:"For",ph:"Helped set up, baked the cake…"}]},
 board:{noun:"idea",fields:[{k:"caption",l:"Caption"},{k:"url",l:"Link (optional)",type:"url",ph:"https://"}]}
};

/* ---- generic form and list ---- */
function plWhoOpts(sel){const m=D.mods||{};return `<option value="">Anyone</option>${Object.keys(m).map(id=>`<option value="${id}" ${sel===id?"selected":""}>${esc(m[id].name)}</option>`).join("")}`}
function plPeople(){const s=new Set();Object.values(D.mods||{}).forEach(m=>m&&m.name&&s.add(m.name));try{guestNames().forEach(n=>s.add(n))}catch(e){}return [...s].sort((a,b)=>a.localeCompare(b))}
const plDL=(id,arr)=>`<datalist id="${id}">${arr.map(n=>`<option value="${esc(n)}"></option>`).join("")}</datalist>`;
function plField(list,f,pre,x){const key=`${pre}${list}_${f.k}`,orig=x?x[f.k]:(f.def!=null?f.def:"");const v=dv(key,f.type==="check"?(orig?"1":"0"):(orig==null?"":String(orig)));
 const lab=(inner,wide)=>`<label class="stack tight ${wide?"plwide":""}"><span class="small">${f.l}</span>${inner}${f.hint?`<span class="small muted">${f.hint}</span>`:""}</label>`;
 const ph=f.ph?` placeholder="${esc(f.ph)}"`:"";
 switch(f.type){
  case "check":return `<label class="row small plchk"><input type="checkbox" data-draft="${key}" ${v==="1"?"checked":""}> ${f.l}</label>`;
  case "select":return lab(`<select data-draft="${key}">${f.opts.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`);
  case "who":return lab(`<select data-draft="${key}">${plWhoOpts(v)}</select>`);
  case "area":return lab(`<textarea data-draft="${key}" rows="2"${ph}>${esc(v)}</textarea>`,1);
  case "date":case "time":return lab(`<input type="${f.type}" data-draft="${key}" value="${esc(v)}">`);
  case "money":return lab(`<input type="text" inputmode="decimal" data-draft="${key}" value="${esc(v)}" placeholder="$0">`);
  case "num":return lab(`<input type="text" inputmode="numeric" data-draft="${key}" value="${esc(v)}"${ph}>`);
  case "person":return lab(`<input type="text" list="plPeople" autocomplete="off" data-draft="${key}" value="${esc(v)}"${ph||' placeholder="Name"'}>`);
  case "guest":return lab(`<input type="text" list="plGuests" autocomplete="off" data-draft="${key}" value="${esc(v)}" placeholder="Guest's name">`);
  case "vendor":return lab(`<input type="text" list="plVendors" autocomplete="off" data-draft="${key}" value="${esc(v)}" placeholder="Store or vendor">`);
  default:return lab(`<input type="${f.type||"text"}" data-draft="${key}" value="${esc(v)}"${ph}>`)}}
function plForm(list,pre,x){const cfg=PL_CFG[list];const fs=cfg.fields.filter(f=>!f.money||plMoneyOK());
 return `<div class="grid2 g8 plform">${fs.filter(f=>f.type!=="check").map(f=>plField(list,f,pre,x)).join("")}</div>${fs.some(f=>f.type==="check")?`<div class="row">${fs.filter(f=>f.type==="check").map(f=>plField(list,f,pre,x)).join("")}</div>`:""}`}
function plCollect(list,pre,x){const o={};for(const f of PL_CFG[list].fields){if(f.money&&!plMoneyOK())continue;const key=`${pre}${list}_${f.k}`,orig=x?x[f.k]:"";
  let v=dv(key,f.type==="check"?(orig?"1":"0"):(orig==null?"":String(orig)));
  if(f.type==="check")o[f.k]=v==="1";else if(f.type==="money"||f.type==="num"){v=String(v).trim();o[f.k]=v===""?"":plNum(v)}
  else if(f.type==="select"&&!v)o[f.k]=f.opts[0];else o[f.k]=String(v).trim().slice(0,f.type==="area"?1000:200)}
 return o}
const plClear=(list,pre)=>PL_CFG[list].fields.forEach(f=>delete L.drafts[`${pre}${list}_${f.k}`]);
function plAddBox(list,label,preset){const cfg=PL_CFG[list];if(L.plAdd!==list)return `<button class="btn sm as" data-act="plAddOpen" data-l="${list}">+ ${label||"Add "+(/^[aeiou]/i.test(cfg.noun)?"an ":"a ")+cfg.noun}</button>`;
 return `<div class="pladd stack tight">${plForm(list,"pa_",preset||null)}<div class="row"><button class="btn sm primary" data-act="plAdd" data-l="${list}">Add</button><button class="btn sm" data-act="plAddClose">Cancel</button></div></div>`}
function plEditBox(list,x){return `<div class="pledit stack tight">${plForm(list,"pe_",x)}<div class="row"><button class="btn sm primary" data-act="plSave" data-l="${list}" data-k="${x.k}">Save</button><button class="btn sm" data-act="plEdClose">Cancel</button><span class="grow"></span><button class="btn sm" data-act="plDel" data-l="${list}" data-k="${x.k}">${L.confirm==="pd"+x.k?"Tap again to delete":"Delete"}</button></div></div>`}
/* a row: optional check box, the caller's summary, and Edit; the editor opens in place */
function plRow(list,x,inner,opts){opts=opts||{};const cfg=PL_CFG[list];if(L.plEd&&L.plEd.l===list&&L.plEd.k===x.k)return plEditBox(list,x);
 const ck=cfg.check?`<input type="checkbox" class="plbox" data-act="plTog" data-l="${list}" data-k="${x.k}" data-f="${cfg.check}" ${x[cfg.check]?"checked":""} aria-label="Done">`:(opts.icon?`<span class="gnum">${opts.icon}</span>`:"");
 return `<div class="plrow ${cfg.check&&x[cfg.check]?"dim":""} ${opts.cls||""}">${ck}<div class="mw0 grow">${inner}</div><button class="btn sm" data-act="plEdOpen" data-l="${list}" data-k="${x.k}" aria-label="Edit">Edit</button></div>`}

/* ---- reminders: what needs doing soon ---- */
function plPayments(){const out=[];plItems("vendors").forEach(v=>{
  if(plNum(v.deposit)>0||v.depDue)out.push({v,kind:"Deposit",f:"depPaid",amt:plNum(v.deposit),due:v.depDue||"",paid:!!v.depPaid});
  const bal=Math.max(0,plNum(v.cost)-plNum(v.deposit));if(bal>0||v.balDue)out.push({v,kind:plNum(v.deposit)>0?"Balance":"Payment",f:"balPaid",amt:bal,due:v.balDue||"",paid:!!v.balPaid})});
 return out.sort((a,b)=>(a.paid-b.paid)||((a.due||"9")<(b.due||"9")?-1:1))}
function plReminders(mineOnly){const r=[],ev=plEvDays(),add=(lvl,sec,txt,n)=>r.push({lvl,sec,txt,n:n==null?99:n});
 plItems("tasks").filter(x=>!x.done&&x.due&&(!mineOnly||x.who===L.modId)).forEach(x=>{const n=plDays(x.due);if(n<0)add("bad","time",`<b>${esc(x.title)}</b> was due ${plWhen(x.due)}`,n);else if(n<=7)add(n<=1?"bad":"warn","time",`<b>${esc(x.title)}</b> is due ${plWhen(x.due)}`,n)});
 if(mineOnly)return r.sort((a,b)=>a.n-b.n);
 if(plMoneyOK())plPayments().filter(p=>!p.paid&&p.due).forEach(p=>{const n=plDays(p.due);if(n<=14)add(n<0?"bad":n<=3?"bad":"warn","money",`${p.kind} for <b>${esc(p.v.name)}</b>${p.amt?" ("+plMoney(p.amt)+")":""} ${n<0?"was due "+plWhen(p.due):"is due "+plWhen(p.due)}`,n)});
 plItems("rentals").forEach(x=>{if(!x.picked&&x.pickup){const n=plDays(x.pickup);if(n<=7)add(n<0?"bad":"warn","shop",`Pick up <b>${esc(x.item)}</b> ${plWhen(x.pickup)}`,n)}
  if(!x.returned&&x.ret){const n=plDays(x.ret);if(n<=3)add(n<0?"bad":"warn","shop",`Return <b>${esc(x.item)}</b> ${n<0?"(was due "+plWhen(x.ret)+")":plWhen(x.ret)}`,n)}});
 if(ev!=null&&ev>=0){const unb=plItems("vendors").filter(v=>v.status!=="Booked");if(unb.length&&ev<=45)add(ev<=14?"bad":"warn","vend",`${unb.length} vendor${unb.length===1?" isn't":"s aren't"} booked yet: ${unb.slice(0,3).map(v=>esc(v.name)).join(", ")}${unb.length>3?"…":""}`,ev);
  const need=plItems("shop").filter(x=>!x.got);if(need.length&&ev<=7)add(ev<=2?"bad":"warn","shop",`${need.length} thing${need.length===1?"":"s"} still to buy`,ev);
  const wait=glList().filter(g=>!glConfirmed(g)&&g.rsvp!=="no");if(wait.length&&ev<=21)add("warn","guests",`${wait.length} guest${wait.length===1?" hasn't":"s haven't"} RSVP'd`,ev);
  const tb=plItems("tables");if(tb.length&&ev<=7){const un=plUnseated().length;if(un)add("warn","guests",`${un} guest${un===1?" isn't":"s aren't"} seated yet`,ev)}
  const w=PLN().weather||{};if(w.outdoor==="yes"&&!String(w.backup||"").trim()&&ev<=30)add("warn","wx","Your event is outdoors and there's no rain plan yet",ev)}
 if(ev!=null&&ev<0){const g=giftOn()?giftList().filter(x=>!x.thanked).length:0,o=plItems("thanks").filter(x=>!x.done).length;if(g+o)add("warn","thanks",`${g+o} thank-you${g+o===1?"":"s"} still to send`,0)}
 return r.sort((a,b)=>(a.lvl==="bad"?0:1)-(b.lvl==="bad"?0:1)||a.n-b.n)}
const plBadge=()=>{try{return plReminders(!plHost()&&!!L.modId).filter(x=>x.lvl==="bad").length}catch(e){return 0}};

/* ---- starter checklists by event type (days before the event) ---- */
const PL_BASE=[[90,"Set the budget"],[90,"Make the guest list"],[84,"Book the venue"],[70,"Pick a theme and colors"],[60,"Book food or a caterer"],[56,"Send invitations"],[45,"Book rentals (tables, chairs, linens)"],[30,"Plan the menu and drinks"],[30,"Pick games and activities in Host Mode"],[21,"Order decorations"],[14,"Follow up on RSVPs"],[10,"Give the caterer a final headcount"],[7,"Make the seating chart"],[7,"Buy everything on the shopping list"],[3,"Confirm every vendor's arrival time"],[2,"Pick up rentals"],[1,"Pack a day-of kit (tape, scissors, pens, lighter, chargers)"],[1,"Test the big screen and the Host Mode links"],[0,"Set up decorations"],[-1,"Return rentals"],[-7,"Send thank-you notes"]];
const PL_TYPE={
 baby:[[60,"Set up the baby registry"],[45,"Plan the reveal, raffle and games"],[21,"Buy favors for guests"],[10,"Order the cake"],[0,"Set up the gift table and gift log"]],
 wedding:[[365,"Set the date and budget"],[330,"Book the venue"],[300,"Book the officiant"],[270,"Book the photographer"],[240,"Choose the wedding party"],[210,"Shop for the dress and attire"],[180,"Send save-the-dates"],[90,"Book hair and makeup"],[70,"Send invitations"],[45,"Get the marriage license"],[30,"Final fitting"],[14,"Write vows and toasts"],[2,"Rehearsal and rehearsal dinner"]],
 engagement:[[30,"Ask someone to give a toast"],[14,"Make a photo slideshow (Presentations tab)"],[7,"Order the cake"]],
 anniversary:[[45,"Gather old photos for a slideshow"],[21,"Ask guests to share a memory"],[7,"Order the cake"]],
 birthday:[[30,"Choose the cake"],[14,"Plan the toast or surprise"],[7,"Order the cake"],[3,"Buy candles and party favors"]],
 reunion:[[180,"Pick a date most of the family can make"],[150,"Collect everyone's contact info"],[90,"Order matching T-shirts"],[45,"Make a family tree or history display"],[14,"Assign potluck dishes"]],
 corporate:[[60,"Get the budget approved"],[45,"Book AV and a microphone"],[30,"Finalize the agenda and speakers"],[14,"Order name badges"],[5,"Send attendees a reminder"]],
 other:[]};
function plTemplate(){const type=evType();const m={};PL_BASE.forEach(([d,t])=>m[t]=d);(PL_TYPE[type]||[]).forEach(([d,t])=>m[t]=d);
 if(type==="wedding"){delete m["Book the venue"];m["Book the venue"]=330;delete m["Send invitations"];m["Send invitations"]=70}
 return Object.keys(m).map(t=>({title:t,days:m[t]})).sort((a,b)=>b.days-a.days)}
function plTplDue(days){const d=C().date;if(!plDate(d))return "";let due=plAddDays(d,-days);const ev=plEvDays();
 if(plDays(due)<0&&days>=0)due=plIso(new Date(Math.min(plDate(d).getTime(),plToday().getTime()+3*864e5)));return due}

/* ---- the day-of handoff: timed to-dos and vendor arrivals become run-of-show steps ---- */
function plHandoff(){const sent=new Set(Object.values(C().ros||{}).map(x=>x&&x.src).filter(Boolean));const out=[];
 plItems("tasks").filter(x=>x.time).forEach(x=>out.push({src:"task:"+x.k,time:x.time,title:x.title,note:x.note||"",who:x.who||""}));
 plItems("vendors").filter(v=>v.arrive&&v.status!=="Considering").forEach(v=>out.push({src:"vend:"+v.k,time:v.arrive,title:`${v.name} arrives`,note:[v.contact,v.phone].filter(Boolean).join(" · "),who:""}));
 plItems("rentals").filter(x=>x.pickup&&x.pickup===C().date&&!x.picked).forEach(x=>out.push({src:"rent:"+x.k,time:"",title:`Rentals: ${x.item}`,note:x.from||"",who:""}));
 return out.map(x=>Object.assign(x,{sent:sent.has(x.src)})).sort((a,b)=>(a.time||"99")<(b.time||"99")?-1:1)}
function plHandoffCard(){const h=plHandoff(),todo=h.filter(x=>!x.sent);
 return `<section class="card stack"><div class="row between"><h3 class="m0">Day-of handoff</h3><span class="pill ${todo.length?"warn":"ok"}">${h.length-todo.length} of ${h.length} in the run of show</span></div>
 <p class="small muted m0">To-dos with a time on the day, and vendor arrival times, become steps in the night's run of show on the Tonight tab, with the same teammate assigned.</p>
 ${h.length?`<div class="stack tight">${h.map(x=>`<div class="plrow ${x.sent?"dim":""}"><span class="gnum">${x.sent?"✓":"·"}</span><div class="mw0 grow"><b>${esc(fmtTime(x.time)||"Any time")}</b> ${esc(x.title)}${x.who?` <span class="pill">${esc(plHelperName(x.who))}</span>`:""}</div></div>`).join("")}</div>
 <div class="row">${todo.length?`<button class="btn sm primary" data-act="plHand">Send ${todo.length} to the run of show</button>`:""}<button class="btn sm" data-act="mtab" data-k="tonight">Open the run of show</button></div>`:'<p class="small muted m0">Nothing timed yet. Give a to-do a time on the day, or a vendor an arrival time.</p>'}</section>`}

/* ---- calendar file so phones remind you ---- */
function plICS(){const ev=C(),rows=[],stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
 const icsEsc=s=>String(s||"").replace(/\\/g,"\\\\").replace(/[,;]/g,m=>"\\"+m).replace(/\n/g,"\\n");
 const add=(uid,date,title,desc)=>{const d=plDate(date);if(!d)return;const e=new Date(d);e.setDate(e.getDate()+1);
  rows.push("BEGIN:VEVENT",`UID:${uid}@hostmode`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${plIso(d).replace(/-/g,"")}`,`DTEND;VALUE=DATE:${plIso(e).replace(/-/g,"")}`,`SUMMARY:${icsEsc(title)}`,desc?`DESCRIPTION:${icsEsc(desc)}`:"","BEGIN:VALARM","TRIGGER:-PT15H","ACTION:DISPLAY",`DESCRIPTION:${icsEsc(title)}`,"END:VALARM","END:VEVENT")};
 const mine=!plHost()&&L.modId;
 plItems("tasks").filter(x=>!x.done&&x.due&&(!mine||x.who===L.modId)).forEach(x=>add("t"+x.k,x.due,x.title,(ev.title||"")+(x.note?"\n"+x.note:"")));
 if(!mine){if(plMoneyOK())plPayments().filter(p=>!p.paid&&p.due).forEach(p=>add("p"+p.v.k+p.f,p.due,`${p.kind} due: ${p.v.name}${p.amt?" "+plMoney(p.amt):""}`,ev.title||""));
  plItems("rentals").forEach(x=>{if(!x.picked&&x.pickup)add("rp"+x.k,x.pickup,"Pick up rentals: "+x.item,x.from||"");if(!x.returned&&x.ret)add("rr"+x.k,x.ret,"Return rentals: "+x.item,x.from||"")})}
 if(!rows.length)return null;
 return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Host Mode//Plan//EN","CALSCALE:GREGORIAN",`X-WR-CALNAME:${icsEsc((ev.title||"Event")+" plan")}`].concat(rows.filter(Boolean)).concat(["END:VCALENDAR"]).join("\r\n")}

/* ---- guests and seating ---- */
function plGuestStats(){const all=glList();let yes=0,wait=0,no=0,here=0;all.forEach(g=>{const n=Math.max(1,glMembers(g).length);if(g.rsvp==="no")no+=n;else if(glConfirmed(g))yes+=n;else wait+=n;if(g.arrived)here+=n});return {rows:all.length,yes,wait,no,here}}
function plConfirmedNames(){const out=[];glList().filter(g=>glConfirmed(g)&&g.rsvp!=="no").sort((a,b)=>(a.t||0)-(b.t||0)).forEach(g=>glMembers(g).forEach(m=>out.push(m)));return out}
function plSeatMap(){return PLN().seats||{}}
function plUnseated(){const s=plSeatMap(),tb=PLN().tables||{};const on=new Set(Object.values(s).filter(x=>x&&tb[x.tb]).map(x=>normName(x.n)));return plConfirmedNames().filter(n=>!on.has(normName(n)))}
function plTableGuests(tk){const s=plSeatMap();return Object.keys(s).filter(k=>s[k]&&s[k].tb===tk).map(k=>Object.assign({key:k},s[k])).sort((a,b)=>(a.t||0)-(b.t||0))}

/* ---- food ---- */
const PL_ALLERGY={nut:["nut","peanut","almond","pecan","walnut","cashew","pistachio"],dairy:["dairy","milk","cheese","lactose","butter","cream"],gluten:["gluten","wheat","celiac","coeliac","flour","bread"],shellfish:["shellfish","shrimp","crab","lobster","crawfish"],fish:["fish","salmon","tuna"],egg:["egg"],soy:["soy"],pork:["pork","bacon","ham","sausage"],meat:["vegetarian","vegan","meat","chicken","beef","pork","turkey"]};
function plClash(dish,need){const c=normName(dish.contains+" "+dish.dish),n=normName(need.need);const hits=[];
 for(const k in PL_ALLERGY){const w=PL_ALLERGY[k];if(k==="meat"){if(/vegetarian|vegan/.test(n)&&/chicken|beef|pork|turkey|meat|bacon|ham|sausage|shrimp|fish|wings|ribs/.test(c))hits.push("meat");continue}
  if(w.some(x=>n.includes(x))&&w.some(x=>c.includes(x)))hits.push(k)}
 if(/vegan/.test(n)&&/dairy|cheese|milk|egg|butter|honey/.test(c)&&!hits.includes("dairy"))hits.push("animal products");return hits}
function plFoodText(){const gs=plGuestStats(),extra=plNum((PLN().food||{}).extra||10),head=Math.ceil(gs.yes*(1+extra/100));
 const lines=[`${C().title||"Event"}${C().date?" · "+plFmtD(C().date):""}`,`Headcount: ${gs.yes} confirmed${gs.wait?`, ${gs.wait} still waiting on`:""}. Plan for ${head}.`,""];
 const ds=plItems("dishes");if(ds.length){lines.push("Menu:");COURSES.forEach(c=>{const l=ds.filter(d=>(d.course||COURSES[0])===c);if(l.length)lines.push(`${c}: `+l.map(d=>d.dish+(d.serves?` (serves ${d.serves})`:"")+(d.contains?` [contains ${d.contains}]`:"")).join("; "))});lines.push("")}
 const di=plItems("diet");if(di.length){lines.push("Dietary needs:");di.forEach(x=>lines.push(`- ${x.name}: ${x.need}${x.note?" ("+x.note+")":""}`))}
 return lines.join("\n")}

/* ---- weather (Open-Meteo, free, no key; forecasts reach about 16 days out) ---- */
const WX_CODE=c=>c==null?["",""]:c===0?["☀️","Clear"]:c<=2?["🌤️","Partly cloudy"]:c===3?["☁️","Cloudy"]:c<=48?["🌫️","Fog"]:c<=57?["🌦️","Drizzle"]:c<=67?["🌧️","Rain"]:c<=77?["🌨️","Snow"]:c<=82?["🌧️","Showers"]:c<=86?["🌨️","Snow showers"]:["⛈️","Thunderstorms"];
async function plWxFetch(force){const w=PLN().weather||{},place=String(w.place||"").trim(),date=C().date,d=plDate(date);if(!place||!d)return;
 const key=place+"|"+plIso(d);if(!force&&L.plWx&&L.plWx.key===key&&(L.plWx.busy||Date.now()-L.plWx.at<36e5))return;
 const n=plDays(date);if(n<0||n>15){L.plWx={key,at:Date.now(),far:true};renderSoon();return}
 L.plWx={key,at:Date.now(),busy:true};renderSoon();
 try{const g=await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name="+encodeURIComponent(place.split(",")[0].trim()))).json();
  const loc=(g.results||[])[0];if(!loc)throw new Error("place");
  const f=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&start_date=${plIso(d)}&end_date=${plIso(d)}`)).json();
  const dd=f.daily||{};L.plWx={key,at:Date.now(),place:[loc.name,loc.admin1].filter(Boolean).join(", "),code:(dd.weather_code||[])[0],hi:(dd.temperature_2m_max||[])[0],lo:(dd.temperature_2m_min||[])[0],rain:(dd.precipitation_probability_max||[])[0],wind:(dd.wind_speed_10m_max||[])[0]}}
 catch(e){L.plWx={key,at:Date.now(),err:e.message==="place"?"We couldn't find that place. Try the city and state.":"The forecast couldn't load. Check your connection and try again."}}
 render()}

/* ================= the sections ================= */
const PL_SECS=[["over","Overview"],["time","To-dos"],["money","Budget"],["vend","Vendors"],["guests","Guests & seating"],["food","Food"],["shop","Shopping & rentals"],["board","Inspiration"],["docs","Documents"],["wx","Weather"],["notes","Notes"],["thanks","Thank-yous"]];
function mPlan(){if(!L.plSec)L.plSec="over";const sec=L.plSec;
 const secs=PL_SECS.filter(([k])=>plMoneyOK()||!(k==="docs"));
 const chips=`<nav class="plchips" aria-label="Planning sections">${secs.map(([k,l])=>`<button class="plchip" data-act="plSec" data-k="${k}" aria-pressed="${sec===k}">${l}</button>`).join("")}</nav>`;
 const lists=`${plDL("plPeople",plPeople())}${plDL("plGuests",plConfirmedNames())}${plDL("plVendors",plItems("vendors").map(v=>v.name))}`;
 const f={over:plOverview,time:plTimeline,money:plBudget,vend:plVendors,guests:plGuests,food:plFood,shop:plShop,board:plBoard,docs:plDocs,wx:plWeather,notes:plNotes,thanks:plThanks}[sec]||plOverview;
 return `<div class="stack plan">${chips}${f()}${lists}</div>`}

function plOverview(){const c=C(),n=plEvDays(),host=plHost(),mine=!host&&L.modId;
 let cd;if(n==null)cd=`<section class="card stack plcount"><h2 class="m0">When is it?</h2><p class="small muted m0">Add the date and the countdown, due dates and reminders all line up with it.</p><div class="row"><input type="date" data-draft="pl_evdate" value="${esc(dv("pl_evdate",""))}"><button class="btn sm primary" data-act="plSetDate">Save the date</button></div></section>`;
 else cd=`<section class="card plcount gilt"><div class="plbig">${n>0?n:n===0?"🎉":Math.abs(n)}</div><div class="mw0"><div class="eyebrow">${n>1?"days to go":n===1?"day to go":n===0?"It's today":"days ago"}</div><h2 class="m0">${esc(c.title||"Your event")}</h2><div class="small muted">${esc(plFmtD(c.date))}${n>=0&&n<=7?` · ${Math.max(0,n)*24+(24-new Date().getHours())} hours`:""}</div></div></section>`;
 const today=n===0?`<section class="card row between"><span><b>It's party day.</b> The run of show and guest check-in are on the Tonight tab.</span><button class="btn sm primary" data-act="mtab" data-k="tonight">Open Tonight</button></section>`:"";
 const rem=plReminders(!!mine);
 const remCard=`<section class="card stack"><div class="row between"><h3 class="m0">${mine?"Your reminders":"Coming up"}</h3>${rem.length?`<span class="pill ${rem.some(x=>x.lvl==="bad")?"bad":"warn"}">${rem.length}</span>`:""}</div>
  ${rem.length?`<div class="stack tight">${rem.slice(0,10).map(x=>`<button class="plrem ${x.lvl}" data-act="plSec" data-k="${x.sec}"><span class="pldot"></span><span class="mw0">${x.txt}</span><span class="muted">›</span></button>`).join("")}</div>`:`<p class="small muted m0">${n==null?"Nothing yet. Add your date and a few to-dos.":"Nothing urgent. You're on track."}</p>`}
  <div class="row"><button class="btn sm" data-act="plICS">Add deadlines to my calendar</button><span class="small muted">Your phone reminds you the evening before each one.</span></div></section>`;
 const tasks=plItems("tasks"),myT=tasks.filter(x=>!x.done&&L.modId&&x.who===L.modId);
 const my=L.modId&&(myT.length||mine)?`<section class="card stack"><div class="row between"><h3 class="m0">Your to-dos</h3><span class="pill">${myT.length}</span></div>${myT.length?`<div class="stack tight">${myT.slice(0,6).map(x=>plTaskRow(x)).join("")}</div>`:'<p class="small muted m0">Nothing assigned to you right now.</p>'}</section>`:"";
 if(mine)return cd+today+my+remCard;
 const td=tasks.filter(x=>x.done).length,gs=plGuestStats(),cap=plNum(PLN().capacity),vs=plItems("vendors"),vb=vs.filter(v=>v.status==="Booked").length,sh=plItems("shop"),shg=sh.filter(x=>x.got).length;
 const tot=plBudgetTotals();
 const tile=(sec,lab,val,sub,pct,warn)=>`<button class="pltile" data-act="plSec" data-k="${sec}"><span class="small muted">${lab}</span><b>${val}</b>${pct!=null?`<span class="bar ${warn?"warnbar":""}"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></span>`:""}<span class="small muted">${sub}</span></button>`;
 const tiles=`<div class="pltiles">${tile("time","To-dos",`${td} of ${tasks.length}`,tasks.length?"done":"Add your first to-do",tasks.length?td/tasks.length*100:null)}
  ${plMoneyOK()?tile("money","Budget",tot.budget?plMoney(tot.spent):plMoney(tot.planned),tot.budget?`spent of ${plMoney(tot.budget)}${tot.planned>tot.budget?" · over plan":""}`:"planned",tot.budget?tot.spent/tot.budget*100:null,tot.planned>tot.budget&&tot.budget>0):""}
  ${tile("guests","Guests",`${gs.yes}`,gs.rows?`confirmed${cap?` of ${cap} capacity`:""}${gs.wait?` · ${gs.wait} waiting`:""}`:"Import your guest list",cap?gs.yes/cap*100:null,cap&&gs.yes>cap)}
  ${tile("vend","Vendors",`${vb} of ${vs.length}`,vs.length?"booked":"Add vendors",vs.length?vb/vs.length*100:null)}
  ${tile("shop","Shopping",`${shg} of ${sh.length}`,sh.length?"bought":"Start a list",sh.length?shg/sh.length*100:null)}
  ${n!=null&&n<0?tile("thanks","Thank-yous",`${plThanksAll().filter(x=>x.done).length} of ${plThanksAll().length}`,"sent",plThanksAll().length?plThanksAll().filter(x=>x.done).length/plThanksAll().length*100:null):""}</div>`;
 const start=!tasks.length?`<section class="card row between"><span><b>New here?</b> Start with a ${esc((EVENT_TYPES[evType()]||{}).label||"party").toLowerCase()} checklist with due dates worked out from your date.</span><button class="btn sm primary" data-act="plGo" data-k="time">See the checklist</button></section>`:"";
 const hand=n!=null&&n>=0&&n<=7?plHandoffCard():"";
 return cd+today+start+remCard+my+tiles+hand}

function plTaskRow(x){const n=x.due?plDays(x.due):null;const late=!x.done&&n!=null&&n<0,soon=!x.done&&n!=null&&n>=0&&n<=3;
 return plRow("tasks",x,`<b>${esc(x.title)}</b><div class="small muted plmeta">${x.due?`<span class="${late?"bad":soon?"plsoon":""}">${late?"Overdue · ":""}${esc(plWhen(x.due))}</span>`:""}${x.who?`<span class="pill">${esc(plHelperName(x.who)||"Teammate")}</span>`:""}${x.time?`<span>On the day at ${esc(fmtTime(x.time))}</span>`:""}${x.note?`<span>${esc(x.note)}</span>`:""}</div>`)}

function plTimeline(){const host=plHost(),all=plItems("tasks");const f=L.plTF||(!host&&L.modId?"mine":"open");
 const show=all.filter(x=>f==="all"||f==="open"&&!x.done||f==="done"&&x.done||f==="mine"&&x.who===L.modId);
 const fb=(k,l)=>`<button class="btn sm ${f===k?"primary":""}" data-act="plTF" data-k="${k}">${l}</button>`;
 const groups=[["Overdue",x=>!x.done&&x.due&&plDays(x.due)<0],["This week",x=>!x.done&&x.due&&plDays(x.due)>=0&&plDays(x.due)<=7],["This month",x=>!x.done&&x.due&&plDays(x.due)>7&&plDays(x.due)<=31],["Later",x=>!x.done&&x.due&&plDays(x.due)>31],["No date",x=>!x.done&&!x.due],["Done",x=>x.done]];
 const used=new Set();const body=groups.map(([l,t])=>{const g=show.filter(x=>!used.has(x.k)&&t(x));g.forEach(x=>used.add(x.k));return g.length?`<div class="stack tight"><div class="eyebrow ${l==="Overdue"?"bad":""}">${l} · ${g.length}</div>${g.map(plTaskRow).join("")}</div>`:""}).join("");
 const d=all.filter(x=>x.done).length;
 return `<section class="card stack"><div class="row between"><h2 class="m0">To-dos</h2><span class="pill gold">${d} of ${all.length} done</span></div>
 ${all.length?`<span class="bar"><i style="width:${all.length?d/all.length*100:0}%"></i></span>`:""}
 <div class="row">${L.modId?fb("mine","Mine"):""}${fb("open","To do")}${fb("done","Done")}${fb("all","All")}</div>
 ${body||`<p class="small muted m0">${f==="mine"?"Nothing assigned to you.":f==="done"?"Nothing ticked off yet.":"No to-dos yet."}</p>`}
 ${plAddBox("tasks")}</section>${plTemplateCard()}${plHandoffCard()}`}

function plTemplateCard(){const tpl=plTemplate(),have=new Set(plItems("tasks").map(x=>normName(x.title)));const fresh=tpl.filter(x=>!have.has(normName(x.title)));
 const label=(EVENT_TYPES[evType()]||{}).label||"Party";const open=L.plTpl||!plItems("tasks").length;
 if(!fresh.length)return "";
 if(!open)return `<section class="card row between"><span class="small">The ${esc(label.toLowerCase())} checklist has ${fresh.length} more suggestion${fresh.length===1?"":"s"}.</span><button class="btn sm" data-act="plTplOpen">Show them</button></section>`;
 const noDate=!plDate(C().date);
 return `<section class="card stack"><h3 class="m0">Starter checklist: ${esc(label)}</h3>
 <p class="small muted m0">${noDate?"Add your event date on the Overview and these get due dates too.":"Due dates are worked out from your event date. Anything already past is set for this week, so untick what you've already done."}</p>
 <div class="stack tight">${fresh.map((x,i)=>{const due=plTplDue(x.days);return `<label class="plrow pltpl"><input type="checkbox" data-draft="pltpl_${i}" ${dv("pltpl_"+i,"1")==="1"?"checked":""}><span class="mw0 grow">${esc(x.title)}</span><span class="small muted">${due?esc(plFmtD(due)):x.days>0?x.days+" days before":x.days<0?-x.days+" days after":"On the day"}</span></label>`}).join("")}</div>
 <div class="row"><button class="btn sm primary" data-act="plTplAdd">Add the ticked ones</button>${plItems("tasks").length?`<button class="btn sm" data-act="plTplClose">Hide</button>`:""}</div></section>`}

function plBudgetTotals(){const b=plItems("budget"),v=plItems("vendors").filter(x=>x.status!=="Considering"),s=plItems("shop"),r=plItems("rentals");
 let planned=0,spent=0;b.forEach(x=>{planned+=plNum(x.est)||plNum(x.spent);spent+=plNum(x.spent)});
 v.forEach(x=>{planned+=plNum(x.cost);if(x.depPaid)spent+=plNum(x.deposit);if(x.balPaid)spent+=Math.max(0,plNum(x.cost)-plNum(x.deposit))});
 s.forEach(x=>{planned+=plNum(x.cost);if(x.got)spent+=plNum(x.cost)});r.forEach(x=>{planned+=plNum(x.cost);if(x.picked)spent+=plNum(x.cost)});
 return {budget:plNum(PLN().budgetTotal),planned,spent}}
function plBudget(){if(!plMoneyOK())return `<section class="card"><p class="m0">The host keeps the budget private.</p></section>`;
 const t=plBudgetTotals(),left=t.budget-t.planned;
 const byCat={};const addC=(c,p,s)=>{byCat[c]=byCat[c]||{p:0,s:0};byCat[c].p+=p;byCat[c].s+=s};
 plItems("budget").forEach(x=>addC(x.cat||"Other",plNum(x.est)||plNum(x.spent),plNum(x.spent)));
 plItems("vendors").filter(x=>x.status!=="Considering").forEach(x=>addC("Vendors",plNum(x.cost),(x.depPaid?plNum(x.deposit):0)+(x.balPaid?Math.max(0,plNum(x.cost)-plNum(x.deposit)):0)));
 plItems("shop").forEach(x=>plNum(x.cost)&&addC("Shopping",plNum(x.cost),x.got?plNum(x.cost):0));plItems("rentals").forEach(x=>plNum(x.cost)&&addC("Rentals",plNum(x.cost),x.picked?plNum(x.cost):0));
 const max=Math.max(1,...Object.values(byCat).map(x=>x.p));
 const pays=plPayments();
 const sum=`<section class="card stack"><div class="row between"><h2 class="m0">Budget</h2>${t.budget?`<span class="pill ${left<0?"bad":"ok"}">${left<0?plMoney(-left)+" over":plMoney(left)+" left to plan"}</span>`:""}</div>
 <div class="row"><label class="stack tight"><span class="small">Total budget</span><input type="text" inputmode="decimal" data-draft="pl_btot" value="${esc(dv("pl_btot",PLN().budgetTotal||""))}" placeholder="$0" style="max-width:160px"></label><button class="btn sm as" data-act="plBTot">Save</button></div>
 <div class="plstats"><div><span class="small muted">Planned</span><b>${plMoney(t.planned)}</b></div><div><span class="small muted">Spent</span><b>${plMoney(t.spent)}</b></div><div><span class="small muted">Still to pay</span><b>${plMoney(Math.max(0,t.planned-t.spent))}</b></div></div>
 ${t.budget?`<span class="bar ${t.planned>t.budget?"warnbar":""}"><i style="width:${Math.min(100,t.spent/t.budget*100)}%"></i></span>`:""}
 ${Object.keys(byCat).length?`<div class="stack tight">${Object.keys(byCat).sort((a,b)=>byCat[b].p-byCat[a].p).map(c=>`<div class="plcat"><span class="small">${esc(c)}</span><span class="bar"><i style="width:${byCat[c].p/max*100}%"></i></span><span class="small"><b>${plMoney(byCat[c].p)}</b></span></div>`).join("")}</div>`:""}
 <p class="small muted m0">Vendors you've contacted or booked, shopping and rentals count here automatically. Add anything else below.</p>
 ${plHost()?`<label class="row small plshare"><input type="checkbox" data-act="plShareMoney" ${(PLN().share||{}).money?"checked":""}> Let teammates see the budget, payments and documents</label>`:""}</section>`;
 const payCard=`<section class="card stack"><div class="row between"><h3 class="m0">Payments</h3><span class="pill">${pays.filter(p=>p.paid).length} of ${pays.length} paid</span></div>
 ${pays.length?`<div class="stack tight">${pays.map(p=>{const n=p.due?plDays(p.due):null,late=!p.paid&&n!=null&&n<0;return `<div class="plrow ${p.paid?"dim":""}"><input type="checkbox" class="plbox" data-act="plTog" data-l="vendors" data-k="${p.v.k}" data-f="${p.f}" ${p.paid?"checked":""} aria-label="Paid"><div class="mw0 grow"><b>${esc(p.v.name)}</b> · ${p.kind}${p.amt?` <b>${plMoney(p.amt)}</b>`:""}<div class="small ${late?"bad":"muted"}">${p.paid?"Paid":p.due?(late?"Overdue · ":"Due ")+esc(plWhen(p.due)):"No due date"}</div></div></div>`}).join("")}</div>`:'<p class="small muted m0">Add a vendor with a cost, deposit or due date and their payments show up here.</p>'}
 <button class="btn sm as" data-act="plGo" data-k="vend">Go to vendors</button></section>`;
 const items=plItems("budget");
 const itemCard=`<section class="card stack"><h3 class="m0">Other expenses</h3>${items.length?`<div class="stack tight">${items.map(x=>plRow("budget",x,`<b>${esc(x.item)}</b> <span class="pill">${esc(x.cat||"Other")}</span><div class="small muted">${x.est!==""&&x.est!=null?"Planned "+plMoney(x.est):""}${plNum(x.spent)?` · spent ${plMoney(x.spent)}`:""}${x.note?" · "+esc(x.note):""}</div>`)).join("")}</div>`:""}${plAddBox("budget","Add an expense")}</section>`;
 return sum+payCard+itemCard}

function plVendors(){const vs=plItems("vendors"),mo=plMoneyOK();
 const row=v=>plRow("vendors",v,`<div class="row g8"><b>${esc(v.name)}</b><span class="pill ${v.status==="Booked"?"ok":v.status==="Contacted"?"warn":""}">${esc(v.status||"Considering")}</span></div>
  <div class="small muted plmeta"><span>${esc(v.kind||"")}</span>${v.contact?`<span>${esc(v.contact)}</span>`:""}${v.arrive?`<span>Arrives ${esc(fmtTime(v.arrive))}</span>`:""}${mo&&plNum(v.cost)?`<span>${plMoney(v.cost)}${v.balPaid?" · paid":v.depPaid?" · deposit paid":""}</span>`:""}</div>
  ${v.phone||v.email?`<div class="row g8 plcontact">${v.phone?`<a class="btn sm" href="tel:${esc(v.phone.replace(/[^0-9+]/g,""))}">📞 ${esc(v.phone)}</a><a class="btn sm" href="sms:${esc(v.phone.replace(/[^0-9+]/g,""))}">Text</a>`:""}${v.email?`<a class="btn sm" href="mailto:${esc(v.email)}">✉️ Email</a>`:""}</div>`:""}
  ${v.note?`<div class="small">${esc(v.note)}</div>`:""}`);
 const kinds={};vs.forEach(v=>(kinds[v.status||"Considering"]=kinds[v.status||"Considering"]||[]).push(v));
 return `<section class="card stack"><div class="row between"><h2 class="m0">Vendors</h2><span class="pill gold">${vs.filter(v=>v.status==="Booked").length} booked</span></div>
 <p class="small muted m0">Venue, caterer, baker, DJ, photographer… Tap a number to call or text them.${mo?" Costs, deposits and due dates feed the budget and payment reminders.":""}</p>
 ${["Booked","Contacted","Considering"].filter(k=>kinds[k]).map(k=>`<div class="stack tight"><div class="eyebrow">${k} · ${kinds[k].length}</div>${kinds[k].map(row).join("")}</div>`).join("")}
 ${plAddBox("vendors")}</section>`}

function plGuests(){const gs=plGuestStats(),cap=plNum(PLN().capacity),tbs=plItems("tables"),un=plUnseated();
 const count=`<section class="card stack"><div class="row between"><h2 class="m0">Guest count</h2><button class="btn sm" data-act="mtab" data-k="tonight">Manage the guest list</button></div>
 ${gs.rows?`<div class="plstats"><div><span class="small muted">Confirmed</span><b>${gs.yes}</b></div><div><span class="small muted">Awaiting RSVP</span><b>${gs.wait}</b></div><div><span class="small muted">Can't come</span><b>${gs.no}</b></div>${gs.here?`<div><span class="small muted">Checked in</span><b>${gs.here}</b></div>`:""}</div>
  ${cap?`<span class="bar ${gs.yes>cap?"warnbar":""}"><i style="width:${Math.min(100,gs.yes/cap*100)}%"></i></span><p class="small m0 ${gs.yes>cap?"bad":"muted"}">${gs.yes>cap?`${gs.yes-cap} over the venue's capacity of ${cap}`:`${cap-gs.yes} spot${cap-gs.yes===1?"":"s"} left of ${cap}`}${gs.wait?` · if half the waiting guests come: ${gs.yes+Math.ceil(gs.wait/2)}`:""}</p>`:""}
  <p class="small muted m0">Counts come straight from your guest list, so confirming someone on the Tonight tab updates them here.</p>`:`<p class="small muted m0">Import your guest list (Partiful, a spreadsheet, or pasted names) on the Tonight tab and the counts show up here.</p>`}
 <div class="row"><label class="stack tight"><span class="small">Venue capacity</span><input type="text" inputmode="numeric" data-draft="pl_cap" value="${esc(dv("pl_cap",PLN().capacity||""))}" placeholder="80" style="max-width:120px"></label><button class="btn sm as" data-act="plCap">Save</button></div></section>`;
 const seated=plConfirmedNames().length-un.length;
 const tables=tbs.map(tb=>{const g=plTableGuests(tb.k),cap2=plNum(tb.seats);if(L.plEd&&L.plEd.l==="tables"&&L.plEd.k===tb.k)return `<div class="pltable">${plEditBox("tables",tb)}</div>`;
  return `<div class="pltable ${cap2&&g.length>cap2?"over":""}"><div class="row between"><b>${esc(tb.name)}</b><span class="row g8"><span class="small ${cap2&&g.length>cap2?"bad":"muted"}">${g.length}${cap2?" / "+cap2:""}</span><button class="btn sm" data-act="plEdOpen" data-l="tables" data-k="${tb.k}">Edit</button></span></div>${tb.note?`<div class="small muted">${esc(tb.note)}</div>`:""}
  <div class="plseats">${g.map(s=>`<span class="plseat">${esc(s.n)}<button data-act="plUnseat" data-k="${esc(s.key)}" aria-label="Remove ${esc(s.n)}">×</button></span>`).join("")||'<span class="small muted">Empty</span>'}</div></div>`}).join("");
 const opts=tbs.map(tb=>`<option value="${tb.k}">${esc(tb.name)}</option>`).join("");
 const seat=`<section class="card stack"><div class="row between"><h2 class="m0">Seating chart</h2>${tbs.length?`<span class="pill ${un.length?"warn":"ok"}">${seated} of ${seated+un.length} seated</span>`:""}</div>
 ${tbs.length?`<div class="pltables">${tables}</div>`:'<p class="small muted m0">Add your tables, then seat guests. Parties and plus-ones stay together when you fill tables automatically.</p>'}
 ${plAddBox("tables")}
 ${tbs.length?`<div class="row"><button class="btn sm" data-act="plTablesN">Add tables in bulk</button>${un.length?`<button class="btn sm primary" data-act="plAutoSeat">Fill tables automatically</button>`:""}<button class="btn sm" data-act="plSeatCopy">Copy the seating chart</button>${seated?`<button class="btn sm" data-act="plSeatClear">${L.confirm==="seatClear"?"Tap again to clear every seat":"Clear seats"}</button>`:""}</div>`:`<button class="btn sm as" data-act="plTablesN">Add tables in bulk</button>`}
 ${L.plBulk?`<div class="row"><input type="text" inputmode="numeric" data-draft="pl_tn" value="${esc(dv("pl_tn","8"))}" style="max-width:70px" aria-label="How many tables"><span class="small">tables of</span><input type="text" inputmode="numeric" data-draft="pl_ts" value="${esc(dv("pl_ts","8"))}" style="max-width:70px" aria-label="Seats per table"><span class="small">seats</span><button class="btn sm primary" data-act="plTablesAdd">Add</button></div>`:""}
 ${tbs.length&&un.length?`<details ${L.plUnOpen?"open":""}><summary class="small" data-act="plUnToggle"><b>Not seated yet · ${un.length}</b></summary><div class="stack tight">${un.map(nm=>`<div class="plrow"><span class="mw0 grow">${esc(nm)}</span><select data-act="plSeat" data-n="${esc(nm)}" aria-label="Seat ${esc(nm)}"><option value="">Seat at…</option>${opts}</select></div>`).join("")}</div></details>`:""}
 ${tbs.length?`<div class="row"><input type="text" class="grow" list="plPeople" data-draft="pl_seatname" value="${esc(dv("pl_seatname",""))}" placeholder="Someone not on the list"><select data-draft="pl_seattb"><option value="">Table…</option>${tbs.map(tb=>`<option value="${tb.k}" ${dv("pl_seattb","")===tb.k?"selected":""}>${esc(tb.name)}</option>`).join("")}</select><button class="btn sm" data-act="plSeatAdd">Seat</button></div>`:""}</section>`;
 return count+seat}

function plFood(){const gs=plGuestStats(),food=PLN().food||{},extra=food.extra==null||food.extra===""?10:plNum(food.extra),head=Math.ceil(gs.yes*(1+extra/100));
 const ds=plItems("dishes"),di=plItems("diet");
 const head1=`<section class="card stack"><div class="row between"><h2 class="m0">Menu & catering</h2><span class="pill gold">Plan for ${head}</span></div>
 <p class="small muted m0">${gs.yes} confirmed guest${gs.yes===1?"":"s"} plus ${extra}% extra${gs.wait?`, ${gs.wait} still ${gs.wait===1?"hasn't":"haven't"} answered`:""}.</p>
 <div class="row"><label class="stack tight"><span class="small">Extra to plan for (%)</span><input type="text" inputmode="numeric" data-draft="pl_extra" value="${esc(dv("pl_extra",String(extra)))}" style="max-width:90px"></label><button class="btn sm as" data-act="plExtra">Save</button></div>
 ${COURSES.map(c=>{const l=ds.filter(d=>(d.course||COURSES[0])===c);if(!l.length)return "";const sv=l.reduce((a,d)=>a+plNum(d.serves),0);
  return `<div class="stack tight"><div class="row between"><span class="eyebrow">${c}</span>${sv?`<span class="small ${sv<head?"plsoon":"muted"}">serves ${sv}${sv<head?` · ${head-sv} short`:""}</span>`:""}</div>${l.map(d=>{const cl=di.map(n=>({n,h:plClash(d,n)})).filter(x=>x.h.length);
   return plRow("dishes",d,`<b>${esc(d.dish)}</b><div class="small muted plmeta">${d.from?`<span>${esc(d.from)}</span>`:""}${d.serves?`<span>Serves ${esc(d.serves)}</span>`:""}${d.contains?`<span>Contains ${esc(d.contains)}</span>`:""}</div>${cl.length?`<div class="small bad">⚠ Check with ${cl.map(x=>`${esc(x.n.name)} (${esc(x.n.need)})`).join(", ")}</div>`:""}`)}).join("")}</div>`}).join("")}
 ${plAddBox("dishes")}
 <div class="row"><button class="btn sm" data-act="plFoodCopy">Copy for the caterer</button></div></section>`;
 const diet=`<section class="card stack"><div class="row between"><h3 class="m0">Dietary needs & allergies</h3><span class="pill">${di.length}</span></div>
 <p class="small muted m0">Dishes whose ingredients clash with someone's needs get flagged above.</p>
 ${di.length?`<div class="stack tight">${di.map(x=>plRow("diet",x,`<b>${esc(x.name)}</b> · ${esc(x.need)}${x.note?`<div class="small muted">${esc(x.note)}</div>`:""}`,{icon:"🍽️"})).join("")}</div>`:""}
 ${plAddBox("diet")}</section>`;
 return head1+diet}

function plShop(){const sh=plItems("shop"),re=plItems("rentals"),mo=plMoneyOK();const by={};sh.filter(x=>!x.got).forEach(x=>(by[x.who||"Not assigned"]=by[x.who||"Not assigned"]||[]).push(x));const got=sh.filter(x=>x.got);
 const sRow=x=>plRow("shop",x,`<b>${esc(x.item)}</b>${x.qty?` <span class="muted">× ${esc(x.qty)}</span>`:""}<div class="small muted plmeta">${x.where?`<span>${esc(x.where)}</span>`:""}${mo&&plNum(x.cost)?`<span>${plMoney(x.cost)}</span>`:""}</div>`);
 const shop=`<section class="card stack"><div class="row between"><h2 class="m0">Shopping & supplies</h2><span class="pill gold">${got.length} of ${sh.length} bought</span></div>
 <p class="small muted m0">Put a name on each item so everyone knows who's buying what. Tick it off once it's bought.</p>
 ${Object.keys(by).sort((a,b)=>a==="Not assigned"?1:b==="Not assigned"?-1:a.localeCompare(b)).map(w=>`<div class="stack tight"><div class="eyebrow">${esc(w)} · ${by[w].length}</div>${by[w].map(sRow).join("")}</div>`).join("")}
 ${got.length?`<details><summary class="small"><b>Bought · ${got.length}</b></summary><div class="stack tight">${got.map(sRow).join("")}</div></details>`:""}
 ${plAddBox("shop")}${sh.length?`<button class="btn sm as" data-act="plShopCopy">Copy the list</button>`:""}</section>`;
 const rent=`<section class="card stack"><div class="row between"><h2 class="m0">Rentals</h2><span class="pill">${re.filter(x=>x.returned).length} of ${re.length} returned</span></div>
 <p class="small muted m0">Tables, chairs, linens, a bounce house… Pickup and return dates show up in your reminders.</p>
 ${re.length?`<div class="stack tight">${re.map(x=>plRow("rentals",x,`<b>${esc(x.item)}</b>${x.qty?` <span class="muted">× ${esc(x.qty)}</span>`:""}<div class="small muted plmeta">${x.from?`<span>${esc(x.from)}</span>`:""}${x.pickup?`<span class="${!x.picked&&plDays(x.pickup)<0?"bad":""}">${x.picked?"✓ Picked up":"Pick up "+esc(plWhen(x.pickup))}</span>`:""}${x.ret?`<span class="${!x.returned&&plDays(x.ret)<0?"bad":""}">${x.returned?"✓ Returned":"Return "+esc(plWhen(x.ret))}</span>`:""}${x.who?`<span>${esc(x.who)}</span>`:""}${mo&&plNum(x.cost)?`<span>${plMoney(x.cost)}</span>`:""}</div>
  <div class="row g8">${x.picked?"":`<button class="btn sm" data-act="plSet" data-l="rentals" data-k="${x.k}" data-f="picked">Picked up</button>`}${x.picked&&!x.returned?`<button class="btn sm" data-act="plSet" data-l="rentals" data-k="${x.k}" data-f="returned">Returned</button>`:""}</div>`,{icon:x.returned?"✓":"📦",cls:x.returned?"dim":""})).join("")}</div>`:""}
 ${plAddBox("rentals")}</section>`;
 return shop+rent}

/* inspiration: photos, links and a color palette */
const PLI={thumb:{},pend:{}};
function plBoard(){const items=plItems("board"),cols=(PLN().colors||[]).filter(Boolean);
 const pal=`<section class="card stack"><h2 class="m0">Inspiration</h2>
 <div class="stack tight"><span class="small"><b>Color palette</b></span><div class="row g8 plpal">${cols.map((c,i)=>`<span class="plsw" style="background:${esc(c)}"><button data-act="plColDel" data-i="${i}" aria-label="Remove ${esc(c)}">×</button><span>${esc(c)}</span></span>`).join("")}
  ${cols.length<10?`<label class="plsw add" aria-label="Add a color">+<input type="color" data-draft="pl_col" value="${esc(dv("pl_col","#e8338f"))}"></label><button class="btn sm" data-act="plColAdd">Add this color</button>`:""}</div>
  ${cols.length?`<div class="row"><button class="btn sm" data-act="plColTheme">Use these colors in the app</button></div>`:""}</div>
 <div class="row"><label class="btn sm primary upl">Add photos<input type="file" accept="image/*" multiple data-act="plImgUp"></label>${plAddBox("board","Add a link or note")}</div>
 ${L.plBusy?`<p class="small muted m0">${esc(L.plBusy)}</p>`:""}</section>`;
 const grid=items.length?`<div class="plboard">${items.map(x=>{if(L.plEd&&L.plEd.l==="board"&&L.plEd.k===x.k)return `<div class="pltile2 card">${plEditBox("board",x)}</div>`;
  return `<figure class="pltile2">${x.img?`<button class="plimg" data-act="plImgOpen" data-k="${x.k}">${x.th?`<img src="${esc(x.th)}" alt="${esc(x.caption||"Inspiration photo")}" loading="lazy">`:""}</button>`:x.url?`<a class="pllink" href="${esc(x.url)}" target="_blank" rel="noopener">🔗 ${esc(x.url.replace(/^https?:\/\/(www\.)?/,"").slice(0,40))}</a>`:'<div class="plnote">📝</div>'}
   <figcaption class="row between"><span class="small mw0">${esc(x.caption||"")}</span><button class="btn sm" data-act="plEdOpen" data-l="board" data-k="${x.k}">Edit</button></figcaption></figure>`}).join("")}</div>`:`<section class="card"><p class="small muted m0">Save photos of cakes, balloon arches and tablescapes you love, links to ideas, and your colors, so teammates and vendors see the same vision.</p></section>`;
 const lb=L.plLB?`<button class="lb pllb" data-act="plLBClose" aria-label="Close">${PLI.full&&PLI.full.k===L.plLB?`<img src="${esc(PLI.full.src)}" alt="">`:'<span style="color:#fff">Loading…</span>'}</button>`:"";
 return pal+grid+lb}

/* documents: contracts, receipts, venue rules */
function plDocs(){if(!plMoneyOK())return `<section class="card"><p class="m0">The host keeps documents private.</p></section>`;
 const ds=plItems("docs").sort((a,b)=>(b.t||0)-(a.t||0));const by={};ds.forEach(d=>(by[d.kind||"Other"]=by[d.kind||"Other"]||[]).push(d));
 const kb=dv("pl_dkind",DOC_KINDS[0]);
 return `<section class="card stack"><div class="row between"><h2 class="m0">Documents</h2><span class="pill">${ds.length}</span></div>
 <p class="small muted m0">Contracts, receipts, the venue's rules, permits. Photos of paper copies work too. Files up to 4 MB.</p>
 <div class="row"><select data-draft="pl_dkind" aria-label="Kind of document">${DOC_KINDS.map(k=>`<option ${k===kb?"selected":""}>${k}</option>`).join("")}</select><select data-draft="pl_dvend" aria-label="Vendor"><option value="">No vendor</option>${plItems("vendors").map(v=>`<option value="${v.k}" ${dv("pl_dvend","")===v.k?"selected":""}>${esc(v.name)}</option>`).join("")}</select>
 <label class="btn sm primary upl">Upload a file<input type="file" data-act="plDocUp"></label></div>
 ${L.plBusy?`<p class="small muted m0">${esc(L.plBusy)}</p>`:""}
 ${DOC_KINDS.filter(k=>by[k]).map(k=>`<div class="stack tight"><div class="eyebrow">${k} · ${by[k].length}</div>${by[k].map(d=>{const v=d.vend&&(PLN().vendors||{})[d.vend];return `<div class="plrow"><span class="gnum">${/pdf/.test(d.type)?"📄":/image/.test(d.type)?"🖼️":"📎"}</span><div class="mw0 grow"><b class="brk">${esc(d.name)}</b><div class="small muted">${v?esc(v.name)+" · ":""}${(d.size/1024/1024).toFixed(d.size>1048576?1:2)} MB · ${new Date(d.t).toLocaleDateString()}${d.by?" · "+esc(d.by):""}</div></div><button class="btn sm" data-act="plDocGet" data-k="${d.k}">Open</button>${L.confirm==="dd"+d.k?`<button class="btn sm gold" data-act="plDocDel" data-k="${d.k}">Delete?</button>`:`<button class="btn sm" data-act="plDocDel" data-k="${d.k}" aria-label="Delete">×</button>`}</div>`}).join("")}</div>`).join("")}</section>`}

function plWeather(){const w=PLN().weather||{},n=plEvDays();setTimeout(()=>plWxFetch(false),0);const x=L.plWx||{};
 const fc=!w.place?`<p class="small muted m0">Add the town and the forecast appears here once it's within about two weeks of the date.</p>`:!plDate(C().date)?`<p class="small muted m0">Add your event date on the Overview first.</p>`:x.busy?`<p class="small muted m0">Getting the forecast…</p>`:x.err?`<p class="small bad m0">${esc(x.err)}</p>`:x.far||n>15?`<p class="small muted m0">${n<0?"The event has passed.":`The forecast for ${esc(plFmtD(C().date))} shows up about 16 days before, around ${esc(plFmtD(plAddDays(C().date,-16)))}.`}</p>`:x.hi!=null?`<div class="plwx"><span class="plwxi">${WX_CODE(x.code)[0]}</span><div><b>${WX_CODE(x.code)[1]}</b> · high ${Math.round(x.hi)}°, low ${Math.round(x.lo)}°<div class="small muted">${x.rain!=null?`${x.rain}% chance of rain`:""}${x.wind!=null?` · wind up to ${Math.round(x.wind)} mph`:""} · ${esc(x.place)}</div></div></div>${x.rain>=40&&w.outdoor!=="no"?`<p class="small bad m0">Rain is likely. Time to put the backup plan in motion.</p>`:""}`:`<p class="small muted m0">Getting the forecast…</p>`;
 return `<section class="card stack"><div class="row between"><h2 class="m0">Weather & backup plan</h2>${w.place&&plDate(C().date)&&n>=0&&n<=15?`<button class="btn sm" data-act="plWxRe">Refresh</button>`:""}</div>${fc}
 <div class="grid2 g8"><label class="stack tight"><span class="small">Town or city</span><input type="text" data-draft="pl_wplace" value="${esc(dv("pl_wplace",w.place||""))}" placeholder="Charlotte, NC"></label>
 <label class="stack tight"><span class="small">Is any of it outdoors?</span><select data-draft="pl_wout">${[["","Choose"],["no","No, all indoors"],["part","Partly (parking, photos, a tent)"],["yes","Yes, mostly outdoors"]].map(([v,l])=>`<option value="${v}" ${dv("pl_wout",w.outdoor||"")===v?"selected":""}>${l}</option>`).join("")}</select></label></div>
 <label class="stack tight"><span class="small">Backup plan if the weather turns</span><textarea data-draft="pl_wbackup" rows="4" placeholder="Move the photo booth inside, umbrellas by the door, tent rental on standby (call by Thursday)…">${esc(dv("pl_wbackup",w.backup||""))}</textarea></label>
 <label class="stack tight"><span class="small">Deadline to decide</span><input type="date" data-draft="pl_wdecide" value="${esc(dv("pl_wdecide",w.decide||""))}" style="max-width:200px"></label>
 <button class="btn sm primary as" data-act="plWxSave">Save</button></section>`}

function plNotes(){const p=PLN();return `<section class="card stack"><div class="row between"><h2 class="m0">Notes</h2>${p.notesBy?`<span class="small muted">Saved by ${esc(p.notesBy)}${p.notesT?" · "+new Date(p.notesT).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):""}</span>`:""}</div>
 <p class="small muted m0">Ideas, phone calls, things to remember. Everyone helping with the plan can see these.</p>
 <textarea class="plnotes" data-draft="pl_notes" rows="14" placeholder="Venue says no confetti or open flames. Cake tasting Saturday at 2…">${esc(dv("pl_notes",p.notes||""))}</textarea>
 <div class="row"><button class="btn sm primary" data-act="plNotesSave">Save notes</button>${L.drafts.pl_notes!=null&&L.drafts.pl_notes!==(p.notes||"")?'<span class="small plsoon">Not saved yet</span>':""}</div></section>`}

function plThanksAll(){const out=[];if(giftOn()||Object.keys(D.gifts||{}).length)giftList().forEach(g=>out.push({src:"gift",k:g.k,name:g.from,for:g.gift,done:!!g.thanked}));
 plItems("thanks").forEach(x=>out.push({src:"plan",k:x.k,name:x.name,for:x.for,done:!!x.done,x}));return out}
function plThanks(){const all=plThanksAll(),d=all.filter(x=>x.done).length,gifts=all.filter(x=>x.src==="gift"),others=plItems("thanks");
 return `<section class="card stack"><div class="row between"><h2 class="m0">Thank-yous</h2><span class="pill gold">${d} of ${all.length} sent</span></div>
 ${all.length?`<span class="bar"><i style="width:${d/all.length*100}%"></i></span>`:""}
 <p class="small muted m0">Gifts from the gift log show up here automatically. Add teammates, vendors and anyone else you want to thank.</p>
 ${gifts.length?`<div class="stack tight"><div class="eyebrow">Gifts · ${gifts.length}</div>${gifts.map(g=>`<div class="plrow ${g.done?"dim":""}"><input type="checkbox" class="plbox" data-act="gfThank" data-k="${g.k}" ${g.done?"checked":""} aria-label="Thanked"><div class="mw0 grow"><b>${esc(g.name)}</b><div class="small muted">${esc(g.for)}</div></div></div>`).join("")}</div>`:""}
 ${others.length?`<div class="stack tight"><div class="eyebrow">Others · ${others.length}</div>${others.map(x=>plRow("thanks",x,`<b>${esc(x.name)}</b>${x.for?`<div class="small muted">${esc(x.for)}</div>`:""}`)).join("")}</div>`:""}
 <div class="row">${plAddBox("thanks","Add someone")}<button class="btn sm" data-act="plThanksHelpers">Add teammates and booked vendors</button></div>
 ${all.length?`<div class="row"><button class="btn sm" data-act="plThanksCsv">Download the list</button>${giftOn()?"":`<span class="small muted">Turn on the gift log on the Tonight tab to track gifts.</span>`}</div>`:""}</section>`}

/* ================= actions ================= */
function plFiles(el){return [...(el.files||[])]}
const plDataURL=f=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(f)});
const plShrink=(f,max,q)=>new Promise(res=>shrinkImage(f,max,q,res));
function plBlob(dataURL){const [h,b]=dataURL.split(",");const type=(/data:([^;]+)/.exec(h)||[])[1]||"application/octet-stream";const bin=atob(b);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type})}
Object.assign(ACT,{
 plSec:el=>{L.plSec=el.dataset.k;L.plEd=null;L.plAdd=null;L.confirm=null;render(true);const n=document.querySelector(".plchips [aria-pressed=true]");if(n&&n.scrollIntoView)try{n.scrollIntoView({block:"nearest",inline:"center"})}catch(e){}window.scrollTo({top:0})},
 plGo:el=>ACT.plSec(el),
 plAddOpen:el=>{L.plAdd=el.dataset.l;L.plEd=null;plClear(el.dataset.l,"pa_");render(true);const f=document.querySelector(".pladd input,.pladd select");if(f)f.focus()},
 plAddClose:()=>{L.plAdd=null;render(true)},
 plAdd:async el=>{const list=el.dataset.l,cfg=PL_CFG[list],o=plCollect(list,"pa_",null);const req=cfg.fields.find(f=>f.req&&!o[f.k]);if(req)return toast(`Fill in "${req.l}"`);
  o.t=Date.now();o.by=L.modName||"";const r=ER("plan/"+list).push(o);D.plan=Object.assign({},D.plan,{[list]:Object.assign({},(D.plan||{})[list],{[r.key]:o})});plClear(list,"pa_");buzz(20);render(true);
  const f=document.querySelector(".pladd input,.pladd select");if(f)f.focus();await r},
 plEdOpen:el=>{L.plEd={l:el.dataset.l,k:el.dataset.k};L.plAdd=null;L.confirm=null;plClear(el.dataset.l,"pe_");render(true)},
 plEdClose:()=>{L.plEd=null;L.confirm=null;render(true)},
 plSave:async el=>{const list=el.dataset.l,k=el.dataset.k,x=Object.assign({k},(PLN()[list]||{})[k]);const o=plCollect(list,"pe_",x);const req=PL_CFG[list].fields.find(f=>f.req&&!o[f.k]);if(req)return toast(`Fill in "${req.l}"`);
  L.plEd=null;plClear(list,"pe_");render(true);await ER(`plan/${list}/${k}`).update(o)},
 plDel:async el=>{const list=el.dataset.l,k=el.dataset.k;if(L.confirm!=="pd"+k){L.confirm="pd"+k;return render(true)}L.confirm=null;L.plEd=null;
  if(list==="board"&&((PLN().board||{})[k]||{}).img)ER("planImg/"+k).remove();
  if(list==="tables"){const s=plSeatMap(),u={};Object.keys(s).forEach(sk=>{if(s[sk]&&s[sk].tb===k)u[sk]=null});if(Object.keys(u).length)ER("plan/seats").update(u)}
  await ER(`plan/${list}/${k}`).remove();toast("Deleted")},
 plTog:el=>{ER(`plan/${el.dataset.l}/${el.dataset.k}/${el.dataset.f}`).set(!!el.checked);if(el.checked)buzz(20)},
 plSet:el=>{ER(`plan/${el.dataset.l}/${el.dataset.k}/${el.dataset.f}`).set(true);buzz(20)},
 plTF:el=>{L.plTF=el.dataset.k;render(true)},
 plSetDate:async()=>{const d=dv("pl_evdate","");if(!plDate(d))return toast("Pick a date");await ER("content/date").set(d);delete L.drafts.pl_evdate;toast("Date saved");render(true)},
 plICS:()=>{const s=plICS();if(!s)return toast("Nothing with a due date yet");download(`${(C().title||"event").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-plan.ics`,new Blob([s],{type:"text/calendar"}));toast("Open the file to add the dates to your calendar")},
 plTplOpen:()=>{L.plTpl=true;render(true)},
 plTplClose:()=>{L.plTpl=false;render(true)},
 plTplAdd:async()=>{const tpl=plTemplate(),have=new Set(plItems("tasks").map(x=>normName(x.title)));const fresh=tpl.filter(x=>!have.has(normName(x.title)));const u={},tm=Date.now();let n=0;
  fresh.forEach((x,i)=>{if(dv("pltpl_"+i,"1")!=="1")return;u["t"+tm.toString(36)+i]={title:x.title,due:plTplDue(x.days),who:"",time:"",note:"",done:false,t:tm+i,by:L.modName||""};n++});
  Object.keys(L.drafts).filter(k=>k.startsWith("pltpl_")).forEach(k=>delete L.drafts[k]);if(!n)return toast("Nothing ticked");
  await ER("plan/tasks").update(u);L.plTpl=false;L.plTF="open";toast(`${n} to-dos added`);render(true)},
 plHand:async()=>{const todo=plHandoff().filter(x=>!x.sent);if(!todo.length)return;const u={},tm=Date.now();todo.forEach((x,i)=>{u["p"+tm.toString(36)+i]={time:x.time||"",title:x.title.slice(0,80),note:(x.note||"").slice(0,140),who:x.who||"",t:tm+i,src:x.src}});
  await ER("content/ros").update(u);toast(`${todo.length} step${todo.length===1?"":"s"} added to the run of show`)},
 plBTot:async()=>{const v=String(dv("pl_btot","")).trim();await ER("plan/budgetTotal").set(v===""?null:plNum(v));delete L.drafts.pl_btot;toast("Budget saved")},
 plShareMoney:el=>{ER("plan/share/money").set(!!el.checked)},
 plCap:async()=>{const v=String(dv("pl_cap","")).trim();await ER("plan/capacity").set(v===""?null:plNum(v));delete L.drafts.pl_cap;toast("Saved")},
 plTablesN:()=>{L.plBulk=!L.plBulk;render(true)},
 plTablesAdd:async()=>{const n=Math.min(60,Math.max(1,Math.round(plNum(dv("pl_tn","8"))))),s=Math.max(0,Math.round(plNum(dv("pl_ts","8"))));const have=plItems("tables").length,u={},tm=Date.now();
  for(let i=0;i<n;i++)u["b"+tm.toString(36)+i]={name:"Table "+(have+i+1),seats:s||"",note:"",t:tm+i};await ER("plan/tables").update(u);L.plBulk=false;toast(`${n} tables added`);render(true)},
 plSeat:async el=>{const tb=el.value,nm=el.dataset.n;try{el.blur()}catch(e){}if(L.heldRender&&!typingHold()){L.heldRender=false;render()}if(!tb)return;await ER("plan/seats/"+plKey(nm)).set({n:nm,tb,t:Date.now()});buzz(20)},
 plSeatAdd:async()=>{const nm=dv("pl_seatname","").trim().slice(0,60),tb=dv("pl_seattb","");if(!nm)return toast("Type a name");if(!tb)return toast("Pick a table");await ER("plan/seats/"+plKey(nm)).set({n:nm,tb,t:Date.now(),extra:true});delete L.drafts.pl_seatname;render(true)},
 plUnseat:el=>{ER("plan/seats/"+el.dataset.k).remove()},
 plUnToggle:e=>{L.plUnOpen=!L.plUnOpen},
 plSeatClear:async()=>{if(L.confirm!=="seatClear"){L.confirm="seatClear";return render(true)}L.confirm=null;await ER("plan/seats").remove();toast("Seats cleared")},
 plAutoSeat:async()=>{const tbs=plItems("tables");if(!tbs.length)return;
  /* keep each guest-list row (a couple, a family) and its plus-ones together */
  const seated=new Set(Object.keys(plSeatMap()).filter(k=>{const s=plSeatMap()[k];return s&&(PLN().tables||{})[s.tb]}));const parties=[];
  glList().filter(g=>glConfirmed(g)&&g.rsvp!=="no").sort((a,b)=>(a.t||0)-(b.t||0)).forEach(g=>{const ms=glMembers(g).filter(m=>!seated.has(plKey(m)));if(!ms.length)return;
   const last=parties[parties.length-1];if(g.plusOf&&last&&normName(last.host)===normName(g.plusOf))last.ms.push(...ms);else parties.push({host:glMembers(g)[0],ms})});
  const free={};tbs.forEach(tb=>free[tb.k]=(plNum(tb.seats)||8)-plTableGuests(tb.k).length);
  const u={},tm=Date.now();let n=0,left=0;
  parties.forEach(p=>{let tb=tbs.find(t=>free[t.k]>=p.ms.length);if(!tb){left+=p.ms.length;return}
   p.ms.forEach((m,i)=>{u[plKey(m)]={n:m,tb:tb.k,t:tm+n};n++});free[tb.k]-=p.ms.length});
  if(n)await ER("plan/seats").update(u);toast(n?`${n} guests seated${left?` · ${left} didn't fit. Add a table.`:""}`:"No room left. Add a table or more seats.")},
 plSeatCopy:()=>copyText(plItems("tables").map(tb=>`${tb.name}\n${plTableGuests(tb.k).map(s=>"  "+s.n).join("\n")||"  (empty)"}`).join("\n\n")),
 plExtra:async()=>{await ER("plan/food/extra").set(Math.max(0,Math.round(plNum(dv("pl_extra","10")))));delete L.drafts.pl_extra;toast("Saved")},
 plFoodCopy:()=>copyText(plFoodText()),
 plShopCopy:()=>{const by={};plItems("shop").filter(x=>!x.got).forEach(x=>(by[x.who||"Anyone"]=by[x.who||"Anyone"]||[]).push(x));copyText(Object.keys(by).map(w=>`${w}:\n`+by[w].map(x=>`- ${x.item}${x.qty?" x "+x.qty:""}${x.where?" ("+x.where+")":""}`).join("\n")).join("\n\n")||"Everything's bought!")},
 plColAdd:async()=>{const c=dv("pl_col","#e8338f");const cols=(PLN().colors||[]).filter(Boolean);if(cols.includes(c))return toast("Already in the palette");await ER("plan/colors").set(cols.concat(c).slice(0,10))},
 plColDel:async el=>{const cols=(PLN().colors||[]).filter(Boolean);cols.splice(+el.dataset.i,1);await ER("plan/colors").set(cols)},
 plColTheme:()=>{L.mtab="event";render(true);toast("Your palette is on the Plan tab. Pick theme colors here.");setTimeout(()=>{const t=document.querySelector("[data-ts]");if(t&&t.scrollIntoView)t.scrollIntoView({block:"center"})},150)},
 plImgUp:async el=>{const fs=plFiles(el).filter(f=>/^image\//.test(f.type)||/\.(jpe?g|png|gif|webp|heic)$/i.test(f.name)).slice(0,12);el.value="";if(!fs.length)return toast("Pick a photo");
  let i=0;for(const f of fs){i++;L.plBusy=`Adding photo ${i} of ${fs.length}…`;render(true);
   try{const full=await plShrink(f,1600,.82),th=await plShrink(f,420,.7);const r=ER("plan/board").push();await ER("planImg/"+r.key).set(full);await r.set({img:true,th,caption:"",url:"",t:Date.now()+i,by:L.modName||""})}catch(e){toast("A photo couldn't be added")}}
  L.plBusy=null;render(true);toast(fs.length===1?"Photo added":fs.length+" photos added")},
 plImgOpen:async el=>{const k=el.dataset.k;L.plLB=k;render(true);if(!(PLI.full&&PLI.full.k===k)){const s=await ER("planImg/"+k).once("value");PLI.full={k,src:s.val()||((PLN().board||{})[k]||{}).th||""};if(L.plLB===k)render(true)}},
 plLBClose:()=>{L.plLB=null;render(true)},
 plDocUp:async el=>{const f=plFiles(el)[0];el.value="";if(!f)return;let data;
  try{if(/^image\//.test(f.type)&&f.size>1.5e6){data=await plShrink(f,2000,.85)}else{if(f.size>4*1048576)return toast("That file is over 4 MB. Try a smaller copy or a photo of it.");data=await plDataURL(f)}}catch(e){return toast("That file couldn't be read")}
  L.plBusy="Uploading "+f.name+"…";render(true);
  try{const r=ER("plan/docs").push();await ER("planDoc/"+r.key).set(data);await r.set({name:f.name.slice(0,120),type:(data.match(/^data:([^;]+)/)||[])[1]||f.type||"",size:Math.round(data.length*.75),kind:dv("pl_dkind",DOC_KINDS[0]),vend:dv("pl_dvend",""),t:Date.now(),by:L.modName||""});toast("Saved")}
  catch(e){toast("Upload failed. Check your connection.")}L.plBusy=null;render(true)},
 plDocGet:async el=>{const k=el.dataset.k,d=(PLN().docs||{})[k];if(!d)return;toast("Opening…");const s=await ER("planDoc/"+k).once("value");const v=s.val();if(!v)return toast("That file is missing");download(d.name||"document",plBlob(v))},
 plDocDel:async el=>{const k=el.dataset.k;if(L.confirm!=="dd"+k){L.confirm="dd"+k;return render(true)}L.confirm=null;await ER("planDoc/"+k).remove();await ER("plan/docs/"+k).remove();toast("Deleted")},
 plWxSave:async()=>{const w=PLN().weather||{};const o={place:dv("pl_wplace",w.place||"").trim().slice(0,80),outdoor:dv("pl_wout",w.outdoor||""),backup:dv("pl_wbackup",w.backup||"").trim().slice(0,2000),decide:dv("pl_wdecide",w.decide||"")};
  await ER("plan/weather").set(o);["pl_wplace","pl_wout","pl_wbackup","pl_wdecide"].forEach(k=>delete L.drafts[k]);
  if(o.decide&&!plItems("tasks").some(x=>x.src==="wx")){await ER("plan/tasks").push({title:"Decide on the weather backup plan",due:o.decide,who:"",time:"",note:"",done:false,src:"wx",t:Date.now()})}
  toast("Saved");plWxFetch(true)},
 plWxRe:()=>plWxFetch(true),
 plNotesSave:async()=>{const v=String(dv("pl_notes",PLN().notes||"")).slice(0,20000);await ER("plan").update({notes:v,notesBy:L.modName||"",notesT:Date.now()});delete L.drafts.pl_notes;toast("Notes saved");render(true)},
 plThanksHelpers:async()=>{const have=new Set(plThanksAll().map(x=>normName(x.name)));const u={},tm=Date.now();let n=0;
  Object.values(D.mods||{}).forEach(m=>{if(m&&m.name&&!m.owner&&!have.has(normName(m.name))){have.add(normName(m.name));u["h"+tm.toString(36)+n]={name:m.name,for:"Helping run the party",done:false,t:tm+n};n++}});
  plItems("vendors").filter(v=>v.status==="Booked").forEach(v=>{if(!have.has(normName(v.name))){have.add(normName(v.name));u["h"+tm.toString(36)+n]={name:v.name,for:v.kind||"",done:false,t:tm+n};n++}});
  if(!n)return toast("Everyone's already on the list");await ER("plan/thanks").update(u);toast(`${n} added`)},
 plThanksCsv:()=>{const rows=[["Name","For","Thank-you sent"]].concat(plThanksAll().map(x=>[x.name,x.for||"",x.done?"Yes":""]));download(`thank-yous-${EV}.csv`,new Blob(["﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv"}))}
});
/* the gift log's "thanked" box also lives on the Thank-yous section, so let it re-render */

/* ---- a gentle nudge when the console opens with something overdue ---- */
const _renderPlan=render;
render=function(force){_renderPlan(force);if(VIEW==="moderator"&&L.modOK&&L.planLoaded&&!L.plNudged&&L.mtab!=="plan"&&!(D.meta&&D.meta.host)){L.plNudged=true;const n=plBadge();if(n)setTimeout(()=>toast(`${n} planning reminder${n===1?" needs":"s need"} attention. See the Plan tab.`),1200)}};

TOUR.splice(Math.max(0,TOUR.findIndex(x=>/k=live/.test(x.sel))+1),0,{sel:'[data-act=mtab][data-k=plan]',title:"Plan",text:"Everything for the weeks before: a countdown, to-dos with due dates, budget and payments, vendors, seating, food, shopping, documents and reminders. Teammates see the to-dos you give them."});

/* ---- event setup files: save an event's whole setup to a file, or load one into another event ---- */
const SETUP_SKIP_PLAN=["docs","seats","notesBy","notesT","share"];
function setupData(){const c=clone(C());const p=clone(D.plan||{});SETUP_SKIP_PLAN.forEach(k=>delete p[k]);
 if(p.board)Object.keys(p.board).forEach(k=>{if(p.board[k]&&p.board[k].img)delete p.board[k]});
 return {hostmode:1,kind:"event-setup",saved:new Date().toISOString(),type:evType(),content:c,plan:p}}
function setupCheck(o){if(!o||typeof o!=="object"||o.kind!=="event-setup"||!o.content||typeof o.content!=="object")return "That isn't a Host Mode setup file.";
 if(o.content.image&&!/^data:image\/(jpeg|png|webp);base64,/.test(o.content.image))return "The picture in that file can't be used.";return ""}
function setupCard(){const can=L.isAdmin||L.isOwner;if(!can)return "";const s=L.setupFile;
 return `<section class="card stack"><h2>Setup file</h2><p class="small muted m0">Save this event's details, colors, games, run of show and plan to a file. Load it into another event to start from it. Guests, photos and scores aren't included.</p>
 <div class="row"><button class="btn sm" data-act="setupSave">Save the setup to a file</button><label class="btn sm upl">Load a setup file<input type="file" accept=".json,application/json" data-act="setupPick"></label></div>
 ${s?`<div class="banner soft stack tight"><span><b>${esc(s.content.title||"Untitled")}</b>${s.content.date?" · "+esc(plFmtD(s.content.date)):""} · ${esc((EVENT_TYPES[s.content.eventType]||{}).label||"Event")}</span>
  <span class="small">This replaces this event's details, colors, games and run of show${s.plan&&Object.keys(s.plan).length?", and adds the file's plan (to-dos, vendors, budget and more)":""}. Guests, photos and scores stay.</span>
  <div class="row"><button class="btn sm primary" data-act="setupLoad">Load it</button><button class="btn sm" data-act="setupCancel">Cancel</button></div></div>`:""}</section>`}
const _mEvSetup=mEvent;mEvent=function(){return _mEvSetup()+setupCard()};
Object.assign(ACT,{
 setupSave:()=>{const d=setupData();download(`${(C().title||"event").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.hostmode.json`,new Blob([JSON.stringify(d)],{type:"application/json"}));toast("Setup saved")},
 setupPick:el=>{const f=el.files&&el.files[0];el.value="";if(!f)return;if(f.size>9e6)return toast("That file is too big");const fr=new FileReader();
  fr.onload=()=>{let o=null;try{o=JSON.parse(String(fr.result||""))}catch(e){}const bad=setupCheck(o);if(bad)return toast(bad);L.setupFile=o;render(true)};fr.readAsText(f)},
 setupCancel:()=>{L.setupFile=null;render(true)},
 setupLoad:async()=>{const o=L.setupFile;if(!o||setupCheck(o))return;if(!(L.isAdmin||L.isOwner))return toast("Only the host can do this");
  const c=Object.assign(templateFor(o.content.eventType||o.type||"other"),o.content);
  await ER("content").set(c);
  if(o.plan&&typeof o.plan==="object"){const u={};Object.keys(o.plan).forEach(k=>{if(SETUP_SKIP_PLAN.includes(k))return;const v=o.plan[k];
   if(v&&typeof v==="object"&&!Array.isArray(v))Object.keys(v).forEach(id=>{u[k+"/"+id]=v[id]});else u[k]=v});
   if(Object.keys(u).length)await ER("plan").update(u)}
  L.setupFile=null;Object.keys(L.drafts).filter(k=>/^ev_|^ed_/.test(k)).forEach(k=>delete L.drafts[k]);toast("Setup loaded");render(true)}
});

/* ---- Host Mode's own look: the create-event page and the host console wear the brand, not an event's theme ---- */
const BRAND={colors:{bar:"#0c2147",ground:"#f2f5fa",card:"#ffffff",line:"#d2dbea",ink:"#0c2147",muted:"#4b5b79",hd:"#0f2c5c",hd2:"#b45a00",btn1:"#0f2c5c",btn2:"#1f4f96",rose:"#f7941d",flame:"#f26722",gold:"#f2b134",violet:"#0f2c5c",leaf:"#3dae2b"},fonts:{title:"Montserrat",head:"Montserrat",body:"Figtree",size:15}};
const brandView=()=>VIEW==="new"||VIEW==="host"||VIEW==="planner"||VIEW==="mate"||VIEW==="client"||VIEW==="fb"||(VIEW==="guest"&&(!EV||L.missing));
const _applyThemeBrand=applyTheme;
applyTheme=function(){_applyThemeBrand();const on=brandView();document.documentElement.classList.toggle("hmbrand",on);if(!on)return;
 setThemeVars(BRAND.colors,BRAND.fonts,true);if(Object.keys(L.drafts).some(k=>k.startsWith("ts_c_")||k.startsWith("ts_f_")||k==="ts_glow"))previewTheme("ts_")};
const _newEvBrand=newEventView;
newEventView=function(){const h=_newEvBrand();if(!L.loaded||L.newInv)return h;
 return `<section class="card stack narrow hmhero"><div class="eyebrow">Welcome to Host Mode</div><h2>Run your whole event from your phone</h2><p class="m0">Plan the weeks before, check guests in at the door, and run games, big moments and the big screen on the day. Baby showers, weddings, birthdays, reunions and company events.</p></section>`+h.replace(`data-act="nwCheck">Continue</button>`,`data-act="nwCheck">Continue</button><p class="small muted m0">No code yet? Ask your host for one. Already have an event? Open the link your host sent you. Hosts sign in on the <a href="games.html#host">admin console</a>.</p>`)};

/* ================= DEMO EVENT (?e=DEMO) =================
   demo.js swaps in a pretend database kept in this browser only. The first visit fills it with a
   ready-made birthday party so visitors can see every screen; "Start the demo over" resets it. */
const DEMO_V=5;
const demoOn=()=>!!window.__HMDEMO&&EV==="DEMO";
function demoSeed(){const dbr=firebase.database();const cur=JSON.parse(localStorage.getItem("hm_demo_db")||"{}");
 if(cur.demoV===DEMO_V&&cur.partygames)return;
 const iso=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return plIso(d)};
 const date=iso(14);
 const content=Object.assign(templateFor("birthday","Rosa's 30th"),{title:"Rosa's 30th",honorees:"Rosa",date,tagline:"Thirty, flirty and thriving"});
 content.ros={};[["18:30","Doors open, check-in at the welcome table",""],["19:00","Welcome and the first game",""],["19:45","Dinner is served",""],["20:30","Toasts and the birthday slideshow",""],["21:00","Cake and candles",""],["21:30","Team trivia finale and crowning the winners",""]].forEach((r,i)=>content.ros["r"+i]={time:r[0],title:r[1],note:r[2],who:"",t:1+i});
 const names=[["Alicia R","🦋",3,4],["Marcus T","🌻",7,19],["Tasha W","🌸",1,22],["Devon K","⭐",9,2],["Priya S","🍓",4,30],["Andre M","🎈",11,11],["Keisha L","🌙",2,14],["Omar J","🐝",8,8],["Lauren B","🦄",5,5],["Chris P","🧸",10,27]];
 const players={},scores={},pods={};names.forEach(([n,e,m,d],i)=>{const id="p"+i;players[id]={name:n,m,d,fq:i%6,fa:i%3,word:n[0],t:1000+i,av:{e},bot:true};scores[id]=[18,15,14,12,11,10,9,8,7,6][i]});
 const guests={};names.concat([["Maya B"],["Rosa's mom"],["Uncle Ray"]]).forEach((x,i)=>guests["g"+i]={name:x[0],rsvp:"yes",t:i,...(i<6?{arrived:{t:Date.now()-6e5,by:"Alicia"}}:{})});
 guests.gw1={name:"Kendra F",rsvp:"maybe",t:40};guests.gw2={name:"Luis O",rsvp:"maybe",t:41};
 const now=Date.now(),album={},albumFull={};(window.HM_DEMO_PHOTOS||[]).forEach((p,i)=>{album["a"+i]={thumb:p.thumb,t:now-i*6e4,name:names[[6,1,4][i]][0]};albumFull["a"+i]=p.full});
 const plan={budgetTotal:2500,capacity:60,
  tasks:{t1:{title:"Book the venue",due:iso(-30),done:true,t:1},t2:{title:"Send invitations",due:iso(-21),done:true,t:2},t3:{title:"Order the cake",due:iso(3),who:"m2",t:3},t4:{title:"Make the birthday slideshow",due:iso(9),t:4},t5:{title:"Pick up balloons",due:iso(13),who:"m2",time:"17:00",t:5},t6:{title:"Buy candles and party favors",due:iso(11),t:6},t7:{title:"Set up the photo corner",due:iso(14),time:"18:00",t:7}},
  vendors:{v1:{name:"The Loft on Main",kind:"Venue",status:"Booked",contact:"Dana",phone:"555-0142",cost:900,deposit:300,depPaid:true,balDue:iso(10),arrive:"16:00",t:1},v2:{name:"Sugar & Spoon Bakery",kind:"Cake & desserts",status:"Booked",phone:"555-0188",cost:220,deposit:60,depDue:iso(2),t:2},v3:{name:"DJ Nova",kind:"DJ & music",status:"Contacted",cost:450,t:3}},
  budget:{b1:{item:"Balloon arch",cat:"Decor",est:180,spent:0,t:1},b2:{item:"Party favors",cat:"Favors & gifts",est:90,spent:35,t:2}},
  shop:{s1:{item:"Candles (3 and 0)",who:"Alicia",cost:8,t:1},s2:{item:"Paper plates",qty:"80",who:"Marcus",cost:16,t:2},s3:{item:"Confetti cannons",qty:"6",who:"Alicia",cost:30,got:true,t:3}},
  dishes:{f1:{dish:"Sliders",course:"Mains",from:"Caterer",serves:40,t:1},f2:{dish:"Mac and cheese",course:"Sides",from:"Tasha",serves:30,contains:"dairy, gluten",t:2},f3:{dish:"Birthday cake",course:"Desserts",from:"Sugar & Spoon Bakery",serves:50,contains:"dairy, eggs, gluten",t:3}},
  diet:{d1:{name:"Priya S",need:"Vegetarian",t:1}},
  colors:["#7b3fb8","#e8338f","#f6892f","#ffd166"],
  notes:"Surprise toast from Rosa's college friends at 8:30. Venue says no open flames except the cake candles."};
 const ev={meta:{name:"Rosa's 30th",created:now,demo:true,planner:"demohost",host:true,setup:{details:true,content:true,moments:true,menu:true,pin:true,practice:true,share:true}},
  mods:{m1:{name:"You",pinHash:"demo",owner:true},m2:{name:"Alicia",pinHash:"demo-helper"}},
  content,players,scores,team:{A:64,B:51},state:{teamNames:{A:"Team Cake",B:"Team Candles"}},guests,album,albumFull,plan};
 /* the host's own account (as made on the new-event page): their dashboard has My events, Plan and Stay & Go. Made-up people and money. */
 const td=iso(13),tt=iso(15),wh=o=>Object.fromEntries(o.map(k=>[k,1]));
 const host={profile:{kind:"host",name:"You",email:"you@example.com",code:"DEMO",t:now},events:{DEMO:{name:"Rosa's 30th",created:now}},
  stay:{trips:{rt:{name:"Rosa's 30th weekend",client:"",place:"Charlotte, NC",cur:"USD",from:td,to:tt,note:"",t:now}},
   mem:{s1:{trip:"rt",name:"Priya S",email:"priya@example.com",phone:"",room:"",group:"Out of town",from:td,to:tt,t:now},s2:{trip:"rt",name:"Omar J",email:"",phone:"555-0161",room:"",group:"Out of town",from:td,to:tt,t:now},s3:{trip:"rt",name:"Lauren B",email:"lauren@example.com",phone:"555-0162",room:"",group:"Out of town",from:td,to:tt,t:now}},
   res:{h1:{trip:"rt",cat:"stay",prov:"hotels",name:"Uptown Suites",conf:"US-55120",booked:iso(-7),start:td,end:tt,inT:"15:00",outT:"11:00",addr:"Tryon St, Charlotte, NC",phone:"555-0170",email:"",total:72000,due:iso(10),status:"confirmed",who:wh(["s1","s2","s3"]),split:"even",owe:{s1:24000,s2:24000,s3:24000},oweDue:iso(7),gnote:"Ask for the Rosa's 30th block at the front desk.",note:"",t:now}},
   exp:{},pay:{q1:{trip:"rt",mid:"s1",amt:24000,date:iso(-2),method:"Zelle",ref:"",note:"",alloc:{"r:h1":24000},rc:"",t:now}},rc:{},rcBlob:{},msg:{},
   act:{a1:{trip:"rt",ref:"trip",text:"Created the trip Rosa's 30th weekend",t:now,by:"You"}}}};
 const all={demoV:DEMO_V,partygames:{admin:{defaultEvent:"DEMO"},index:{DEMO:{name:"Rosa's 30th",created:now,planner:"demohost"}},events:{DEMO:ev},planners:{demohost:host}}};
 localStorage.setItem("hm_demo_db",JSON.stringify(all));dbr.ref("demoV").set(DEMO_V);
 Object.keys(localStorage).filter(k=>/^pg_.*DEMO/.test(k)).forEach(k=>localStorage.removeItem(k));
 store.set("mod_DEMO",{h:"demo",id:"m1",r:"mod"})}
function demoReset(){try{localStorage.removeItem("hm_demo_db");Object.keys(localStorage).filter(k=>/^pg_.*DEMO/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}location.reload()}
if(demoOn()&&window.top!==window)L.tourAuto=true;
const _connectDemo=connect;
connect=function(){if(demoOn()){try{demoSeed()}catch(e){console.warn("demo seed",e)}if(!store.get("mod_DEMO",null))store.set("mod_DEMO",{h:"demo",id:"m1",r:"mod"})}_connectDemo()};
/* a bar on every demo screen: switch views, start over */
function demoBar(){if(!demoOn()||window.top!==window)return "";const v=(h,l)=>`<a class="${(VIEW===(h||"guest"))?"on":""}" href="games.html?e=DEMO${h?"#"+h:""}">${l}</a>`;
 return `<div class="demoslot"><div class="demobar"><div class="dbrow"><span class="dbt">Demo</span><span class="dbkeys"><a href="index.html">Home</a><a href="demo.html">All three</a><button data-act="demoReset">Start over</button></span></div><div class="dbscreens">${v("planner","Host")}${v("moderator","Console")}${v("","Guest")}${v("screen","Big screen")}</div></div></div>`}
/* the bar floats with you down the page and fades the further you scroll */
function demoFloat(){const b=document.querySelector(".demobar"),sl=document.querySelector(".demoslot");if(!b||!sl)return;const h=b.offsetHeight+22;if(sl.dataset.h!=h){sl.dataset.h=h;sl.style.height=h+"px"}const y=window.scrollY||document.documentElement.scrollTop||0;const mx=Math.max(1,(document.documentElement.scrollHeight||0)-(window.innerHeight||0));b.style.opacity=String(Math.max(0,Math.min(1,1-y/mx)).toFixed(2));b.style.pointerEvents=+b.style.opacity<.05?"none":""}
if(demoOn()&&window.top===window){addEventListener("scroll",demoFloat,{passive:true});addEventListener("resize",demoFloat);setInterval(demoFloat,400)}
const _hvDemo=headerView;headerView=function(){return demoBar()+_hvDemo()};
ACT.demoReset=()=>demoReset();
/* typing DEMO as an invite code opens the demo */
const _nwCheckDemo=ACT.nwCheck;ACT.nwCheck=function(){const box=document.querySelector('[data-draft="nw_inv"]');const code=String((box&&box.value)||dv("nw_inv",QS.get("invite")||"")).trim().toUpperCase();if(code==="DEMO"){location.href="demo.html";return}return _nwCheckDemo.apply(this,arguments)};
if(VIEW==="new"&&QS.get("invite"))setTimeout(()=>{if(!L.newInv)ACT.nwCheck()},900);

/* ================= DEMO CONTACT GATE =================
   Visitors explore freely for two taps; before the third, they leave their contact details once.
   Details go to the real database (partygames/leads) through its REST address, since the demo itself
   runs on a pretend database. The host sees them on the host console's Contacts tab. */
const LEAD_FREE=2;
const leadDone=()=>{try{return !!localStorage.getItem("hm_lead_done")}catch(e){return true}};
const leadCount=()=>{try{return +localStorage.getItem("hm_demo_taps")||0}catch(e){return 0}};
function leadTap(){try{localStorage.setItem("hm_demo_taps",String(leadCount()+1))}catch(e){}}
async function leadSend(o){const url=FIREBASE_CONFIG.databaseURL.replace(/\/$/,"")+"/"+ROOT+"/leads.json";
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
if(demoOn()){
 document.addEventListener("click",e=>{const el=e.target;if(!el||!el.closest||leadDone())return;
  if(el.closest(".demobar")||el.closest("#leadgate")||el.closest("#tour"))return;
  leadTap();if(leadCount()<LEAD_FREE||L.leadShown)return;L.leadShown=true;
  /* the second tap does what it was meant to do, then the form slides in once */
  setTimeout(()=>{if(leadDone())return;if(window.top!==window){try{window.top.postMessage({hm:"leadgate"},location.origin)}catch(x){}}else showLeadGate()},700)},true);
 addEventListener("storage",e=>{if(e.key==="hm_lead_done"&&leadDone()){const g=document.getElementById("leadgate");if(g)g.remove()}});
}
function showLeadGate(){if(document.getElementById("leadgate"))return;const g=document.createElement("div");g.id="leadgate";g.innerHTML=LEAD_FORM_HTML();document.body.appendChild(g);leadWire(g)}
/* the same form is used on demo.html, so it lives in one string */
const LEAD_FORM_HTML=()=>`<div class="lg-bg"></div><form class="lg-card" novalidate aria-labelledby="lgT"><button type="button" class="lg-x" aria-label="Close">×</button><div class="lg-eb">Enjoying the demo?</div><h2 id="lgT">Tell us how to reach you</h2>
 <p>Leave your details and we'll send you an invite code when you're ready to plan your own event.</p>
 <div class="lg-grid"><label>Your name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label>
 <label>Phone (optional)<input name="phone" type="tel" autocomplete="tel"></label><label>What are you planning?<select name="type"><option value="">Choose one</option>${Object.keys(EVENT_TYPES).map(k=>`<option>${EVENT_TYPES[k].label}</option>`).join("")}<option>I plan events for clients</option></select></label>
 <label>Event date (optional)<input name="date" type="date"></label><label class="lg-wide">Anything else? (optional)<textarea name="note" rows="2"></textarea></label></div>
 <p class="lg-err" hidden></p><button class="lg-go" type="submit">Send my details</button><p class="lg-fine">We only use this to contact you about Host Mode.</p></form>`;
function leadWire(g){const f=g.querySelector("form");const close=()=>{try{localStorage.setItem("hm_lead_done","closed")}catch(y){}g.remove()};g.querySelector(".lg-x").onclick=close;g.querySelector(".lg-bg").onclick=close;addEventListener("keydown",function k(e){if(e.key==="Escape"){close();removeEventListener("keydown",k)}});f.addEventListener("submit",async e=>{e.preventDefault();const v=k=>String((f.elements[k]&&f.elements[k].value)||"").trim();const err=f.querySelector(".lg-err");
  const o={name:v("name").slice(0,80),email:v("email").slice(0,120),phone:v("phone").slice(0,40),type:v("type").slice(0,60),date:v("date").slice(0,20),note:v("note").slice(0,600),t:{".sv":"timestamp"},src:"demo",page:location.hash.slice(1)||"guest"};
  if(!o.name){err.textContent="Please add your name.";err.hidden=false;return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)){err.textContent="Please check your email address.";err.hidden=false;return}
  const btn=f.querySelector(".lg-go");btn.disabled=true;btn.textContent="Sending…";
  try{await leadSend(o)}catch(x){try{localStorage.setItem("hm_lead_pending",JSON.stringify(o))}catch(y){}}
  try{localStorage.setItem("hm_lead_done","1")}catch(y){}g.remove();toast("Thanks, "+o.name.split(" ")[0]+"! Enjoy the demo.")})}
/* a lead that couldn't be sent (no signal) goes out next time */
if(demoOn())setTimeout(()=>{let p=null;try{p=JSON.parse(localStorage.getItem("hm_lead_pending")||"null")}catch(e){}if(p)leadSend(p).then(()=>localStorage.removeItem("hm_lead_pending")).catch(()=>{})},3000);

/* host console: Contacts tab */
D.leads={};
/* the Contacts list is loaded with the other owner-only data (ownerSubs) */
const leadList=()=>Object.keys(D.leads||{}).map(k=>Object.assign({k},D.leads[k])).sort((a,b)=>(b.t||0)-(a.t||0));
function hLeads(){const l=leadList();
 return `<section class="card stack"><div class="row between"><h2>Contacts</h2><span class="pill gold">${l.length}</span></div><p class="small muted m0">People who left their details: demo visitors, and planners or venues who used the “Talk to us” form on the home page. New ones appear here as they come in.</p>
 ${l.length?`<div class="stack tight">${l.map(x=>`<div class="plrow"><div class="mw0 grow"><b>${esc(x.name)}</b>${x.biz?` <span class="small">· ${esc(x.biz)}</span>`:""}${x.pro?` <span class="pill gold">Planner / venue</span>`:""}${x.type?` <span class="pill">${esc(x.type)}</span>`:""}${x.size?` <span class="pill">${esc(x.size)} events a year</span>`:""}<div class="small muted plmeta"><span>${x.t?esc(new Date(x.t).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})):""}</span>${x.date?`<span>Event ${esc(plFmtD(x.date)||x.date)}</span>`:""}</div>${x.note?`<div class="small">${esc(x.note)}</div>`:""}
  <div class="row g8 plcontact">${x.email?`<a class="btn sm" href="mailto:${esc(x.email)}">✉️ ${esc(x.email)}</a>`:""}${x.phone?`<a class="btn sm" href="tel:${esc(x.phone.replace(/[^0-9+]/g,""))}">📞 ${esc(x.phone)}</a><a class="btn sm" href="sms:${esc(x.phone.replace(/[^0-9+]/g,""))}">Text</a>`:""}</div></div>
  <button class="btn sm" data-act="leadDel" data-k="${esc(x.k)}">${L.confirm==="ld"+x.k?"Tap again":"Delete"}</button></div>`).join("")}</div>
  <div class="row"><button class="btn sm" data-act="leadCsv">Download as a spreadsheet</button></div>`:'<p class="small muted m0">No contacts yet. Share the demo link: hostmode.github.io/demo.html</p>'}</section>`}
Object.assign(ACT,{
 leadDel:async el=>{const k=el.dataset.k;if(L.confirm!=="ld"+k){L.confirm="ld"+k;return render(true)}L.confirm=null;await RT("leads/"+k).remove();toast("Deleted")},
 leadCsv:()=>{const rows=[["Name","Business","Email","Phone","Type","Events a year","Event date","Note","From","When"]].concat(leadList().map(x=>[x.name,x.biz,x.email,x.phone,x.type,x.size,x.date,x.note,x.pro?"Home page (planner/venue)":"Demo",x.t?new Date(x.t).toLocaleString():""]));download("host-mode-contacts.csv",new Blob(["﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv"}))}
});

