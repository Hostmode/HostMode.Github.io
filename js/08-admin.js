/* ================= ADMIN, MODERATORS, START FRESH, INVITE CODES, NEW-EVENT PAGE, THEME STUDIO ================= */
/* --- sign-in: the host PIN is the administrator; each moderator has a personal PIN; an optional shared event PIN --- */
function modSession(){const s=store.get("mod_"+EV,null);if(!s)return null;return typeof s==="string"?{h:s}:s}
/* the starting host PIN (0102) is public, so on the live site it only works until Roy sets his own; demos and offline test copies keep it */
const masterLive=()=>!(L.masterHash&&L.masterHash===L.defaultHash&&!window.__HMDEMO&&!window.__HMPDEMO&&AUTH());
function checkAuth(){const m=L.masterHash;const hs=store.get("host",null);L.hostOK=!!m&&(hs===m||!!hs&&hs.h===m);
 if(EV&&D.meta){const s=modSession();const mods=D.mods||{};let ok=false,admin=false,name="";
  if(s&&s.h){if(s.h===m&&masterLive()){ok=admin=true;name="Administrator"}else if(s.id&&mods[s.id]&&mods[s.id].pinHash===s.h){ok=true;name=mods[s.id].name}else if(D.meta.pinHash&&s.h===D.meta.pinHash&&!s.id){ok=true;name="Moderator"}}
  /* the host or planner whose account owns this event is signed in: open as the event's first moderator, no PIN */
  let acct=null;if(!ok&&L.navUid&&D.meta.planner&&L.navUid===D.meta.planner){acct=Object.keys(mods).find(k=>mods[k]&&mods[k].owner)||null;ok=true;name=(acct&&mods[acct].name)||"Host"}
  if(L.modOK&&!ok&&VIEW==="moderator")L.kicked=true;L.modOK=ok;L.isAdmin=admin;L.modName=name;L.modId=ok&&(s&&s.id||acct)||null;L.isOwner=!!(ok&&(acct||s&&s.id&&mods[s.id]&&mods[s.id].owner))}}
function pinScreen(){return `<section class="card stack narrow"><div class="eyebrow">Moderators only</div><h2>Enter your PIN</h2><p class="small muted m0">${esc(D.meta?D.meta.name:"")}</p>${L.kicked?'<div class="nudge">Your moderator access for this event was removed by the administrator.</div>':""}
 <input type="password" id="pin" inputmode="numeric" autocomplete="off" data-draft="pin" value="${esc(dv("pin",""))}"><button class="btn primary" data-act="pin">Open the console</button><p class="small muted m0">Use your personal moderator PIN. The administrator signs in with the host PIN.</p><a class="small muted" href="${esc(eventURL(EV))}">I'm a guest</a></section>`}
Object.assign(ACT,{
 pin:async()=>{const h=await hashPin(dv("pin",""));const mods=D.mods||{};let s=null;
  if(h===L.masterHash&&!masterLive())return toast("The starting host PIN is turned off. Roy: set your own host PIN in the admin console, under Host settings.");
  if(h===L.masterHash)s={h,r:"admin"};else{const id=Object.keys(mods).find(k=>mods[k].pinHash===h);if(id)s={h,id,r:"mod"};else if(D.meta&&D.meta.pinHash===h)s={h,r:"shared"}}
  if(!s)return toast("That PIN isn't right");store.set("mod_"+EV,s);L.kicked=false;L.drafts.pin="";checkAuth();render(true)},
 modSignOut:()=>{store.set("mod_"+EV,null);checkAuth();render(true)},
 addMod:async el=>{const code=el.dataset.code||EV,p=(dv("nm_pin_"+code,"")).trim(),n=(dv("nm_name_"+code,"")).trim();if(!n)return toast("Type the moderator's name");if(p.length<4)return toast("Use at least 4 digits for their PIN");
  const h=await hashPin(p);if(h===L.masterHash)return toast("Pick a PIN that's different from the host PIN");const mods=(code===EV?D.mods:(D.hostMods||{})[code])||{};if(Object.values(mods).some(x=>x.pinHash===h))return toast("Another moderator already uses that PIN");
  await ER("mods",code).push({name:n.slice(0,30),pinHash:h,t:Date.now()});L.drafts["nm_pin_"+code]="";L.drafts["nm_name_"+code]="";toast(`${n} can now sign in with their PIN`);render(true)},
 delMod:el=>{const code=el.dataset.code||EV;ER("mods/"+el.dataset.id,code).remove();toast("Removed. Their phone is signed out right away.")},
 sharedOff:el=>{ER("meta/pinHash",el.dataset.code||EV).remove();toast("Shared PIN turned off. Anyone who used it is signed out.")},
 sharedSet:async el=>{const code=el.dataset.code||EV,p=(dv("sp_"+code,"")).trim();if(p.length<4)return toast("Use at least 4 digits");await ER("meta/pinHash",code).set(await hashPin(p));L.drafts["sp_"+code]="";toast("Shared PIN set")},
 freshOpt:el=>{L.freshOpt=Object.assign({archive:true,download:true,content:false},L.freshOpt,{[el.dataset.k]:el.checked});},
 freshGo:async el=>{const code=el.dataset.code||EV;if((dv("fr_"+code,"")).trim()!=="RESET")return toast("Type RESET in capitals to confirm");L.freshing=true;render(true);
  try{await startFresh(code,Object.assign({archive:true,download:true,content:false},L.freshOpt||{}));L.drafts["fr_"+code]="";toast("Done. The event is ready for a fresh start.")}catch(e){toast("Couldn't finish: "+e.message)}L.freshing=false;L.confirm=null;render(true)},
 arcView:el=>{L.arcOpen=L.arcOpen===el.dataset.k?null:el.dataset.k;render(true)},
 arcDownload:async el=>{const [code,t]=el.dataset.k.split("|");const a=(await RT(`archives/${code}/${t}`).once("value")).val();if(a)download(`${code}-archive-${new Date(+t).toISOString().slice(0,10)}.json`,new Blob([JSON.stringify({event:code,name:a.name,t:+t,data:JSON.parse(a.data||"{}")})],{type:"application/json"}))},
 arcRestore:async el=>{const [code,t]=el.dataset.k.split("|");if(L.confirm!=="arc:"+el.dataset.k){L.confirm="arc:"+el.dataset.k;return render(true)}const a=(await RT(`archives/${code}/${t}`).once("value")).val();if(!a)return;const data=JSON.parse(a.data||"{}");const u={};Object.keys(data).forEach(k=>u[k]=data[k]);await ER("",code).update(u);L.confirm=null;toast("Restored into "+code);render(true)},
 arcDelete:el=>{const [code,t]=el.dataset.k.split("|");if(L.confirm!=="arcdel:"+el.dataset.k){L.confirm="arcdel:"+el.dataset.k;return render(true)}RT(`archives/${code}/${t}`).remove();L.confirm=null;toast("Archive deleted")},
 hostOpen:el=>{const k=el.dataset.k;L.hostOpen=L.hostOpen===k?null:k;if(L.hostOpen)watchHostEvent(k);render(true)},
 adultToggle:el=>{const code=el.dataset.code||EV;const cur=code===EV?!!C().adultOn:!!((D.hostEv||{})[code]||{}).adultOn;ER("content/adultOn",code).set(!cur);toast(!cur?"21+ section is on for "+code:"21+ section is off")},
 /* invite codes */
 invNew:()=>{const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";const code=[...Array(8)].map(()=>A[rnd(A.length)]).join("");RT("invites/"+code).set({label:(dv("inv_label","")).trim()||"Invite",max:1,used:0,active:true,t:Date.now()});L.drafts.inv_label="";toast("Invite code "+code+" created")},
 invToggle:el=>{const v=(D.invites||{})[el.dataset.k];if(v)RT(`invites/${el.dataset.k}/active`).set(!v.active)},
 invDel:el=>RT("invites/"+el.dataset.k).remove(),
 /* new-event page */
 nwCheck:async()=>{const box=document.querySelector('[data-draft="nw_inv"]');const code=String((box&&typeof box.value==="string"&&box.value)||dv("nw_inv",QS.get("invite")||"")).toUpperCase().replace(/[^A-Z0-9]/g,"");if(!code)return toast("Type your invite code");L.drafts.nw_inv=code;const v=(await RT("invites/"+code).once("value")).val();
  if(!v||!v.active)return toast("That invite code isn't valid. Ask the host for a new one.");if((v.used||0)>=1||v.event)return toast("That invite code has already been used.");L.newInv=code;render(true)},
 nwType:el=>{L.drafts.nw_type=el.value;const t=EVENT_TEMPLATES[L.drafts.nw_tpl];if(t&&t.type!==el.value)delete L.drafts.nw_tpl;render(true)},
 nwImg:el=>{const f=el.files[0];if(!f)return;shrinkImage(f,640,.72,img=>{L.drafts.nw_image=img;extractPalette(img,pal=>{L.palette=pal;const th=autoTheme(pal);Object.keys(th).forEach(k=>L.drafts["ts_c_"+k]=th[k]);previewTheme("ts_");render(true)})})},
 nwCreate:async()=>{const d=k=>(L.drafts[k]||"").trim();const name=d("nw_name"),pin=d("nw_pin"),you=d("nw_you");
  if(!name)return toast("Give your event a name");if(!you)return toast("Type your name");if(pin.length<4)return toast("Choose a PIN with at least 4 digits");
  const inv=L.newInv,plu=L.newPl;let hu=null,hprof=null,asHost=false;
  if(nwAcctOn()){const a=AUTH();hu=a.currentUser;
   /* check the invite code before making an account, so a used code doesn't leave an account with no event */
   const iv=await RT("invites/"+inv).once("value").then(x=>x.val()).catch(()=>null);if(!iv||!iv.active||(iv.used||0)>=1||iv.event)return toast("That invite code can't be used any more. Ask the host for a new one.");
   if(!hu){const em=d("nw_email"),pw=nwPw();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return toast("Type your email for your account");if(pw.length<8)return toast("Choose a password with at least 8 characters");
    try{hu=(await a.createUserWithEmailAndPassword(em,pw)).user}catch(e){return toast(authErr(e))}}
   hprof=await RT("planners/"+hu.uid+"/profile").once("value").then(x=>x.val()).catch(()=>null);
   /* planners and the owner use the same sign-in: only a new account or a host account becomes the event's host.
      A planner's event is added to their portal as usual (keeping Plan in the console); the owner's isn't linked at all. */
   const own=await RT("owner").once("value").then(x=>x.val()).catch(()=>null);
   asHost=hprof?hprof.kind==="host":hu.uid!==own;if(!asHost&&!hprof)hu=null}
  /* a transaction first runs on the phone's local copy, which can be empty (null) before the server answers.
     Returning null there lets Firebase fetch the real code and run this again, instead of giving up. */
  const ok=plu?true:await new Promise(res=>RT("invites/"+inv).transaction(v=>{if(v===null)return null;if(!v.active||(v.used||0)>=1||v.event)return;v.used=1;if(asHost)v.host=hu.uid;return v},(e,c,snap)=>{const x=snap&&snap.val();res(!e&&c&&!!x&&x.used===1&&!x.event)}));
  if(!ok)return toast("That invite code can't be used any more. Ask the host for a new one.");
  if(asHost&&!hprof){const pr={kind:"host",name:you.slice(0,40),email:hu.email||"",code:inv,t:Date.now()};
   try{await RT("planners/"+hu.uid+"/profile").set(pr);await RT("plist/"+hu.uid).set({name:pr.name,biz:"",email:pr.email,kind:"host",t:pr.t})}catch(e){return toast("We couldn't set up your account. Try again in a moment.")}
   store.set("hmRoles",{uid:hu.uid,roles:["planner"],host:true})}
  let code=d("nw_code").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);const taken=async c=>!!(await ER("meta",c).once("value")).val()||!!(await RT("index/"+c).once("value")).val();
  if(code&&await taken(code))code="";
  if(!code){const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";do{code=[...Array(5)].map(()=>A[rnd(A.length)]).join("")}while(await taken(code))}
  const type=L.drafts.nw_type||"baby";const content=templateFor(type,name);const hon=d("nw_hon"),date=d("nw_date");
  Object.assign(content,{title:name,honorees:hon,date,tagline:d("nw_tag")||[hon?`Celebrating ${hon}`:"",date?fmtDate(date):""].filter(Boolean).join(" · "),themeDesc:(content.themeDesc||"a celebration")});
  if(L.newPl&&L.drafts.nw_tpl){if(!d("nw_tag"))content.tagline="";tplApply(content,L.drafts.nw_tpl,hon,date);if(!content.tagline)content.tagline=[hon?`Celebrating ${hon}`:"",date?fmtDate(date):""].filter(Boolean).join(" · ")}
  if(L.drafts.nw_image)content.image=L.drafts.nw_image;Object.assign(content,themeFromDrafts("ts_"));
  const tm=Date.now(),h=await hashPin(pin),u={};
  u["events/"+code+"/meta"]={name,created:tm,invite:inv,setup:{type:true}};u["events/"+code+"/content"]=content;if(plu){u["events/"+code+"/meta"].invite=null;u["events/"+code+"/meta"].planner=plu;u["index/"+code]={name,created:tm,planner:plu,by:you.slice(0,30)};u["planners/"+plu+"/events/"+code]={name,created:tm}}
  else{u["index/"+code]={name,created:tm,invite:inv,by:you.slice(0,30)};u["invites/"+inv+"/event"]=code;u["invites/"+inv+"/eventName"]=name;u["invites/"+inv+"/usedAt"]=tm;
   /* the event belongs to the host's account: it shows in their dashboard, and Plan moves there (meta.host) */
   if(hu){u["events/"+code+"/meta"].planner=hu.uid;if(asHost)u["events/"+code+"/meta"].host=true;u["index/"+code].planner=hu.uid;u["planners/"+hu.uid+"/events/"+code]={name,created:tm}}}
  const mid=ER("mods",code).push().key;u["events/"+code+"/mods/"+mid]={name:you.slice(0,30),pinHash:h,t:tm,owner:true};
  await db.ref(ROOT).update(u);store.set("mod_"+code,{h,id:mid,r:"mod"});location.href=eventURL(code,"moderator")},
 /* theme studio */
 tsChip:el=>{L.drafts[el.dataset.k]=el.dataset.c;previewTheme(el.dataset.p);render(true)},
 tsImg:el=>{const f=el.files[0];if(!f)return;shrinkImage(f,640,.72,img=>{L.drafts.ts_image=img;extractPalette(img,pal=>{L.palette=pal;render(true)})})},
 tsAuto:el=>{const p=el.dataset.p;if(!L.palette||!L.palette.length)return toast("Upload a picture first, or pick colors by hand");const th=autoTheme(L.palette);Object.keys(th).forEach(k=>L.drafts[p+"c_"+k]=th[k]);previewTheme(p);render(true)},
 tsSave:async()=>{const u=themeFromDrafts("ts_");if(L.drafts.ts_image)u.image=L.drafts.ts_image;if(L.palette)u.palette=L.palette;await ER("content").update(u);Object.keys(L.drafts).filter(k=>k.startsWith("ts_")).forEach(k=>delete L.drafts[k]);toast("Look saved on every screen");render(true)},
 tsReset:el=>{const p=el.dataset.p;Object.keys(L.drafts).filter(k=>k.startsWith(p)).forEach(k=>delete L.drafts[k]);applyTheme();render(true)}
});
async function startFresh(code,o){const snap=(await ER("",code).once("value")).val()||{};const t=Date.now();
 const data={};["players","scores","team","wishes","album","albumFull","photos","badges","orders","sips","streak"].forEach(k=>{if(snap[k])data[k]=snap[k]});if(snap.state&&snap.state.teamNames)data.state={teamNames:snap.state.teamNames};
 const summary={players:Object.keys(data.players||{}).length,photos:Object.keys(data.album||{}).length,wishes:Object.keys(data.wishes||{}).length,teams:data.team||{}};
 if(o.archive)await RT(`archives/${code}/${t}`).set({name:(snap.meta||{}).name||code,t,summary,data:JSON.stringify(data)});
 if(o.download)download(`${code}-backup-${new Date(t).toISOString().slice(0,10)}.json`,new Blob([JSON.stringify({event:code,name:(snap.meta||{}).name||code,t,data})],{type:"application/json"}));
 const keep={meta:snap.meta||null,mods:snap.mods||null,secret:snap.secret||null,music:snap.music||null,musicData:snap.musicData||null,decks:snap.decks||null,deckImg:snap.deckImg||null,deckThumb:snap.deckThumb||null};
 if(!o.content){keep.content=snap.content||null;keep.honor=snap.honor||null;keep.honorFull=snap.honorFull||null}else keep.content=templateFor(((snap.content||{}).eventType)||"baby",(snap.meta||{}).name);
 await ER("",code).set(keep)}
function freshPanel(code){const o=Object.assign({archive:true,download:true,content:false},L.freshOpt||{});
 return `<div class="stack tight"><p class="small muted m0">Clears every player, score, photo, wish, vote, order and game for <b>${esc(code)}</b>. Songs aren't saved in the archive.</p>
 <label class="row small"><input type="checkbox" data-act="freshOpt" data-k="archive" ${o.archive?"checked":""}> Save an archive in the admin console (you can restore it later)</label>
 <label class="row small"><input type="checkbox" data-act="freshOpt" data-k="download" ${o.download?"checked":""}> Download a backup file to this device</label>
 <label class="row small"><input type="checkbox" data-act="freshOpt" data-k="content" ${o.content?"checked":""}> Also clear the content (questions, moments, colors, your photos)</label>
 <div class="row"><span class="small">Type RESET to confirm:</span><input type="text" class="w110" data-draft="fr_${esc(code)}" value="${esc(dv("fr_"+code,""))}"><button class="btn primary" data-act="freshGo" data-code="${esc(code)}">${L.freshing?"Working…":"Start fresh"}</button></div></div>`}
function modsPanel(code,mods,meta){const ms=mods||{},keys=Object.keys(ms).sort((a,b)=>(ms[a].t||0)-(ms[b].t||0));
 return `<div class="stack tight">${keys.length?keys.map(k=>`<div class="row between small"><span><b>${esc(ms[k].name)}</b> <span class="muted">· added ${new Date(ms[k].t||0).toLocaleDateString()}</span>${ms[k].owner?' <span class="pill">created the event</span>':""}</span>${ms[k].owner&&!L.isAdmin?"":`<button class="btn xs" data-act="delMod" data-code="${esc(code)}" data-id="${k}">Remove</button>`}</div>`).join(""):'<span class="small muted">No personal moderators yet.</span>'}
 <div class="row"><input type="text" class="grow" placeholder="Moderator's name" data-draft="nm_name_${esc(code)}" value="${esc(dv("nm_name_"+code,""))}"><input type="password" inputmode="numeric" placeholder="Their PIN" class="w110" data-draft="nm_pin_${esc(code)}" value="${esc(dv("nm_pin_"+code,""))}"><button class="btn sm primary" data-act="addMod" data-code="${esc(code)}">Add moderator</button></div>
 <div class="row between small"><span>Shared event PIN: <b>${meta&&meta.pinHash?"on":"off"}</b> <span class="muted">(anyone with it can moderate)</span></span>${meta&&meta.pinHash?`<button class="btn xs" data-act="sharedOff" data-code="${esc(code)}">Turn off and sign everyone out</button>`:`<span class="row"><input type="password" inputmode="numeric" class="w110" placeholder="New shared PIN" data-draft="sp_${esc(code)}"><button class="btn xs" data-act="sharedSet" data-code="${esc(code)}">Set</button></span>`}</div></div>`}
function watchHostEvent(code){D.hostMods=D.hostMods||{};D.hostMeta=D.hostMeta||{};D.hostEv=D.hostEv||{};if(D.hostMods["_w"+code])return;D.hostMods["_w"+code]=1;
 ER("mods",code).on("value",s=>{D.hostMods[code]=s.val()||{};renderSoon()});ER("meta",code).on("value",s=>{D.hostMeta[code]=s.val()||{};renderSoon()});ER("content/adultOn",code).on("value",s=>{D.hostEv[code]={adultOn:!!s.val()};renderSoon()});
 RT("archives/"+code).on("value",s=>{D.archives=D.archives||{};D.archives[code]=s.val()||{};renderSoon()})}
function archiveList(code){const a=(D.archives||{})[code]||{};const ks=Object.keys(a).sort((x,y)=>y-x);if(!ks.length)return '<span class="small muted">No archives yet. Start fresh saves one.</span>';
 return ks.map(t=>{const x=a[t],k=code+"|"+t,s=x.summary||{};return `<div class="row between small"><span><b>${new Date(+t).toLocaleString()}</b> · ${s.players||0} players · ${s.photos||0} photos · ${s.wishes||0} wishes</span><span class="row"><button class="btn xs" data-act="arcDownload" data-k="${k}">Download</button>${L.confirm==="arc:"+k?'<span>Replace current players and results?</span>':""}<button class="btn xs ${L.confirm==="arc:"+k?"gold":""}" data-act="arcRestore" data-k="${k}">${L.confirm==="arc:"+k?"Yes, restore":"Restore"}</button><button class="btn xs ${L.confirm==="arcdel:"+k?"gold":""}" data-act="arcDelete" data-k="${k}">${L.confirm==="arcdel:"+k?"Yes, delete":"Delete"}</button></span></div>`}).join("")}

/* --- admin console views --- */
function hEvents(){const ev=D.events||{},def=D.admin.defaultEvent;const keys=Object.keys(ev).sort((a,b)=>(ev[b].created||0)-(ev[a].created||0));
 return `<section class="card stack"><div class="row between"><h2>Your events</h2><span class="small muted">You're the administrator. Moderators work under you.</span></div>${keys.length?keys.map(k=>{const open=L.hostOpen===k;
  return `<div class="gamerow evrow ${open?"on":""}"><span class="gnum">${def===k?"★":""}</span><div class="mw0"><b>${esc(ev[k].name||k)}</b> ${ev[k].practice?'<span class="pill warn">practice</span>':""}<div class="small muted">Code ${esc(k)}${def===k?" · opens from the main link":""}${ev[k].invite?` · made with invite ${esc(ev[k].invite)}${ev[k].by?" by "+esc(ev[k].by):""}`:""}${ev[k].planner?` · in ${esc(plName(ev[k].planner))}'s planner portal`:""}</div></div>
  <div class="row">${L.confirm==="del:"+k?`<span class="small">Delete everything?</span><button class="btn sm gold" data-act="delEvent" data-k="${k}">Delete</button><button class="btn sm" data-act="cancelConfirm">Keep</button>`:`<button class="btn sm primary" data-act="openMod" data-k="${k}">Console</button><a class="btn sm" href="${esc(eventURL(k))}" target="_blank" rel="noopener">Guest view</a><a class="btn sm" href="${esc(eventURL(k,"screen"))}" target="_blank" rel="noopener">Big screen</a><button class="btn sm ${open?"gold":""}" data-act="hostOpen" data-k="${k}">${open?"Close":"Manage"}</button>${def===k?"":`<button class="btn sm" data-act="setMain" data-k="${k}">Make main</button>`}<button class="btn sm" data-act="askDel" data-k="${k}">Delete</button>`}</div>
  ${open?`<div class="stack evfull adminbox"><h3>Event code</h3>${codePanel(k)}<h3>Planner portal</h3>${plMovePanel(k,ev[k])}<h3>Moderators</h3>${modsPanel(k,(D.hostMods||{})[k],(D.hostMeta||{})[k])}
   <h3>21+ section</h3><div class="row between small"><span>Drinking games for guests who confirm they're 21 or older. Off by default.</span><button class="toggle tg-sm" data-act="adultToggle" data-code="${k}" aria-pressed="${!!((D.hostEv||{})[k]||{}).adultOn}"><span>${((D.hostEv||{})[k]||{}).adultOn?"On":"Off"}</span><i></i></button></div>
   <h3>Start fresh</h3>${freshPanel(k)}<h3>Archives</h3>${archiveList(k)}</div>`:""}</div>`}).join(""):'<p class="small muted m0">No events yet.</p>'}</section>
 <section class="card stack"><div class="row between"><h2>New events</h2><a class="btn sm primary" href="${esc(baseURL())}#new" target="_blank" rel="noopener">Open the new-event page</a></div><p class="small muted m0">New events are made on their own page, so nothing here or in your shower changes. Give people an invite code from the Invite codes tab.</p></section>`}
function hInvites(){const v=D.invites||{},ks=Object.keys(v).sort((a,b)=>(v[b].t||0)-(v[a].t||0));
 return `<section class="card stack"><h2>Invite codes</h2><p class="small muted m0">Each code lets one person create one event and pick their own moderator PIN. Once it's used, it's spent. You can open and change any event made with your codes.</p>
 <div class="row"><input type="text" class="grow" placeholder="Who it's for, like Cousin Tasha" data-draft="inv_label" value="${esc(dv("inv_label",""))}"><button class="btn primary" data-act="invNew">Make a code</button></div>
 ${ks.length?ks.map(k=>{const x=v[k],used=!!x.event||(x.used||0)>=1,ev=x.event&&(D.events||{})[x.event];
  const status=used?(x.event?`Used for <b>${esc(x.eventName||(ev&&ev.name)||x.event)}</b> · code ${esc(x.event)}${ev?"":" · event deleted"}`:"Used"):(x.active?"Not used yet":"Cancelled");
  const btns=used?(ev?`<button class="btn sm primary" data-act="openMod" data-k="${esc(x.event)}">Open event</button>`:"")+`<button class="btn sm" data-act="invDel" data-k="${k}">Remove</button>`
   :x.active?`<button class="btn sm" data-act="copyLink" data-url="${esc(baseURL()+"?invite="+k+"#new")}">Copy link</button><button class="btn sm" data-act="invToggle" data-k="${k}">Cancel</button>`
   :`<button class="btn sm" data-act="invToggle" data-k="${k}">Turn back on</button><button class="btn sm" data-act="invDel" data-k="${k}">Remove</button>`;
  return `<div class="gamerow evrow ${!used&&!x.active?"dim":""}"><span class="gnum">🎟️</span><div class="mw0"><b class="mono">${k}</b> · ${esc(x.label||"")}<div class="small muted">${status}</div></div><div class="row">${btns}</div></div>`}).join(""):'<p class="small muted m0">No codes yet.</p>'}</section>`}
function hArchives(){const ev=D.events||{};Object.keys(ev).forEach(watchHostEvent);
 return `<section class="card stack"><h2>Archives</h2><p class="small muted m0">Saved copies of events from Start fresh: players, scores, wishes and photos. Download, restore or delete them.</p>${Object.keys(ev).map(k=>`<div class="stack tight"><h3>${esc(ev[k].name||k)} · ${esc(k)}</h3>${archiveList(k)}</div>`).join("")}</section>`}

/* --- new-event page (#new) --- */
function newEventView(){
 if(!L.loaded)return loadingView();
 if(!L.newInv)return `<section class="card stack narrow"><div class="eyebrow">Create your event</div><h2>Enter your invite code</h2><p class="small muted m0">Ask the host for a code. It lets you set up your own event with its own links.</p><input type="text" data-draft="nw_inv" value="${esc(dv("nw_inv",QS.get("invite")||""))}" autocapitalize="characters" placeholder="Invite code"><button class="btn primary" data-act="nwCheck">Continue</button>${legalFoot()}</section>`;
 const type=L.drafts.nw_type||"baby";const fld=(k,l,ph,tp)=>`<label class="stack tight"><span class="small"><b>${l}</b></span><input type="${tp||"text"}" data-draft="${k}" value="${esc(dv(k,""))}" placeholder="${esc(ph||"")}"></label>`;
 return `<section class="card stack"><div class="eyebrow">Create your event</div><h2>Let's set up your party</h2><p class="small muted m0">Your event starts from a complete template: games, moments, a reveal and an evening order. You get your own links, and you can change anything later.</p></section>
 ${L.newPl?nwTplSection():""}
 <section class="card stack"><h2>1. Your event</h2><label class="stack tight"><span class="small"><b>Event type</b> ${hint("eventType")}</span><select data-act="nwType">${Object.keys(EVENT_TYPES).map(k=>`<option value="${k}" ${type===k?"selected":""}>${EVENT_TYPES[k].label}</option>`).join("")}</select></label>
 <div class="grid2 g8">${fld("nw_name","Event name","Kim & Lee's Wedding")}${fld("nw_hon","Guests of honor","Kim & Lee")}${fld("nw_date","Date","","date")}${fld("nw_tag","Line under the title (optional)","Celebrating Kim & Lee · June 14")}</div></section>
 <section class="card stack"><h2>2. Look and feel</h2><div class="row top g16">${L.drafts.nw_image?`<img class="invite" src="${L.drafts.nw_image}" alt="">`:'<div class="invite ph0">Flyer or picture</div>'}<div class="stack grow mw200"><p class="small muted m0">Upload your flyer or invitation. We pull up to 8 colors from it and build a matching look. Then fine-tune any part below.</p><label class="btn upl as">Upload a picture<input type="file" accept="image/*" data-act="nwImg"></label></div></div>${themeStudio("ts_",true)}</section>
 <section class="card stack"><h2>3. You</h2><p class="small muted m0">You'll be this event's first moderator. Keep your PIN private.</p><div class="grid2 g8">${fld("nw_you","Your name","Tasha")}${fld("nw_pin","Your moderator PIN","4 or more digits","password")}${fld("nw_code","Event code (optional)","Leave blank to make one")}</div>${nwAcctBox()}
 <button class="btn primary big" data-act="nwCreate">Create my event</button><p class="small muted m0">Next, your console opens with a setup checklist and a quick tour.</p>${legalFoot()}</section>`}
/* hosts get their own account with the event: an email and password open their event dashboard (My events, Plan, Stay & Go).
   Planners creating from their portal (L.newPl), demos and offline test copies (no sign-in) skip this. */
const nwAcctOn=()=>!L.newPl&&!!AUTH()&&!window.__HMDEMO&&!window.__HMPDEMO;
const nwPw=()=>{const el=document.querySelector('[data-draft="nw_pw"]');return el?el.value:""};
function nwAcctBox(){if(!nwAcctOn())return "";
 if(L.user)return `<div class="banner soft"><span>Signed in as <b>${esc(L.user.email||"")}</b>. This event will be added to your account.</span></div>`;
 if(L.acMode==="signin")return `<div class="stack tight"><h3 class="m0">Sign in to your account</h3>${acctForm("signin")}<button class="btn xs as" data-act="acMode" data-k="new">I need a new account</button></div>`;
 return `<div class="stack tight"><h3 class="m0">Your account</h3><p class="small muted m0">Your email and password open your event dashboard on any phone or computer. That's where you plan your event and its travel. Your PIN is still how helpers open the console on the night.</p>
  <div class="grid2 g8"><label class="stack tight"><span class="small"><b>Your email</b></span><input type="email" data-draft="nw_email" value="${esc(dv("nw_email",""))}" autocomplete="email"></label><label class="stack tight"><span class="small"><b>Choose a password</b> (8 or more characters)</span><input type="password" data-draft="nw_pw" value="" autocomplete="new-password"></label></div>
  <button class="btn xs as" data-act="acMode" data-k="signin">I already have an account</button></div>`}
const fmtDate=s=>{const d=new Date(s+"T12:00:00");return isNaN(d)?s:d.toLocaleDateString("en-US",{month:"long",day:"numeric"})};
/* ---- ready-made events for planners ----
   Each one sets the look (every theme color and the fonts), the theme description, the line under the title,
   the moments and their wording, the order of the night, a timed run of show, the reveal and which games are on.
   Picking one fills the theme studio below it, so the planner can still change anything before creating the event. */
const RS=(time,title,note)=>({time,title,note:note||""});
const EVENT_TEMPLATES={
 garden:{type:"baby",name:"Enchanted Garden Baby Shower",about:"Soft greens and blush, wildflowers and songbirds. A relaxed afternoon brunch shower.",
  tag:"Celebrating {honorees} · {date}",themeDesc:"a baby shower with an enchanted garden theme: wildflowers, songbirds and soft greenery",
  colors:{bar:"#3f6b3a",ground:"#f5f8f0",card:"#ffffff",line:"#d7e3cc",ink:"#22301f",muted:"#5c6a56",hd:"#3f6b3a",hd2:"#a14a74",btn1:"#5e8c4f",btn2:"#3f6b3a",rose:"#d96f9b",flame:"#e39a62",gold:"#c79a1e",violet:"#8a6bb8",leaf:"#4f8a4c"},
  fonts:{title:"Dancing Script",head:"Cormorant Garamond",body:"Nunito",size:15},
  moments:[MOM("welcome","Welcome","Welcome to the garden","Celebrating {honorees} and the little one on the way","ah"),MOM("brunch","Brunch","Brunch is served","Help yourself, and keep snapping photos for the album","ahw"),MOM("wisdom","Words of wisdom","Words of wisdom","Your advice and wishes for {honorees}","w"),MOM("gifts","Gift opening","Gift opening","Gather round as {honorees} open their gifts","ah"),MOM("cake","Cake","Time for cake!","","ah"),MOM("farewell","Farewell","Thank you for helping our garden grow","With love from {honorees}","ahw")],
  reveal:{enabled:false,kind:"gender",label:"Boy or girl?",answer:"girl",sub:""},
  order:["m:welcome","g:split","g:longword","g:hunt","m:brunch","g:trivia","m:wisdom","m:gifts","g:crossword","g:sup","reveal","g:bingo","m:cake","winner","m:farewell"],
  ros:[RS("11:00","Doors open","Greet guests and point them to the wish cards."),RS("11:15","Team Splitter and Long Word Wins","Icebreakers. Start them from the Live tab."),RS("11:30","Open the Scavenger Hunt","It runs in the background all afternoon."),RS("11:45","Brunch is served","Show the Brunch moment on the big screen."),RS("12:15","Trivia"),RS("12:40","Words of wisdom","Show the guests' wishes on the big screen."),RS("12:50","Gift opening","Log each gift on the Tonight tab for the thank-you notes."),RS("13:30","Crossword and Superlatives"),RS("13:50","Bingo, then crown the winners"),RS("14:10","Cake"),RS("14:30","Farewell and cleanup","Hand out favors at the door.")]},
 blacktie:{type:"wedding",name:"Black-Tie Wedding Reception",about:"Navy, ivory and gold. Cocktail hour, grand entrance, dinner, toasts and dancing.",
  tag:"The wedding of {honorees} · {date}",themeDesc:"an elegant black-tie wedding reception in navy, ivory and gold",
  colors:{bar:"#14213d",ground:"#f8f5ee",card:"#fffdf8",line:"#e3d9c3",ink:"#141b2d",muted:"#5a6072",hd:"#14213d",hd2:"#8a6a1f",btn1:"#1f3461",btn2:"#14213d",rose:"#b08968",flame:"#c99a4b",gold:"#c9a227",violet:"#3d4f7c",leaf:"#5b7f6a"},
  fonts:{title:"Great Vibes",head:"Playfair Display",body:"Lato",size:15},
  games:{crossword:false},
  moments:[MOM("cocktail","Cocktail hour","Welcome to cocktail hour","The newlyweds will join you shortly","ah"),MOM("entrance","Grand entrance","Please welcome the newlyweds!","{honorees}","h"),MOM("firstdance","First dance","Their first dance","{honorees}","h"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("toasts","Toasts","Raise your glasses","Toasts to the happy couple","hw"),MOM("parents","Parent dances","A dance with the parents","","h"),MOM("cake","Cake cutting","Cake cutting","","ah"),MOM("lastdance","Last dance","One last dance","Thank you for celebrating with us. With love, {honorees}","ahw")],
  reveal:{enabled:false,kind:"text",label:"Where's the honeymoon?",answer:"",sub:"Bon voyage!"},
  order:["m:cocktail","g:split","g:longword","g:hunt","m:entrance","m:firstdance","m:dinner","g:trivia","m:toasts","m:parents","g:sup","m:cake","reveal","g:bingo","winner","m:lastdance"],
  ros:[RS("17:00","Cocktail hour","Guests arrive from the ceremony. Show the Cocktail hour moment."),RS("17:10","Team Splitter and Long Word Wins","Icebreakers while guests mingle."),RS("17:20","Open the Scavenger Hunt","It runs in the background all night."),RS("18:00","Grand entrance","Cue the DJ, then show the Grand entrance moment."),RS("18:05","First dance"),RS("18:15","Dinner is served"),RS("18:45","Trivia","Play between courses."),RS("19:00","Toasts","Best man, maid of honor, then the parents."),RS("19:20","Parent dances"),RS("19:30","Superlatives and open dancing"),RS("20:15","Cake cutting"),RS("21:30","Bingo, then crown the winners"),RS("22:00","Last dance and send-off","Sparklers or bubbles at the exit.")]},
 golden:{type:"anniversary",name:"Golden Anniversary Dinner",about:"Gold, cream and deep burgundy. A seated dinner honoring decades together.",
  tag:"Celebrating {honorees} · {date}",themeDesc:"a golden anniversary dinner in gold, cream and burgundy, honoring a lifetime together",
  colors:{bar:"#5b1a2a",ground:"#fbf7ee",card:"#fffdf7",line:"#eadcb8",ink:"#2a1a16",muted:"#6b5a52",hd:"#7a2335",hd2:"#8a6a1f",btn1:"#8c2a3f",btn2:"#5b1a2a",rose:"#b5485d",flame:"#c98a4b",gold:"#c9a227",violet:"#6d3b5e",leaf:"#6a7f4f"},
  fonts:{title:"Cinzel",head:"Cormorant Garamond",body:"Lato",size:16},
  games:{longword:false,crossword:false},
  moments:[MOM("welcome","Welcome","Welcome to the anniversary dinner","Celebrating {honorees}","ah"),MOM("years","Through the years","Through the years","{honorees}","h"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("story","Their story","How it all began","The story of {honorees}","h"),MOM("toasts","Toasts","Raise your glasses","To many more years","hw"),MOM("cake","Cake","Time for cake!","","ah"),MOM("farewell","Farewell","Thank you for celebrating with us","With love, {honorees}","ahw")],
  reveal:{enabled:false,kind:"number",label:"How many years together?",answer:"50",sub:"years together"},
  order:["m:welcome","g:split","g:hunt","m:years","m:dinner","g:trivia","m:story","m:toasts","reveal","g:sup","m:cake","g:bingo","winner","m:farewell"],
  ros:[RS("18:00","Guests arrive","Greet guests and seat the family up front."),RS("18:15","Team Splitter","A gentle icebreaker for each table."),RS("18:20","Open the Scavenger Hunt"),RS("18:30","Through the years","Play the photo slideshow on the big screen."),RS("18:45","Dinner is served"),RS("19:30","Trivia about the couple"),RS("19:50","Their story","A family member tells how they met."),RS("20:00","Toasts"),RS("20:15","The reveal: how many years together?"),RS("20:20","Superlatives"),RS("20:35","Cake"),RS("20:50","Bingo, then crown the winners"),RS("21:15","Farewell","Hand out favors and take a family photo.")]},
 neon:{type:"birthday",name:"Neon Glow Birthday Bash",about:"Hot pink, electric blue and lime on a dark background. Music, games and a big birthday moment.",
  tag:"{honorees}'s birthday bash · {date}",themeDesc:"a neon glow birthday party with hot pink, electric blue and lime on a dark background",
  colors:{bar:"#120d24",ground:"#120d24",card:"#1d1638",line:"#3a2f6b",ink:"#f5f2ff",muted:"#bdb4dd",hd:"#ff5cdb",hd2:"#5ce1ff",btn1:"#d6249f",btn2:"#6a3cff",rose:"#ff5cdb",flame:"#ff8a3d",gold:"#ffe14f",violet:"#8b6bff",leaf:"#3dffa2"},
  fonts:{title:"Pacifico",head:"Fredoka",body:"Poppins",size:15},glow:true,
  moments:[MOM("welcome","Welcome","Let's glow!","Happy birthday, {honorees}","ah"),MOM("dancefloor","Dance floor","The dance floor is open","","a"),MOM("dinner","Food","Food is ready","","ahw"),MOM("cake","Make a wish","Make a wish!","Happy birthday, {honorees}","ah"),MOM("toasts","Toasts","Raise your glasses","To {honorees}","hw"),MOM("farewell","Farewell","Thanks for coming!","","ahw")],
  reveal:{enabled:false,kind:"number",label:"How old?",answer:"30",sub:"and still glowing"},
  order:["m:welcome","g:split","g:longword","g:hunt","m:dinner","g:trivia","m:dancefloor","g:sup","g:crossword","reveal","m:toasts","m:cake","g:bingo","winner","m:farewell"],
  ros:[RS("19:00","Doors open","Hand out glow sticks at the door."),RS("19:15","Team Splitter and Long Word Wins"),RS("19:30","Open the Scavenger Hunt"),RS("19:45","Food is ready"),RS("20:15","Trivia about the birthday star"),RS("20:45","Dance floor opens","Cue the DJ and show the Dance floor moment."),RS("21:30","Superlatives and Crossword"),RS("21:50","The reveal: how old?"),RS("21:55","Toasts"),RS("22:00","Make a wish","Lights down, candles lit, everyone sings."),RS("22:20","Bingo, then crown the winners"),RS("23:00","Farewell and cleanup")]},
 awards:{type:"corporate",name:"Company Awards Night",about:"Deep navy, teal and silver. Networking, dinner, keynote and an awards ceremony.",
  tag:"{honorees} · {date}",themeDesc:"a polished company awards night in deep navy, teal and silver",
  colors:{bar:"#0b1f3a",ground:"#f3f6f9",card:"#ffffff",line:"#d5dee8",ink:"#0f1b2d",muted:"#536173",hd:"#0b1f3a",hd2:"#0f7c80",btn1:"#0f7c80",btn2:"#0b1f3a",rose:"#d0566c",flame:"#e0873a",gold:"#b8a46a",violet:"#3b5b92",leaf:"#2f8f6b"},
  fonts:{title:"Playfair Display",head:"Montserrat",body:"Source Sans 3",size:15},glow:false,
  games:{longword:false,crossword:false},
  moments:[MOM("welcome","Welcome","Welcome","{honorees}","ah"),MOM("networking","Networking","Networking reception","Grab a drink and meet someone new","a"),MOM("remarks","Opening remarks","Opening remarks","","h"),MOM("dinner","Dinner","Dinner is served","","a"),MOM("keynote","Keynote","Our keynote","","h"),MOM("awards","Awards","Awards","Celebrating our team","h"),MOM("closing","Closing","Thank you for joining us","","a")],
  reveal:{enabled:false,kind:"award",label:"And the award goes to…",answer:"",sub:"Employee of the Year"},
  order:["m:welcome","m:networking","g:split","g:hunt","m:remarks","m:dinner","g:trivia","m:keynote","m:awards","reveal","g:sup","g:bingo","winner","m:closing"],
  ros:[RS("18:00","Registration and networking","Check guests in and hand out name badges."),RS("18:15","Team Splitter","Mixes departments into teams."),RS("18:20","Open the Scavenger Hunt"),RS("18:45","Opening remarks"),RS("19:00","Dinner is served"),RS("19:30","Company trivia","Play between courses."),RS("19:50","Keynote"),RS("20:15","Awards ceremony","Show each award on the big screen."),RS("20:45","The big award reveal"),RS("20:50","Superlatives"),RS("21:00","Bingo, then crown the winners"),RS("21:20","Closing","Thank sponsors and staff.")]}
};
function tplFill(s,hon,date){return String(s||"").replace(/\{honorees\}/g,hon||"").replace(/\{date\}/g,date?fmtDate(date):"").replace(/\s*·\s*$/,"").replace(/^\s*·\s*/,"").replace(/^'s /,"").trim()}
function nwTplSection(){const cur=L.drafts.nw_tpl||"";
 return `<section class="card stack"><h2>Start from a ready-made event</h2><p class="small muted m0">Each one comes with its own look, moments, games and a timed run of show. Pick one, then change anything you like below.</p>
 <div class="stack tight">${Object.keys(EVENT_TEMPLATES).map(k=>{const t=EVENT_TEMPLATES[k],c=t.colors,on=cur===k;
  return `<div class="clrow ${on?"on":""}" style="${on?"outline:2px solid var(--btn1);":""}"><div class="row between"><div class="mw0"><div class="row" style="gap:4px;margin-bottom:6px">${[c.ground,c.btn1,c.rose,c.gold,c.leaf].map(x=>`<span style="width:22px;height:22px;border-radius:6px;background:${x};border:1px solid rgba(0,0,0,.15);display:inline-block"></span>`).join("")}</div><b>${esc(t.name)}</b> <span class="pill">${esc(EVENT_TYPES[t.type].label)}</span><div class="small muted">${esc(t.about)}</div></div>
  <button class="btn sm ${on?"":"primary"}" data-act="nwTpl" data-k="${k}">${on?"✓ Selected":"Use this"}</button></div></div>`}).join("")}</div>
 ${cur?`<button class="btn sm as" data-act="nwTpl" data-k="">Start from scratch instead</button>`:""}</section>`}
function tplApply(content,id,hon,date){const t=EVENT_TEMPLATES[id];if(!t||t.type!==content.eventType)return content;
 Object.assign(content,{themeDesc:t.themeDesc,moments:clone(t.moments),order:t.order.slice(),reveal:Object.assign({},(EVENT_TYPES[t.type]||{}).reveal||{},t.reveal),games:Object.assign({},ALL_GAMES_ON,t.games||{}),template:id});
 const tm=Date.now(),ros={};t.ros.forEach((x,i)=>ros["k"+tm.toString(36)+i]=Object.assign({},x,{t:tm+i}));content.ros=ros;
 if(!content.tagline)content.tagline=tplFill(t.tag,hon,date);return content}
ACT.nwTpl=el=>{const k=el.dataset.k,t=EVENT_TEMPLATES[k];
 if(!t){delete L.drafts.nw_tpl;THEME_PARTS.forEach(([p])=>delete L.drafts["ts_c_"+p]);["title","head","body","size"].forEach(r=>delete L.drafts["ts_f_"+r]);delete L.drafts.ts_glow;previewTheme("ts_");return render(true)}
 L.drafts.nw_tpl=k;L.drafts.nw_type=t.type;Object.keys(t.colors).forEach(p=>L.drafts["ts_c_"+p]=t.colors[p]);
 ["title","head","body"].forEach(r=>{if(t.fonts[r])L.drafts["ts_f_"+r]=t.fonts[r]});if(t.fonts.size)L.drafts.ts_f_size=String(t.fonts.size);if(t.glow!=null)L.drafts.ts_glow=t.glow?"1":"0";
 previewTheme("ts_");toast(t.name+" selected");render(true)};


/* --- theme studio: up to 8 colors from a picture, a color for every part of the page, fonts and text size --- */
const THEME_PARTS=[["bar","Browser bar"],["ground","Page background"],["card","Cards and panels"],["line","Borders"],["ink","Main text"],["muted","Soft text"],["hd","Headings"],["hd2","Small headings"],["btn1","Buttons, start color"],["btn2","Buttons, end color"],["rose","Accent 1"],["flame","Accent 2"],["gold","Highlight"],["violet","Accent 3"],["leaf","Accent 4"]];
/* One shared display-font list for the planner's brand font and the event's
   title/heading fonts. Body text stays Figtree everywhere — only the
   display font is choosable. */
const DISPLAY_FONTS=["Cormorant Garamond","Playfair Display","Marcellus","Lora","Montserrat","Great Vibes"];
const FONTS={title:DISPLAY_FONTS,head:DISPLAY_FONTS,body:["Figtree","Nunito","Lato","Poppins","Source Sans 3","Merriweather","Quicksand"]};
const FONT_FALL={title:'"Brush Script MT",cursive',head:"Georgia,serif",body:'system-ui,-apple-system,"Segoe UI",sans-serif'};
const hex2rgb=h=>{h=String(h||"#000").replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255]};
const rgb2hex=a=>"#"+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const mixHex=(a,b,t)=>{const x=hex2rgb(a),y=hex2rgb(b);return rgb2hex(x.map((v,i)=>v+(y[i]-v)*t))};
const lum=h=>{const c=hex2rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const sat=h=>{const [r,g,b]=hex2rgb(h).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mx?(mx-mn)/mx:0};
function extractPalette(src,cb){const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=80;const x=c.getContext("2d");x.drawImage(img,0,0,80,80);const d=x.getImageData(0,0,80,80).data,b={};
 for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const k=(d[i]>>4)+","+(d[i+1]>>4)+","+(d[i+2]>>4);const o=b[k]||(b[k]={n:0,r:0,g:0,b:0});o.n++;o.r+=d[i];o.g+=d[i+1];o.b+=d[i+2]}
 const list=Object.values(b).map(o=>({n:o.n,c:[o.r/o.n,o.g/o.n,o.b/o.n]})).sort((p,q)=>q.n-p.n),out=[];
 const dist=(p,q)=>Math.sqrt(p.reduce((s,v,i)=>s+(v-q[i])*(v-q[i]),0));
 for(const o of list){if(out.every(p=>dist(p.c,o.c)>56))out.push(o);if(out.length===8)break}
 cb(out.map(o=>rgb2hex(o.c)))};img.src=src}
function autoTheme(pal){const p=(pal||[]).slice();if(!p.length)return {};
 const byL=p.slice().sort((a,b)=>lum(b)-lum(a)),light=byL[0],dark=byL[byL.length-1];
 const vivid=p.filter(h=>lum(h)>.04&&lum(h)<.8).sort((a,b)=>sat(b)-sat(a));const acc=i=>vivid[i]||vivid[i%Math.max(1,vivid.length)]||p[i%p.length];
 const ground=lum(light)>.86?light:mixHex(acc(0),"#ffffff",.9),card=mixHex(ground,"#ffffff",.75);
 let ink=lum(dark)<.05?dark:mixHex(dark,"#000000",.55);if(contrast(ink,card)<7)ink="#1d1222";
 const darkenTo=(h,bg,r)=>{let x=h;for(let i=0;i<12&&contrast(x,bg)<r;i++)x=mixHex(x,"#000000",.12);return x};
 return {ground,card,ink,muted:mixHex(ink,card,.42),line:mixHex(acc(2),card,.72),hd:darkenTo(acc(0),card,4.5),hd2:darkenTo(acc(1),card,4),btn1:acc(0),btn2:acc(1),bar:acc(0),rose:acc(0),flame:acc(1),gold:acc(2),violet:acc(3),leaf:acc(4)}}
function curColors(){const cs=getComputedStyle(document.documentElement),c=C().colors||{},o={};THEME_PARTS.forEach(([k])=>{o[k]=c[k]||(k==="bar"?c.rose||cs.getPropertyValue("--rose").trim():k==="hd"?cs.getPropertyValue("--violet").trim():k==="hd2"?cs.getPropertyValue("--leaf").trim():k==="btn1"?cs.getPropertyValue("--rose").trim():k==="btn2"?cs.getPropertyValue("--flame").trim():cs.getPropertyValue("--"+k).trim())||"#7b3fb8"});return o}
function themeFromDrafts(p){const base=Object.assign(curColors(),C().colors||{});const colors={};THEME_PARTS.forEach(([k])=>{colors[k]=L.drafts[p+"c_"+k]||base[k]});
 const f=Object.assign({title:"Great Vibes",head:"Marcellus",body:"Figtree",size:15},C().fonts||{});["title","head"].forEach(r=>{if(L.drafts[p+"f_"+r])f[r]=L.drafts[p+"f_"+r]});f.body="Figtree";/* body text is always Figtree — only the display fonts are choosable */if(L.drafts[p+"f_size"])f.size=+L.drafts[p+"f_size"];
 const glow=L.drafts[p+"glow"]!=null?L.drafts[p+"glow"]==="1":C().glow!==false;return {colors,fonts:f,glow}}
function previewTheme(p){const t2=themeFromDrafts(p);setThemeVars(t2.colors,t2.fonts,t2.glow)}
function setThemeVars(colors,fonts,glow){const r=document.documentElement;const map={ground:"--ground",card:"--card",line:"--line",ink:"--ink",muted:"--muted",hd:"--hd",hd2:"--hd2",btn1:"--btn1",btn2:"--btn2",rose:"--rose",flame:"--flame",gold:"--gold",violet:"--violet",leaf:"--leaf"};
 Object.keys(map).forEach(k=>{if(colors&&colors[k])r.style.setProperty(map[k],colors[k])});if(colors&&colors.ground)r.style.setProperty("--ground-2",mixHex(colors.ground,colors.violet||colors.rose||"#7b3fb8",.08));
 if(colors&&colors.ground)r.style.setProperty("--mint",mixHex(colors.ground,colors.leaf||"#2f8a4c",.1));
 const meta=document.querySelector('meta[name="theme-color"]');const barC=colors&&(colors.bar||colors.rose);if(meta&&meta.setAttribute&&(barC||!window.__themePre))meta.setAttribute("content",barC||"#e8338f");
 r.classList.toggle("noglow",glow===false);
 try{if(EV&&colors&&Object.keys(colors).length){const o={};["--ground","--card","--line","--ink","--muted","--hd","--hd2","--btn1","--btn2","--rose","--flame","--gold","--violet","--leaf","--ground-2","--mint"].forEach(k=>{const x=r.style.getPropertyValue(k);if(x)o[k]=x});if(colors.bar||colors.rose)o.bar=colors.bar||colors.rose;const j=JSON.stringify(o);if(localStorage.getItem("hm_theme_"+EV)!==j)localStorage.setItem("hm_theme_"+EV,j)}}catch(e){}
 if(fonts){loadFonts(fonts);r.style.setProperty("--f-script",`"${fonts.title}",${FONT_FALL.title}`);r.style.setProperty("--f-caps",`"${fonts.head}",${FONT_FALL.head}`);r.style.setProperty("--f-body",`"${fonts.body}",${FONT_FALL.body}`);document.body&&(document.body.style.fontSize=(+fonts.size||15)+"px")}}
let fontKey="";function loadFonts(f){if(!document.head)return;const fams=[...new Set([f.title,f.head,f.body].filter(Boolean))];const key=fams.join("|");if(key===fontKey)return;fontKey=key;let el=document.getElementById("fontlink");if(!el){el=document.createElement("link");el.id="fontlink";el.rel="stylesheet";document.head.appendChild(el)}
 el.href="https://fonts.googleapis.com/css2?"+fams.map(x=>"family="+x.replace(/ /g,"+")+":wght@400;600;700").join("&")+"&display=swap"}
function applyTheme(){const c=C();if(EV&&window.__themePre&&!D.contentLoaded){}else setThemeVars(c.colors||{},Object.assign({title:"Great Vibes",head:"Marcellus",body:"Figtree",size:15},c.fonts||{}),c.glow);
 const r=document.documentElement;r.classList.toggle("large",!!L.large);r.classList.toggle("hc",!!L.hc);r.lang=L.lang==="es"?"es":"en";
 if(Object.keys(L.drafts).some(k=>k.startsWith("ts_c_")||k.startsWith("ts_f_")||k==="ts_glow"))previewTheme("ts_");
 document.title=(VIEW==="host"||VIEW==="planner"||((!EV||L.missing)&&VIEW==="guest")?"Host Mode":VIEW==="new"?"Create your event · Host Mode":(c.title||"Host Mode"))+(VIEW==="moderator"?" · Moderator":VIEW==="screen"?" · Big screen":VIEW==="host"?" · Admin":"")}
function themeStudio(p,inWizard){const base=Object.assign(curColors(),C().colors||{});const pal=L.palette||C().palette||[];const t2=themeFromDrafts(p);
 const warn=[];const ck=(a,b,r,l)=>{const v=contrast(t2.colors[a],t2.colors[b]);if(v<r)warn.push(`${l} may be hard to read (${v.toFixed(1)}:1, aim for ${r}:1)`)};
 ck("ink","ground",4.5,"Main text on the page background");ck("ink","card",4.5,"Main text on cards");ck("hd","card",3,"Headings on cards");ck("muted","card",3,"Soft text on cards");if(contrast("#ffffff",t2.colors.btn1)<2.5)warn.push("White button text on the button start color may be hard to read");
 const chips=k=>pal.map(c=>`<button class="chip" style="background:${c}" data-act="tsChip" data-p="${p}" data-k="${p}c_${k}" data-c="${c}" aria-label="Use ${c}" title="${c}"></button>`).join("");
 const fsel=(r,l)=>`<label class="stack tight"><span class="small"><b>${l}</b></span><select data-draft="${p}f_${r}" data-act="tsFont">${FONTS[r].map(f=>`<option ${t2.fonts[r]===f?"selected":""} style="font-family:'${f}'">${f}</option>`).join("")}</select></label>`;
 return `<div class="stack ts">${pal.length?`<div class="row small"><span><b>Colors from your picture</b></span>${pal.map(c=>`<span class="chip big" style="background:${c}" title="${c}"></span>`).join("")}<button class="btn sm" data-act="tsAuto" data-p="${p}">Build a look from these</button></div>`:inWizard?"":`<div class="row"><label class="btn sm upl">Pull colors from a picture<input type="file" accept="image/*" data-act="tsImg"></label><span class="small muted">or pick each color by hand below</span></div>`}
 <div class="tsgrid">${THEME_PARTS.map(([k,l])=>`<div class="tsrow"><span class="small"><b>${l}</b></span><input type="color" data-draft="${p}c_${k}" data-ts="${p}" value="${esc(/^#[0-9a-f]{6}$/i.test(t2.colors[k])?t2.colors[k]:"#7b3fb8")}" aria-label="${l}"><div class="chips">${chips(k)}</div></div>`).join("")}</div>
 <label class="row small"><input type="checkbox" data-draft="${p}glow" ${t2.glow!==false?"checked":""} data-ts="${p}"> Soft color glows in the page background</label>
 <div class="grid2 g8">${fsel("title","Title font")}${fsel("head","Heading font")}<label class="stack tight"><span class="small"><b>Text size</b></span><select data-draft="${p}f_size" data-act="tsFont">${[[14,"Small"],[15,"Normal"],[16,"Large"],[17,"Extra large"]].map(([v,l])=>`<option value="${v}" ${+t2.fonts.size===v?"selected":""}>${l}</option>`).join("")}</select></label></div>
 <div class="tsprev"><div class="brand"><h1 style="font-size:2rem">${esc(dv("nw_name",VIEW==="new"?"":C().title)||"Your event")}</h1><p>${esc(dv("nw_hon",VIEW==="new"?"":C().honorees)||"Guests of honor")}</p></div><div class="card stack tight"><h2>Heading</h2><h3>Small heading</h3><p class="m0">Main text looks like this.</p><p class="small muted m0">Soft text looks like this.</p><div class="row"><button class="btn primary" type="button">Button</button><span class="pill live">Accent</span><span class="pill warn">Highlight</span></div></div></div>
 ${warn.length?`<div class="nudge">${warn.map(esc).join("<br>")}</div>`:""}
 ${inWizard?"":`<div class="row"><button class="btn primary" data-act="tsSave">Save the look</button><button class="btn" data-act="tsReset" data-p="${p}">Undo changes</button></div>`}</div>`}
ACT.tsFont=el=>{L.drafts[el.dataset.draft]=el.value;previewTheme(el.dataset.draft.split("f_")[0]);render(true)};
document.addEventListener("input",e=>{const p=e.target.dataset&&e.target.dataset.ts;if(p)setTimeout(()=>{previewTheme(p)},0)});
document.addEventListener("change",e=>{const p=e.target.dataset&&e.target.dataset.ts;if(p)setTimeout(()=>{previewTheme(p);render(true)},0)});

