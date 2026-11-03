/* ================= SUPPORT DEPARTMENT =================
   Anyone (guests, hosts, planners, clients, teammates) reports a problem from the "Report a problem" link at the bottom of every screen.
   Roy (owner) and support teammates like Icee share one inbox: the Support tab of the admin console, or games.html#support.
   partygames/tickets/{id}           = {msg, who (the screen), name, contact, ev, p, client, mate, page, device, errs, lang, uid,
                                        status: new|working|solved, seen:{uid:t}, by:{uid,name,t}, solved:{uid,name,t}, t, last, lastFrom}
                                        anyone holding the id can read it (the reporter's device keeps the id); only staff can list them
   partygames/ticketReplies/{id}/{k} = {from: reporter|staff, name, text, t}     what the reporter sees
   partygames/ticketNotes/{id}/{k}   = {kind: note|take|handoff|release|solve|reopen, name, text, t}   staff only (the history)
   partygames/staff/{uid}            = {name, role: owner|support, code, t, active}
   partygames/sinvites/{CODE}        = {label, active, by, name, usedAt, t}   one-time codes Roy makes so a support teammate can create a login
   Support teammates can read tickets and accounts and answer tickets. They can't delete, touch money or make invite codes. */
D.tix={};D.staff={};D.sinvites={};D.tkReplies={};D.tkNotes={};D.myTk={};D.supIdx={};
L.errs=[];
addEventListener("error",e=>{try{L.errs.push((String(e.message||"Error").slice(0,180))+(e.lineno?" (line "+e.lineno+")":""));L.errs=L.errs.slice(-5)}catch(x){}});
addEventListener("unhandledrejection",e=>{try{const r=e.reason;L.errs.push("Unfinished task: "+String(r&&r.message||r||"").slice(0,180));L.errs=L.errs.slice(-5)}catch(x){}});
Object.assign(ES,{"Something not working?":"¿Algo no funciona?","Report a problem":"Reportar un problema","Your reports":"Tus reportes","new reply":"respuesta nueva","new replies":"respuestas nuevas",
 "What went wrong?":"¿Qué salió mal?","Tell us what you were trying to do and what happened.":"Cuéntanos qué intentabas hacer y qué pasó.","Your name (optional)":"Tu nombre (opcional)",
 "Email or phone, so we can reach you (optional)":"Correo o teléfono para contactarte (opcional)","We'll also send the page you're on and the kind of device you're using, so we can find the problem faster.":"También enviaremos la página en la que estás y el tipo de dispositivo, para encontrar el problema más rápido.",
 "Send report":"Enviar reporte","Thanks! Your report was sent.":"¡Gracias! Tu reporte fue enviado.","Our support team will look at it soon. Replies show up here, under Your reports.":"Nuestro equipo de soporte lo revisará pronto. Las respuestas aparecen aquí, en Tus reportes.",
 "Received":"Recibido","Being worked on":"En proceso","Solved":"Resuelto","You":"Tú","Support":"Soporte","Write back":"Responder","Send":"Enviar","No reports yet.":"Aún no hay reportes.","New report":"Nuevo reporte","Tell us a little more first.":"Cuéntanos un poco más primero.",
 "You've sent a lot of reports. Please wait a little and try again.":"Has enviado muchos reportes. Espera un poco e inténtalo de nuevo.","Couldn't send it. Check your connection and try again.":"No se pudo enviar. Revisa tu conexión e inténtalo de nuevo."});
const SUP_WHO={guest:"Guest",album:"Guest",moderator:"Host running an event",new:"Host creating an event",planner:"Planner",client:"Planner's client",mate:"Planner's teammate",fb:"Guest giving feedback",show:"Visitor to a planner's page",host:"Admin",support:"Support",vendor:"Vendor",tester:"Nightly tester"};
const TK_ST={new:["New","warn"],working:["Being worked on","gold"],solved:["Solved","ok"]};
const supAgo=t=>{if(!t)return "";const s=Math.max(0,(Date.now()-t)/1000);return s<60?"just now":s<3600?Math.floor(s/60)+" min ago":s<86400?Math.floor(s/3600)+" hr ago":new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric"})};
const supTime=t=>t?new Date(t).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
function supDevice(){const u=navigator.userAgent||"",os=/iPhone|iPad/.test(u)?"iPhone/iPad":/Android/.test(u)?"Android":/Mac OS X/.test(u)?"Mac":/Windows/.test(u)?"Windows":/CrOS/.test(u)?"Chromebook":/Linux/.test(u)?"Linux":"Other";
 const br=/Edg\//.test(u)?"Edge":/CriOS|Chrome\//.test(u)?"Chrome":/FxiOS|Firefox\//.test(u)?"Firefox":/Safari\//.test(u)?"Safari":"Other browser";
 return `${os} · ${br} · screen ${screen.width}×${screen.height} · ${navigator.onLine?"online":"offline"} · ${(navigator.language||"").slice(0,10)}`}
/* ---- the reporter's side ---- */
const myTix=()=>store.get("myTix",[]).filter(x=>x&&/^[A-Za-z0-9_-]{6,40}$/.test(x.id)).slice(-12);
const tkUnreadFor=id=>{const r=(D.myTk[id]||{}).replies||{},seen=store.get("tkSeen_"+id,0);return Object.values(r).filter(x=>x&&x.from==="staff"&&x.t>seen).length};
const myUnread=()=>myTix().reduce((n,x)=>n+tkUnreadFor(x.id),0);
let supMineOn={};
function supMineSubs(){if(!db)return;myTix().forEach(({id})=>{if(supMineOn[id])return;supMineOn[id]=1;D.myTk[id]=D.myTk[id]||{};
 RT("tickets/"+id).on("value",s=>{const v=s.val();if(v)Object.assign(D.myTk[id],{status:v.status,msg:v.msg,t:v.t});else D.myTk[id].gone=true;renderSoon()},()=>{});
 RT("ticketReplies/"+id).on("value",s=>{D.myTk[id].replies=s.val()||{};renderSoon()},()=>{})})}
const supShow=()=>!L.offline&&SUP_WHO[VIEW]!=null&&VIEW!=="host"&&VIEW!=="support";
function supFoot(){if(!supShow())return "";const n=myUnread(),has=myTix().length;
 return `<div class="supfoot small"><span class="muted">${t("Something not working?")}</span> <button class="linkbtn" data-act="supOpen" data-k="new">${t("Report a problem")}</button>${has?` · <button class="linkbtn" data-act="supOpen" data-k="mine">${t("Your reports")}</button>${n?` <span class="pill warn">${n} ${t(n===1?"new reply":"new replies")}</span>`:""}`:""}</div>`}
function supSheet(){const mode=L.report,mine=myTix().slice().reverse(),pl=VIEW==="planner"&&D.plMe?D.plMe:null;
 const head=`<div class="row between"><div class="row small">${mine.length?`<button class="btn xs ${mode==="mine"?"primary":""}" data-act="supOpen" data-k="mine">${t("Your reports")}</button><button class="btn xs ${mode==="new"?"primary":""}" data-act="supOpen" data-k="new">${t("New report")}</button>`:""}</div><button class="btn sm" data-act="supClose">${t("Close")}</button></div>`;
 let body;
 if(String(mode).startsWith("sent:"))body=`<h2>${t("Thanks! Your report was sent.")}</h2><p class="small muted m0">${t("Our support team will look at it soon. Replies show up here, under Your reports.")}</p><button class="btn as" data-act="supOpen" data-k="mine">${t("Your reports")}</button>`;
 else if(mode==="mine")body=mine.length?`<h2>${t("Your reports")}</h2><div class="stack tight">${mine.map(({id})=>{const k=D.myTk[id]||{},st=k.status||"new",rs=Object.keys(k.replies||{}).map(r=>k.replies[r]).sort((a,b)=>a.t-b.t),un=tkUnreadFor(id);
   if(k.gone)return "";return `<div class="mrow2 small"><div class="row between"><span class="mw0"><b>${esc(String(k.msg||"").slice(0,90))}${String(k.msg||"").length>90?"…":""}</b><span class="db muted">${esc(supTime(k.t))}</span></span><span class="pill ${TK_ST[st][1]}">${t(st==="new"?"Received":TK_ST[st][0])}</span></div>
   ${rs.length?`<div class="stack tight tkthread">${rs.map(r=>`<div class="tkmsg ${r.from==="staff"?"them":"me"}"><b>${esc(r.from==="staff"?(r.name||t("Support"))+" · "+t("Support"):t("You"))}</b> <span class="muted">${esc(supAgo(r.t))}</span><div>${esc(r.text)}</div></div>`).join("")}</div>`:""}
   <div class="row"><input type="text" class="grow" data-draft="rpr_${esc(id)}" maxlength="2000" value="${esc(dv("rpr_"+id,""))}" placeholder="${t("Write back")}" aria-label="${t("Write back")}"><button class="btn xs" data-act="supReply" data-k="${esc(id)}">${t("Send")}</button></div>${un?`<span class="small warn">${un} ${t(un===1?"new reply":"new replies")}</span>`:""}</div>`}).join("")}</div>`:`<p class="small muted m0">${t("No reports yet.")}</p>`;
 else body=`<h2>${t("Report a problem")}</h2><label class="stack tight"><span class="small">${t("What went wrong?")}</span><textarea rows="5" data-draft="rp_msg" maxlength="2000" placeholder="${t("Tell us what you were trying to do and what happened.")}">${esc(dv("rp_msg",""))}</textarea></label>
  <label class="stack tight"><span class="small">${t("Your name (optional)")}</span><input type="text" data-draft="rp_name" maxlength="60" value="${esc(dv("rp_name",pl?pl.name||"":store.get("rpName","")))}" autocomplete="name"></label>
  <label class="stack tight"><span class="small">${t("Email or phone, so we can reach you (optional)")}</span><input type="text" data-draft="rp_contact" maxlength="120" value="${esc(dv("rp_contact",pl?pl.email||"":store.get("rpContact","")))}" autocomplete="email"></label>
  <p class="small muted m0">${t("We'll also send the page you're on and the kind of device you're using, so we can find the problem faster.")}</p><button class="btn primary" data-act="supSend">${t("Send report")}</button>`;
 return `<div class="sheet-bg" data-act="supClose"></div><div class="sheet" role="dialog" aria-label="${t("Report a problem")}"><div class="stack">${head}${body}</div></div>`}
Object.assign(ACT,{
 supOpen:el=>{L.report=el.dataset.k;if(L.report==="mine")myTix().forEach(({id})=>{const r=(D.myTk[id]||{}).replies||{},mx=Math.max(0,...Object.values(r).map(x=>x.t||0));if(mx)store.set("tkSeen_"+id,mx)});render(true)},
 supClose:()=>{L.report=null;render(true)},
 supSend:async()=>{const msg=String(dv("rp_msg","")).trim();if(msg.length<5)return toast(t("Tell us a little more first."));
  const recent=store.get("tkSent",[]).filter(x=>Date.now()-x<36e5);if(recent.length>=5)return toast(t("You've sent a lot of reports. Please wait a little and try again."));
  const pl=VIEW==="planner"&&D.plMe?D.plMe:null,name=String(dv("rp_name",pl?pl.name||"":store.get("rpName",""))).trim().slice(0,60),contact=String(dv("rp_contact",pl?pl.email||"":store.get("rpContact",""))).trim().slice(0,120),now=Date.now();
  const page=(location.pathname.split("/").pop()+location.search.replace(/([?&](pw|pin)=)[^&]*/gi,"$1…")+location.hash).slice(0,300);
  const rec={msg:msg.slice(0,2000),who:VIEW,name,contact,ev:EV||"",p:PLID()||"",client:(QS.get("client")||"").slice(0,64),mate:(QS.get("mate")||"").slice(0,64),page,device:supDevice(),errs:L.errs.join("\n").slice(0,1000),lang:L.lang||"en",status:"new",t:now,last:now,lastFrom:"reporter"};
  if(L.user&&L.user.uid)rec.uid=L.user.uid;if(window.__HMPDEMO||window.__HMDEMO)rec.demo=true;
  try{const r=RT("tickets").push();await r.set(rec);store.set("myTix",myTix().concat([{id:r.key,t:now}]));store.set("tkSent",recent.concat([now]));if(name)store.set("rpName",name);if(contact)store.set("rpContact",contact);
   ["rp_msg"].forEach(k=>delete L.drafts[k]);L.report="sent:"+r.key;supMineSubs();render(true)}catch(e){toast(t("Couldn't send it. Check your connection and try again."))}},
 supReply:async el=>{const id=el.dataset.k,text=String(dv("rpr_"+id,"")).trim();if(!text)return;
  try{const now=Date.now();await RT("ticketReplies/"+id).push().set({from:"reporter",name:store.get("rpName",""),text:text.slice(0,2000),t:now});await RT("tickets/"+id).update({last:now,lastFrom:"reporter"});delete L.drafts["rpr_"+id];render(true)}catch(e){toast(t("Couldn't send it. Check your connection and try again."))}}
});

/* ---- the support team's side ---- */
const supDemo=()=>!!window.__HMPDEMO;
function supMe(){if(supDemo()){const k=L.supAs||"roy",s=(D.staff||{})[k]||{};return {uid:k,name:s.name||(k==="roy"?"Roy":"Icee"),role:k==="roy"?"owner":(D.admins||{})[k]===true?"admin":"support"}}
 const u=L.user;if(!u)return null;const s=(D.staff||{})[u.uid];if(D.owner&&u.uid===D.owner)return {uid:u.uid,name:(s&&s.name)||"Roy",role:"owner"};if(L.coAdmin)return {uid:u.uid,name:(s&&s.name)||"Admin",role:"admin"};return s?{uid:u.uid,name:s.name||"Support",role:"support"}:null}
/* the owner and admins can do the owner-only actions here (support codes, removing staff, deleting reports, pausing agents) */
const supIsOwner=()=>{const m=supMe();return !!(m&&(m.role==="owner"||m.role==="admin"))};
/* only Roy himself can make or remove admins */
const supIsRoy=()=>{const m=supMe();return !!(m&&m.role==="owner")};
const tkList=()=>Object.keys(D.tix||{}).map(k=>Object.assign({k},D.tix[k])).sort((a,b)=>(b.last||b.t||0)-(a.last||a.t||0));
const tkNewCount=()=>tkList().filter(x=>(x.status||"new")==="new").length;
const tkWaiting=(x,me)=>x.status!=="solved"&&x.lastFrom==="reporter"&&me&&(x.last||0)>(x.t||0)&&(x.last||0)>(((x.seen||{})[me.uid])||0);
function tkLine(x){const st=x.status||"new",seen=Object.keys(x.seen||{}).map(u=>((D.staff||{})[u]||{}).name||"someone");
 if(st==="solved")return `Solved by ${esc((x.solved||{}).name||"support")} · ${esc(supTime((x.solved||{}).t))}`;
 if(st==="working"&&x.by)return `Being worked on by <b>${esc(x.by.name)}</b> since ${esc(supTime(x.by.t))}`;
 return seen.length?`Seen by ${esc(seen.join(", "))} · nobody has taken it yet`:"Nobody has opened it yet"}
let supSubbed=false,supBeat=null;
function supSubs(){if(supSubbed||!db)return;supSubbed=true;RT("admins").on("value",s=>{D.admins=s.val()||{};renderSoon()},()=>{});
 RT("tickets").on("value",s=>{D.tix=s.val()||{};L.supLoaded=true;renderSoon()},()=>{L.supLoaded=true;L.supDenied=true;renderSoon()});
 RT("staff").on("value",s=>{D.staff=s.val()||{};supEnsureOwner();renderSoon()},()=>{});
 if(supIsOwner()||supDemo())RT("sinvites").on("value",s=>{D.sinvites=s.val()||{};renderSoon()},()=>{});
 RT("plist").once("value").then(s=>{D.plist=Object.assign({},D.plist||{},s.val()||{});renderSoon()}).catch(()=>{});
 RT("agents").on("value",s=>{D.agents=s.val()||{};renderSoon()},()=>{});tmSubs();
 RT("sales").on("value",s=>{D.sales=s.val()||{};renderSoon()},()=>{});RT("salesLog").on("value",s=>{D.salesLog=s.val()||{};renderSoon()},()=>{});RT("resources").on("value",s=>{D.resources=s.val()||{};renderSoon()},()=>{});RT("agentRuns").on("value",s=>{D.agentRuns=s.val()||{};renderSoon()},()=>{});RT("backupStatus").on("value",s=>{D.backupStatus=s.val();renderSoon()},()=>{});
 RT("index").once("value").then(s=>{D.supIdx=s.val()||{};renderSoon()}).catch(()=>{});
 const beat=()=>{const m=supMe();if(m&&(VIEW==="support"||(VIEW==="host"&&L.hostTab==="support")))RT("staff/"+m.uid+"/active").set(Date.now()).catch(()=>{})};
 if(!supBeat){beat();supBeat=setInterval(beat,60000)}}
function supEnsureOwner(){if(supDemo())return;const u=L.user;if(u&&D.owner&&u.uid===D.owner&&!(D.staff||{})[u.uid])RT("staff/"+u.uid).set({name:"Roy",role:"owner",t:Date.now(),active:Date.now()}).catch(()=>{})}
let tkOn={};function tkSub(id){if(tkOn[id]||!db)return;tkOn[id]=1;
 RT("ticketReplies/"+id).on("value",s=>{D.tkReplies[id]=s.val()||{};renderSoon()},()=>{});RT("ticketNotes/"+id).on("value",s=>{D.tkNotes[id]=s.val()||{};renderSoon()},()=>{})}
const tkNote=(id,kind,text)=>{const m=supMe();return RT("ticketNotes/"+id).push().set({kind,name:m?m.name:"",text:String(text||"").slice(0,2000),t:Date.now()})};
const TK_KIND={note:"📝",take:"🙋",handoff:"🔁",release:"↩️",solve:"✅",reopen:"🔓",reply:"💬",agent:"🤖",draft:"✍️"};
function tkDetail(x){const id=x.k,me=supMe(),st=x.status||"new",mine=x.by&&me&&x.by.uid===me.uid,rs=Object.keys(D.tkReplies[id]||{}).map(k=>D.tkReplies[id][k]).sort((a,b)=>a.t-b.t),ns=Object.keys(D.tkNotes[id]||{}).map(k=>D.tkNotes[id][k]).sort((a,b)=>a.t-b.t);
 const pl=x.p&&(D.plist||{})[x.p],asLink=x.p?baseURL()+"?"+(supDemo()?"pdemo=1&":"")+"as="+encodeURIComponent(x.p)+"#planner":"";
 const info=[["From",(SUP_WHO[x.who]||x.who||"Someone")+(x.name?" · "+x.name:"")],["Contact",x.contact],["Event code",x.ev],["Planner",pl?(pl.name||"")+(pl.biz?" · "+pl.biz:""):x.p],["Page",x.page],["Device",x.device],["Language",x.lang&&x.lang!=="en"?x.lang:""]].filter(r=>r[1]);
 return `<div class="tkdetail stack tight"><div class="tkbody">${esc(x.msg||"")}</div>
 <div class="small stack tight">${info.map(([k,v])=>`<div><span class="muted">${k}:</span> ${esc(v)}</div>`).join("")}${x.errs?`<details><summary class="small">Errors the app noticed on their device</summary><pre class="tkerr">${esc(x.errs)}</pre></details>`:""}</div>
 <div class="row small">${x.ev?`<a class="btn xs" href="${esc(eventURL(x.ev))}" target="_blank" rel="noopener">Open their event (guest view)</a>`:""}${asLink?`<a class="btn xs" href="${esc(asLink)}" target="_blank" rel="noopener">Look at their planner portal</a>`:""}${/@/.test(x.contact||"")?`<a class="btn xs" href="mailto:${esc(x.contact)}?subject=${encodeURIComponent("Your Host Mode report")}">Email them</a>`:""}</div>
 <div class="row">${st!=="solved"?(!x.by?`<button class="btn sm primary" data-act="tkTake" data-k="${esc(id)}">I'll take it</button>`:mine?`<button class="btn sm" data-act="tkRelease" data-k="${esc(id)}">Let it go</button>`:`<button class="btn sm primary" data-act="tkTake" data-k="${esc(id)}">Take over from ${esc(x.by.name)}</button>`)+`<button class="btn sm" data-act="tkSolve" data-k="${esc(id)}">Mark solved</button>`:`<button class="btn sm" data-act="tkReopen" data-k="${esc(id)}">Reopen</button>`}
 ${supIsOwner()?`<button class="btn sm" data-act="tkDel" data-k="${esc(id)}">${L.confirm==="tkx"+id?"Tap again to delete":"Delete"}</button>`:""}</div>
 <div class="stack tight"><b class="small">Conversation with them</b>${rs.length?`<div class="stack tight tkthread">${rs.map(r=>`<div class="tkmsg ${r.from==="staff"?"me":"them"}"><b>${esc(r.from==="staff"?(r.name||"Support"):(r.name||x.name||"Them"))}</b> <span class="muted">${esc(supAgo(r.t))}</span><div>${esc(r.text)}</div></div>`).join("")}</div>`:'<span class="small muted">No replies yet.</span>'}
 <textarea rows="2" data-draft="tkr_${esc(id)}" maxlength="2000" placeholder="Reply to them. They see it under Your reports in the app.">${esc(dv("tkr_"+id,""))}</textarea><button class="btn sm as" data-act="tkReply" data-k="${esc(id)}">Send reply</button></div>
 <div class="stack tight"><b class="small">Team notes and history</b><span class="small muted">Only Roy and support can see these.</span>${ns.length?`<div class="stack tight">${ns.map((n,i)=>n.kind==="draft"?`<div class="small tkdraft">✍️ <b>${esc(n.name||"")}</b> wrote a draft reply <span class="muted">${esc(supTime(n.t))}</span><div class="tkbody">${esc(n.text||"")}</div><button class="btn xs" data-act="tkUseDraft" data-k="${esc(id)}" data-i="${i}">Use this draft</button> <span class="muted">It goes in the reply box so you can change it before sending.</span></div>`:`<div class="small">${TK_KIND[n.kind]||"•"} <b>${esc(n.name||"")}</b> ${esc(n.text||"")} <span class="muted">${esc(supTime(n.t))}</span></div>`).join("")}</div>`:""}
 <div class="row"><input type="text" class="grow" data-draft="tkn_${esc(id)}" maxlength="2000" value="${esc(dv("tkn_"+id,""))}" placeholder="Add a private note" aria-label="Private note"><button class="btn xs" data-act="tkNoteAdd" data-k="${esc(id)}">Add note</button></div></div></div>`}
function supportBody(){const me=supMe();if(!me)return `<section class="card stack"><p class="m0">This account doesn't have support access.</p></section>`;
 if(!L.supLoaded&&!supDemo())return loadingView();
 if(L.supDenied)return `<section class="card stack"><h2>Support isn't switched on yet</h2><p class="small muted m0">The database rules need updating before tickets can load. Roy: publish the latest database.rules.json in the Firebase console, then reload.</p></section>`;
 const all=tkList(),today=new Date();today.setHours(0,0,0,0);const f=L.tkF||"open",q=String(dv("tk_q","")).toLowerCase().trim();
 const nNew=all.filter(x=>(x.status||"new")==="new").length,nWork=all.filter(x=>x.status==="working").length,nSolvedToday=all.filter(x=>x.status==="solved"&&((x.solved||{}).t||0)>=today.getTime()).length,nWait=all.filter(x=>tkWaiting(x,me)).length;
 const team=Object.keys(D.staff||{}).map(u=>Object.assign({uid:u},D.staff[u])).sort((a,b)=>(a.role==="owner"?0:1)-(b.role==="owner"?0:1)||String(a.name).localeCompare(String(b.name)));
 const shown=all.filter(x=>{const st=x.status||"new";if(f==="open"&&st==="solved")return false;if(f==="new"&&st!=="new")return false;if(f==="mine"&&!(x.by&&x.by.uid===me.uid&&st!=="solved"))return false;if(f==="solved"&&st!=="solved")return false;if(f==="reply"&&!tkWaiting(x,me))return false;
  return !q||[x.msg,x.name,x.contact,x.ev,x.page,SUP_WHO[x.who]].join(" ").toLowerCase().includes(q)});
 const meter=`<div class="stats"><button class="stat ${nNew?"hot":""}" data-act="tkFilter" data-k="new"><b>${nNew}</b><span>New, nobody has taken it</span></button><button class="stat" data-act="tkFilter" data-k="open"><b>${nWork}</b><span>Being worked on</span></button><button class="stat ${nWait?"hot":""}" data-act="tkFilter" data-k="reply"><b>${nWait}</b><span>They wrote back</span></button><button class="stat" data-act="tkFilter" data-k="solved"><b>${nSolvedToday}</b><span>Solved today</span></button></div>
 <div class="supteam">${team.map(s=>{const has=all.filter(x=>x.status==="working"&&x.by&&x.by.uid===s.uid).length,on=s.active&&Date.now()-s.active<3*60000;
  return `<div class="row between small clrow"><span><span class="dot ${on?"on":""}"></span> <b>${esc(s.name||"Support")}</b>${s.uid===me.uid?" (you)":""} <span class="muted">· ${on?"active now":s.active?"last active "+supAgo(s.active):"hasn't signed in yet"}</span></span><span>${has} in progress</span></div>`}).join("")||'<span class="small muted">The team list shows up once support logins are set up.</span>'}</div>`;
 return `<section class="card stack"><div class="row between"><h2 class="m0">Support</h2>${supDemo()?`<button class="btn xs" data-act="supAs">Demo: switch to ${L.supAs==="icee"?"Roy":"Icee"}</button>`:""}</div>
 <p class="small muted m0">Every report comes to both ${team.length>1?esc(team.map(s=>s.name).join(" and ")):"of you"}. Take a ticket so the other person knows you've got it. If someone isn't around, the other can take it over.</p>${meter}</section>
 <section class="card stack"><div class="row small">${[["open","Open"],["new","New"],["mine","Mine"],["reply","They wrote back"],["solved","Solved"],["all","All"]].map(([k,l])=>`<button class="btn xs ${f===k?"primary":""}" data-act="tkFilter" data-k="${k}">${l}</button>`).join("")}</div>
 <div class="row"><input type="search" class="grow" data-draft="tk_q" value="${esc(dv("tk_q",""))}" placeholder="Search reports" aria-label="Search reports"><button class="btn xs" data-act="tkFind">Search</button></div>
 ${shown.length?`<div class="stack tight">${shown.slice(0,60).map(x=>{const st=x.status||"new",open=L.tkOpen===x.k,wait=tkWaiting(x,me),unseen=!((x.seen||{})[me.uid]);
  return `<div class="mrow2 tkrow ${open?"open":""}"><button class="tkhead" data-act="tkOpen" data-k="${esc(x.k)}" aria-expanded="${open}"><span class="row between small"><span class="mw0"><span class="pill ${TK_ST[st][1]}">${TK_ST[st][0]}</span>${wait?' <span class="pill warn">They wrote back</span>':""}${unseen&&st!=="solved"?' <span class="pill">Unread</span>':""} <b>${esc(SUP_WHO[x.who]||"Someone")}</b>${x.name?" · "+esc(x.name):""}${x.ev?` · <span class="muted">${esc(x.ev)}</span>`:""}</span><span class="muted">${esc(supAgo(x.last||x.t))}</span></span>
  <span class="db small tkmsgline">${esc(String(x.msg||"").slice(0,160))}${String(x.msg||"").length>160?"…":""}</span><span class="db small muted">${tkLine(x)}</span></button>${open?tkDetail(x):""}</div>`}).join("")}</div>`:'<p class="small muted m0">Nothing here.</p>'}</section>
 ${supAgentsCard()}${supAccounts()}${supIsOwner()?supTeamCard():""}`}
/* the nightly agents' morning summary, their pause switch and the last backup */
function supAgentsCard(){const runs=Object.keys(D.agentRuns||{}).sort().reverse().map(k=>Object.assign({k},D.agentRuns[k])),last=runs[0],paused=!!(D.agents&&D.agents.paused),b=D.backupStatus,own=supIsOwner();
 const runBox=r=>{const ts=r.tester||{},tc=r.tech||{},u=r.usage||{},prs=tc.prs||[];
  return `<div class="stack tight small"><div class="row">${[[ts.passed,"check passed","checks passed","ok"],[ts.failed,"check failed","checks failed","warn"],[ts.aiProblems,"problem found by the AI tester","problems found by the AI tester","warn"],[tc.replied,"question answered","questions answered","ok"],[tc.drafted,"draft reply to check","draft replies to check","gold"],[tc.person,"needs a person","need a person",""],[prs.length,"fix waiting for Roy","fixes waiting for Roy","gold"]].map(([n,a,m,c])=>imPill(n,n===1?a:m,c)).join("")}</div>
  ${ts.ai&&ts.ai.role?`<div><b>AI test customer</b> played a ${esc(ts.ai.role)} on a ${esc(ts.ai.size||"")} screen${ts.ai.lang&&ts.ai.lang!=="English"?" in "+esc(ts.ai.lang):""} (${+ts.ai.steps||0} steps).${ts.ai.summary?" "+esc(ts.ai.summary):""}</div>`:""}
  ${(ts.problems||[]).length?`<div><b>Problems found:</b> ${(ts.problems||[]).map(esc).join(" · ")}</div>`:""}
  ${prs.length?`<div class="stack tight">${prs.map(p=>`<div class="clrow"><a href="${esc(p.url)}" target="_blank" rel="noopener"><b>Review the fix</b></a> <span class="pill ${p.confidence==="sure"?"ok":p.confidence==="likely"?"gold":"warn"}">${esc(p.confidence)}</span><div class="muted">${esc(p.summary||"")}</div></div>`).join("")}</div>`:""}
  <div class="muted">About ${clMoney(u.usd||0)} of credits used.</div>
  ${L.agRun===r.k?`<pre class="tkerr">${esc((r.log||[]).join("\n"))}</pre>`:""}<button class="btn xs as" data-act="agRunOpen" data-k="${esc(r.k)}">${L.agRun===r.k?"Hide the log":"See everything they did"}</button></div>`};
 return `<section class="card stack"><div class="row between"><h3>Overnight report</h3>${paused?'<span class="pill warn">Paused</span>':""}</div>
 ${last?`<p class="small muted m0">Last run ${esc(supTime(last.t))}.</p>${runBox(last)}`:'<p class="small muted m0">The nightly test customer and technical agent haven\'t run yet. Their report shows up here each morning.</p>'}
 ${runs.length>1?`<details><summary class="small">Earlier nights (${runs.length-1})</summary><div class="stack">${runs.slice(1,8).map(r=>`<div class="stack tight"><b class="small">${esc(supTime(r.t))}</b>${runBox(r)}</div>`).join("")}</div></details>`:""}
 ${own?`<div class="row"><button class="btn sm ${paused?"primary":""}" data-act="agPause">${paused?"Turn the agents back on":L.confirm==="agp"?"Tap again to pause them":"Pause the agents"}</button><span class="small muted">Pausing stops them from the next run on.</span></div>`:""}
 <div class="small ${b&&b.t&&Date.now()-b.t<36*36e5?"":"bad"}">💾 ${b&&b.t?`Last backup ${esc(supTime(b.t))} (${esc(String(b.mb||0))} MB)`:"No backup has run yet. See ops/BACKUPS.md in the code to switch them on."}</div></section>`}
function supAccounts(){const pl=D.plist||{},ev=Object.assign({},D.supIdx||{},VIEW==="host"?D.events||{}:{}),q=String(dv("sa_q","")).toLowerCase().trim(),open=L.saOpen;
 const pk=Object.keys(pl).filter(u=>!q||[pl[u].name,pl[u].biz,pl[u].email].join(" ").toLowerCase().includes(q)).slice(0,30),ek=Object.keys(ev).filter(k=>!q||[k,ev[k].name].join(" ").toLowerCase().includes(q)).slice(0,30);
 return `<section class="card stack"><div class="row between"><h3>Look up an account</h3><button class="btn xs" data-act="saToggle">${open?"Hide":"Show"}</button></div><p class="small muted m0">See a planner's portal or an event the way they see it. This view is read-only, so nothing you tap changes their data.</p>
 ${open?`<div class="row"><input type="search" class="grow" data-draft="sa_q" value="${esc(dv("sa_q",""))}" placeholder="Name, business, email or event code" aria-label="Search accounts"><button class="btn xs" data-act="tkFind">Search</button></div>
 <b class="small">Planners</b>${pk.length?`<div class="stack tight">${pk.map(u=>`<div class="row between small clrow"><span class="mw0"><b>${esc(pl[u].name||"Planner")}</b><span class="db muted">${esc([pl[u].biz,pl[u].email].filter(Boolean).join(" · "))}</span></span><a class="btn xs" href="${esc(baseURL()+"?"+(supDemo()?"pdemo=1&":"")+"as="+encodeURIComponent(u)+"#planner")}" target="_blank" rel="noopener">Look at their portal</a></div>`).join("")}</div>`:'<span class="small muted">No planners found.</span>'}
 <b class="small">Events</b>${ek.length?`<div class="stack tight">${ek.map(k=>`<div class="row between small clrow"><span class="mw0"><b>${esc(ev[k].name||k)}</b><span class="db muted">Code ${esc(k)}</span></span><a class="btn xs" href="${esc(eventURL(k))}" target="_blank" rel="noopener">Guest view</a></div>`).join("")}</div>`:'<span class="small muted">No events found.</span>'}`:""}</section>`}
function supTeamCard(){const codes=Object.keys(D.sinvites||{}).map(k=>Object.assign({k},D.sinvites[k])).sort((a,b)=>(b.t||0)-(a.t||0)),me=supMe(),team=Object.keys(D.staff||{}).filter(u=>D.staff[u].role!=="owner"),link=baseURL()+"#support";
 return `<section class="card stack"><h3>Support team</h3><p class="small muted m0">Make a one-time code for each person who helps with support. They open the support page, enter the code and create their own login. Support logins can answer tickets and look at accounts, but can't delete anything, change money or make invite codes. Tap Make admin to give someone everything you have in the admin console, except making admins.</p>
 <div class="row"><input type="text" class="grow" data-draft="si_label" maxlength="40" value="${esc(dv("si_label",""))}" placeholder="Who it's for, like Icee" aria-label="Who the code is for"><button class="btn sm primary" data-act="siMake">Make a support code</button></div>
 <div class="small">Support page: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(link)}</a></div>
 ${codes.length?`<div class="stack tight">${codes.map(c=>`<div class="row between small clrow"><span class="mw0"><b class="mono">${esc(c.k)}</b> · ${esc(c.label||"")}<span class="db muted">${c.by?"Used by "+esc(c.name||"someone")+" · "+esc(supTime(c.usedAt)):c.active?"Not used yet":"Turned off"}</span></span>${!c.by&&c.active?`<button class="btn xs" data-act="siOff" data-k="${esc(c.k)}">Turn off</button>`:""}</div>`).join("")}</div>`:""}
 ${team.length?`<b class="small">People with support logins</b><div class="stack tight">${team.map(u=>`<div class="row between small clrow"><span class="mw0"><b>${esc(D.staff[u].name||"Support")}</b><span class="db muted">${(D.admins||{})[u]===true?"Admin (everything except making admins)":"Support"} · joined ${esc(supTime(D.staff[u].t))}</span></span><span class="row">${supIsRoy()?`<button class="btn xs" data-act="stAdmin" data-k="${esc(u)}">${L.confirm==="sta"+u?"Tap again to confirm":(D.admins||{})[u]===true?"Remove admin":"Make admin"}</button>`:""}<button class="btn xs" data-act="stRemove" data-k="${esc(u)}">${L.confirm==="stx"+u?"Tap again to remove":"Remove access"}</button></span></div>`).join("")}</div>`:""}
 <label class="stack tight"><span class="small">Your name on tickets</span><span class="row"><input type="text" class="grow" data-draft="st_me" maxlength="40" value="${esc(dv("st_me",(me&&me.name)||"Roy"))}"><button class="btn xs" data-act="stName">Save</button></span></label></section>`}
async function tkSet(id,u){await RT("tickets/"+id).update(u)}
Object.assign(ACT,{
 tkFilter:el=>{L.tkF=el.dataset.k;render(true)},
 tkFind:()=>render(true),
 saToggle:()=>{L.saOpen=!L.saOpen;render(true)},
 supAs:()=>{L.supAs=L.supAs==="icee"?"roy":"icee";render(true)},
 tkOpen:el=>{const id=el.dataset.k;L.tkOpen=L.tkOpen===id?null:id;L.confirm=null;if(L.tkOpen){tkSub(id);const me=supMe();if(me)RT("tickets/"+id+"/seen/"+me.uid).set(Date.now()).catch(()=>{})}render(true)},
 tkTake:async el=>{const id=el.dataset.k,x=(D.tix||{})[id],me=supMe();if(!x||!me)return;const prev=x.by&&x.by.uid!==me.uid?x.by.name:"";
  await tkSet(id,{status:"working",by:{uid:me.uid,name:me.name,t:Date.now()}});await tkNote(id,prev?"handoff":"take",prev?`took it over from ${prev}`:"took it");toast(prev?"It's yours now. "+prev+" will see the handoff.":"It's yours")},
 tkRelease:async el=>{const id=el.dataset.k;await tkSet(id,{status:"new",by:null});await tkNote(id,"release","let it go so someone else can take it");toast("Released")},
 tkSolve:async el=>{const id=el.dataset.k,me=supMe();if(!me)return;await tkSet(id,{status:"solved",solved:{uid:me.uid,name:me.name,t:Date.now()}});await tkNote(id,"solve","marked it solved");toast("Marked solved")},
 tkReopen:async el=>{const id=el.dataset.k;await tkSet(id,{status:"new",by:null,solved:null});await tkNote(id,"reopen","reopened it");toast("Reopened")},
 tkReply:async el=>{const id=el.dataset.k,me=supMe(),text=String(dv("tkr_"+id,"")).trim();if(!text)return toast("Type a reply first");if(!me)return;const now=Date.now(),x=(D.tix||{})[id]||{};
  await RT("ticketReplies/"+id).push().set({from:"staff",name:me.name,text:text.slice(0,2000),t:now});const u={last:now,lastFrom:"staff"};if(!x.by&&x.status!=="solved"){u.status="working";u.by={uid:me.uid,name:me.name,t:now}}u["seen/"+me.uid]=now;await tkSet(id,u);
  await tkNote(id,"reply","replied to them");delete L.drafts["tkr_"+id];toast("Reply sent. They'll see it in the app.");render(true)},
 tkUseDraft:el=>{const id=el.dataset.k,ns=Object.keys(D.tkNotes[id]||{}).map(k=>D.tkNotes[id][k]).sort((a,b)=>a.t-b.t),n=ns[+el.dataset.i];if(!n)return;L.drafts["tkr_"+id]=n.text||"";render(true);const t=document.querySelector(`[data-draft="tkr_${CSS.escape(id)}"]`);if(t){t.focus();t.scrollIntoView({block:"center"})}},
 agPause:async()=>{if(!supIsOwner())return;const on=!(D.agents&&D.agents.paused);if(on&&L.confirm!=="agp"){L.confirm="agp";return render(true)}L.confirm=null;await RT("agents/paused").set(on);toast(on?"Agents paused. They'll skip tonight.":"Agents turned back on")},
 agRunOpen:el=>{L.agRun=L.agRun===el.dataset.k?null:el.dataset.k;render(true)},
 tkNoteAdd:async el=>{const id=el.dataset.k,text=String(dv("tkn_"+id,"")).trim();if(!text)return;await tkNote(id,"note",text);delete L.drafts["tkn_"+id];render(true)},
 tkDel:async el=>{const id=el.dataset.k;if(!supIsOwner())return;if(L.confirm!=="tkx"+id){L.confirm="tkx"+id;return render(true)}L.confirm=null;
  await Promise.all([RT("ticketReplies/"+id).remove(),RT("ticketNotes/"+id).remove()]);await RT("tickets/"+id).remove();L.tkOpen=null;toast("Report deleted")},
 siMake:async()=>{if(!supIsOwner())return;const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let c="SUP-";const r=crypto.getRandomValues(new Uint32Array(6));r.forEach(x=>c+=a[x%a.length]);
  await RT("sinvites/"+c).set({label:String(dv("si_label","")).trim().slice(0,40),active:true,t:Date.now()});delete L.drafts.si_label;toast("Code made: "+c);render(true)},
 siOff:async el=>{if(!supIsOwner())return;await RT("sinvites/"+el.dataset.k+"/active").set(false);toast("Code turned off")},
 /* Roy only: make a support person a full admin, or take it back */
 stAdmin:async el=>{const u=el.dataset.k;if(!supIsRoy())return;if(L.confirm!=="sta"+u){L.confirm="sta"+u;return render(true)}L.confirm=null;const on=(D.admins||{})[u]!==true;
  try{await RT("admins/"+u).set(on?true:null);toast(on?((D.staff[u]||{}).name||"They")+" is now an admin":"Admin access removed")}catch(e){toast("Couldn't change that. Check the database rules are published.")}render(true)},
 stRemove:async el=>{const u=el.dataset.k;if(!supIsOwner())return;if(L.confirm!=="stx"+u){L.confirm="stx"+u;return render(true)}L.confirm=null;if((D.admins||{})[u]===true&&supIsRoy())await RT("admins/"+u).remove().catch(()=>{});await RT("staff/"+u).remove();toast("Support access removed")},
 stName:async()=>{const me=supMe(),n=String(dv("st_me","")).trim().slice(0,40);if(!me||!n)return;await RT("staff/"+me.uid+"/name").set(n);toast("Saved")},
 supJoin:async()=>{const a=AUTH();if(!a)return;const code=supCodeNorm(dv("sj_code","")),name=String(dv("sj_name","")).trim().slice(0,40),em=String(dv("ac_email","")).trim(),pw=acPw();
  if(!code)return toast("Type the support code Roy gave you");if(!name)return toast("Type your name");
  const v=(await RT("sinvites/"+code).once("value").catch(()=>null));const vv=v&&v.val();if(!vv||!vv.active)return toast("That support code isn't valid. Check it with Roy. A code made in the demo only works in the demo.");if(vv.by)return toast("That support code has already been used.");
  try{let u=a.currentUser;if(!u){if(pw.length<8)return toast("Use a password with at least 8 characters");u=(await a.createUserWithEmailAndPassword(em,pw)).user}
   await RT("sinvites/"+code).update({by:u.uid,usedAt:Date.now(),name});await RT("staff/"+u.uid).set({name,role:"support",code,t:Date.now(),active:Date.now()});
   ["sj_code","sj_name","ac_pw"].forEach(k=>delete L.drafts[k]);toast("Welcome to Host Mode support, "+name+"!");location.reload()}catch(e){toast(authErr(e))}}
});
/* support codes look like SUP-AB3CD4: accept them typed in small letters, with spaces, or without the SUP- at the start */
function supCodeNorm(v){let c=String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(c.startsWith("SUP"))c=c.slice(3);return c?"SUP-"+c:""}
function supConnect(){if(supDemo()){L.authReady=true;L.supLoaded=true;supSubs();return}
 const a=AUTH();if(!a){L.authReady=true;return}
 RT("owner").on("value",s=>{D.owner=s.val()||null;renderSoon()});
 a.onAuthStateChanged(async u=>{L.user=u;L.authReady=true;if(!u){renderSoon();return}
  const ow=(await RT("owner").once("value").catch(()=>null)),own=ow&&ow.val()===u.uid||await loadCoAdmin(u);D.owner=ow?ow.val():D.owner;
  const sf=(await RT("staff/"+u.uid).once("value").catch(()=>null)),sv=sf&&sf.val();if(sv)D.staff=Object.assign({},D.staff,{[u.uid]:sv});
  if(own||sv)supSubs();renderSoon()})}
function supportView(){if(supDemo())return staffTabs()+staffBody();
 if(!L.authReady)return loadingView();
 const card=(h,b)=>`<section class="card stack narrow"><div class="eyebrow">Host Mode support</div><h2>${h}</h2>${b}<a class="btn xs as" href="index.html">Home</a></section>`;
 if(!L.user)return card(L.acMode==="join"?"Create your support login":"Sign in",L.acMode==="join"?`<p class="small muted m0">Use the one-time support code Roy gave you.</p><label class="stack tight"><span class="small">Support code</span><input type="text" data-draft="sj_code" value="${esc(dv("sj_code",""))}" autocapitalize="characters" autocomplete="off"></label><label class="stack tight"><span class="small">Your name</span><input type="text" data-draft="sj_name" value="${esc(dv("sj_name",""))}" autocomplete="name"></label><label class="stack tight"><span class="small">Email</span><input type="email" data-draft="ac_email" value="${esc(dv("ac_email",""))}" autocomplete="email"></label><label class="stack tight"><span class="small">Choose a password (8+ characters)</span><input type="password" data-draft="ac_pw" autocomplete="new-password"></label><button class="btn primary" data-act="supJoin">Create my support login</button><button class="btn xs as" data-act="acMode" data-k="signin">I already have a login</button>`
  :`<p class="small muted m0">For the Host Mode support team.</p>${acctForm("signin")}<button class="btn xs as" data-act="acMode" data-k="join">I have a support code</button>`);
 const me=supMe();if(!me)return card("No support access",`<p class="small muted m0">You're signed in as ${esc(L.user.email||"")}, which doesn't have a support login. If Roy gave you a support code, sign out and tap "I have a support code."</p><button class="btn" data-act="acOut">Sign out</button>`);
 return `<div class="row between small acctbar"><span class="muted">Signed in as ${esc(L.user.email||"")} · ${esc(me.name)}</span><span class="row">${me.role==="owner"||me.role==="admin"?`<a class="btn xs" href="${esc(baseURL())}#host">Admin console</a>`:roleLinks("support")}<button class="btn xs" data-act="acOut">Sign out</button></span></div>`+staffTabs()+staffBody()}

/* ================= VENDOR PAGES =================
   Each vendor gets a private link (games.html?vendor=TOKEN&p=PLANNER), no account needed.
   planners/{uid}/clientVendors/{cid}/{vk} also holds: tok (the link's token), vnote (notes for the vendor), extra (details by vendor type), pickup
   planners/{uid}/vpages/{tok}  = what the vendor sees; rebuilt by the planner's portal (vpSync). Anyone with the token can read it.
   planners/{uid}/vcheck/{tok}  = {here: t, issues:{k:{text,t,ok}}}; written from the vendor's phone
   The run of show comes straight from the event (events/{EV}/content/ros and rosDone). A step is the vendor's when its "who" is
   "v:<cid>_<vk>", or when its words match the vendor's type (a caterer sees lunch and coffee, a DJ sees the first dance). */
const VK={
 cater:{l:"Caterer",x:"Allergies and meal notes",ph:"Two nut allergies at table 4. Twelve vegetarian plates.",kw:/coffee|lunch|dinner|breakfast|brunch|meal|food|buffet|cake|dessert|toast|cocktail|drink|\bbar\b|serve|snack/i,head:true},
 music:{l:"DJ or band",x:"Music cues",ph:"Grand entrance song, first dance song, last song of the night.",kw:/dance|music|song|entrance|toast|speech|remarks|welcome|introduc|award|keynote|panel|cake|send.?off|game/i},
 photo:{l:"Photographer or videographer",x:"Shot list",ph:"Family photo after the ceremony. Candids of the grandparents.",kw:/photo|portrait|ceremony|entrance|first dance|cake|toast|speech|keynote|award|group|send.?off|reveal/i},
 rental:{l:"Florist, decor or rentals",x:"Delivery and setup details",ph:"Load in through the side door. Centerpieces on every guest table.",kw:/setup|set up|load|deliver|teardown|tear down|strike|registration|doors|close/i,pickup:true},
 venue:{l:"Venue staff",x:"Room setup",ph:"20 round tables of 8, stage on the north wall, dance floor in the middle.",kw:/doors|registration|setup|break|lunch|dinner|close|end|reset/i},
 other:{l:"Vendor",x:"Details for you",ph:"",kw:null}};
/* a function declaration (not a const) so the planner demo can build vendor pages while the page is still loading */
function vKind(role){const r=String(role||"").toLowerCase();return [["cater",/cater|food|chef|kitchen|bak|cake|dessert|bartend|\bbar\b|beverage|drink|coffee/],["music",/\bdj\b|band|music|sound|entertain|singer|\bmc\b|emcee/],["photo",/photo|video|film|camera/],["rental",/flor|flower|decor|rental|tent|linen|chair|table|light|balloon|drap|furniture|\bav\b|staging|screen|badge|sign|print/],["venue",/venue|hall|staff|facility|site|room|centre|center|ballroom/]].map(([k,re])=>re.test(r)?k:"").find(Boolean)||"other"}
const vpLink=tok=>location.origin+location.pathname.replace(/[^/]*$/,"")+"games.html?"+(window.__HMPDEMO?"pdemo=1&":"")+"vendor="+encodeURIComponent(tok)+"&p="+encodeURIComponent(PLID());
const vpNewTok=()=>{const a="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789",r=crypto.getRandomValues(new Uint32Array(18));let s="";r.forEach(x=>s+=a[x%a.length]);return s};
/* the vendor's page, from the planner's records (pure, so the demo can build it too) */
function vpBuild(v,cid,c,brand,prof){brand=brand||{};prof=prof||{};c=c||{};
 return {name:String(v.name||"").slice(0,60),role:String(v.role||"").slice(0,40),kind:vKind(v.role),arrive:v.arrive||"",pickup:v.pickup||"",delivers:String(v.delivers||"").slice(0,80),
  vnote:String(v.vnote||"").slice(0,600),extra:String(v.extra||"").slice(0,1500),ev:c.ev||"",evName:String(c.evName||c.evTitle||((c.name||"")+"'s event")).slice(0,80),date:c.date||"",place:String(c.venue||"").slice(0,120),
  guests:+c.guests||0,vkey:cid+"_"+(v.k||""),plan:{name:String(brand.name||prof.biz||prof.name||"Your planner").slice(0,80),phone:String(brand.phone||prof.phone||"").slice(0,30)}}}
let vpT=null;function vpSyncSoon(){clearTimeout(vpT);vpT=setTimeout(vpSync,700)}
function vpSync(){if(!PSP||VIEW!=="planner"||L.viewOnly)return;const out={},cs=D.clients||{};
 Object.keys(D.cven||{}).forEach(cid=>{if(!cs[cid])return;Object.keys(D.cven[cid]||{}).forEach(vk=>{const v=D.cven[cid][vk];if(v&&v.tok)out[v.tok]=vpBuild(Object.assign({k:vk},v),cid,cs[cid],D.brand,D.plMe)})});
 const j=JSON.stringify(out);if(j===L.vpLast)return;L.vpLast=j;RT(PSP+"vpages").set(out).catch(()=>{})}
/* every vendor with a link, for the planner's Home and Vendors tab */
function vpAll(){const out=[],cs=D.clients||{};Object.keys(D.cven||{}).forEach(cid=>Object.keys(D.cven[cid]||{}).forEach(vk=>{const v=D.cven[cid][vk];if(v&&v.tok)out.push({cid,vk,v,c:cs[cid]||{},chk:(D.vchk||{})[v.tok]||{}})}));return out}
const vpIssues=chk=>Object.keys(chk.issues||{}).map(k=>Object.assign({k},chk.issues[k])).sort((a,b)=>(a.t||0)-(b.t||0));
const vpOpenIssues=()=>vpAll().reduce((n,x)=>n+vpIssues(x.chk).filter(i=>!i.ok).length,0);
/* planner side: the vendor page editor inside a client's Vendors tab */
function vpEditor(cid,v){const K=VK[vKind(v.role)],tok=v.tok,chk=tok?((D.vchk||{})[tok]||{}):{},iss=vpIssues(chk),p="vp_"+cid+"_"+v.k+"_",g=(f,d)=>dv(p+f,v[f]==null?(d||""):v[f]);
 const link=tok?vpLink(tok):"",sms=tok&&v.phone?`sms:${String(v.phone).replace(/[^+\d]/g,"")}?&body=${encodeURIComponent(`Hi ${v.name}, here's your page for the event, with your arrival time and the schedule: ${link}`)}`:"";
 return `<div class="card stack tight"><div class="row between"><b>${esc(v.name)}'s vendor page</b><span class="pill">${esc(K.l)}</span></div>
 <span class="small muted">One page on their phone with the event basics, their arrival time and an "I'm here" button, the schedule with their moments highlighted, your notes, and a way to flag a problem. No account needed.</span>
 ${tok?`<div class="small">${chk.here?`<span class="okt">✓ Checked in at ${esc(supTime(chk.here))}</span>`:"Not checked in yet"}</div>`:""}
 ${iss.length?`<div class="stack tight">${iss.map(i=>`<div class="row between small clrow"><span class="mw0 ${i.ok?"muted":"bad"}">🚩 ${esc(i.text)} <span class="muted">· ${esc(supAgo(i.t))}</span></span>${i.ok?'<span class="small muted">Handled</span>':`<button class="btn xs" data-act="vpIssueOk" data-m="${esc(cid)}" data-k="${esc(v.k)}" data-i="${esc(i.k)}">Handled</button>`}</div>`).join("")}</div>`:""}
 <div class="grid2 g8"><label class="stack tight"><span class="small">Arrives at</span><input type="time" data-draft="${p}arrive" value="${esc(g("arrive"))}"></label>
 ${K.pickup?`<label class="stack tight"><span class="small">Picks up at</span><input type="time" data-draft="${p}pickup" value="${esc(g("pickup"))}"></label>`:""}
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Notes for ${esc(v.name)}</span><textarea rows="2" data-draft="${p}vnote" maxlength="600" placeholder="Park in the back lot. Power is on the stage wall.">${esc(g("vnote"))}</textarea></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">${esc(K.x)}</span><textarea rows="3" data-draft="${p}extra" maxlength="1500" placeholder="${esc(K.ph)}">${esc(g("extra"))}</textarea></label></div>
 <div class="row"><button class="btn sm primary" data-act="vpSave" data-m="${esc(cid)}" data-k="${esc(v.k)}">${tok?"Save":"Save and make their link"}</button>${tok?`<button class="btn sm" data-act="vpCopy" data-m="${esc(cid)}" data-k="${esc(v.k)}">Copy their link</button>${sms?`<a class="btn sm" href="${esc(sms)}">Text it to them</a>`:""}<a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">Open it</a>`:""}<button class="btn sm" data-act="vpToggle" data-m="${esc(cid)}" data-k="${esc(v.k)}">Close</button></div>
 ${tok?`<span class="small muted">To give them their own steps in the schedule, pick them under "Who" when you add a step in the event's run of show. ${c0(cid)}</span>`:""}</div>`}
const c0=cid=>((D.clients||{})[cid]||{}).ev?"":"Link this client to an event first, so the schedule shows up on the page.";
Object.assign(ACT,{
 vpToggle:el=>{const k=el.dataset.m+"|"+el.dataset.k;L.vpOpen=L.vpOpen===k?null:k;render(true)},
 vpSave:async el=>{const cid=el.dataset.m,vk=el.dataset.k,v=((D.cven||{})[cid]||{})[vk];if(!v)return;const p="vp_"+cid+"_"+vk+"_",g=f=>dv(p+f,v[f]==null?"":v[f]);
  const u={arrive:g("arrive"),pickup:VK[vKind(v.role)].pickup?g("pickup"):(v.pickup||""),vnote:String(g("vnote")).trim().slice(0,600),extra:String(g("extra")).trim().slice(0,1500)};if(!v.tok)u.tok=vpNewTok();
  await RT(PSP+`clientVendors/${cid}/${vk}`).update(u);Object.keys(L.drafts).filter(k=>k.startsWith(p)).forEach(k=>delete L.drafts[k]);vpSyncSoon();toast(v.tok?"Saved. Their page updates right away.":"Saved. Their link is ready to copy.");render(true)},
 vpCopy:async el=>{const v=((D.cven||{})[el.dataset.m]||{})[el.dataset.k];if(!v||!v.tok)return;const l=vpLink(v.tok);try{await navigator.clipboard.writeText(l);toast("Link copied. Send it to "+v.name+".")}catch(e){prompt("Copy this link",l)}},
 vpIssueOk:async el=>{const v=((D.cven||{})[el.dataset.m]||{})[el.dataset.k];if(!v||!v.tok)return;await RT(PSP+`vcheck/${v.tok}/issues/${el.dataset.i}/ok`).set(true);toast("Marked handled")}
});
/* the vendor's own page */
function vendorConnect(){const tok=QS.get("vendor")||"";if(!/^[A-Za-z0-9_-]{8,40}$/.test(tok)||!PSP){L.loaded=true;D.vp=null;renderSoon();return}
 RT(PSP+"vpages/"+tok).on("value",s=>{D.vp=s.val();L.loaded=true;const ev=D.vp&&D.vp.ev;
  if(ev&&L.vpEv!==ev){L.vpEv=ev;ER("content/ros",ev).on("value",x=>{D.vros=x.val()||{};renderSoon()},()=>{});ER("rosDone",ev).on("value",x=>{D.vdone=x.val()||{};renderSoon()},()=>{});ER("rosShifts",ev).on("value",x=>{D.vshift=x.val()||{};renderSoon()},()=>{})}renderSoon()},()=>{L.loaded=true;D.vp=null;renderSoon()});
 RT(PSP+"vcheck/"+tok).on("value",s=>{D.vc=s.val()||{};renderSoon()},()=>{});
 RT(PSP+"brand").on("value",s=>{D.brand=s.val();try{applyTheme()}catch(e){}renderSoon()},()=>{});
 setInterval(()=>{vpNudge();renderSoon()},30000)}
/* heads-up: on the day, the vendor's next moment within 15 minutes shows at the top; with notifications allowed,
   the phone also buzzes 5 minutes before (free browser notifications, while the page is open) */
function vpNext(){const v=D.vp;if(!v||v.date!==todayISO())return null;const K=VK[v.kind]||VK.other,me="v:"+v.vkey,done=D.vdone||{},n=new Date(),now=n.getHours()*60+n.getMinutes();
 return Object.keys(D.vros||{}).map(k=>Object.assign({k},D.vros[k])).filter(x=>!done[x.k]&&x.time&&(x.who===me||(!!K.kw&&!x.who&&K.kw.test((x.title||"")+" "+(x.note||""))))).map(x=>Object.assign(x,{inMin:rosMin(x.time)-now})).filter(x=>x.inMin>=-5&&x.inMin<=15).sort((a,b)=>a.inMin-b.inMin)[0]||null}
function vpNudge(){const x=vpNext();if(!x||x.inMin>5||x.inMin<0)return;const key="vpN_"+x.k+"_"+x.time;if(store.get(key,0))return;store.set(key,1);
 try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
 try{if(window.Notification&&Notification.permission==="granted")new Notification("Coming up at "+fmtTime(x.time),{body:x.title+". You're on."})}catch(e){}}
function vendorView(){if(!L.loaded)return loadingView();const v=D.vp;
 if(!v)return `<section class="card stack narrow"><h2>This link isn't working</h2><p class="small muted m0">It may have been mistyped or turned off. Ask your planner to send it again.</p></section>`;
 const K=VK[v.kind]||VK.other,c=D.vc||{},iss=vpIssues(c),me="v:"+v.vkey,done=D.vdone||{};
 const ros=Object.keys(D.vros||{}).map(k=>Object.assign({k},D.vros[k])).sort((a,b)=>String(a.time||"99").localeCompare(String(b.time||"99"))||(a.t||0)-(b.t||0));
 const mine=x=>x.who===me||(!!K.kw&&!x.who&&K.kw.test((x.title||"")+" "+(x.note||""))),nextI=ros.findIndex(x=>!done[x.k]),myN=ros.filter(x=>mine(x)&&!done[x.k]);
 const tel=v.plan&&v.plan.phone?String(v.plan.phone).replace(/[^+\d]/g,""):"";
 return `<section class="card stack"><div class="eyebrow">${esc(v.role||K.l)}</div><h2 class="m0">${esc(v.name)}</h2>
 <div class="small"><b>${esc(v.evName)}</b>${v.date?` · ${esc(clFmtDate(v.date))}`:""}${v.place?`<span class="db">${esc(v.place)} · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.place)}" target="_blank" rel="noopener">Directions</a></span>`:""}</div>
 <div class="small">Questions? ${esc(v.plan&&v.plan.name||"Your planner")}${tel?` · <a href="tel:${esc(tel)}">${esc(v.plan.phone)}</a>`:""}</div></section>
 ${(()=>{const x=vpNext();return x?`<section class="card stack gilt vpsoon" role="status"><b>${x.inMin<=0?"Happening now":"Coming up in "+x.inMin+" min"}: ${esc(x.title)}</b><span class="small">${esc(fmtTime(x.time))} · you're on</span></section>`:""})()}
 ${(()=>{const sh=Object.values(D.vshift||{}).sort((a,b)=>(a.t||0)-(b.t||0)),tot=sh.reduce((n,z)=>n+(+z.mins||0),0),last=sh[sh.length-1];return last&&tot?`<section class="card stack"><b>The schedule moved ${tot} minutes later</b><span class="small muted">Last change at ${esc(new Date(last.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}))}. The times below are up to date.</span></section>`:""})()}
 <section class="card stack"><h3>Your arrival</h3>${v.arrive?`<div class="vpbig">${esc(clFmtTime(v.arrive))}</div>`:'<p class="small muted m0">Your planner hasn\'t set an arrival time yet.</p>'}${v.pickup?`<div class="small">Pick up at <b>${esc(clFmtTime(v.pickup))}</b></div>`:""}${v.delivers?`<div class="small muted">Bringing: ${esc(v.delivers)}</div>`:""}
 ${c.here?`<div class="okt"><b>✓ You checked in at ${esc(supTime(c.here))}</b></div><button class="btn xs as" data-act="vpHere" data-k="undo">That was a mistake</button>`:`<button class="btn primary vpherebtn" data-act="vpHere">I'm here</button><span class="small muted">Tap when you arrive, so ${esc(v.plan&&v.plan.name||"your planner")} knows without a call.</span>`}</section>
 ${myN.length?`<section class="card stack gilt"><h3>Your moments</h3><div class="stack tight">${myN.slice(0,6).map(x=>`<div class="row between small clrow"><b>${esc(x.title)}</b><span>${esc(clFmtTime(x.time)||"")}</span></div>`).join("")}</div></section>`:""}
 ${v.date===todayISO()&&window.Notification&&Notification.permission==="default"?`<button class="btn sm as" data-act="vpNotify">Buzz my phone 5 minutes before my moments</button>`:""}
 <section class="card stack"><div class="row between"><h3>Schedule</h3>${ros.length?`<span class="pill">${ros.filter(x=>done[x.k]).length} of ${ros.length} done</span>`:""}</div>
 ${ros.length?`<div class="stack tight">${ros.map((x,i)=>{const d=!!done[x.k],m=mine(x);return `<div class="row between small clrow ${d?"done dim":""} ${m?"vpmine":""}"><span class="mw0"><b>${esc(x.title||"")}</b>${m?' <span class="pill gold">You</span>':""}${i===nextI?' <span class="pill live">Up next</span>':""}${d?' <span class="pill ok">Done</span>':""}${x.note?`<span class="db muted">${esc(x.note)}</span>`:""}</span><span class="rostime">${esc(clFmtTime(x.time)||"")}</span></div>`}).join("")}</div><span class="small muted">Updates live as the day runs.</span>`:'<p class="small muted m0">The schedule shows up here once your planner shares it.</p>'}</section>
 ${v.extra||(K.head&&v.guests)?`<section class="card stack"><h3>${esc(K.x)}</h3>${K.head&&v.guests?`<div class="small">Headcount: <b>${+v.guests}</b></div>`:""}${v.extra?`<div class="small" style="white-space:pre-wrap">${esc(v.extra)}</div>`:""}</section>`:""}
 ${v.vnote?`<section class="card stack"><h3>Notes from ${esc(v.plan&&v.plan.name||"your planner")}</h3><div class="small" style="white-space:pre-wrap">${esc(v.vnote)}</div></section>`:""}
 <section class="card stack"><h3>Something wrong?</h3><p class="small muted m0">Stuck in traffic, missing a delivery, can't find the loading door? Tell ${esc(v.plan&&v.plan.name||"your planner")} here.</p>
 ${iss.length?`<div class="stack tight">${iss.map(i=>`<div class="small clrow">🚩 ${esc(i.text)} <span class="muted">· ${esc(supAgo(i.t))}${i.ok?" · seen and handled":""}</span></div>`).join("")}</div>`:""}
 <textarea rows="2" data-draft="vp_issue" maxlength="300" aria-label="What's wrong" placeholder="Running 15 minutes late">${esc(dv("vp_issue",""))}</textarea><button class="btn sm as" data-act="vpIssue">Send to the planner</button></section>`}
Object.assign(ACT,{
 vpNotify:async()=>{try{const p=await Notification.requestPermission();toast(p==="granted"?"You'll get a buzz 5 minutes before your moments, while this page is open":"Notifications are off. Keep this page open and check the top for what's next.")}catch(e){}render(true)},
 vpHere:async el=>{const tok=QS.get("vendor")||"";try{await RT(PSP+"vcheck/"+tok+"/here").set(el.dataset.k==="undo"?null:Date.now());toast(el.dataset.k==="undo"?"Check-in removed":"Checked in. Thanks!")}catch(e){toast("Couldn't send it. Check your connection.")}},
 vpIssue:async()=>{const tok=QS.get("vendor")||"",text=String(dv("vp_issue","")).trim().slice(0,300);if(!text)return toast("Say what's wrong first");
  try{await RT(PSP+"vcheck/"+tok+"/issues").push().set({text,t:Date.now()});delete L.drafts.vp_issue;toast("Sent to the planner");render(true)}catch(e){toast("Couldn't send it. Check your connection.")}}
});

/* ================= STAFF AREA: SALES AND RESOURCES =================
   Roy and support staff (Icee) see these in the staff area (games.html#support) and the admin console.
   partygames/sales/{k}       = a planner, venue or business Host Mode is pitching:
                                {name, biz, kind, city, phone, email, web, stage, next, nextWhat, owner:{uid,name}, src, notes, t, last}
   partygames/salesLog/{k}/{n} = {text, name, t}   every call, email or visit, newest last
   partygames/resources/{k}   = a staff document: {title, kind, body, url, t, by, edited, prev}
                                prev keeps the version before the last edit, so a mistake can be put back
   Staff can add and edit; only Roy deletes. Competitor names are fine here (staff only), never in public pages. */
D.sales={};D.salesLog={};D.resources={};
const SL_ST=[["idea","To contact",""],["contacted","Contacted",""],["talking","Talking","gold"],["demo","Demo booked","gold"],["trial","Trying it","warn"],["customer","Customer","ok"],["notnow","Not now",""]];
const slSt=k=>SL_ST.find(x=>x[0]===k)||SL_ST[0];
const SL_KIND=[["planner","Event planner"],["venue","Venue"],["decor","Decorator or rentals"],["vendor","Vendor (DJ, caterer, photographer)"],["host","Single-event host"],["other","Other"]];
const slList=()=>Object.keys(D.sales||{}).map(k=>Object.assign({k},D.sales[k])).sort((a,b)=>String(a.next||"9999").localeCompare(String(b.next||"9999"))||(b.last||b.t||0)-(a.last||a.t||0));
const slLog=k=>Object.keys((D.salesLog||{})[k]||{}).map(n=>Object.assign({n},D.salesLog[k][n])).sort((a,b)=>(a.t||0)-(b.t||0));
const slDue=()=>slList().filter(x=>x.next&&x.next<=mateToday()&&!["customer","notnow"].includes(x.stage)).length;
/* a first pitch email in Host Mode's voice; the pitch-email Skill writes better ones with Claude */
function slPitch(x){const kind=x.kind||"planner",first=String(x.name||"").split(" ")[0]||"there";
 const hook={planner:"Most planners we talk to pay for three or four apps: one for clients and invoices, one for timelines, one for floor plans, and nothing for the party itself.",
  venue:"Venues tell us they juggle a booking calendar, a rentals spreadsheet and a separate app for every event.",
  decor:"Decorators and rental businesses tell us their linens, centerpieces and chairs live in a spreadsheet nobody trusts.",
  vendor:"Vendors tell us they get the day's schedule five different ways from five different planners.",
  host:"Most party apps stop at the invitation.",other:"Most event software goes quiet on the big day."}[kind]||"";
 const body=`Hi ${first},\n\n${hook} Host Mode puts it all in one place: clients, planning, ${kind==="venue"?"venue bookings, blocked days, ":""}inventory and the event itself, with games, a big screen and guest check-in on the night.\n\nYou can bring everything over in one upload, and if anything ever goes wrong there's a real person to help, right inside the app.\n\nWould you have 15 minutes this week for a quick look?\n\n${(supMe()||{}).name||"Host Mode"}\nHost Mode · Charlotte, NC`;
 return {subject:"Plan it, run it, remember it, in one place",body}}
function salesBody(){const me=supMe(),all=slList(),f=L.slF||"open",q=String(dv("sl_q","")).toLowerCase().trim(),today=mateToday();
 const cnt=k=>all.filter(x=>(x.stage||"idea")===k).length,due=all.filter(x=>x.next&&x.next<=today&&!["customer","notnow"].includes(x.stage));
 const shown=all.filter(x=>{const s=x.stage||"idea";if(f==="open"&&["customer","notnow"].includes(s))return false;if(f==="due"&&!due.includes(x))return false;if(f==="mine"&&!(x.owner&&me&&x.owner.uid===me.uid))return false;if(SL_ST.some(z=>z[0]===f)&&s!==f)return false;
  return !q||[x.name,x.biz,x.city,x.email,x.notes].join(" ").toLowerCase().includes(q)});
 const open=L.slOpen,edit=L.slEdit;
 return `<section class="card stack"><div class="row between"><h2 class="m0">Sales</h2><button class="btn sm primary" data-act="slNew">Add someone to pitch</button></div>
 <p class="small muted m0">The planners, venues and businesses you're talking to about Host Mode, where each one stands, and what to do next.</p>
 <div class="stats"><button class="stat ${due.length?"hot":""}" data-act="slFilter" data-k="due"><b>${due.length}</b><span>Follow up today</span></button><button class="stat" data-act="slFilter" data-k="talking"><b>${cnt("talking")+cnt("demo")}</b><span>Talking or demo booked</span></button><button class="stat" data-act="slFilter" data-k="trial"><b>${cnt("trial")}</b><span>Trying it</span></button><button class="stat" data-act="slFilter" data-k="customer"><b>${cnt("customer")}</b><span>Customers</span></button></div>
 ${edit?slForm(edit==="new"?null:Object.assign({k:edit},(D.sales||{})[edit]||{})):""}</section>
 <section class="card stack"><div class="row small">${[["open","Open"],["due","Follow up today"],["mine","Mine"]].concat(SL_ST.map(x=>[x[0],x[1]])).map(([k,l])=>`<button class="btn xs ${f===k?"primary":""}" data-act="slFilter" data-k="${k}">${l}</button>`).join("")}</div>
 <div class="row"><input type="search" class="grow" data-draft="sl_q" value="${esc(dv("sl_q",""))}" placeholder="Search by name, business or city" aria-label="Search sales"><button class="btn xs" data-act="tkFind">Search</button>${all.length?`<button class="btn xs" data-act="slCsv">Download</button>`:""}</div>
 ${shown.length?`<div class="stack tight">${shown.map(x=>{const st=slSt(x.stage),late=x.next&&x.next<=today&&!["customer","notnow"].includes(x.stage),lg=slLog(x.k);
  return `<div class="mrow2 tkrow ${open===x.k?"open":""}"><button class="tkhead" data-act="slOpen" data-k="${esc(x.k)}" aria-expanded="${open===x.k}"><span class="row between small"><span class="mw0"><span class="pill ${st[2]}">${st[1]}</span> <b>${esc(x.biz||x.name||"Someone")}</b>${x.biz&&x.name?" · "+esc(x.name):""}${x.city?` <span class="muted">· ${esc(x.city)}</span>`:""}</span><span class="muted">${esc((SL_KIND.find(z=>z[0]===x.kind)||SL_KIND[5])[1])}</span></span>
  <span class="db small ${late?"bad":"muted"}">${x.next?(late?(x.next===today?"Follow up today":"Follow up was due "+esc(clFmtDate(x.next))):"Next: "+esc(clFmtDate(x.next)))+(x.nextWhat?" · "+esc(x.nextWhat):""):"No next step set"}${x.owner?" · "+esc(x.owner.name):""}</span></button>
  ${open===x.k?`<div class="tkdetail stack tight small">${[x.phone?`<a href="tel:${esc(String(x.phone).replace(/[^+\d]/g,""))}">${esc(x.phone)}</a>`:"",x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:"",x.web?`<a href="${esc(/^https?:/.test(x.web)?x.web:"https://"+x.web)}" target="_blank" rel="noopener">${esc(x.web)}</a>`:"",x.src?"Found through "+esc(x.src):""].filter(Boolean).join(" · ")}
   ${x.notes?`<div style="white-space:pre-wrap">${esc(x.notes)}</div>`:""}
   <div class="row"><select data-act="slStage" data-k="${esc(x.k)}" aria-label="Where they stand">${SL_ST.map(z=>`<option value="${z[0]}" ${(x.stage||"idea")===z[0]?"selected":""}>${z[1]}</option>`).join("")}</select>${x.email?`<a class="btn xs" href="mailto:${esc(x.email)}?subject=${encodeURIComponent(slPitch(x).subject)}&body=${encodeURIComponent(slPitch(x).body)}">Email a pitch</a>`:""}<button class="btn xs" data-act="slCopyPitch" data-k="${esc(x.k)}">Copy a pitch</button><button class="btn xs" data-act="slEdit" data-k="${esc(x.k)}">Edit</button>${supIsOwner()?`<button class="btn xs" data-act="slDel" data-k="${esc(x.k)}">${L.confirm==="slx"+x.k?"Tap again to delete":"Delete"}</button>`:""}</div>
   ${x.stage==="trial"?`<span class="muted">Ready for an account? Roy makes planner invite codes in the admin console.</span>`:""}
   <b>What's happened</b>${lg.length?`<div class="stack tight tkthread">${lg.map(l=>`<div>${esc(l.text)} <span class="muted">· ${esc(l.name||"")} · ${esc(supTime(l.t))}</span></div>`).join("")}</div>`:'<span class="muted">Nothing logged yet.</span>'}
   <div class="row"><input type="text" class="grow" data-draft="sll_${esc(x.k)}" maxlength="500" value="${esc(dv("sll_"+x.k,""))}" placeholder="Called, left a voicemail" aria-label="Log what happened"><button class="btn xs" data-act="slLogAdd" data-k="${esc(x.k)}">Log it</button></div>
   <div class="row"><span>Next step</span><input type="date" data-draft="sln_${esc(x.k)}" value="${esc(dv("sln_"+x.k,x.next||""))}" aria-label="Next step date"><input type="text" class="grow" data-draft="slw_${esc(x.k)}" maxlength="80" value="${esc(dv("slw_"+x.k,x.nextWhat||""))}" placeholder="Send the demo link" aria-label="Next step"><button class="btn xs" data-act="slNext" data-k="${esc(x.k)}">Save</button></div></div>`:""}</div>`}).join("")}</div>`
  :`<p class="small muted m0">${all.length?"Nothing here.":"No one yet. Add the first planner or venue you want to pitch."}</p>`}</section>`}
function slForm(x){const g=(f,d)=>esc(dv("slf_"+f,x?(x[f]==null?"":x[f]):(d||"")));
 return `<div class="card stack tight"><div class="row between"><b>${x?"Edit "+esc(x.biz||x.name):"Someone to pitch"}</b><button class="btn xs" data-act="slClose">Close</button></div><div class="grid2 g8">
 <label class="stack tight"><span class="small">Business</span><input type="text" data-draft="slf_biz" maxlength="80" value="${g("biz")}" placeholder="Queen City Events"></label>
 <label class="stack tight"><span class="small">Contact name</span><input type="text" data-draft="slf_name" maxlength="60" value="${g("name")}" placeholder="Dana Brooks"></label>
 <label class="stack tight"><span class="small">What they are</span><select data-draft="slf_kind">${SL_KIND.map(([k,l])=>`<option value="${k}" ${dv("slf_kind",x?x.kind:"planner")===k?"selected":""}>${l}</option>`).join("")}</select></label>
 <label class="stack tight"><span class="small">City</span><input type="text" data-draft="slf_city" maxlength="60" value="${g("city","Charlotte")}"></label>
 <label class="stack tight"><span class="small">Phone</span><input type="tel" data-draft="slf_phone" maxlength="30" value="${g("phone")}"></label>
 <label class="stack tight"><span class="small">Email</span><input type="email" data-draft="slf_email" maxlength="120" value="${g("email")}"></label>
 <label class="stack tight"><span class="small">Website or Instagram</span><input type="text" data-draft="slf_web" maxlength="120" value="${g("web")}"></label>
 <label class="stack tight"><span class="small">How you found them</span><input type="text" data-draft="slf_src" maxlength="80" value="${g("src")}" placeholder="Wedding expo, referral, Instagram"></label>
 <label class="stack tight"><span class="small">Next step date</span><input type="date" data-draft="slf_next" value="${g("next")}"></label>
 <label class="stack tight"><span class="small">Next step</span><input type="text" data-draft="slf_nextWhat" maxlength="80" value="${g("nextWhat")}" placeholder="First call"></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Notes</span><textarea rows="3" data-draft="slf_notes" maxlength="2000" placeholder="Does 30 weddings a year, uses spreadsheets for rentals">${g("notes")}</textarea></label></div>
 <button class="btn primary as" data-act="slSave" data-k="${x?esc(x.k):""}">${x?"Save":"Add"}</button></div>`}
const slClear=()=>Object.keys(L.drafts).filter(k=>/^slf_/.test(k)).forEach(k=>delete L.drafts[k]);
/* ---- Resources: the team's shared documents ---- */
const RS_KIND={playbook:["📣","Sales and marketing"],advantages:["🏆","How we win"],process:["🧭","How we sell"],competitors:["🔍","Competitors (staff only)"],brand:["🎨","Brand kit"],link:["🔗","Link"],doc:["📄","Document"]};
/* starter documents, shown until the team saves its own copy. No competitor names here: this code is public. */
const RS_STARTERS={
 playbook:{title:"Sales and Marketing Playbook",kind:"playbook",body:`In anything the public sees, never name a competitor. Say "other apps" or "other event software" instead.

## Our main message
Plan it. Run it. Remember it. All in one place.

## Taglines
- "Other software goes quiet on the big day. Host Mode is just getting started."
- "Stop paying for three apps. Host Mode does it all."
- "Bring everything over in one upload."
- "Real help from real people, right inside the app."
- "Floor plans that know what's in your storage room." (coming soon)
- "The floor plan that actually knows your business." (use once floor plans are live)
- "Other apps are for a backyard party. Host Mode is for your business."

## Our strengths vs. what other apps miss
- They stop helping once the contract is signed → Host Mode runs the party itself: games, big screen, check-in, drinks, photos
- Planners pay for several apps at once → clients, planning, inventory, venue bookings and the event, in one app
- Switching apps is painful → upload your old spreadsheets once and everything lands where it belongs
- Support by email only, during business hours → report a problem from any screen and get a real reply in the app
- Floor plan software is expensive and hard to learn → simple floor plans tied to your inventory (coming soon)
- Nothing left after the event → photo album and a keepsake guests love to share
- Casual party apps have no business tools → client portals, packages, invoices, teammates and reports
- Vendors get the schedule five different ways → every vendor gets one page with their arrival time and the live schedule

## Who we're talking to
- Professional planners who juggle several apps
- Venues that need bookings, blocked days and inventory in one place
- Decorators and rental businesses tracking linens, centerpieces, chairs and lights
- Single-event hosts who want their party to feel professional

## Rules for public materials
- Never name a competitor or use their logos.
- Only promise features that are live. Mark anything else "coming soon."
- Pricing claims wait until subscriptions launch.
- Use the Host Mode name and colors (navy, orange and green) consistently.`},
 advantages:{title:"Sales Advantages",kind:"advantages",body:`Ideas that can set Host Mode apart. Use them in the sales plan, pitches and demos.

## Always-on sales help
Our AI sales agent can answer questions and walk people through a demo at any hour. Most small competitors can't.

## Easy switching
The importer brings in a planner's old spreadsheets and data in one upload, so the biggest reason to stay with another app goes away. This is the hardest one for others to copy.

## A first event free
People try it with no risk, then pay once they've seen it work. (Pricing waits for Roy's approval.)

## Real proof
The January 2 baby shower is our first case study: photos, guest reactions and what the host said.

## Planner connections
Roy's cousin is a professional planner. She can open doors and refer other planners.`},
 process:{title:"How We Sell (Icee's playbook)",kind:"process",body:`Write down what you do as you do it. It doesn't have to be neat: tell your Claude what happened and ask it to tidy this up. Later, this becomes the sales agent's guide.

## Where I find leads
-

## What I say on the first call or message
-

## What I show in a demo
- Start at games.html?pdemo=1#planner (the planner demo), then the vendor page and the big screen.

## When I follow up
-

## What people ask, and what I answer
-

## What's working / what isn't
- `},
 brand:{title:"Brand Kit",kind:"brand",body:`## Name
Host Mode (one space, both words capitalized)

## Colors
- Navy #0c2147 (main)
- Orange #f7941d (highlights and buttons)
- Green #3dae2b (success, "done")
- Gold #f2b134 (accents)
- Paper #fffaf3 (backgrounds)

## Logo
The app icon is img/icon.svg in the code. The new "two doors" crest logo is still being chosen; use the app icon until then.

## Screenshots for flyers and posts
img/shot-plan.jpg, img/shot-guest.jpg, img/shot-host.jpg, img/shot-tv.jpg, img/shot-moment.jpg

## Voice
Warm, plain and confident. Short sentences. No tech words. Talk about the party, not the software.`},
 competitors:{title:"Competitor Notes",kind:"competitors",body:`Staff only. Roy: paste the Host Mode Competitor Report here (it names the other companies, so it lives in the app, not in the public code).

## Pricing tracker
| Company | Plan | Price | Last checked |
|---|---|---|---|
| | | | |`}};
const rsList=()=>Object.keys(D.resources||{}).map(k=>Object.assign({k},D.resources[k])).sort((a,b)=>Object.keys(RS_KIND).indexOf(a.kind)-Object.keys(RS_KIND).indexOf(b.kind)||String(a.title).localeCompare(String(b.title)));
/* light formatting for documents: ## headings, - bullets, | tables, links */
function rsRender(body){const lines=String(body||"").split("\n"),out=[];let list=null,table=null;
 const inline=t=>esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
 const flush=()=>{if(list){out.push(`<ul class="m0">${list.join("")}</ul>`);list=null}if(table){out.push(`<div class="rstable"><table>${table.map((r,i)=>`<tr>${r.map(c=>i?`<td>${inline(c)}</td>`:`<th>${inline(c)}</th>`).join("")}</tr>`).join("")}</table></div>`);table=null}};
 lines.forEach(l=>{const t=l.trim();if(/^\|.*\|$/.test(t)){if(/^\|[\s|:-]+\|$/.test(t))return;if(list)flush();(table=table||[]).push(t.slice(1,-1).split("|").map(c=>c.trim()));return}
  if(/^[-*] /.test(t)){if(table)flush();(list=list||[]).push(`<li>${inline(t.slice(2))}</li>`);return}flush();
  if(/^#{1,3} /.test(t))out.push(`<h4>${inline(t.replace(/^#+ /,""))}</h4>`);else if(t)out.push(`<p class="m0">${inline(t)}</p>`)});
 flush();return out.join("")}
function resourcesBody(){const docs=rsList(),have=new Set(docs.map(d=>d.kind)),starters=Object.keys(RS_STARTERS).filter(k=>!have.has(k)),open=L.rsOpen,edit=L.rsEdit;
 const docCard=(d,starter)=>{const K=RS_KIND[d.kind]||RS_KIND.doc,isOpen=open===(starter?"s:"+d.kind:d.k),isEdit=!starter&&edit===d.k;
  return `<div class="mrow2 tkrow ${isOpen?"open":""}"><button class="tkhead" data-act="rsOpen" data-k="${esc(starter?"s:"+d.kind:d.k)}" aria-expanded="${isOpen}"><span class="row between small"><span class="mw0">${K[0]} <b>${esc(d.title)}</b>${starter?' <span class="pill">Starter</span>':""}</span><span class="muted">${starter?"not saved yet":d.edited?"edited "+esc(supAgo(d.edited))+(d.by?" by "+esc(d.by):""):""}</span></span></button>
  ${isOpen?`<div class="tkdetail stack tight">${d.kind==="link"&&d.url?`<a class="btn sm as" href="${esc(/^https?:/.test(d.url)?d.url:"https://"+d.url)}" target="_blank" rel="noopener">Open the link</a>`:""}
   ${isEdit?`<input type="text" data-draft="rse_t_${esc(d.k)}" maxlength="80" value="${esc(dv("rse_t_"+d.k,d.title))}" aria-label="Title"><textarea rows="16" data-draft="rse_b_${esc(d.k)}" maxlength="40000" aria-label="Document">${esc(dv("rse_b_"+d.k,d.body||""))}</textarea>${d.kind==="link"?`<input type="url" data-draft="rse_u_${esc(d.k)}" value="${esc(dv("rse_u_"+d.k,d.url||""))}" placeholder="https://…">`:""}
    <span class="small muted">Tip: start a line with ## for a heading or - for a bullet.</span><div class="row"><button class="btn sm primary" data-act="rsSave" data-k="${esc(d.k)}">Save</button><button class="btn sm" data-act="rsEditClose">Cancel</button></div>`
   :`<div class="rsdoc small">${rsRender(d.body)}</div><div class="row">${starter?`<button class="btn sm primary" data-act="rsAdopt" data-k="${esc(d.kind)}">Save it so the team can edit it</button>`:`<button class="btn sm" data-act="rsEdit" data-k="${esc(d.k)}">Edit</button><button class="btn sm" data-act="rsCopy" data-k="${esc(d.k)}">Copy the text</button>${d.prev?`<button class="btn sm" data-act="rsUndo" data-k="${esc(d.k)}">Undo the last edit</button>`:""}${supIsOwner()?`<button class="btn sm" data-act="rsDel" data-k="${esc(d.k)}">${L.confirm==="rsx"+d.k?"Tap again to delete":"Delete"}</button>`:""}`}</div>`}</div>`:""}</div>`};
 return `<section class="card stack"><div class="row between"><h2 class="m0">Resources</h2><button class="btn sm primary" data-act="rsNew">Add a document or link</button></div>
 <p class="small muted m0">The team's shared playbook, brand kit, sales notes and links. Only Roy and staff can see this page, so competitor names are fine here. Never put them in anything public.</p>
 ${L.rsNew?`<div class="card stack tight"><div class="grid2 g8"><label class="stack tight"><span class="small">Title</span><input type="text" data-draft="rsn_t" maxlength="80" value="${esc(dv("rsn_t",""))}" placeholder="Wedding expo flyer"></label><label class="stack tight"><span class="small">Kind</span><select data-draft="rsn_k">${Object.keys(RS_KIND).map(k=>`<option value="${k}" ${dv("rsn_k","doc")===k?"selected":""}>${RS_KIND[k][1]}</option>`).join("")}</select></label>
  <label class="stack tight" style="grid-column:1/-1"><span class="small">Link (optional): a promo video, a flyer in Google Drive or Canva</span><input type="url" data-draft="rsn_u" value="${esc(dv("rsn_u",""))}" placeholder="https://…"></label>
  <label class="stack tight" style="grid-column:1/-1"><span class="small">Text (optional)</span><textarea rows="5" data-draft="rsn_b" maxlength="40000">${esc(dv("rsn_b",""))}</textarea></label></div><div class="row"><button class="btn primary" data-act="rsAdd">Add</button><button class="btn" data-act="rsNewClose">Cancel</button></div></div>`:""}
 <div class="stack tight">${docs.map(d=>docCard(d,false)).join("")}${starters.map(k=>docCard(Object.assign({k:"s:"+k},RS_STARTERS[k]),true)).join("")}</div></section>`}
/* the staff area's tabs */
/* ---- Agents tab: the agent office (admin console, Roy and staff) ---- */
const AG_REPO="Hostmode/HostMode.Github.io",AG_LIMIT=100;
const AG_CAST=[["tester","Test customer","Nightly agents","guest"],["tech","Technical agent","Nightly agents","tech"],["builder","Builder","Claude builder","build"],["reviewer","Reviewer","Claude reviewer","clip"],["checks","Pull request checks","Pull request checks","guard"],["backup","Backup","Nightly backup","box"]];
const agState=r=>!r?"idle":r.status!=="completed"?"work":r.conclusion==="success"?"done":(r.conclusion==="failure"||r.conclusion==="timed_out")?"fail":"idle";
const agPrs=()=>((L.ag||{}).prs||[]).filter(p=>!p.draft&&p.state!=="closed");
/* the builder's scorecard: its pull requests (claude/... branches) merged, closed without merging, and undone (a later "Revert" pull request names them) */
function agScore(){const all=((L.ag||{}).prs||[]),mine=all.filter(p=>String((p.head||{}).ref||"").startsWith("claude/")),
  reverts=all.filter(p=>/^Revert "/.test(p.title||"")&&p.merged_at).map(p=>p.title.slice(8,-1));
 const merged=mine.filter(p=>p.merged_at),undone=merged.filter(p=>reverts.includes(p.title)).length,closed=mine.filter(p=>p.state==="closed"&&!p.merged_at).length,open=mine.filter(p=>p.state==="open").length;
 return {merged:merged.length,undone,closed,open,gate:Math.min(5,merged.length-undone)}}
function agLoad(force){const g=L.ag=L.ag||{};if(g.busy||(!force&&g.t&&Date.now()-g.t<120000))return;
 if(window.__HMPDEMO){const n=Date.now(),h=x=>new Date(n-x*36e5).toISOString(),u="https://github.com/"+AG_REPO+"/actions";
  g.runs=[["Nightly agents","completed","success",6],["Claude builder","in_progress","",0.1],["Claude reviewer","completed","success",2],["Pull request checks","completed","failure",3],["Nightly backup","completed","success",4]].map(([name,status,conclusion,a])=>({name,status,conclusion,html_url:u,created_at:h(a),updated_at:h(a)}));
  const pr=(t,ref,st,m)=>({title:t,head:{ref},state:st,merged_at:m?h(30):null,html_url:"https://github.com/"+AG_REPO+"/pulls",draft:false});
  g.prs=[pr("Add the calendar download","claude/issue-1","open"),pr("Keepsake art","claude/issue-2","open"),pr("Agents tab","claude/issue-20","closed",1),pr("Old office movement","claude/issue-22","closed"),pr("Thank-you cards","claude/issue-3","closed",1)];g.t=n;return}
 g.busy=true;const api="https://api.github.com/repos/"+AG_REPO+"/";
 Promise.all([fetch(api+"actions/runs?per_page=60").then(r=>r.ok?r.json():Promise.reject()),fetch(api+"pulls?state=all&per_page=100").then(r=>r.ok?r.json():Promise.reject())])
  .then(([a,p])=>{g.runs=a.workflow_runs||[];g.prs=Array.isArray(p)?p:[];g.err=false}).catch(()=>{g.err=true}).finally(()=>{g.busy=false;g.t=Date.now();renderSoon()})}
function agLatestRun(name){return ((L.ag||{}).runs||[]).filter(r=>r.name===name&&r.conclusion!=="skipped"&&r.conclusion!=="cancelled").sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]}
function agNews(k,r,st){const runs=Object.keys(D.agentRuns||{}).sort(),last=D.agentRuns&&D.agentRuns[runs[runs.length-1]],ts=(last&&last.tester)||{},tc=(last&&last.tech)||{},n=agPrs().length,b=D.backupStatus;
 if(st==="fail")return "Something went wrong. Tap to see.";
 if(k==="tester")return st==="work"?"Trying the games now…":ts.passed!=null?`${ts.passed} check${ts.passed===1?"":"s"} passed${ts.failed?`, ${ts.failed} failed`:""}`:st==="idle"?"No news yet":"Finished the checks";
 if(k==="tech")return st==="work"?"Looking at tickets…":n?"Waiting for Roy":tc.replied!=null?`${tc.replied} question${tc.replied===1?"":"s"} answered`:st==="idle"?"No news yet":"All caught up";
 if(k==="builder")return st==="work"?"Building something new…":n?`${n} fix${n===1?"":"es"} waiting for Roy`:st==="idle"?"No news yet":"Nothing to build";
 if(k==="reviewer")return st==="work"?"Reading a change…":st==="idle"?"No news yet":"Finished reading";
 if(k==="checks")return st==="work"?"Checking a change…":st==="idle"?"No news yet":"All clear at the door";
 return st==="work"?"Packing the boxes…":b&&b.t?`Last backup ${supAgo(b.t)}${b.mb?` (${b.mb} MB)`:""}`:st==="idle"?"No news yet":"Backed up"}
/* the agent office: an isometric party venue being set up. Each agent stands at its station (AG_SPOT) and shows its state by its
   floor ring and thought bubble: orange = working, green check = finished, red flag = needs a look, "z z" = resting.
   Tapping someone opens their card (agPanel) with mood-style bars. Everything is one SVG, drawn back to front (agScene). */
const AG_LOOK={tester:{shirt:"#2f8a4c",skin:"#c68c5a",hair:"#3b2416"},tech:{shirt:"#16255a",skin:"#8d5a3b",hair:"#111"},
 builder:{shirt:"#16255a",skin:"#f1c7a1",hair:"#6b3b1f"},reviewer:{shirt:"#e8edf7",skin:"#e0ac7e",hair:"#2a1a10"},
 checks:{shirt:"#111c3d",skin:"#a8714a",hair:"#111"},backup:{shirt:"#f6892f",skin:"#f3cfa8",hair:"#7a4b26"}};
/* stations on the 10 x 10 floor grid (i runs down to the right, j down to the left); z lifts onto the stage;
   an optional 4th number sets the drawing order (default i + j), for agents whose walk takes them in front of furniture */
const AG_SPOT={tester:[4.9,5.6,0,13],tech:[2.1,6.75,0],builder:[8,1.7,8],reviewer:[7.3,8.7,0],checks:[1.6,3.7,0],backup:[3.2,1.5,0]};
const AG_ROLE={tester:"Tries the demos every night like a real planner, venue, host or guest.",tech:"Answers support tickets and tries to fix bugs overnight.",
 builder:"Builds the issues you label \"claude\" and sends them to you as pull requests.",reviewer:"Reads every new pull request and gives it a rating for you.",
 checks:"Checks every change for broken code and broken screens before it reaches you.",backup:"Packs up an encrypted copy of the whole database every night."};
function agPerson(k){const c=AG_LOOK[k],pants=k==="checks"?"#0b1022":"#22305e",shoe='<rect x="-1" y="18" width="7" height="4" rx="2" fill="#222"/>';
 const acc={builder:['<path d="M11 10a9 8 0 0 1 18 0h2v2H9v-2z" fill="#f6892f"/><rect x="18" y="2" width="4" height="3" rx="1" fill="#f6892f"/>','<rect x="28.5" y="37" width="2" height="10" fill="#7a4b26"/><rect x="25.5" y="45" width="8" height="3" rx="1" fill="#8a94a6"/>',''],
  checks:['<rect x="12" y="6" width="16" height="4" rx="2" fill="#0b1022"/><rect x="24" y="9" width="8" height="2" rx="1" fill="#0b1022"/>','','<circle cx="15" cy="28" r="2" fill="#f6c343"/>'],
  tech:['<path d="M11.5 12a8.5 8.5 0 0 1 17 0" stroke="#111" stroke-width="1.6" fill="none"/><rect x="10" y="10" width="3" height="5" rx="1.5" fill="#111"/><path d="M11.5 15q0 5 6 5" stroke="#111" stroke-width="1.2" fill="none"/>','',''],
  reviewer:['','<rect x="24" y="30" width="10" height="13" rx="1" fill="#c98a4a"/><rect x="25.5" y="32" width="7" height="9" fill="#fff"/><path d="M26.5 34.5h5M26.5 37h5M26.5 39.5h3" stroke="#2f8a4c" stroke-width=".9"/>','<path d="M20 23v12" stroke="#16255a" stroke-width="2"/>'],
  tester:['','<rect x="28" y="35" width="5" height="8" rx="1" fill="#111"/><rect x="28.8" y="36" width="3.4" height="5.6" fill="#8fd0ff"/>',''],
  backup:['','','']}[k];
 const box=k==="backup"?'<g class="agcarry"><rect x="9" y="27" width="22" height="14" rx="1.5" fill="#c98a4a" stroke="#7a4b26"/><path d="M9 32h22" stroke="#7a4b26"/></g>':"";
 return `<svg class="agp" viewBox="0 0 44 66" aria-hidden="true" focusable="false"><ellipse cx="20" cy="63" rx="10" ry="2.5" fill="rgba(0,0,0,.18)"/>
 <g class="agbod"><g class="agleg-l"><g transform="translate(14 40)"><rect width="5" height="20" rx="2" fill="${pants}"/>${shoe}</g></g><g class="agleg-r"><g transform="translate(21 40)"><rect width="5" height="20" rx="2" fill="${pants}"/>${shoe}</g></g>
 <g class="agarm-b"><rect x="8" y="24" width="5" height="15" rx="2.5" fill="${c.shirt}"/><circle cx="10.5" cy="40" r="2.5" fill="${c.skin}"/></g>
 <rect x="11" y="22" width="18" height="21" rx="6" fill="${c.shirt}" ${c.shirt==="#e8edf7"?'stroke="#c3cbe0"':""}/>${acc[2]}<rect x="18" y="18" width="4" height="5" fill="${c.skin}"/>
 <circle cx="20" cy="12" r="8" fill="${c.skin}"/><path d="M12 11a8 8 0 0 1 16 0c-3-2.5-6-3.2-8-3.2s-5 .7-8 3.2z" fill="${c.hair}"/>${acc[0]}
 <circle cx="17" cy="12.5" r="1" fill="#16255a"/><circle cx="23" cy="12.5" r="1" fill="#16255a"/><path d="M17 15.5q3 2 6 0" stroke="#16255a" stroke-width="1" fill="none"/>
 ${box}<g class="agarm"><rect x="27" y="24" width="5" height="15" rx="2.5" fill="${c.shirt}"/>${acc[1]}<circle cx="29.5" cy="40" r="2.5" fill="${c.skin}"/></g></g>
 <g class="agflag"><path d="M37 2v30" stroke="#555" stroke-width="1.6"/><path d="M37 2h7l-2.5 3.5 2.5 3.5h-7z" fill="#d62d2d"/></g></svg>`}
/* isometric helpers: P(a,b,z) is the screen point of floor spot (a,b) raised by z, in a 400 x 290 scene */
const agP=(a,b,z)=>[200+(a-b)*18,90+(a+b)*9-(z||0)],agPts=l=>l.map(q=>q.map(v=>Math.round(v*10)/10).join(",")).join(" ");
function agBox(i,j,w,d,h,top,lf,rt){const A=agP(i,j,h),B=agP(i+w,j,h),C=agP(i+w,j+d,h),Dd=agP(i,j+d,h),Cb=agP(i+w,j+d,0),Db=agP(i,j+d,0),Bb=agP(i+w,j,0);
 return `<polygon points="${agPts([Dd,C,Cb,Db])}" fill="${lf}"/><polygon points="${agPts([B,C,Cb,Bb])}" fill="${rt}"/><polygon points="${agPts([A,B,C,Dd])}" fill="${top}" stroke="rgba(11,16,34,.25)" stroke-width=".6"/>`}
function agTable(i,j){const t=agP(i,j,11),f=agP(i,j,0);return `<ellipse cx="${f[0]}" cy="${f[1]}" rx="15" ry="7.5" fill="rgba(0,0,0,.12)"/><rect x="${t[0]-2}" y="${t[1]}" width="4" height="11" fill="#16255a"/><ellipse cx="${t[0]}" cy="${t[1]+2}" rx="17" ry="8.5" fill="#2f8a4c"/><ellipse cx="${t[0]}" cy="${t[1]}" rx="17" ry="8.5" fill="#3aa35e"/><circle cx="${t[0]}" cy="${t[1]-3}" r="3" fill="#f6892f"/>`}
const AG_ICON={check:'<path d="M-5 0l3.5 3.5L5-3.5" stroke="#2f8a4c" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 flag:'<path d="M-3 6V-6" stroke="#555" stroke-width="1.6"/><path d="M-3-6h8l-2.5 3 2.5 3h-8z" fill="#d62d2d"/>',zz:'<text y="3" text-anchor="middle" font-size="7" font-weight="800" fill="#16255a">z z</text>',
 builder:'<path d="M-4 5l6-7" stroke="#7a4b26" stroke-width="2.2" stroke-linecap="round"/><rect x="0" y="-6" width="7" height="3.5" rx="1" transform="rotate(-45 3.5 -4)" fill="#8a94a6"/>',
 tester:'<rect x="-3.2" y="-5.5" width="6.4" height="11" rx="1.2" fill="#111"/><rect x="-2.2" y="-4" width="4.4" height="7" fill="#8fd0ff"/>',
 reviewer:'<rect x="-4.5" y="-5.5" width="9" height="11" rx="1" fill="#c98a4a"/><rect x="-3" y="-4" width="6" height="8" fill="#fff"/><path d="M-2-2h4M-2 0h4M-2 2h2.5" stroke="#2f8a4c" stroke-width=".9"/>',
 checks:'<circle cx="-1" cy="-1" r="3.6" stroke="#16255a" stroke-width="1.8" fill="#eaf6ff"/><path d="M1.8 1.8l3.4 3.4" stroke="#16255a" stroke-width="2" stroke-linecap="round"/>',
 backup:'<path d="M0-5l5 2.5v5L0 5l-5-2.5v-5z" fill="#c98a4a" stroke="#7a4b26" stroke-width=".8"/><path d="M-5-2.5L0 0l5-2.5M0 0v5" stroke="#7a4b26" stroke-width=".8" fill="none"/>',
 tech:'<path d="M-4.5 1a4.5 4.5 0 0 1 9 0" stroke="#16255a" stroke-width="1.8" fill="none"/><rect x="-5.5" y="0" width="2.6" height="4" rx="1" fill="#16255a"/><rect x="2.9" y="0" width="2.6" height="4" rx="1" fill="#16255a"/>'};
const AG_RING={work:"#f6892f",done:"#2f8a4c",fail:"#d62d2d",idle:"#9aa3b8"};
function agFigure(c,sel){const [i,j,z]=AG_SPOT[c.k],[x,y]=agP(i,j,z),ic=c.st==="done"?"check":c.st==="fail"?"flag":c.st==="idle"?"zz":c.k,
  label=`${c.l}: ${({work:"working",done:"finished",fail:"needs a look",idle:"resting"})[c.st]}. ${c.news}`;
 return `<g class="agw r-${c.k} ${c.st}${sel?" sel":""}" data-agk="${c.k}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(label)}"><g class="agmove">
  <ellipse class="agring" cx="0" cy="0" rx="12" ry="6" fill="${AG_RING[c.st]}" fill-opacity="${sel?.7:.4}" ${sel?'stroke="#fff" stroke-width="1.6"':""}/>
  <svg class="agp" x="-11.8" y="-37.5" width="26" height="39" viewBox="0 0 44 66" overflow="visible">${agPerson(c.k).replace(/^<svg[^>]*>|<\/svg>$/g,"")}</svg>
  <g class="agthink" transform="translate(9 -52)"><circle cx="-6" cy="11" r="1.5" fill="#fff" stroke="#16255a" stroke-width=".8"/><circle cx="-3" cy="7.5" r="2.2" fill="#fff" stroke="#16255a" stroke-width=".8"/>
   <ellipse rx="11" ry="9" fill="#fff" stroke="${c.st==="fail"?"#d62d2d":"#16255a"}" stroke-width="1.4"/>${AG_ICON[ic]}</g>
  <rect class="aghit" x="-14" y="-62" width="34" height="70" fill="transparent"/>
 </g></g>`}
function agScene(cast,sel,night,sky,n,tk,p){const wall=night?"#2a3a72":"#f6efe2",wall2=night?"#22305e":"#ece2cf",fl1=night?"#9c8664":"#ead9bb",fl2=night?"#927c5b":"#e0cba7";
 const RW=(a,z)=>agP(a,0,z),LW=(b,z)=>agP(0,b,z),parts=[];
 let floor="";for(let a=0;a<10;a++)for(let b=0;b<10;b++)floor+=`<polygon points="${agPts([agP(a,b),agP(a+1,b),agP(a+1,b+1),agP(a,b+1)])}" fill="${(a+b)%2?fl1:fl2}"/>`;
 const bulbs=[];for(let a=.5;a<10;a+=1){const q=RW(a,64-Math.sin(a/10*Math.PI)*6);bulbs.push(`<circle class="agbulb b${Math.round(a)%3}" cx="${q[0]}" cy="${q[1]}" r="2.6" fill="${["#f6892f","#2f8a4c","#fff4c2"][Math.round(a)%3]}"/>`)}
 for(let b=.5;b<10;b+=1){const q=LW(b,64-Math.sin(b/10*Math.PI)*6);bulbs.push(`<circle class="agbulb b${(Math.round(b)+1)%3}" cx="${q[0]}" cy="${q[1]}" r="2.6" fill="${["#f6892f","#2f8a4c","#fff4c2"][(Math.round(b)+1)%3]}"/>`)}
 const sun=RW(2,40),door=[RW(4.2,0),RW(5.4,0),RW(5.4,46),RW(4.2,46)],ent=[LW(4.4,0),LW(5.6,0),LW(5.6,44),LW(4.4,44)],bn=RW(6.1,60),en=LW(5,50),rd=RW(4.8,38);
 const back=`<polygon points="${agPts([agP(0,0),agP(0,10),LW(10,70),LW(0,70)])}" fill="${wall2}"/><polygon points="${agPts([agP(0,0),agP(10,0),RW(10,70),RW(0,70)])}" fill="${wall}"/>
  <polyline points="${agPts([LW(10,70),LW(0,70),RW(10,70)])}" fill="none" stroke="#16255a" stroke-width="3"/>
  <polygon points="${agPts([RW(1,22),RW(3,22),RW(3,54),RW(1,54)])}" fill="${sky}" stroke="#16255a" stroke-width="3"/><circle cx="${sun[0]}" cy="${sun[1]}" r="6" fill="${night?"#f4f4f4":"#ffd24a"}"/><polyline points="${agPts([RW(2,22),RW(2,54)])}" stroke="#16255a" stroke-width="2"/>
  <polygon points="${agPts(door)}" fill="#16255a"/><polygon points="${agPts([RW(4.4,32),RW(5.2,32),RW(5.2,42),RW(4.4,42)])}" fill="#f6efe2"/><text transform="translate(${rd[0]} ${rd[1]}) skewY(26.565)" text-anchor="middle" font-size="4.6" font-weight="800" fill="#16255a">ROY</text>
  <polygon points="${agPts([RW(5.9,52),RW(9.4,52),RW(9.4,66),RW(5.9,66)])}" fill="#16255a"/><text transform="translate(${bn[0]+30} ${bn[1]+15}) skewY(26.565)" text-anchor="middle" font-size="9" font-weight="800" fill="#f6892f">HOST MODE</text>
  <polygon points="${agPts(ent)}" fill="#2f8a4c" stroke="#16255a" stroke-width="2"/><text transform="translate(${en[0]} ${en[1]}) skewY(-26.565)" text-anchor="middle" font-size="5" font-weight="800" fill="#16255a">ENTRANCE</text>
  <polygon points="${agPts([LW(7,20),LW(9,20),LW(9,48),LW(7,48)])}" fill="#16255a"/><polygon points="${agPts([LW(7.2,23),LW(8.8,23),LW(8.8,45),LW(7.2,45)])}" fill="#f6892f" fill-opacity=".85"/>
  ${floor}${bulbs.join("")}`;
 /* furniture and people, drawn back to front */
 parts.push([1.1,agBox(2.3,0,.1,1,14,"#dfe6f5","#c3cbe0","#d3dbeb")+agBox(2.3,1.7,.1,.6,14,"#dfe6f5","#c3cbe0","#d3dbeb")+agBox(0,2.3,2.4,.1,14,"#dfe6f5","#c3cbe0","#d3dbeb")+agBox(.3,.4,.9,.9,10,"#d9a466","#b77f43","#c98a4a")+agBox(.4,.5,.7,.7,20,"#d9a466","#b77f43","#c98a4a")+agBox(1.2,.4,.8,.8,9,"#d9a466","#b77f43","#c98a4a")]);
 {const q=agP(2.42,1.45,14);parts.push([3.8,`<rect x="${q[0]-3}" y="${q[1]}" width="6" height="5" rx="1" fill="#f6c343"/><path d="M${q[0]-2} ${q[1]}a2 2 0 0 1 4 0" stroke="#555" stroke-width="1.2" fill="none"/>`])}
 parts.push([5,agBox(6,0,4,3.2,8,"#16255a","#0e1a44","#f6892f")]);
 for(let k=0;k<Math.min(n,6);k++)parts.push([4.4+k*.01,agBox(4.3+(k%2)*.55,.35,.5,.5,7,"#d9a466","#b77f43","#c98a4a").replace(/<polygon/g,`<polygon transform="translate(0 ${-Math.floor(k/2)*7})"`)]);
 parts.push([8.8,agTable(4.4,4.4)]);parts.push([12.8,agTable(6.3,6.5)]);
 parts.push([14.3,agBox(8.4,5,1.2,3,16,"#f6892f","#16255a","#22305e")]);
 {const q=agP(9,5.8,16);parts.push([14.4,`<rect x="${q[0]-4}" y="${q[1]-12}" width="8" height="12" rx="2" fill="#eaf6ff" fill-opacity=".9" stroke="#16255a" stroke-width="1"/><rect x="${q[0]-3}" y="${q[1]-1-Math.round(10*p/100)}" width="6" height="${Math.round(10*p/100)}" fill="#2f8a4c"/>`])}
 parts.push([9.9,agBox(1,7.2,2.3,.9,14,"#2f8a4c","#16255a","#22305e")+(()=>{const q=agP(1.7,7.5,14);return `<rect x="${q[0]-5}" y="${q[1]-8}" width="10" height="7" rx="1" fill="#2b2b2b"/><rect x="${q[0]-4}" y="${q[1]-7}" width="8" height="5" fill="#8fd0ff"/>`})()]);
 parts.push([13.9,agBox(4,8.5,1.7,.9,12,"#f6efe2","#c9bfa9","#ddd3bd")+(()=>{const q=agP(5.2,8.8,12);return `${tk?`<circle cx="${q[0]}" cy="${q[1]-10}" r="11" fill="#f6892f" opacity=".3"/>`:""}<path d="M${q[0]} ${q[1]}v-8" stroke="#16255a" stroke-width="1.4"/><circle cx="${q[0]}" cy="${q[1]-9}" r="3.2" fill="${tk?"#f6892f":"#9aa3b8"}"/>`})()]);
 {const q=agP(9.5,9.4,0);parts.push([19,`<rect x="${q[0]-5}" y="${q[1]-9}" width="10" height="9" rx="2" fill="#c98a4a"/><circle cx="${q[0]}" cy="${q[1]-15}" r="7" fill="#2f8a4c"/><circle cx="${q[0]-4}" cy="${q[1]-12}" r="4.5" fill="#3aa35e"/>`])}
 cast.forEach(c=>{const [i,j,,d]=AG_SPOT[c.k];parts.push([d!=null?d:i+j+.05,agFigure(c,c.k===sel)])});
 parts.sort((x,y)=>x[0]-y[0]);
 const sc=cast.find(c=>c.k===sel),tag=sc?(()=>{const [i,j,z]=AG_SPOT[sc.k],[x,y]=agP(i,j,z),w=sc.l.length*5.2+10;return `<g class="agw agtagw r-${sc.k} ${sc.st}" transform="translate(${x} ${y})" aria-hidden="true"><g class="agmove"><g class="agtag" transform="translate(0 12)"><rect x="${-w/2}" y="-7" width="${w}" height="12" rx="6" fill="#16255a"/><text y="1.8" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff">${esc(sc.l)}</text></g></g></g>`})():"";
 return `<svg class="agiso" viewBox="0 0 400 290" role="group" aria-label="The agent office. ${n} pull request${n===1?"":"s"} waiting at Roy's office, ${tk} ticket${tk===1?"":"s"} at Icee's desk. Tap an agent to see how it's doing.">${back}${parts.map(x=>x[1]).join("")}${tag}</svg>`}
function agBar(label,pct,col,txt){return `<div class="agneed"><div class="row between small"><b>${label}</b><span class="muted">${esc(txt)}</span></div><div class="agbar"><i style="width:${Math.max(4,Math.min(100,pct))}%;background:${col}"></i></div></div>`}
function agPanel(c,spent){const hrs=c.r?(Date.now()-Date.parse(c.r.created_at))/36e5:null,fresh=hrs==null?0:hrs<=24?100:hrs<=48?60:hrs<=72?30:10,left=Math.max(0,100-spent/AG_LIMIT*100);
 const job={work:[60,"#f6892f","Working on it"],done:[100,"#2f8a4c","Went well"],fail:[15,"#d62d2d","Needs a look"],idle:[0,"#9aa3b8","Hasn't run yet"]}[c.st];
 return `<div class="agpanel ${c.st}"><div class="row between"><div class="mw0"><h3 class="m0">${esc(c.l)}</h3><div class="small muted">${esc(AG_ROLE[c.k])}</div></div><span class="pill ${c.st==="fail"?"warn":c.st==="done"?"ok":""}">${({work:"Working",done:"Finished",fail:"Needs a look",idle:"Resting"})[c.st]}</span></div>
 <p class="small m0">“${esc(c.news)}”</p>
 ${agBar("Last job",job[0],job[1],job[2])}${agBar("Fresh",fresh,fresh>=60?"#2f8a4c":fresh>=30?"#f6892f":"#d62d2d",hrs==null?"No runs yet":"Ran "+supAgo(Date.parse(c.r.created_at)))}${agBar("Budget left",left,left>=40?"#2f8a4c":left>=15?"#f6892f":"#d62d2d",`${clMoney(spent)} of ${clMoney(AG_LIMIT)} used this month`)}
 <a class="btn sm as" href="${esc(c.url)}" target="_blank" rel="noopener">See its latest run on GitHub</a></div>`}
function agentsBody(){agLoad();const g=L.ag||{},hr=new Date().getHours()+new Date().getMinutes()/60,day=hr>=6.5&&hr<18,mid=(hr>=5&&hr<6.5)||(hr>=18&&hr<20),
  night=!day&&!mid,sky=day?"#8fd0ff":mid?"#f6a45c":"#0e1838",tk=tkNewCount(),n=agPrs().length;
 const mo=new Date().toISOString().slice(0,7);let spent=0;Object.values(D.agentRuns||{}).forEach(r=>{if(r&&r.t&&new Date(r.t).toISOString().slice(0,7)===mo)spent+=+((r.usage||{}).usd)||0});
 const p=Math.min(100,Math.round(spent/AG_LIMIT*100)),cast=AG_CAST.map(([k,l,wf])=>{const r=agLatestRun(wf),st=agState(r);return {k,l,st,r,url:(r&&r.html_url)||"https://github.com/"+AG_REPO+"/actions",news:agNews(k,r,st)}});
 const sel=(cast.find(c=>c.k===L.agSel)||cast.find(c=>c.st==="fail")||cast.find(c=>c.st==="work")||cast[0]).k,cur=cast.find(c=>c.k===sel);
 return `<section class="card stack agoffice"><div class="row between"><h2 class="m0">The agent office</h2><button class="btn xs" data-act="agRefresh">${g.busy?"Looking…":"Refresh"}</button></div>
 <p class="small muted m0">Your helpers setting up the venue. Tap anyone to see how they're doing.${g.err?" <b>Couldn't reach GitHub just now, so some news may be old.</b>":""}</p>
 <div class="agscene ${night?"night":""}">${agScene(cast,sel,night,sky,n,tk,p)}</div>
 ${agPanel(cur,spent)}
 <div class="row agchips">${cast.map(c=>`<button class="btn xs ${c.k===sel?"primary":""}" data-act="agPick" data-k="${c.k}"><span class="agdot ${c.st}"></span>${esc(c.l)}</button>`).join("")}</div>
 <div class="stack tight"><div class="row between small clrow"><span class="mw0"><b>Waiting for Roy</b><span class="db muted">Boxes by your office door</span></span><span class="pill ${n?"warn":""}">${n} pull request${n===1?"":"s"}</span></div>
  ${(()=>{const sc=agScore();return `<div class="small clrow agscore"><div class="row between"><b>Builder scorecard</b><span class="muted">Phase 2 needs 5 merged, none undone</span></div>
   <div class="row agscorerow"><span class="pill ok">${sc.merged} merged</span><span class="pill">${sc.closed} closed without merging</span><span class="pill ${sc.undone?"warn":""}">${sc.undone} undone</span><span class="pill">${sc.open} waiting</span></div>
   ${agBar("Toward Phase 2",sc.gate/5*100,"#2f8a4c",`${sc.gate} of 5`)}</div>`})()}
  <div class="row between small clrow"><span class="mw0"><b>Icee's support desk</b><span class="db muted">The lamp is on when tickets are waiting</span></span><span class="pill ${tk?"warn":""}">${tk} ticket${tk===1?"":"s"}</span></div></div></section>${helpView("ad")}`}
Object.assign(ACT,{agRefresh:()=>{agLoad(true);render(true)},agPick:el=>{L.agSel=el.dataset.k;render(true)}});
/* the people in the scene are SVG, so taps and keys are caught here rather than with data-act */
document.addEventListener("click",e=>{const g=e.target&&e.target.closest&&e.target.closest(".agw[data-agk]");if(g){L.agSel=g.getAttribute("data-agk");render(true)}});
document.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target&&e.target.closest&&e.target.closest(".agw[data-agk]");if(g){e.preventDefault();L.agSel=g.getAttribute("data-agk");render(true);setTimeout(()=>{const n=document.querySelector(`.agw[data-agk="${L.agSel}"]`);if(n)n.focus()},0)}});
const ST_TABS=[["support","Support"],["team","Team"],["onboard","Onboarding"],["sales","Sales"],["resources","Resources"]];
function staffTabs(){const cur=L.stTab||"support",due=slDue(),nw=tkNewCount();
 return `<div class="row sttabs" role="tablist">${ST_TABS.map(([k,l])=>`<button class="btn sm ${cur===k?"primary":""}" role="tab" aria-selected="${cur===k}" data-act="stTab" data-k="${k}">${l}${k==="support"&&nw?` <span class="pill warn">${nw}</span>`:""}${k==="sales"&&due?` <span class="pill warn">${due}</span>`:""}${k==="team"&&tmUnreadAll()?` <span class="pill warn">${tmUnreadAll()}</span>`:""}</button>`).join("")}</div>`}
const staffBody=()=>({team:teamBody,onboard:onboardBody,sales:salesBody,resources:resourcesBody}[L.stTab]||supportBody)();
function marketingBody(){return `<section class="card stack"><h2>Marketing</h2><p class="m0">This is where the marketing department will live: campaigns, social posts, promo videos and which channels bring in sign-ups.</p><p class="small muted m0">It's empty until someone is put in charge of marketing. The playbook, taglines and brand kit are under Resources.</p></section>`}
Object.assign(ACT,{
 stTab:el=>{L.stTab=el.dataset.k;L.confirm=null;render(true);scrollTo(0,0)},
 slFilter:el=>{L.slF=el.dataset.k;render(true)},
 slNew:()=>{slClear();L.slEdit="new";render(true)},
 slEdit:el=>{slClear();L.slEdit=el.dataset.k;render(true);scrollTo(0,0)},
 slClose:()=>{slClear();L.slEdit=null;render(true)},
 slOpen:el=>{L.slOpen=L.slOpen===el.dataset.k?null:el.dataset.k;L.confirm=null;render(true)},
 slSave:async el=>{const k=el.dataset.k,old=k?(D.sales||{})[k]||{}:{},me=supMe(),g=f=>String(dv("slf_"+f,old[f]==null?(f==="city"&&!k?"Charlotte":f==="kind"&&!k?"planner":""):old[f])).trim();
  const biz=g("biz").slice(0,80),name=g("name").slice(0,60);if(!biz&&!name)return toast("Add a business or a contact name");const em=g("email").toLowerCase();if(em&&!imOkEmail(em))return toast("That email doesn't look right");
  const rec=Object.assign({},old,{biz,name,kind:SL_KIND.some(z=>z[0]===g("kind"))?g("kind"):"other",city:g("city").slice(0,60),phone:g("phone").slice(0,30),email:em.slice(0,120),web:g("web").slice(0,120),src:g("src").slice(0,80),next:g("next"),nextWhat:g("nextWhat").slice(0,80),notes:g("notes").slice(0,2000),stage:old.stage||"idea",t:old.t||Date.now(),last:Date.now()});
  if(!old.owner&&me)rec.owner={uid:me.uid,name:me.name};delete rec.k;
  if(k)await RT("sales/"+k).set(rec);else{const r=RT("sales").push();await r.set(rec);L.slOpen=r.key}slClear();L.slEdit=null;toast(k?"Saved":"Added");render(true)},
 slStage:async el=>{const k=el.dataset.k,me=supMe(),st=slSt(el.value);await RT("sales/"+k).update({stage:el.value,last:Date.now()});await RT("salesLog/"+k).push().set({text:"Moved to "+st[1],name:me?me.name:"",t:Date.now()});toast("Moved to "+st[1])},
 slLogAdd:async el=>{const k=el.dataset.k,me=supMe(),text=String(dv("sll_"+k,"")).trim().slice(0,500);if(!text)return toast("Write what happened first");
  await RT("salesLog/"+k).push().set({text,name:me?me.name:"",t:Date.now()});await RT("sales/"+k+"/last").set(Date.now());delete L.drafts["sll_"+k];render(true)},
 slNext:async el=>{const k=el.dataset.k,x=(D.sales||{})[k]||{};await RT("sales/"+k).update({next:dv("sln_"+k,x.next||""),nextWhat:String(dv("slw_"+k,x.nextWhat||"")).trim().slice(0,80),last:Date.now()});delete L.drafts["sln_"+k];delete L.drafts["slw_"+k];toast("Next step saved")},
 slCopyPitch:async el=>{const x=Object.assign({k:el.dataset.k},(D.sales||{})[el.dataset.k]||{}),p=slPitch(x);try{await navigator.clipboard.writeText("Subject: "+p.subject+"\n\n"+p.body);toast("Pitch copied. Change anything you like before sending.")}catch(e){prompt("Copy this pitch",p.body)}},
 slDel:async el=>{const k=el.dataset.k;if(!supIsOwner())return;if(L.confirm!=="slx"+k){L.confirm="slx"+k;return render(true)}L.confirm=null;await RT("salesLog/"+k).remove();await RT("sales/"+k).remove();L.slOpen=null;toast("Deleted")},
 slCsv:()=>{const q=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`,rows=[["Business","Contact","What they are","City","Phone","Email","Website","Found through","Stage","Next step","Next step date","Owner","Notes"]].concat(slList().map(x=>[x.biz,x.name,(SL_KIND.find(z=>z[0]===x.kind)||SL_KIND[5])[1],x.city,x.phone,x.email,x.web,x.src,slSt(x.stage)[1],x.nextWhat,x.next,x.owner?x.owner.name:"",x.notes]));
  download("Host Mode sales.csv",new Blob([rows.map(r=>r.map(q).join(",")).join("\n")],{type:"text/csv"}))},
 rsOpen:el=>{L.rsOpen=L.rsOpen===el.dataset.k?null:el.dataset.k;L.rsEdit=null;L.confirm=null;render(true)},
 rsAdopt:async el=>{const s=RS_STARTERS[el.dataset.k];if(!s)return;const me=supMe(),r=RT("resources").push();await r.set({title:s.title,kind:s.kind,body:s.body,t:Date.now(),edited:Date.now(),by:me?me.name:""});L.rsOpen=r.key;toast("Saved. Anyone on the team can edit it now.");render(true)},
 rsEdit:el=>{L.rsEdit=el.dataset.k;render(true)},
 rsEditClose:()=>{const k=L.rsEdit;["rse_t_","rse_b_","rse_u_"].forEach(p=>delete L.drafts[p+k]);L.rsEdit=null;render(true)},
 rsSave:async el=>{const k=el.dataset.k,d=(D.resources||{})[k];if(!d)return;const me=supMe(),title=String(dv("rse_t_"+k,d.title)).trim().slice(0,80)||d.title,body=String(dv("rse_b_"+k,d.body||"")).slice(0,40000),url=String(dv("rse_u_"+k,d.url||"")).trim().slice(0,500);
  await RT("resources/"+k).update({title,body,url,edited:Date.now(),by:me?me.name:"",prev:{title:d.title||"",body:d.body||"",url:d.url||"",edited:d.edited||d.t||0,by:d.by||""}});["rse_t_","rse_b_","rse_u_"].forEach(p=>delete L.drafts[p+k]);L.rsEdit=null;toast("Saved");render(true)},
 rsUndo:async el=>{const k=el.dataset.k,d=(D.resources||{})[k];if(!d||!d.prev)return;await RT("resources/"+k).update({title:d.prev.title,body:d.prev.body,url:d.prev.url||"",edited:d.prev.edited||Date.now(),by:d.prev.by||"",prev:null});toast("Put back the earlier version")},
 rsCopy:async el=>{const d=(D.resources||{})[el.dataset.k];if(!d)return;try{await navigator.clipboard.writeText(d.body||"");toast("Copied")}catch(e){prompt("Copy this",d.body||"")}},
 rsNew:()=>{L.rsNew=true;render(true)},
 rsNewClose:()=>{L.rsNew=false;["rsn_t","rsn_k","rsn_u","rsn_b"].forEach(k=>delete L.drafts[k]);render(true)},
 rsAdd:async()=>{const title=String(dv("rsn_t","")).trim().slice(0,80),url=String(dv("rsn_u","")).trim().slice(0,500),body=String(dv("rsn_b","")).slice(0,40000),me=supMe();if(!title)return toast("Give it a title");if(!url&&!body.trim())return toast("Add a link or some text");
  const kind=RS_KIND[dv("rsn_k","doc")]?dv("rsn_k","doc"):"doc",r=RT("resources").push();await r.set({title,kind:url&&!body.trim()?"link":kind,body,url,t:Date.now(),edited:Date.now(),by:me?me.name:""});L.rsNew=false;["rsn_t","rsn_k","rsn_u","rsn_b"].forEach(k=>delete L.drafts[k]);L.rsOpen=r.key;toast("Added");render(true)},
 rsDel:async el=>{const k=el.dataset.k;if(!supIsOwner())return;if(L.confirm!=="rsx"+k){L.confirm="rsx"+k;return render(true)}L.confirm=null;await RT("resources/"+k).remove();L.rsOpen=null;toast("Deleted")}
});

