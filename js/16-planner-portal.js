/* ================= ACCOUNTS + PLANNER PORTAL =================
   Three levels:
   - Owner (Roy): signs in with email + password at #host. Owner-only tools: events, invite codes, planners, contacts, settings.
   - Planner: signs in at #planner. Their own space at partygames/planners/{uid}: events they created, clients, teammates,
     templates, branding, day-of switch, feedback. Client, teammate and feedback links carry ?p={uid}.
   - Guests, clients, teammates: no account. Guests join an event by code; clients and teammates by their personal link.
   partygames/owner = owner uid (claimed once)       partygames/pinvites/{CODE} = planner invite {label, active, by, t}
   partygames/plist/{uid} = {name, biz, email, t}     partygames/planners/{uid}/profile = {name, biz, email, code, t}
   partygames/planners/{uid}/events/{EV} = {name, created}   partygames/planners/{uid}/tv/{EV} = vendors shared with teammates */
/* admins: Roy (the owner) can make other people full admins (partygames/admins/{uid}=true, Roy's decision on Nov 3, 2026).
   An admin can do everything Roy can in the admin console except make or remove admins. */
L.coAdmin=false;D.admins={};
const isAdminUser=()=>!!(L.user&&(L.user.uid===D.owner||L.coAdmin));
const loadCoAdmin=async u=>{L.coAdmin=false;if(!u)return false;const v=await RT("admins/"+u.uid).once("value").then(s=>s.val()).catch(()=>null);L.coAdmin=v===true;return L.coAdmin};
const AUTH=()=>{try{return window.firebase&&firebase.auth?firebase.auth():null}catch(e){return null}};
const PLID=()=>PSP?PSP.split("/")[1]:"";
const authErr=e=>{const c=(e&&e.code)||"";return {"auth/invalid-email":"That email address doesn't look right.","auth/user-not-found":"No account with that email.","auth/wrong-password":"That password isn't right.","auth/invalid-credential":"That email and password don't match.","auth/invalid-login-credentials":"That email and password don't match.","auth/email-already-in-use":"There's already an account with that email. Sign in instead.","auth/weak-password":"Use a password with at least 8 characters.","auth/too-many-requests":"Too many tries. Wait a minute and try again.","auth/network-request-failed":"No connection. Check your signal and try again."}[c]||("Something went wrong: "+((e&&e.message)||c))};
D.owner=null;D.pinvites={};D.plist={};D.plMe=null;D.tv={};
function acctForm(kind){/* kind: "signin" | "owner" | "planner" */
 const f=(k,l,t,extra)=>`<label class="stack tight"><span class="small">${l}</span><input type="${t||"text"}" data-draft="${k}" value="${t==="password"?"":esc(dv(k,""))}" ${extra||""}></label>`;
 if(kind==="owner")return `${f("ac_pin","Current host PIN","password",'inputmode="numeric" autocomplete="off"')}${f("ac_email","Your email","email",'autocomplete="email"')}${f("ac_pw","Choose a password (8+ characters)","password",'autocomplete="new-password"')}<button class="btn primary" data-act="acOwner">Create the owner account</button>`;
 if(kind==="planner")return `${f("ac_code","Planner invite code","text",'autocapitalize="characters" autocomplete="off"')}${f("ac_name","Your name","text",'autocomplete="name"')}${f("ac_biz","Business name","text",'autocomplete="organization"')}${f("ac_email","Email","email",'autocomplete="email"')}${f("ac_pw","Choose a password (8+ characters)","password",'autocomplete="new-password"')}<button class="btn primary" data-act="acPlanner">Create my planner account</button>`;
 return `${f("ac_email","Email","email",'autocomplete="email"')}${f("ac_pw","Password","password",'autocomplete="current-password"')}<button class="btn primary" data-act="acSignIn">Sign in</button><button class="btn xs as" data-act="acForgot">Forgot your password?</button>`}
const acPw=()=>{const el=document.querySelector('[data-draft="ac_pw"]');return el?el.value:""};
Object.assign(ACT,{
 acSignIn:async()=>{const a=AUTH();if(!a)return;try{await a.signInWithEmailAndPassword(dv("ac_email","").trim(),acPw());toast("Signed in")}catch(e){toast(authErr(e))}},
 acForgot:async()=>{const a=AUTH(),em=dv("ac_email","").trim();if(!em)return toast("Type your email first, then tap this again");try{await a.sendPasswordResetEmail(em);toast("Check your email for a link to reset your password")}catch(e){toast(authErr(e))}},
 acOut:async()=>{const a=AUTH();if(a)await a.signOut();L.plOK=false;L.hostOK=false;location.reload()},
 acMode:el=>{L.acMode=el.dataset.k;render(true)},
 acOwner:async()=>{const a=AUTH();if(!a)return;if(D.owner)return toast("The owner account is already set up. Sign in instead.");
  if(await hashPin(dv("ac_pin",""))!==L.masterHash)return toast("That host PIN isn't right");
  const pw=acPw();if(pw.length<8)return toast("Use a password with at least 8 characters");
  try{const c=await a.createUserWithEmailAndPassword(dv("ac_email","").trim(),pw);await RT("owner").set(c.user.uid);toast("Owner account created. You're signed in.")}catch(e){toast(authErr(e))}},
 acPlanner:async()=>{const a=AUTH();if(!a)return;const code=dv("ac_code","").toUpperCase().replace(/[^A-Z0-9]/g,""),name=dv("ac_name","").trim().slice(0,60),biz=dv("ac_biz","").trim().slice(0,80),em=dv("ac_email","").trim(),pw=acPw();
  const isOwner=a.currentUser&&a.currentUser.uid===D.owner;
  if(!isOwner){if(!code)return toast("Type your planner invite code");const v=(await RT("pinvites/"+code).once("value")).val();if(!v||!v.active)return toast("That planner code isn't valid. Ask Host Mode for a new one.");if(v.by)return toast("That planner code has already been used.")}
  if(!name)return toast("Type your name");
  try{let u=a.currentUser;if(!u){if(pw.length<8)return toast("Use a password with at least 8 characters");u=(await a.createUserWithEmailAndPassword(em,pw)).user}
   const prof={name,biz,email:u.email||em,code:isOwner?"OWNER":code,t:Date.now()};
   if(!isOwner)await RT("pinvites/"+code).update({by:u.uid,usedAt:Date.now(),name});
   await RT("planners/"+u.uid+"/profile").set(prof);await RT("plist/"+u.uid).set({name,biz,email:prof.email,t:prof.t});
   ["ac_code","ac_name","ac_biz","ac_pw"].forEach(k=>delete L.drafts[k]);toast("Welcome to your planner portal!");location.reload()}catch(e){toast(authErr(e))}}
});


/* ---- one sign-in for everyone with an account (games.html#signin) ----
   Roy goes to the admin console, support staff to the staff area, planners to their portal.
   Someone with more than one role picks where to go, and the other pages show links to switch (roleLinks).
   Guests, clients, teammates and vendors don't sign in: they use event codes and private links. */
const ROLE_LBL={host:["Admin console","Events, support, sales and settings for Host Mode"],planner:["Planner portal","Your clients, events, venue and inventory"],support:["Staff area","Support tickets, sales and resources"]};
async function acctRoles(u){if(!u)return [];const get=p=>RT(p).once("value").then(s=>s.val()).catch(()=>null);
 const [ow,pl,st,adm]=await Promise.all([get("owner"),get("planners/"+u.uid+"/profile"),get("staff/"+u.uid),get("admins/"+u.uid)]);D.owner=ow||D.owner;L.coAdmin=adm===true;
 const r=[];if(ow&&ow===u.uid||adm===true)r.push("host");if(pl)r.push("planner");if(st&&ow!==u.uid)r.push("support");
 store.set("hmRoles",{uid:u.uid,roles:r,host:!!(pl&&pl.kind==="host")});return r}
const goRole=role=>{location.hash=role;location.reload()};
/* hosts (one event, own account) reuse the planner role and pages, with their own name and a smaller set of tabs */
const roleLbl=r=>{const c=store.get("hmRoles",null);return r==="planner"&&c&&c.host?["My event dashboard","Your events, travel plans and account"]:ROLE_LBL[r]};
function roleLinks(cur){const c=store.get("hmRoles",null);if(!c||!L.user||c.uid!==L.user.uid)return "";
 return c.roles.filter(r=>r!==cur&&!(cur==="host"&&r==="planner")&&!(cur==="planner"&&r==="host")).map(r=>`<a class="btn xs" href="${esc(baseURL())}#${r}">${esc(roleLbl(r)[0])}</a>`).join("")}
function signinConnect(){const a=AUTH();if(!a){L.authReady=true;renderSoon();return}
 a.onAuthStateChanged(async u=>{L.user=u;L.authReady=true;L.roles=null;renderSoon();if(!u)return;
  L.roles=await acctRoles(u);if(L.roles.length===1)return goRole(L.roles[0]);renderSoon()})}
function signinView(){
 const card=(h,b)=>`<section class="card stack narrow"><div class="eyebrow">Host Mode</div><h2>${h}</h2>${b}</section>`;
 if(window.__HMPDEMO||window.__HMDEMO)return card("Sign in",`<p class="small muted m0">The demos don't need a sign-in.</p><a class="btn primary" href="games.html?pdemo=1#planner">Planner demo</a><a class="btn" href="games.html?pdemo=1#support">Staff area demo</a>`);
 if(!L.authReady||(L.user&&!L.roles))return loadingView();
 if(!L.user)return card("Sign in",`<p class="small muted m0">For hosts, planners, venues and the Host Mode team. One sign-in takes you to the right place.</p>${acctForm("signin")}
  <div class="stack tight small"><a href="${esc(baseURL())}#planner">New planner with an invite code? Create your account</a><a href="${esc(baseURL())}#support">Have a support code? Create your staff login</a><a href="${esc(baseURL())}#new">Hosting one event with an invite code? Create your event and account</a></div>`);
 if(!L.roles.length)return card("This account isn't set up yet",`<p class="small muted m0">You're signed in as ${esc(L.user.email||"")}, but it isn't linked to a planner portal or a staff login yet.</p><div class="stack tight"><a class="btn primary" href="${esc(baseURL())}#planner">I have a planner invite code</a><a class="btn" href="${esc(baseURL())}#support">I have a support code</a><button class="btn xs as" data-act="acOut">Sign out</button></div>`);
 return card("Where to?",`<p class="small muted m0">Signed in as ${esc(L.user.email||"")}.</p><div class="stack tight">${L.roles.map(r=>`<button class="btn ${r===L.roles[0]?"primary":""} as" data-act="goRole" data-k="${r}"><b>${esc(roleLbl(r)[0])}</b></button><span class="small muted">${esc(roleLbl(r)[1])}</span>`).join("")}</div><button class="btn xs as" data-act="acOut">Sign out</button>`)}
ACT.goRole=el=>goRole(el.dataset.k);

/* ---- owner console gate ---- */
const _checkAuthOwner=checkAuth;
checkAuth=function(){_checkAuthOwner();if(VIEW==="host"&&AUTH()&&!window.__HMPDEMO)L.hostOK=!!(L.user&&(D.owner&&L.user.uid===D.owner||L.coAdmin))};
let ownerSubbed=false;
function ownerSubs(){if(ownerSubbed||!db)return;ownerSubbed=true;
 RT("invites").on("value",s=>{D.invites=s.val()||{};renderSoon()});RT("index").on("value",s=>{D.events=s.val()||{};L.loaded=true;plAutoAttach();renderSoon()},()=>{L.loaded=true;renderSoon()});
 RT("themes").on("value",s=>{D.themes=s.val()||{};renderSoon()});RT("library").on("value",s=>{D.library=s.val()||{};renderSoon()});
 supSubs();RT("leads").on("value",s=>{D.leads=s.val()||{};renderSoon()});RT("pinvites").on("value",s=>{D.pinvites=s.val()||{};plAutoAttach();renderSoon()});RT("plist").on("value",s=>{D.plist=s.val()||{};renderSoon()});
 Promise.all(["clients","mates"].map(n=>RT(n).once("value").then(x=>Object.keys(x.val()||{}).length).catch(()=>0))).then(([c,m])=>{L.legacy={c,m};renderSoon()})}
function hostConnect(){RT("owner").on("value",s=>{D.owner=s.val()||null;checkAuth();if(L.hostOK)ownerSubs();else L.loaded=true;renderSoon()});
 const a=AUTH();if(!a){/* no sign-in available (offline test copy): fall back to the PIN */L.authReady=true;ownerSubs();return}
 a.onAuthStateChanged(async u=>{L.user=u;await loadCoAdmin(u);L.authReady=true;checkAuth();if(L.hostOK)ownerSubs();renderSoon()})}
const _hostView0=hostView;
hostView=function(){const a=AUTH();if(!a||window.__HMPDEMO)return _hostView0();
 if(!L.authReady)return loadingView();
 if(!L.hostOK){const card=(h,b)=>`<section class="card stack narrow"><div class="eyebrow">Host Mode owner</div><h2>${h}</h2>${b}<a class="btn xs as" href="index.html">Home</a></section>`;
  if(L.user)return card("This isn't the owner account",`<p class="small muted m0">You're signed in as ${esc(L.user.email||"")}. The admin console is only for the Host Mode owner.</p><a class="btn primary" href="${esc(baseURL())}#planner">Go to the planner portal</a><button class="btn" data-act="acOut">Sign out</button>`);
  if(!D.owner)return card("Set up the owner account",`<p class="small muted m0">One time only. Prove it's you with the current host PIN, then choose the email and password you'll sign in with from now on.</p>${acctForm("owner")}`);
  return card("Sign in",`<p class="small muted m0">The admin console is for the Host Mode owner.</p>${acctForm("signin")}`)}
 const h=_hostView0();return h.replace('<div class="stack mw0">',`<div class="stack mw0"><div class="row between small acctbar"><span class="muted">Signed in as ${esc(L.user.email||"")}</span><span class="row"><a class="btn xs" href="index.html">Home</a><a class="btn xs" href="${esc(baseURL())}#planner">My planner portal</a><button class="btn xs" data-act="acOut">Sign out</button></span></div>`)};

/* ---- owner: change an event's code (copies everything, leaves a redirect behind) ---- */
function codePanel(k){if(k==="SHOWER")return '<p class="small muted m0">The shower\'s code stays SHOWER because the main link depends on it.</p>';
 const nc=dv("cc_"+k,"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10),ask=L.confirm==="code:"+k;
 return `<div class="stack tight"><p class="small muted m0">Current code <b class="mono">${esc(k)}</b>. Changing it moves everything to the new code. Links and QR codes already shared keep working and forward to the new one. Moderator PINs stay the same.</p>
 <div class="row"><input type="text" class="w110 mono" data-draft="cc_${esc(k)}" value="${esc(dv("cc_"+k,""))}" maxlength="10" autocapitalize="characters" placeholder="New code">${ask?`<span class="small">Change to <b class="mono">${esc(nc)}</b>?</span><button class="btn sm gold" data-act="codeGo" data-k="${esc(k)}">${L.codeBusy?"Moving…":"Yes, change it"}</button><button class="btn sm" data-act="cancelConfirm">Keep</button>`:`<button class="btn sm" data-act="codeAsk" data-k="${esc(k)}">Change code</button>`}</div></div>`}
async function changeEventCode(old,nw){const R=db.ref(ROOT),get=async p=>(await RT(p).once("value")).val();
 if(await get("events/"+nw+"/meta")||await get("index/"+nw))throw new Error("taken");
 const ev=await get("events/"+old),ix=await get("index/"+old);if(!ev||!ev.meta)throw new Error("missing");
 await RT("events/"+nw).set(ev);
 const chk=await get("events/"+nw+"/meta");if(!chk||chk.name!==ev.meta.name)throw new Error("copy");
 const u={},arc=await get("archives/"+old),pl=(ix&&ix.planner)||ev.meta.planner;
 u["index/"+nw]=ix||{name:ev.meta.name||nw,created:ev.meta.created||Date.now()};u["index/"+old]=null;
 if(arc){u["archives/"+nw]=arc;u["archives/"+old]=null}
 const inv=D.invites||{};Object.keys(inv).forEach(c=>{if(inv[c].event===old)u["invites/"+c+"/event"]=nw});
 const pv=D.pinvites||{};Object.keys(pv).forEach(c=>{if(pv[c].ev===old)u["pinvites/"+c+"/ev"]=nw});
 if(D.admin&&D.admin.defaultEvent===old)u["admin/defaultEvent"]=nw;
 if(pl){const pe=await get("planners/"+pl+"/events/"+old),tv=await get("planners/"+pl+"/tv/"+old),cl=await get("planners/"+pl+"/clients")||{};
  u["planners/"+pl+"/events/"+nw]=pe||{name:ev.meta.name||nw,created:ev.meta.created||Date.now()};u["planners/"+pl+"/events/"+old]=null;
  if(tv){u["planners/"+pl+"/tv/"+nw]=tv;u["planners/"+pl+"/tv/"+old]=null}
  Object.keys(cl).forEach(id=>{if(cl[id]&&cl[id].ev===old)u["planners/"+pl+"/clients/"+id+"/ev"]=nw})}
 await R.update(u);
 await RT("events/"+old).set({movedTo:nw,t:Date.now()})}
Object.assign(ACT,{
 codeAsk:el=>{const k=el.dataset.k,nc=dv("cc_"+k,"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(nc.length<4)return toast("Use at least 4 letters or numbers");if(nc===k)return toast("That's already the code");if((D.events||{})[nc])return toast("That code is taken. Try another.");
  L.confirm="code:"+k;render()},
 codeGo:async el=>{const k=el.dataset.k,nc=dv("cc_"+k,"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);if(L.codeBusy)return;L.codeBusy=true;render();
  try{await changeEventCode(k,nc);delete L.drafts["cc_"+k];L.confirm=null;if(L.hostOpen===k)L.hostOpen=nc;toast("Code changed to "+nc+". Old links forward to it.")}
  catch(e){toast(e.message==="taken"?"That code is taken. Try another.":"Couldn't change the code. Nothing was lost; try again.");console.warn(e)}
  L.codeBusy=false;render()}
});

/* ---- owner: upgrade a host to the planner portal, or move an event into one ---- */
function plName(uid){const p=(D.plist||{})[uid];return (p&&(p.name||p.biz))||"a planner"}
function plUpgradeCode(ev){const pv=D.pinvites||{};return Object.keys(pv).find(c=>pv[c].ev===ev&&!pv[c].by&&pv[c].active)}
function plMovePanel(k,e){e=e||{};const pl=D.plist||{},ids=Object.keys(pl).sort((a,b)=>(pl[a].name||"").localeCompare(pl[b].name||""));
 if(e.planner)return `<div class="row between small"><span>In <b>${esc(plName(e.planner))}</b>'s planner portal. They see it under Events there.</span><button class="btn xs" data-act="evFromPl" data-k="${esc(k)}">Take it out</button></div>`;
 const up=plUpgradeCode(k);
 return `<div class="stack tight"><p class="small muted m0">Upgrade this host to the planner portal. They get a planner code, and this event moves into their portal as soon as they sign up.</p>
 ${up?`<div class="row between small"><span>Planner code <b class="mono">${esc(up)}</b> sent for this event. Waiting for them to sign up.</span><span class="row"><button class="btn xs" data-act="copyText" data-t="${esc(baseURL()+"#planner")}  Planner code: ${esc(up)}">Copy</button><button class="btn xs" data-act="piToggle" data-k="${esc(up)}">Cancel</button></span></div>`
  :`<div class="row"><button class="btn sm primary" data-act="evUpgrade" data-k="${esc(k)}">Upgrade to planner portal</button></div>`}
 ${ids.length?`<div class="row small"><span>Or move it to a planner who already has an account:</span><select data-draft="mvpl_${esc(k)}"><option value="">Choose a planner</option>${ids.map(id=>`<option value="${esc(id)}" ${dv("mvpl_"+k,"")===id?"selected":""}>${esc(pl[id].name||"")}${pl[id].biz?" · "+esc(pl[id].biz):""}</option>`).join("")}</select><button class="btn xs" data-act="evToPl" data-k="${esc(k)}">Move</button></div>`:""}</div>`}
async function plAttach(ev,uid){const e=(D.events||{})[ev];if(!e||!uid)return;const u={};
 u["index/"+ev+"/planner"]=uid;u["events/"+ev+"/meta/planner"]=uid;u["planners/"+uid+"/events/"+ev]={name:e.name||ev,created:e.created||Date.now()};
 await db.ref(ROOT).update(u)}
async function plDetach(ev){const e=(D.events||{})[ev];if(!e||!e.planner)return;const u={};
 u["index/"+ev+"/planner"]=null;u["events/"+ev+"/meta/planner"]=null;u["planners/"+e.planner+"/events/"+ev]=null;await db.ref(ROOT).update(u)}
/* when an upgrade code gets used, move its event into the new planner's portal */
let plAutoBusy=false;
async function plAutoAttach(){if(plAutoBusy||!L.hostOK)return;const pv=D.pinvites||{},ev=D.events||{};
 const todo=Object.keys(pv).filter(c=>pv[c].ev&&pv[c].by&&ev[pv[c].ev]&&!ev[pv[c].ev].planner&&!pv[c].moved);if(!todo.length)return;plAutoBusy=true;
 try{for(const c of todo){await plAttach(pv[c].ev,pv[c].by);await RT("pinvites/"+c+"/moved").set(Date.now());toast((pv[c].name||"The planner")+"'s event "+pv[c].ev+" moved into their planner portal")}}catch(e){console.warn(e)}plAutoBusy=false}
Object.assign(ACT,{
 evUpgrade:async el=>{const k=el.dataset.k,e=(D.events||{})[k]||{};if(plUpgradeCode(k))return;const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";const code="P"+[...Array(7)].map(()=>A[rnd(A.length)]).join("");
  await RT("pinvites/"+code).set({label:((e.by||"Host")+" · upgrade for "+(e.name||k)).slice(0,60),active:true,t:Date.now(),ev:k});toast("Planner code "+code+" made. Tap Copy and send it to them.")},
 evToPl:async el=>{const k=el.dataset.k,uid=dv("mvpl_"+k,"");if(!uid)return toast("Choose a planner first");try{await plAttach(k,uid);delete L.drafts["mvpl_"+k];toast("Moved into "+plName(uid)+"'s planner portal")}catch(e){toast("Couldn't move it. Try again.")}},
 evFromPl:async el=>{try{await plDetach(el.dataset.k);toast("Taken out of the planner portal")}catch(e){toast("Couldn't change it. Try again.")}}
});

/* ---- owner: Planners tab ---- */
function hPlanners(){const pv=D.pinvites||{},pl=D.plist||{},ks=Object.keys(pv).sort((a,b)=>(pv[b].t||0)-(pv[a].t||0)),ids=Object.keys(pl).sort((a,b)=>(pl[b].t||0)-(pl[a].t||0)),lg=L.legacy||{};
 return `<section class="card stack"><h2>Planners</h2><p class="small muted m0">Planners and venues get their own portal with their own clients, teammates and events. They can't see your owner tools or anyone else's data. Give each one a planner code to create their account at <b>${esc(baseURL())}#planner</b>.</p>
 <div class="row"><input type="text" class="grow" data-draft="pi_label" maxlength="60" value="${esc(dv("pi_label",""))}" placeholder="Who it's for, e.g. Claire at Northlight Events"><button class="btn primary" data-act="piNew">New planner code</button></div>
 ${ks.length?`<div class="stack tight">${ks.map(k=>{const v=pv[k];return `<div class="row between small clrow"><span class="mw0"><b class="mono">${esc(k)}</b> · ${esc(v.label||"")}<span class="db muted">${v.by?`Used by ${esc(v.name||"a planner")}`:v.active?"Not used yet":"Turned off"}${v.ev?` · moves event ${esc(v.ev)} into their portal`:""}</span></span><span class="row">${v.by?"":`<button class="btn xs" data-act="copyText" data-t="${esc(baseURL()+"#planner")}  Planner code: ${esc(k)}">Copy</button><button class="btn xs" data-act="piToggle" data-k="${esc(k)}">${v.active?"Turn off":"Turn on"}</button>`}</span></div>`}).join("")}</div>`:""}</section>
 <section class="card stack"><h3>Planner and host accounts</h3>${ids.length?`<div class="stack tight">${ids.map(id=>`<div class="clrow small"><div class="row between"><span class="mw0"><b>${esc(pl[id].name||"")}</b>${pl[id].kind==="host"?' <span class="pill">Host</span>':""}${pl[id].biz?` · ${esc(pl[id].biz)}`:""}<div class="muted">${esc(pl[id].email||"")}${pl[id].t?" · joined "+esc(clAgo(pl[id].t)):""}</div></span><a class="btn xs primary" href="${esc(baseURL()+"?as="+encodeURIComponent(id)+"#planner")}">${pl[id].kind==="host"?"Open dashboard":"Open portal"}</a></div></div>`).join("")}</div>`:'<p class="small muted m0">No planners yet.</p>'}</section>
 ${(lg.c||lg.m)?`<section class="card stack"><h3>Move your earlier clients and teammates</h3><p class="small muted m0">You have ${lg.c} client${lg.c===1?"":"s"} and ${lg.m} teammate${lg.m===1?"":"s"} from before planner portals existed. Move them into your own planner portal so they keep working after the database is locked. Their old links will stop working; send the new ones from your portal.</p><button class="btn primary as" data-act="piMigrate">Move them to my planner portal</button></section>`:""}`}
Object.assign(ACT,{
 piNew:()=>{const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";const code="P"+[...Array(7)].map(()=>A[rnd(A.length)]).join("");RT("pinvites/"+code).set({label:(dv("pi_label","")).trim().slice(0,60)||"Planner",active:true,t:Date.now()});L.drafts.pi_label="";toast("Planner code "+code+" created")},
 piToggle:el=>{const v=(D.pinvites||{})[el.dataset.k];if(v)RT(`pinvites/${el.dataset.k}/active`).set(!v.active)},
 copyText:el=>copyText(el.dataset.t),
 piMigrate:async()=>{const uid=L.user&&L.user.uid;if(!uid)return;const base="planners/"+uid+"/";
  const prof=(await RT(base+"profile").once("value")).val();
  if(!prof){const p={name:"Roy",biz:"Host Mode",email:L.user.email||"",code:"OWNER",t:Date.now()};await RT(base+"profile").set(p);await RT("plist/"+uid).set({name:p.name,biz:p.biz,email:p.email,t:p.t})}
  const nodes=["clients","clientTasks","clientMsgs","clientFiles","clientBlobs","clientTemplates","clientApprovals","clientPayments","clientDates","clientVendors","mates","mateTasks","brand","dayOf","feedback"];
  for(const n of nodes){const v=(await RT(n).once("value")).val();if(v!=null){await RT(base+n).update(typeof v==="object"?v:{});if(typeof v!=="object")await RT(base+n).set(v)}}
  /* the events those clients were linked to now show in the portal */
  const cl=(await RT(base+"clients").once("value")).val()||{},idx=D.events||{},u={};Object.values(cl).forEach(c=>{if(c.ev&&idx[c.ev])u[c.ev]={name:idx[c.ev].name||c.ev,created:idx[c.ev].created||Date.now()}});if(Object.keys(u).length)await RT(base+"events").update(u);
  for(const n of nodes)await RT(n).remove();L.legacy={c:0,m:0};toast("Moved. Open your planner portal to see them.");render(true)}
});

/* ---- Help desk tab (planner portal and host console): type a question, get short answers with quick links ---- */
const HELP={
 pl:[
  ["Add a new client","Clients tab → add the client's name and details. Each client gets their own private portal.","clients","new client add customer couple person create"],
  ["Share a client's portal link","Open the client in Clients and copy their portal link. They need no account or app to open it.","clients","client link portal share send url access"],
  ["Send an invoice","Open the client in Clients, then the Money tab. Add a package or line items and send the invoice.","clients","invoice bill billing charge send money"],
  ["See what's paid and what's due","Open the client, then Money. Payments, balances and due dates are listed there.","clients","payment paid due deposit balance owe track money"],
  ["Message a client","Open the client in Clients. The message thread is on their page, and they reply from their portal.","clients","message chat talk text contact reply conversation"],
  ["Get approvals and sign-offs","Open the client and send a menu, floor plan or design. They tap Approve or Request changes.","clients","approve approval sign off signoff design menu floor plan"],
  ["Keep vendor contacts","Open the client, then Vendors. Add the DJ, caterer, florist and more, with arrival times.","clients","vendor dj caterer florist photographer rentals contact"],
  ["Client checklist and uploads","Open the client to see their checklist and the files they've uploaded, like guest lists and photos.","clients","checklist tasks to-do upload file photo pdf document"],
  ["See what needs your attention","Home shows overdue items, unread messages and what's coming up this week.","home","attention overdue late reminder today week upcoming dashboard"],
  ["Handle new inquiries","Leads lists everyone who filled in your inquiry form. One tap turns a lead into a client.","leads","lead inquiry inquiries form website instagram new business prospect"],
  ["Set up your public page","Showcase is your public page: story, past-event photos, packages, reviews and an inquiry form.","show","showcase public page profile gallery portfolio website photos reviews"],
  ["Create an event","Events → New event. Each event gets its own code, games, big screen and guest check-in.","events","event party create new make game code"],
  ["Run an event on the day","Events → Run it opens the event console. Guest view and Big screen open what guests and the TV see.","events","run console live day night big screen tv projector guest view"],
  ["Start from a ready-made event","Templates has events with the look, moments, games and run of show already set up.","tpl","template ready-made ready made starter wedding birthday baby shower corporate"],
  ["See your calendar","Calendar shows every event and key client date. You can download dates to Google or Apple Calendar.","cal","calendar dates schedule upcoming month google apple"],
  ["Add teammates","Teammates lets you add your crew. Each gets a private link with only their tasks.","team","teammate team staff crew helper assistant employee task"],
  ["Day-of mode for your crew","Branding → Day-of mode gives teammates a simple view of just what to do now, with a help button.","brand","day of day-of event day teammates crew mode"],
  ["Price a package per guest","In Packages, tap New package and tick “Priced per guest”. Type the price for each guest and an optional minimum. When you add it to a client, Host Mode multiplies by their guest count (or the minimum, if that's higher) and sets up the deposit and balance.","pkg","per person per guest per head plate price catering minimum guests headcount"],
  ["Set a minimum spend for a space","In Venue, edit a space and type its minimum spend. On each booking, add the food and drink total. Host Mode adds the rental fee and food and drink together and flags confirmed bookings that fall short.","venue","minimum spend food beverage f&b minimum short catering bar total"],
  ["Schedule teammates for an event day","In Teammates, tap Schedule a shift. Pick the teammate, date, role, start and end times and hourly pay. They see it on their teammate page, it shows on your calendar, and Host Mode adds up hours and pay. It only tracks pay; it never pays anyone.","team","shift shifts schedule staff staffing hours pay wage roster crew timesheet labor"],
  ["Take photos for damage claims","On a pull list in Inventory, add photos before it goes out, then add photos of any damage when you check it back in. Each photo is dated, so you have proof if you need to charge a client.","inv","photo photos picture damage claim broken proof deposit check in check out rental"],
  ["Build your packages","Packages holds your services and prices. Add them to clients and invoices from the client's Money tab.","pkg","package packages pricing price services offer bundle"],
  ["Add your logo and colors","Branding puts your logo, colors and contact details on client portals, teammate pages and invoices.","brand","brand branding logo colors look business name contact"],
  ["Track your inventory","Inventory keeps your tablecloths, centerpieces, chairs, tables and lights, with how many you own, where they're stored and what's in repair.","inv","inventory linens tablecloths centerpieces chairs tables lights lighting decor rentals stock items storage"],
  ["Reserve items for an event","Inventory → Reserve for an event makes a pull list, warns you if you're short that day, and lets you check items out and back in.","inv","reserve pull list pack check out check in return missing damaged double booked availability free"],
  ["Book your venue","Venue → turn on venue bookings, add your spaces, then save holds and confirmed bookings. Overlaps and blocked days are flagged.","venue","venue booking book hold rooms spaces ballroom calendar availability deposit"],
  ["Block off days at your venue","Venue → Block off days marks days the whole venue or one space can't be booked, like maintenance or holidays.","venue","block blackout blocked closed holiday maintenance unavailable day off"],
  ["Send a client a questionnaire","Clients → open a client → Ask about their event. They answer in their portal, and their answers fill in the date, guests, venue and budget for you.","clients","questionnaire questions form intake details ask client answers allergies theme"],
  ["Print an event sheet","Clients → Event sheet makes one printable page for the kitchen, venue and crew: timeline, menu with counts, allergies, vendors, room setup and rentals.","clients","event sheet beo banquet event order kitchen print crew timeline menu"],
  ["Move the schedule when you're running late","In the event console's Tonight tab, pick how many minutes and tap Move the rest later. Vendors see the new times right away. Undo puts them back.","clients","running late behind schedule delay move times run of show"],
  ["Give a vendor their own page","Clients → open a client → Vendors → Make a vendor page. Copy or text them the link: they see their arrival time, an I'm here button, the schedule with their moments, your notes, and a way to flag a problem.","clients","vendor page link caterer dj photographer florist rentals arrival check in schedule run of show"],
  ["Add a booking link","Branding → Booking link. Paste your Calendly or Google booking link to show a Book a meeting button.","brand","booking meeting calendly consultation tasting appointment schedule zoom call"],
  ["Bring in your data","Import & export takes spreadsheets, whole workbooks, Google Sheets and PDFs, works out what each tab holds, and puts clients, vendors, guests, inventory, venue bookings, packages and payments where they belong.","data","import upload spreadsheet workbook tabs excel csv google sheets pdf honeybook dubsado move switch data inventory bookings packages payments"],
  ["Fix or undo an import","Before saving, rows with a problem can be skipped or downloaded to fix. Duplicates can be skipped or updated. Any import can be undone for 24 hours.","data","undo duplicate duplicates update problem rows fix skip wrong mistake"],
  ["Download a backup","Import & export → Download everything gives you one spreadsheet with every part of your business, which you can also upload back.","data","export download backup spreadsheet copy save excel everything"],
  ["See how your business is doing","Reports shows money collected and new clients by month, best-selling packages and where leads come from.","rep","report reports revenue income money made stats numbers sales"],
  ["Collect reviews and feedback","Feedback gathers ratings from guests and clients. Feature the best ones as testimonials.","fb","feedback review reviews testimonial rating survey stars"],
  ["Design a venue in 3D","3D designer lays out a room in 3D: walls, stage, dance floor, tables and chairs, linens, balloons, drapery and lighting. Type what you want in the Ask box and it shows a preview first. Designs save to your account.","d3","3d design layout floor plan room venue tables chairs decor seating render"],
  ["Design over a photo of your venue","In the 3D designer, open the Photo tab and choose a photo of the empty room. Drag the four dots onto the corners of something rectangular on the floor (a rug, the dance floor, tile lines), then type how long the near edge really is. Your tables and decor then show in the photo at the right size and angle; Save picture makes an image to send your client. Only the length you type is measured; everything else from a photo is an estimate. The photo stays with that design, in your own account.","d3","photo picture venue real room camera design over overlay client preview measure"],
  ["Change your profile or password","Settings has your profile, account email, password and sign out.","set","settings profile password account email sign out log out name"]],
 ho:[
  ["Plan your event","My events → Plan has your date, countdown and to-do list with due dates and reminders.","events","plan planning date countdown checklist to-do todo reminder due"],
  ["Run your event on the night","My events → Run it opens your console. You're signed in, so you don't need your PIN. Helpers still use their PIN.","events","run console night live games start pin moderator"],
  ["Plan travel for your guests","Stay & Go keeps where everyone stays, rental cars, shared costs, who has paid and the details each guest is sent.","stay","travel hotel lodging airbnb rental car trip stay go flight"],
  ["Track who has paid","Stay & Go → Receipts & payments shows what each traveler owes, has paid and still owes. Host Mode only records payments; it never takes or sends money.","stay","money paid payment owe balance receipt venmo zelle cash split"],
  ["Send travel details to guests","Stay & Go → Guest messages builds each guest's details and opens your own email or texting app to send them.","stay","message email text sms send guest details directions"],
  ["Create another event","Each event needs its own invite code from Host Mode. Tap New event on My events and type the code. It's added to this account.","events","new event another second invite code create"],
  ["Change your password or sign out","Settings has your name, email, phone, a link to change your password, and sign out.","set","settings profile password account email sign out log out name forgot"]],
 ad:[
  ["See what the agents are doing","Agents tab. Each helper shows what it is up to: moving means working, waving means finished, and a red flag means something failed. Tap one to see its run on GitHub.","","agents agent robot status nightly builder reviewer backup"],
  ["Fixes waiting for approval","Boxes by Roy's office door are pull requests waiting for you. Tap the Builder or open the pull requests on GitHub.","","pull request pr approve approval waiting fix box"],
  ["Agent spending","The tip jar shows this month's spending from the nightly agents against the $100 limit.","","cost spending money limit credits budget tip jar"]],
 m:[
  ["Start the games","Live is where you run the night: start games, go to the next moment and watch what's happening.","live","start live begin go game now run tonight"],
  ["Open the big screen","Open this link on the TV or projector. It shows games, scores and photos for the room.","@screen","big screen tv projector display monitor"],
  ["Let guests join","Event → Links has the guest link and QR code. Guests scan it with their phone camera to join.","event","guest join qr code link scan phone invite"],
  ["Set the date and to-dos","Plan holds the date, countdown and your to-do list with due dates and reminders.","plan","plan date countdown checklist to-do todo reminder due"],
  ["Run of show and timing","Tonight has the evening order with times, so everyone knows what's next.","tonight","run of show schedule timeline order program agenda time next"],
  ["Check guests in","Tonight → Guest list. Import your list from a spreadsheet and check people in at the door.","tonight","guest list rsvp check in check-in door arrive import spreadsheet names"],
  ["Raffle and gifts","Tonight also has the raffle and the gift list.","tonight","raffle drawing gift gifts presents prize"],
  ["Moments, reveal and songs","Moments sets up special moments, your photos, the big reveal and the songs that play.","moments","moment moments reveal gender songs music photos slideshow entrance"],
  ["Show slides","Presentations shows slides on the big screen. The presenter's phone becomes the remote.","pres","presentation slides powerpoint speech toast speaker remote"],
  ["Split guests into teams","Teams sets how many teams, how the room splits, tiebreakers and prizes.","teams","teams team split groups pods tables tiebreaker"],
  ["Scores and prizes","Scores shows points, the leaderboard and prizes.","scores","score scores points winner leaderboard prize prizes ranking"],
  ["Change game questions","Content has the questions, words and answers for each game.","content","content questions trivia crossword words answers edit game"],
  ["Change the look and colors","Event → Look. Upload your flyer or invitation to pull its colors, then fine-tune.","event","look colors theme flyer invitation design font style"],
  ["Make your own game","Custom games lets you create a game or add one from the library, then test it.","custom","custom game create make own library build"],
  ["Party games and 21+","Party games are for any crowd. The 21+ section is off unless the admin turns it on.","party","party games drinking adult 21 sip fun"],
  ["Menu and drink orders","Menu shows guests the menu and collects their food and drink orders.","menu","menu drinks drink orders food bar order"],
  ["Photos, album and wishes","Memories holds the shared photo album and guests' wishes.","memories","photos album pictures wishes messages keepsake memories"],
  ["Practice before the event","Event → Rehearsal runs the whole night with pretend guests, so you can practice.","event","practice rehearsal rehearse test trial dry run"],
  ["Add moderators","Event → Moderators. Give a helper their own PIN so they can run things too.","event","moderator moderators helper pin co-host access"],
  ["Change your event code","Ask Host Mode or your planner. They can change it, and old links keep working.","","code change rename event code link"]]};
const helpNorm=t=>(t||"").toLowerCase().replace(/[^a-z0-9+ ]/g," ").replace(/\s+/g," ").trim();
const HELP_STOP=new Set("how do i to the a an my can where is what of in on for it you your get find see does with".split(" "));
function helpScore(item,q){const words=helpNorm(q).split(" ").filter(w=>w&&!HELP_STOP.has(w));if(!words.length)return 1;
 const ti=helpNorm(item[0]),hay=(ti+" "+helpNorm(item[1])+" "+helpNorm(item[3])).split(" ");let sc=0;
 for(const w of words){const stem=w.replace(/(ing|es|s)$/,"");const hit=hay.some(h=>h.startsWith(w)||(stem.length>2&&h.startsWith(stem)));if(!hit)continue;sc+=10+(ti.includes(stem)?3:0)}
 return sc}
function helpView(who){const list=HELP[who]||[],q=dv("help_q_"+who,""),chips=who==="ad"?["agents","waiting","spending"]:who==="ho"?["plan","travel","paid","password"]:who==="pl"?["invoice","client link","import","teammates","booking link","reports"]:["start games","big screen","guest QR code","check in","scores","practice"];
 const tabName=k=>who==="pl"||who==="ho"?((plTabsNow().find(t=>t[0]===k)||PL_TABS.find(t=>t[0]===k)||[])[1]||""):({live:"Live",plan:"Plan",tonight:"Tonight",moments:"Moments",pres:"Presentations",teams:"Teams",scores:"Scores",content:"Content",menu:"Menu",party:"Party games",custom:"Custom games",event:"Event",memories:"Memories"})[k]||"";
 const rows=list.map((it,i)=>{const go=it[2];let btn="";
  if(go==="@screen")btn=`<a class="btn xs primary" href="${esc(eventURL(EV,"screen"))}" target="_blank" rel="noopener">Open big screen</a>`;
  else if(go)btn=`<button class="btn xs primary" data-act="helpGo" data-v="${who}" data-k="${go}">Go to ${esc(tabName(go))}</button>`;
  const sc=helpScore(it,q);return {sc,i,h:`<div class="clrow" data-hrow="${i}" data-hk="${esc(it[0]+" | "+it[1]+" | "+it[3])}"${sc?"":" hidden"}><div class="row between"><div class="mw0"><b>${esc(it[0])}</b><div class="small muted">${esc(it[1])}</div></div>${btn}</div></div>`}});
 const shown=helpNorm(q)?rows.filter(r=>r.sc).sort((a,b)=>b.sc-a.sc||a.i-b.i).concat(rows.filter(r=>!r.sc)):rows;
 return `<section class="card stack"><h2>Help desk</h2><p class="small muted m0">Type a question or a few words, like “send an invoice” or “where is the QR code”.</p>
 <input type="search" data-help="${who}" data-draft="help_q_${who}" value="${esc(q)}" placeholder="What do you need help with?" aria-label="Search the help desk" autocomplete="off">
 <div class="row small">${chips.map(c=>`<button class="btn xs" data-act="helpChip" data-v="${who}" data-k="${esc(c)}">${esc(c)}</button>`).join("")}</div>
 <div class="stack tight" data-hlist="${who}">${shown.map(r=>r.h).join("")}</div>
 <p class="small muted m0" data-hnone="${who}"${!helpNorm(q)||rows.some(r=>r.sc)?" hidden":""}>Nothing matched. Try other words, like ${who==="ho"?"“plan”, “travel” or “password”":who==="pl"?"“client”, “money” or “calendar”":"“games”, “guests” or “screen”"}.</p>
 <p class="small muted m0">${who==="pl"?"Still stuck? Tell Host Mode and we'll help.":"Still stuck? Ask your planner or whoever gave you your event code, or tell Host Mode."}</p><button class="btn sm as" data-act="supOpen" data-k="new">Report a problem</button></section>`}
function helpFilter(who,q){const box=document.querySelector(`[data-hlist="${who}"]`);if(!box)return;const list=HELP[who]||[],rows=[...box.querySelectorAll("[data-hrow]")];
 const sc=rows.map(r=>({r,i:+r.dataset.hrow,s:helpScore(list[+r.dataset.hrow],q)}));const has=!!helpNorm(q);
 sc.sort((a,b)=>has?(b.s-a.s||a.i-b.i):a.i-b.i).forEach(x=>{x.r.hidden=!x.s;box.appendChild(x.r)});
 const none=document.querySelector(`[data-hnone="${who}"]`);if(none)none.hidden=!has||sc.some(x=>x.s)}
addEventListener("input",e=>{const w=e.target.dataset&&e.target.dataset.help;if(w)helpFilter(w,e.target.value)});
Object.assign(ACT,{
 helpGo:el=>{if(el.dataset.v==="pl"||el.dataset.v==="ho")L.plTab=el.dataset.k;else L.mtab=el.dataset.k;L.confirm=null;render();window.scrollTo({top:0})},
 helpChip:el=>{L.drafts["help_q_"+el.dataset.v]=el.dataset.k;const i=document.querySelector(`[data-help="${el.dataset.v}"]`);if(i)i.value=el.dataset.k;helpFilter(el.dataset.v,el.dataset.k)}
});
const plHelp=()=>helpView(plIsHost()?"ho":"pl"),mHelp=()=>helpView("m");

/* ---- the planner portal ---- */
let plSubbed=false;
function plSubs(){if(plSubbed||!db)return;plSubbed=true;
 RT(PSP+"profile").on("value",s=>{D.plMe=s.val();renderSoon()});RT(PSP+"invSettings").on("value",s=>{D.invSet=s.val()||{};renderSoon()});
 RT(PSP+"events").on("value",s=>{D.events=s.val()||{};L.loaded=true;renderSoon()});
 RT(PSP+"feedback").on("value",s=>{D.fbk=s.val()||{};renderSoon()});RT(PSP+"brand").on("value",s=>{D.brand=s.val();renderSoon()});RT(PSP+"dayOf").on("value",s=>{D.dayOf=!!s.val();renderSoon()});
 RT(PSP+"mates").on("value",s=>{D.mates=s.val()||{};renderSoon()});RT(PSP+"mateTasks").on("value",s=>{D.mtasks=s.val()||{};renderSoon()});RT(PSP+"mateShifts").on("value",s=>{D.mshifts=s.val()||{};renderSoon()});
 [["clients","clients"],["clientTasks","ctasks"],["clientMsgs","cmsgs"],["clientFiles","cfiles"],["clientTemplates","ctpl"],["clientApprovals","caps"],["clientPayments","cpay"],["clientDates","cdates"],["clientVendors","cven"],["clientInvoices","cinv"],["packages","pkgs"],["inquiries","inq"],["showcase","show"],["showImg","showImg"],["vcheck","vchk"],["gear","gear"],["gearRes","gres"],["venue","vset"],["spaces","spaces"],["bookings","bks"],["blocks","vblk"],["stay/trips","sgT"],["stay/prov","sgP"],["stay/res","sgR"],["stay/exp","sgE"],["stay/mem","sgM"],["stay/pay","sgPay"],["stay/rc","sgRc"],["stay/msg","sgMsg"],["stay/act","sgAct"]].forEach(([p,k])=>RT(PSP+p).on("value",s=>{D[k]=s.val()||{};if(k==="cven"||k==="clients")tvSyncSoon();if(["bks","vblk","spaces","vset","show"].includes(k))busySyncSoon();renderSoon()}))}
/* teammates can't list a planner's clients, so the vendors marked "teammates see" are copied per event into tv/{EV} */
let tvT=null;function tvSyncSoon(){clearTimeout(tvT);tvT=setTimeout(tvSync,600)}
function tvSync(){if(!PSP||VIEW!=="planner"||L.viewOnly)return;vpSyncSoon();const out={};Object.keys(D.clients||{}).forEach(cid=>{const ev=D.clients[cid].ev;if(!ev)return;clVendors(cid).filter(v=>v.team).forEach(v=>{(out[ev]=out[ev]||{})[cid+"_"+v.k]={name:v.name,role:v.role||"",phone:v.phone||"",email:v.email||"",arrive:v.arrive||"",delivers:v.delivers||"",note:v.note||""}})});
 const j=JSON.stringify(out);if(j===L.tvLast)return;L.tvLast=j;RT(PSP+"tv").set(out)}
function plConnect(){
 if(window.__HMDEMO&&EV==="DEMO"){PSP="planners/demohost/";L.plOK=true;L.authReady=true;plSubs();return}
 if(window.__HMPDEMO){PSP=QS.get("host")==="1"?"planners/jordan/":"planners/northlight/";L.plOK=true;L.authReady=true;plSubs();return}
 const a=AUTH();if(!a){/* offline test copy without sign-in */PSP="planners/test/";L.authReady=true;L.plOK=true;plSubs();return}
 RT("owner").on("value",s=>{D.owner=s.val()||null;renderSoon()});
 a.onAuthStateChanged(async u=>{L.user=u;L.authReady=true;
  if(!u){L.plOK=false;L.loaded=true;renderSoon();return}
  const asU=QS.get("as")||"";
  if(/^[A-Za-z0-9_-]{1,64}$/.test(asU)){const ow=(await RT("owner").once("value").catch(()=>null));
   const adm=await loadCoAdmin(u),sf=ow&&ow.val()!==u.uid&&!adm?(await RT("staff/"+u.uid).once("value").catch(()=>null)):null,isSt=!!(sf&&sf.val());
   if(ow&&(ow.val()===u.uid||adm||isSt)){if(isSt)L.viewOnly=true;const ap=(await RT("planners/"+asU+"/profile").once("value").catch(()=>null));const apv=ap&&ap.val();
    if(apv){PSP="planners/"+asU+"/";D.plMe=apv;L.plOK=true;L.viewAs=true;plSubs();renderSoon();return}}}
  const prof=(await RT("planners/"+u.uid+"/profile").once("value").catch(()=>null));const pv=prof&&prof.val();
  if(pv){PSP="planners/"+u.uid+"/";D.plMe=pv;L.plOK=true;plSubs()}else{L.plOK=false;L.loaded=true}
  renderSoon()})}
function plannerView(){
 if(!L.authReady||(L.plOK&&!L.loaded))return loadingView();
 if(!L.plOK){const card=(h,b)=>`<section class="card stack narrow"><div class="eyebrow">Planner portal</div><h2>${h}</h2>${b}</section>`;
  if(L.user){const own=L.user.uid===D.owner;return card(own?"Set up your planner portal":"Finish your planner account",`<p class="small muted m0">${own?"As the owner you can run your own clients here too.":"Signed in as "+esc(L.user.email||"")+". Add your planner code to finish."}</p>${own?`<label class="stack tight"><span class="small">Your name</span><input type="text" data-draft="ac_name" value="${esc(dv("ac_name",""))}"></label><label class="stack tight"><span class="small">Business name</span><input type="text" data-draft="ac_biz" value="${esc(dv("ac_biz",""))}"></label><button class="btn primary" data-act="acPlanner">Open my planner portal</button>`:acctForm("planner").replace(/<label class="stack tight"><span class="small">(Email|Choose a password)[\s\S]*?<\/label>/g,"")}<button class="btn xs as" data-act="acOut">Sign out</button>`)}
  const mode=L.acMode||"signin";
  return card(mode==="new"?"Create your planner account":"Sign in",`${mode==="new"?`<p class="small muted m0">You'll need the planner code Host Mode sent you.</p>${acctForm("planner")}<button class="btn xs as" data-act="acMode" data-k="signin">I already have an account</button>`:`${acctForm("signin")}<button class="btn xs as" data-act="acMode" data-k="new">New planner? Create your account</button>`}`)}
 const TB=plTabsNow(),cur=TB.some(([k])=>k===L.plTab)?L.plTab:TB[0][0],tab=(k,l)=>`<button data-act="plTab" data-k="${k}" aria-pressed="${cur===k}">${l}${plTabBadge(k)}</button>`;
 const body=plTabBody(cur);const me=D.plMe||{};
 return `${L.viewAs?`<div class="banner soft"><span>You're viewing <b>${esc(me.name||"this planner")}</b>'s ${plIsHost()?"event dashboard":"planner portal"} ${L.viewOnly?"for support. It's read-only, so nothing you tap is saved.":"as the admin. Changes you make save to their account."}</span><a class="btn sm" href="${esc(baseURL())}#${L.viewOnly?"support":"host"}">Back to ${L.viewOnly?"support":"admin console"}</a></div>`:""}${PL_PW?`<div class="stack mw0"><div class="row between small acctbar"><span><b>${esc(plTabLabel(cur))}</b> <span class="muted">· ${esc(me.biz||me.name||"Planner portal")}</span></span><button class="btn xs" data-act="plPopClose">Close window</button></div>${body}</div>`:`<div class="console"><nav class="side" aria-label="${plIsHost()?"Dashboard sections":"Planner sections"}">${TB.map(([k,l])=>tab(k,l)).join("")}</nav><div class="stack mw0"><div class="row between small acctbar"><span class="muted">${esc(me.name||"")}${me.biz?" · "+esc(me.biz):""}</span><span class="row">${plMultiOn()&&cur!=="set"?`<button class="btn xs" data-act="plPop" data-k="${cur}">Pop out ${esc(plTabLabel(cur))}</button>`:""}</span>${window.__HMPDEMO||window.__HMDEMO?"":`<span class="row">${isAdminUser()?`<a class="btn xs" href="${esc(baseURL())}#host">Admin console</a>`:""}${roleLinks("planner")}<button class="btn xs" data-act="acOut">Sign out</button></span>`}</div>${body}</div></div>`}`}
function plEvents(){const ev=D.events||{},ks=Object.keys(ev).sort((a,b)=>(ev[b].created||0)-(ev[a].created||0)),host=plIsHost();
 /* hosts need a new invite code for each event, so their New event goes to the invite code page */
 const nu=host?baseURL()+(window.__HMPDEMO?"?pdemo=1":"")+"#new":baseURL()+"?"+(window.__HMPDEMO?"pdemo=1&":"")+(L.viewAs?"as="+encodeURIComponent(PLID())+"&":"")+"planner=1#new";
 return `<section class="card stack"><div class="row between"><h2>${host?"My events":"Your events"}</h2><a class="btn primary" href="${esc(nu)}">New event</a></div><p class="small muted m0">${host?"Tap Plan for your date, countdown and to-do list. On the night, tap Run it: you're signed in, so the console opens without your PIN. Each new event needs its own invite code from Host Mode.":"Each event gets its own code, games, big screen and guest check-in. Link an event to a client in the Clients tab."}</p>
 ${ks.length?`<div class="stack tight">${ks.map(k=>{const cl=Object.keys(D.clients||{}).filter(id=>D.clients[id].ev===k).map(id=>D.clients[id].name);return `<div class="clrow"><div class="row between"><div class="mw0"><b>${esc(ev[k].name||k)}</b><div class="small muted">Code ${esc(k)}${cl.length?" · for "+esc(cl.join(", ")):""}</div></div></div><div class="row small">${host?`<a class="btn xs primary" href="${esc(planURL(k))}">Plan</a>`:""}<a class="btn xs" href="${esc(eventURL(k,"moderator"))}">Run it</a><a class="btn xs" href="${esc(eventURL(k,""))}">Guest view</a><a class="btn xs" href="${esc(eventURL(k,"screen"))}">Big screen</a></div></div>`}).join("")}</div>`:'<p class="small muted m0">No events yet. Tap New event to create your first one.</p>'}</section>`}
ACT.plTab=el=>{L.plTab=el.dataset.k;L.confirm=null;render();scrollTo(0,0)};
/* ---- planner portal: one tab per part of the business ----
   Home (what needs attention and this week), Clients, Events, Calendar, Teammates, Packages (and every invoice),
   Inventory (what the business owns and pull lists), Venue (spaces, bookings, holds and blocked days),
   Templates (ready-made events and checklists), Import & export, Branding, Feedback, Settings. */
const PL_TABS=[["home","Home"],["clients","Clients"],["leads","Leads"],["events","Events"],["cal","Calendar"],["inv","Inventory"],["venue","Venue"],["d3","3D designer"],["stay","Stay & Go"],["team","Teammates"],["pkg","Packages"],["show","Showcase"],["rep","Reports"],["tpl","Templates"],["data","Import & export"],["brand","Branding"],["fb","Feedback"],["set","Settings"],["help","Help desk"]];
/* a host's dashboard: their events, Stay & Go, the Help desk and their account (planning tabs move here after Jan 3) */
const HOST_TABS=[["events","My events"],["stay","Stay & Go"],["help","Help desk"],["set","Settings"]];
const plIsHost=()=>!!(D.plMe&&D.plMe.kind==="host");
const plTabsNow=()=>plIsHost()?HOST_TABS:PL_TABS;
const CAL_K={event:["🎉","Event day"],date:["📌","Key date"],pay:["💵","Payment due"],task:["☑️","Checklist"],venue:["🏛️","Venue booking"],block:["⛔","Venue blocked"],gear:["📦","Rentals out or back"],shift:["👥","Teammate shifts"],trip:["🧳","Travel"]};
function plCalItems(){const out=[],cs=D.clients||{};
 Object.keys(cs).forEach(id=>{const c=cs[id],nm=c.name||"Client";
  if(c.date)out.push({date:c.date,kind:"event",title:c.evName||c.evTitle||nm+"'s event",who:nm,id,s:"list"});
  clDates(id).forEach(x=>x.date&&out.push({date:x.date,time:x.time,kind:"date",title:x.title,who:nm,id,s:"dates"}));
  clPays(id).filter(x=>!x.paid&&x.due).forEach(x=>out.push({date:x.due,kind:"pay",title:x.title+" · "+clMoney(x.amount),who:nm,id,s:"money"}));
  clTasksOf(id,true).filter(x=>!x.done&&x.due).forEach(x=>out.push({date:x.due,kind:"task",title:x.title,who:nm+(x.owner==="client"?" · client's task":" · your task"),id,s:"list"}))});
 if(venueOn()){bkList().filter(b=>b.status!=="cancelled"&&b.date).forEach(b=>out.push({date:b.date,time:b.start||"",kind:"venue",title:(b.name||"Booking")+(b.status==="hold"?" (on hold)":""),who:spaceName(b.space)+" · "+bkTimes(b),tab:"venue",day:b.date}));
  blkList().forEach(x=>dayRange(x.from,blkTo(x)).forEach(d=>out.push({date:d,kind:"block",title:spaceName(x.space)+" blocked",who:x.reason||"Blocked off",tab:"venue",day:d})))}
 gresList().filter(r=>r.status!=="back"&&r.from).forEach(r=>{out.push({date:r.from,kind:"gear",title:"Rentals go out: "+(r.label||"Event"),who:gresWhat(r).length+" item"+(gresWhat(r).length===1?"":"s"),tab:"inv"});if(gresTo(r)>r.from)out.push({date:gresTo(r),kind:"gear",title:"Rentals come back: "+(r.label||"Event"),who:gresWhat(r).length+" item"+(gresWhat(r).length===1?"":"s"),tab:"inv"})});
 {const by={};shAll().forEach(s=>(by[s.date]=by[s.date]||[]).push(s));Object.keys(by).forEach(d=>{const l=by[d],nm=l.map(s=>((D.mates||{})[s.mid]||{}).name).filter(Boolean);out.push({date:d,time:l[0].start||"",kind:"shift",title:l.length+" teammate"+(l.length===1?"":"s")+" on shift",who:nm.slice(0,4).join(", ")+(nm.length>4?" and "+(nm.length-4)+" more":""),tab:"team"})})}
 try{sgCalItems().forEach(x=>out.push(x))}catch(e){}
 return out.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time||"").localeCompare(String(b.time||"")))}
const plJumpBtn=(x,l)=>x.tab?`<button class="btn xs" data-act="plJump" data-k="${x.tab}"${x.day?` data-d="${esc(x.day)}"`:""}>${l||"Open"}</button>`:x.id?`<button class="btn xs" data-act="plJump" data-k="clients" data-m="${esc(x.id)}" data-s="${x.s||"list"}">${l||"Open"}</button>`:"";
const plCalRow=x=>`<div class="row between small clrow"><span class="mw0">${CAL_K[x.kind][0]} <b>${esc(x.title)}</b>${x.time?" · "+esc(clFmtTime(x.time)):""}<span class="db muted">${esc(clFmtDate(x.date))} · ${esc(x.who)}</span></span>${plJumpBtn(x)}</div>`;
/* ---- Get set up: a checklist for a planner's first days, ticked off automatically as things get done ---- */
function plSetupSteps(){const n=o=>Object.keys(o||{}).length;
 return [["brand","Add your logo, colors and contact details","Branding",!!(D.brand&&(D.brand.name||D.brand.logo))],
  ["data","Bring in your clients from a spreadsheet or another app, or add your first client","Import & export",n(D.clients)>0],
  ["pkg","Add your packages and prices","Packages",n(D.pkgs)>0],
  ["events","Create your first event (games, big screen and check-in)","Events",n(D.events)>0],
  ["team","Invite a teammate for event days","Teammates",n(D.mates)>0],
  ["show","Publish your Showcase page and inquiry form","Showcase",!!(D.show&&D.show.on)],
  ["inv","Optional: add your rentals and decor to Inventory, or turn on venue bookings","Inventory",n(D.gear)>0||venueOn()]]}
function plSetupCard(){if(window.__HMPDEMO&&!L.setupDemo)return "";const st=plSetupSteps(),done=st.filter(x=>x[3]).length,uid=PLID();if(done===st.length||store.get("plSetupHide_"+uid,false))return "";
 return `<section class="card stack gilt"><div class="row between"><h3 class="m0">Get set up</h3><span class="pill">${done} of ${st.length} done</span></div>${mateBar(Math.round(done/st.length*100))}
 <div class="stack tight">${st.map(([k,l,tab,ok])=>`<div class="row between small clrow ${ok?"done dim":""}"><span class="mw0">${ok?"✓":"○"} ${esc(l)}</span>${ok?"":`<button class="btn xs" data-act="plJump" data-k="${k==="brand"?"brand":k==="data"?"data":k}">Open ${esc(tab)}</button>`}</div>`).join("")}</div>
 <div class="row"><button class="btn xs" data-act="plJump" data-k="help">Help desk</button><button class="btn xs" data-act="plSetupHide">Hide this list</button></div></section>`}
ACT.plSetupHide=()=>{store.set("plSetupHide_"+PLID(),true);render(true)};
function plHome(){const me=D.plMe||{},cs=D.clients||{},ids=Object.keys(cs),today=mateToday(),hr=new Date().getHours(),hi=hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";
 const week=plCalItems().filter(x=>x.date>=today&&x.date<=clDays(7)),soon=ids.filter(id=>cs[id].date&&cs[id].date>=today&&cs[id].date<=clDays(30)).length;
 const due=ids.reduce((n,id)=>n+clPayStats(id).left,0),att=[];
 ids.forEach(id=>{const c=cs[id],nm=esc(c.name||"Client"),u=clUnread(id),gl=clPending(id),ap=clApNew(id),lt=clTasksOf(id,true).filter(x=>x.owner==="planner"&&clLate(x)).length;
  if(u)att.push([`💬 <b>${nm}</b> sent ${u} new message${u===1?"":"s"}`,id,"chat"]);
  if(ap)att.push([`✅ <b>${nm}</b> answered ${ap} approval${ap===1?"":"s"}`,id,"approve"]);
  if(gl)att.push([`📋 <b>${nm}</b> sent a guest list to review`,id,"files"]);
  if(lt)att.push([`⏰ ${lt} of your checklist item${lt===1?"":"s"} for <b>${nm}</b> ${lt===1?"is":"are"} overdue`,id,"list"]);
  clPays(id).filter(x=>!x.paid&&x.due&&x.due<today).forEach(x=>att.push([`💵 <b>${nm}</b>: ${esc(x.title)} ${clMoney(x.amount)} was due ${esc(mateDue(x.due))}`,id,"money"]))});
 {const nl=inqNew();if(nl)att.unshift([`📨 ${nl} new inquir${nl===1?"y":"ies"} from your form`,null,"leads"])}
 Object.keys(cs).forEach(id=>{const q=cs[id].qa;if(q&&q.t&&!(q.seen>=q.t))att.push([`📝 <b>${esc(cs[id].name||"A client")}</b> answered your questionnaire`,id,"list"])});
 vpAll().forEach(x=>vpIssues(x.chk).filter(i=>!i.ok).forEach(i=>att.push([`🚩 <b>${esc(x.v.name)}</b> (${esc(x.c.name||"a client")}): ${esc(i.text)}`,x.cid,"ven"])));
 if(venueOn())holdsDue().forEach(b=>att.push([`⏳ Hold for <b>${esc(b.name||"a booking")}</b> on ${esc(clFmtDate(b.date))} ${b.holdUntil<today?"ran out":"runs out"} ${esc(mateDue(b.holdUntil))}`,null,"venue"]));
 gresList().forEach(r=>{if(gresLate(r))att.push([`📦 Rentals for <b>${esc(r.label||"an event")}</b> were due back ${esc(mateDue(gresTo(r)))}`,null,"inv"]);else if(gresTo(r)>=today){const sh=gresShort(r);if(sh.length)att.push([`📦 Not enough ${sh.map(x=>esc(x.name)).join(", ")} for <b>${esc(r.label||"an event")}</b>`,null,"inv"])}});
 if(shAll().length){const sd=new Set(shAll().map(s=>s.date));ids.forEach(id=>{const c=cs[id];if(c.date&&c.date>=today&&c.date<=clDays(7)&&!sd.has(c.date))att.push([`👥 No teammates scheduled yet for <b>${esc(c.evName||c.name||"an event")}</b> on ${esc(mateDue(c.date))}`,null,"team"])})}
 Object.keys(D.mates||{}).forEach(k=>{const m=D.mates[k];if(m&&m.help&&!m.help.ok)att.push([`🆘 <b>${esc(m.name||"A teammate")}</b> asked for help`,null,"team"])});
 const waitAp=ids.reduce((n,id)=>n+clApPending(id),0),nu=baseURL()+"?"+(window.__HMPDEMO?"pdemo=1&":"")+"planner=1#new";
 return `<section class="card stack"><div class="eyebrow">${esc(me.biz||"Planner portal")}</div><h2 class="m0">${hi}${me.name?", "+esc(String(me.name).split(" ")[0]):""}</h2>
 <div class="stats"><button class="stat" data-act="plJump" data-k="clients"><b>${ids.length}</b><span>Clients</span></button><button class="stat" data-act="plJump" data-k="cal"><b>${soon}</b><span>Events in the next 30 days</span></button><button class="stat" data-act="plJump" data-k="pkg"><b>${clMoney(due)}</b><span>Client payments still due</span></button><button class="stat ${att.length?"hot":""}" data-act="plScroll" data-k="plAtt"><b>${att.length}</b><span>Need your attention</span></button></div>
 <div class="row"><button class="btn sm primary" data-act="plJump" data-k="clients">Add a client</button><a class="btn sm" href="${esc(nu)}">New event</a><button class="btn sm" data-act="plJump" data-k="pkg">Packages and invoices</button><button class="btn sm" data-act="plJump" data-k="data">Import clients</button></div></section>
${plSetupCard()}
 <section class="card stack" id="plAtt"><h3>Needs your attention</h3>${att.length?`<div class="stack tight">${att.map(([t,id,s])=>`<div class="row between small clrow"><span class="mw0">${t}</span>${id?`<button class="btn xs" data-act="plJump" data-k="clients" data-m="${esc(id)}" data-s="${s}">Open</button>`:`<button class="btn xs" data-act="plJump" data-k="${s}">Open</button>`}</div>`).join("")}</div>`:'<p class="small muted m0">You\'re all caught up.</p>'}
 ${waitAp?`<span class="small muted">Waiting on clients: ${waitAp} approval${waitAp===1?"":"s"} they haven't answered yet.</span>`:""}</section>
 <section class="card stack"><div class="row between"><h3>This week</h3><button class="btn xs" data-act="plJump" data-k="cal">Calendar</button></div>${week.length?`<div class="stack tight">${week.slice(0,12).map(plCalRow).join("")}</div>${week.length>12?`<span class="small muted">and ${week.length-12} more on the calendar</span>`:""}`:'<p class="small muted m0">Nothing due in the next seven days.</p>'}</section>`}
function plCal(){const items=plCalItems(),by={};items.forEach(x=>(by[x.date]=by[x.date]||[]).push(x));
 const today=mateToday(),ym=L.calYM||today.slice(0,7),[y,m]=ym.split("-").map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),lead=first.getDay();
 const sel=L.calSel&&L.calSel.slice(0,7)===ym?L.calSel:(ym===today.slice(0,7)?today:ym+"-01"),cells=[];for(let i=0;i<lead;i++)cells.push("<div></div>");
 for(let d=1;d<=days;d++){const ds=`${ym}-${String(d).padStart(2,"0")}`,l=by[ds]||[],kinds=Object.keys(CAL_K).filter(k=>l.some(x=>x.kind===k));
  cells.push(`<button class="calday${ds===today?" today":""}${ds===sel?" sel":""}" data-act="calSel" data-k="${ds}" aria-label="${esc(clFmtDate(ds))}, ${l.length} item${l.length===1?"":"s"}"><span>${d}</span><i>${kinds.map(k=>`<b class="cd-${k}"></b>`).join("")}</i></button>`)}
 const dayL=by[sel]||[],up=items.filter(x=>x.date>=today&&x.date<=clDays(14));
 return `<section class="card stack"><div class="row between"><button class="btn sm" data-act="calMove" data-k="-1" aria-label="Previous month">‹</button><h2 class="m0">${esc(first.toLocaleDateString(undefined,{month:"long",year:"numeric"}))}</h2><button class="btn sm" data-act="calMove" data-k="1" aria-label="Next month">›</button></div>
 <div class="calgrid">${["S","M","T","W","T","F","S"].map(x=>`<div class="calhd">${x}</div>`).join("")}${cells.join("")}</div>
 <div class="row small muted">${Object.keys(CAL_K).map(k=>`<span><b class="cd-${k} caldot"></b> ${CAL_K[k][1]}</span>`).join("")}</div><div class="row">${ym!==today.slice(0,7)?`<button class="btn xs" data-act="calMove" data-k="0">Back to today</button>`:""}<button class="btn xs" data-act="calIcs">📥 Add to my calendar app</button></div><span class="small muted">Downloads everything here as a file that Google, Apple and Outlook calendars open. Download it again after you add new dates.</span></section>
 <section class="card stack"><h3>${esc(clFmtDate(sel))}</h3>${dayL.length?`<div class="stack tight">${dayL.map(plCalRow).join("")}</div>`:'<p class="small muted m0">Nothing on this day.</p>'}</section>
 <section class="card stack"><h3>Next two weeks</h3>${up.length?`<div class="stack tight">${up.map(plCalRow).join("")}</div>`:'<p class="small muted m0">Nothing in the next two weeks.</p>'}</section>`}
function plPkgTab(){const cs=D.clients||{},all=[];Object.keys(cs).forEach(id=>invList(id).forEach(x=>all.push({id,x,st:invStatus(id,x)})));
 all.sort((a,b)=>(a.st==="Paid")-(b.st==="Paid")||String(a.x.due||"").localeCompare(String(b.x.due||"")));
 const sum=l=>l.reduce((n,o)=>n+(+o.x.total||0),0),open=all.filter(a=>a.st!=="Paid"),od=all.filter(a=>a.st==="Overdue").length;
 return pkCard()+`<section class="card stack"><h3>Invoices</h3>${all.length?`<div class="row between small"><span>Open <b>${clMoney(sum(open))}</b></span><span>Paid <b>${clMoney(sum(all.filter(a=>a.st==="Paid")))}</b></span>${od?`<span class="bad">${od} overdue</span>`:""}</div>
  <div class="stack tight">${all.map(({id,x,st})=>`<div class="mrow2 small"><div class="row between"><span class="mw0"><b>${esc(x.no)}</b> · ${esc((cs[id]||{}).name||"")} · ${clMoney(x.total)}</span><span class="pill ${st==="Paid"?"ok":st==="Overdue"?"warn":""}">${st}</span></div><div class="row"><span class="muted">${x.due?"due "+esc(mateDue(x.due)):"due on receipt"}</span><button class="btn xs" data-act="plJump" data-k="clients" data-m="${esc(id)}" data-s="money">Open client</button><button class="btn xs" data-act="invView" data-m="${esc(id)}" data-k="${esc(x.k)}">Print or PDF</button></div></div>`).join("")}</div>`:'<p class="small muted m0">No invoices yet.</p>'}
  <p class="small muted m0">To send an invoice or add a package to a client, open the client and tap Money.</p></section>`}
function plTplTab(){const nu=baseURL()+"?"+(window.__HMPDEMO?"pdemo=1&":"")+"planner=1";
 return `<section class="card stack"><h2>Ready-made events</h2><p class="small muted m0">Start a new event with its look, moments, games and a timed run of show already set up. You can change anything after you pick one.</p>
 <div class="stack tight">${Object.keys(EVENT_TEMPLATES).map(k=>{const t=EVENT_TEMPLATES[k],c=t.colors,g=Object.values(Object.assign({},ALL_GAMES_ON,t.games||{})).filter(Boolean).length;
  return `<div class="clrow stack tight"><div class="row" style="gap:4px">${[c.ground,c.btn1,c.rose,c.gold,c.leaf].map(x=>`<span style="width:22px;height:22px;border-radius:6px;background:${x};border:1px solid rgba(0,0,0,.15);display:inline-block"></span>`).join("")}</div>
  <div><b>${esc(t.name)}</b> <span class="pill">${esc(EVENT_TYPES[t.type].label)}</span></div><div class="small muted">${esc(t.about)}</div><div class="small muted">${t.moments.length} moments · ${g} games · ${t.ros.length}-step run of show</div>
  <a class="btn xs as" href="${esc(nu+"&tpl="+k+"#new")}">Create an event from this</a></div>`}).join("")}</div></section>`+clTplCard()}
function plDataTab(){const n=Object.keys(D.clients||{}).length;
 return imCard()+`<section class="card stack"><h2>Export</h2><p class="small muted m0">Download everything in Host Mode as one spreadsheet, with a tab each for clients, vendors, inventory, pull lists, venue spaces, bookings, blocked days, packages, payments, invoices, teammate shifts and leads. It opens in Excel, Google Sheets or Numbers, and you can upload it back here. To export one client with their files, open them in Clients and tap Export.</p><div class="row"><button class="btn primary" data-act="exAll">Download everything</button>${n?`<button class="btn" data-act="clExportAll">Just the ${n} client${n===1?"":"s"}</button>`:""}</div></section>`}
function plSettings(){const me=D.plMe||{},st=D.invSet||{},fld=(k,l,v,ph,tp,mx)=>`<label class="stack tight"><span class="small">${l}</span><input type="${tp||"text"}" data-draft="${k}" maxlength="${mx||80}" value="${esc(dv(k,v||""))}" placeholder="${esc(ph||"")}"></label>`;
 return `<section class="card stack"><h2>Your profile</h2><div class="grid2 g8">${fld("se_name","Your name",me.name,"Claire Moran","text",40)}${fld("se_biz","Business name",me.biz,"Northlight Events","text",60)}${fld("se_email","Your email",me.email,"you@yourbusiness.com","email",120)}${fld("se_phone","Your phone",me.phone,"704-555-0100","tel",30)}</div>
 <button class="btn primary as" data-act="seSave">Save profile</button><span class="small muted">What clients see (logo, colors, contact details) is set in Branding.</span></section>
 <section class="card stack"><h2>Invoices</h2><div class="grid2 g8"><label class="stack tight"><span class="small">Next invoice number</span><input type="text" inputmode="numeric" data-draft="se_next" value="${esc(dv("se_next",String(st.next||1001)))}"></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">How to pay (shown on every invoice)</span><textarea rows="2" data-draft="se_pay" maxlength="400" placeholder="Zelle to pay@yourbusiness.com, or pay by card at yourbusiness.com/pay">${esc(dv("se_pay",st.pay||""))}</textarea></label></div>
 <button class="btn primary as" data-act="seInv">Save invoice settings</button><span class="small muted">Your next invoice will be ${esc(invNo())}.</span></section>
 ${plMultiSection()}
 <section class="card stack"><h2>Your account</h2>${L.user&&L.user.email?`<p class="small muted m0">Signed in as ${esc(L.user.email)}</p>`:""}${me.code&&me.code!=="OWNER"&&me.code!=="DEMO"?`<p class="small muted m0">Planner code: ${esc(me.code)}</p>`:""}
 ${window.__HMPDEMO?`<p class="small muted m0">This is the demo, so there's nothing to sign out of.</p>`:`<button class="btn as" data-act="acOut">Sign out</button>`}</section>`}
/* a host's Settings: their name and contact details, and their account (no business, invoice or window settings) */
function hostSettings(){const me=D.plMe||{},fld=(k,l,v,ph,tp,mx)=>`<label class="stack tight"><span class="small">${l}</span><input type="${tp||"text"}" data-draft="${k}" maxlength="${mx||80}" value="${esc(dv(k,v||""))}" placeholder="${esc(ph||"")}"></label>`;
 return `<section class="card stack"><h2>Your profile</h2><div class="grid2 g8">${fld("se_name","Your name",me.name,"Tasha Green","text",40)}${fld("se_email","Your email",me.email,"you@example.com","email",120)}${fld("se_phone","Your phone",me.phone,"704-555-0100","tel",30)}</div>
 <button class="btn primary as" data-act="seSave">Save profile</button></section>
 <section class="card stack"><h2>Your account</h2>${L.user&&L.user.email?`<p class="small muted m0">Signed in as ${esc(L.user.email)}. Use this email and your password to sign in on any phone or computer.</p>`:""}
 ${window.__HMPDEMO||window.__HMDEMO?`<p class="small muted m0">This is the demo, so there's nothing to sign out of.</p>`:`<div class="row"><button class="btn" data-act="hostPwReset">Change my password</button><button class="btn" data-act="acOut">Sign out</button></div>`}</section>`}
ACT.hostPwReset=async()=>{const a=AUTH(),em=L.user&&L.user.email;if(!a||!em)return toast("Sign in first");try{await a.sendPasswordResetEmail(em);toast("We sent a link to "+em+" to choose a new password")}catch(e){toast(authErr(e))}};
/* ---- multi-window mode: pop planner modules into their own windows (for desktops with more than one monitor) ---- */
const PL_PW=(()=>{const k=QS.get("pw")||"";return PL_TABS.some(t=>t[0]===k)?k:""})();
if(PL_PW)L.plTab=PL_PW;
const plMultiOn=()=>!!store.get("plMulti",false);
const plDesktop=()=>window.matchMedia&&matchMedia("(pointer:fine)").matches&&window.innerWidth>=900;
const plTabLabel=k=>(plTabsNow().find(t=>t[0]===k)||PL_TABS.find(t=>t[0]===k)||[])[1]||"";
async function plPopOut(k){const u=new URL(location.href);u.searchParams.set("pw",k);
 let f="popup,width=1200,height=860";
 if(store.get("plScreen",false)&&"getScreenDetails" in window){try{const sd=await getScreenDetails(),cur=sd.currentScreen,o=sd.screens.find(x=>x!==cur);
  if(o)f=`popup,left=${o.availLeft+40},top=${o.availTop+40},width=${Math.min(1400,o.availWidth-80)},height=${Math.min(1000,o.availHeight-80)}`}catch(e){}}
 const w=window.open(u.toString(),"hm_"+k,f);if(!w)toast("Your browser blocked the window. Allow pop-ups for this site, then try again.");else try{w.focus()}catch(e){}}
function plMultiSection(){const on=plMultiOn(),scr="getScreenDetails" in window;
 return `<section class="card stack"><h2>Multi-window mode</h2><p class="small muted m0">For computers with more than one monitor. Pop any module, like Clients or Calendar, into its own window and move it to another screen. Every window stays in sync as you work.</p>
 <div class="row between small"><span>Multi-window mode</span><button class="toggle tg-sm" data-act="plMultiToggle" aria-pressed="${on}"><span>${on?"On":"Off"}</span><i></i></button></div>
 ${on&&!plDesktop()?'<p class="small muted m0">This works best on a computer. On a phone or tablet, modules open in new tabs.</p>':""}
 ${on&&scr?`<div class="row between small"><span>Open new windows on my other monitor<span class="db muted">Your browser asks once for permission to see your screens.</span></span><button class="toggle tg-sm" data-act="plScreenToggle" aria-pressed="${!!store.get("plScreen",false)}"><span>${store.get("plScreen",false)?"On":"Off"}</span><i></i></button></div>`:""}
 ${on?`<div class="stack tight"><span class="small"><b>Open a module in its own window</b></span><div class="row small">${PL_TABS.filter(t=>t[0]!=="set").map(([k,l])=>`<button class="btn xs" data-act="plPop" data-k="${k}">${esc(l)}</button>`).join("")}</div><p class="small muted m0">You'll also see a <b>Pop out</b> button at the top of each module.</p></div>`:""}</section>`}
Object.assign(ACT,{
 plMultiToggle:()=>{store.set("plMulti",!plMultiOn());render()},
 plScreenToggle:async()=>{const on=!store.get("plScreen",false);if(on&&"getScreenDetails" in window){try{await getScreenDetails()}catch(e){return toast("Your browser didn't allow it. You can still drag windows to another monitor.")}}store.set("plScreen",on);render()},
 plPop:el=>plPopOut(el.dataset.k),
 plPopClose:()=>{try{window.close()}catch(e){}setTimeout(()=>toast("Close this window from your browser"),300)}
});

/* ---- privacy requests: find everything a planner holds about one person, and delete it on request ----
   Looks in clients, inquiries, vendors and the guest lists of the planner's events. The log keeps only
   when it happened and how many records went, never who, so the request itself leaves nothing behind. */
D.pvHits=null;
async function pvSearch(q){q=normName(q);if(q.length<3)return toast("Type at least 3 letters of a name, an email or a phone number");const hit=s=>normName(s).includes(q),out=[];
 Object.keys(D.clients||{}).forEach(id=>{const c=D.clients[id];if([c.name,c.email,c.phone].some(hit))out.push({kind:"client",id,label:c.name,detail:"Client"+(c.evName?" · "+c.evName:"")})});
 inqList().forEach(x=>{if([x.name,x.email,x.phone].some(hit))out.push({kind:"inquiry",id:x.k,label:x.name,detail:"Inquiry from your form · "+(x.email||"")})});
 Object.keys(D.cven||{}).forEach(cid=>Object.keys(D.cven[cid]||{}).forEach(vk=>{const v=D.cven[cid][vk];if(v&&[v.name,v.email,v.phone].some(hit))out.push({kind:"vendor",id:cid+"|"+vk,label:v.name,detail:"Vendor for "+((D.clients||{})[cid]||{}).name})}));
 for(const ev of Object.keys(D.events||{})){try{const g=(await ER("guests",ev).once("value")).val()||{};Object.keys(g).forEach(k=>{if(g[k]&&hit(g[k].name))out.push({kind:"guest",id:ev+"|"+k,label:g[k].name,detail:"Guest at "+(D.events[ev].name||ev)})})}catch(e){}}
 D.pvHits=out;render(true)}
function privacyCard(){const hits=D.pvHits;
 return `<section class="card stack"><h3>Privacy requests</h3><p class="small muted m0">If someone asks you to delete their information, search for them here. You'll see everything you hold about them: client records, inquiries, vendor entries and guest lists.</p>
 <div class="row"><input type="search" class="grow" data-draft="pv_q" value="${esc(dv("pv_q",""))}" placeholder="Name, email or phone" aria-label="Who asked"><button class="btn sm" data-act="pvFind">Search</button></div>
 ${hits?hits.length?`<div class="stack tight">${hits.map((h,i)=>`<div class="row between small clrow"><span class="mw0"><b>${esc(h.label||"")}</b><span class="db muted">${esc(h.detail)}</span></span><button class="btn xs" data-act="pvDel" data-i="${i}">${L.confirm==="pv"+i?"Tap again to delete for good":"Delete"}</button></div>`).join("")}</div>
  <span class="small muted">Deleting a client also removes their checklist, messages, files, payments and portal link.</span>`:'<p class="small muted m0">Nothing found.</p>':""}</section>`}
Object.assign(ACT,{
 pvFind:()=>pvSearch(dv("pv_q","")),
 pvDel:async el=>{const i=+el.dataset.i,h=(D.pvHits||[])[i];if(!h)return;if(L.confirm!=="pv"+i){L.confirm="pv"+i;return render(true)}L.confirm=null;
  if(h.kind==="client")await Promise.all(IM_CL_PATHS.map(p=>RT(PSP+p+"/"+h.id).remove()));
  else if(h.kind==="inquiry")await RT(PSP+"inquiries/"+h.id).remove();
  else if(h.kind==="vendor"){const [cid,vk]=h.id.split("|"),v=((D.cven||{})[cid]||{})[vk]||{};await RT(PSP+`clientVendors/${cid}/${vk}`).remove();if(v.tok)await RT(PSP+"vcheck/"+v.tok).remove().catch(()=>{})}
  else if(h.kind==="guest"){const [ev,k]=h.id.split("|");await ER("guests/"+k,ev).remove()}
  await RT(PSP+"privacyLog").push().set({t:Date.now(),kind:h.kind});D.pvHits.splice(i,1);toast("Deleted");render(true)}
});
