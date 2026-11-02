/* ================= WIRING: guest/moderator tabs, home cards, checklist, tour, hints, privacy, print ================= */
function player(){
 if(L.me&&L.playersLoaded&&!D.players[L.me]){L.profiles=L.profiles.filter(i=>D.players[i]);store.set("profiles_"+EV,L.profiles);L.me=L.profiles[0]||null;store.set("active_"+EV,L.me);watchMine()}
 if(!L.me||L.joining)return `<div class="phone">${status()}${joinScreen()}</div>`;
 if(!D.players[L.me])return `<div class="phone">${loadingView()}</div>`;
 const A=st().announce,seen=store.get("ann_"+EV,0);
 const ann=A&&A.t>seen?`<div class="banner"><span>${esc(A.text)}</span><button class="btn sm" data-act="dismiss">${t("OK")}</button></div>`:"";
 const map={home:pHome,live:pLive,hunt:pHunt,photos:pAlbum,board:pBoard,me:pProfile,menu:pMenu,duo:pDuo,party:pParty};
 const body=(map[L.ptab]||pHome)();
 const back=["menu","duo","party"].includes(L.ptab)?`<button class="btn sm as" data-act="ptab" data-k="home">← ${t("Home")}</button>`:"";
 const tab=(k,l,i)=>`<button data-act="ptab" data-k="${k}" aria-pressed="${L.ptab===k}">${ic(i)}${l}</button>`;
 return `<div class="phone">${status()}${ann}${back}${body}<nav class="tabs">${tab("home",t("Home"),"home")}${tab("live",t("Live game"),"play")}${tab("hunt",t("Hunt"),"hunt")}${tab("photos",t("Photos"),"photo")}${tab("board",t("Leaders"),"board")}</nav></div>`}
const _pHome0=pHome;
pHome=function(){const h=_pHome0();if(st().ended)return h;const cards=homeCards();if(!cards)return h;const at=h.indexOf('<section class="card stack"><h3>');return at>=0?h.slice(0,at)+cards+h.slice(at):h+cards};
function homeCards(){let out="";const m=menuCfg();
 if(m&&menuOn()){const mine=D.mine.order;out+=`<button class="card row between w100 tl" data-act="ptab" data-k="menu"><span><span class="eyebrow">${t("Menu")}</span><br><b>${esc(m.title||t("Menu"))}</b>${m.mode==="choose"?` <span class="muted small">· ${mine&&mine.t?t("Your order is saved"):m.locked?t("Orders are closed."):t("Choose your meal")}</span>`:""}</span><span aria-hidden="true">🍽️</span></button>`}
 if(duoOn()){const inv=duoIncoming().length;out+=`<button class="card row between w100 tl" data-act="ptab" data-k="duo"><span><span class="eyebrow">${t("Anytime")}</span><br><b>${t("Two-player games")}</b> <span class="muted small">· ${inv?`<span class="pill live">${t("{n} invites",{n:inv})}</span>`:t("Challenge someone, just for fun")}</span></span><span aria-hidden="true">🎲</span></button>`}
 if(partyOn())out+=`<button class="card row between w100 tl" data-act="ptab" data-k="party"><span><span class="eyebrow">${adultOn()?t("Party & 21+ games"):t("Party games")}</span><br><b>${t("Party games")}</b> <span class="muted small">· ${partyLiveName()?esc(partyLiveName()):t("See what's playing")}</span></span><span aria-hidden="true">🎉</span></button>`;
 return out}
function moderator(){
 const tab=(k,l)=>`<button data-act="mtab" data-k="${k}" aria-pressed="${L.mtab===k}">${l}</button>`;
 const body=({live:mLive,moments:mMoments,teams:mTeams,scores:mScores,content:mContent,custom:mCustom,event:mEvent,memories:mMemories,menu:mMenu,party:mParty}[L.mtab]||mLive)();
 const pr=D.meta&&D.meta.practice?`<div class="banner soft"><span><b>Practice run</b> with pretend guests. Open a <a href="${esc(eventURL(EV))}" target="_blank" rel="noopener">guest view</a> or the <a href="${esc(eventURL(EV,"screen"))}" target="_blank" rel="noopener">big screen</a> to see what they see.</span><button class="btn sm" data-act="endPractice">End practice</button></div>`:"";
 return `${status()}${pr}<div class="console"><nav class="side">${tab("live","Live")}${tab("moments","Moments")}${tab("teams","Teams")}${tab("scores","Scores")}${tab("content","Content")}${tab("menu","Menu")}${tab("party",adultOn()?"Party & 21+":"Party games")}${tab("custom","Custom games")}${tab("event","Event")}${tab("memories","Memories")}</nav><div class="stack mw0">${body}</div></div>`}

Object.assign(HINTS,{
 menu:"Show the menu on every guest's phone, typed or as a picture they can zoom. With Guests choose, each guest picks from your groups (up to the number you set) and can add a note like an allergy. You get live counts and a kitchen list, and can lock orders when the kitchen needs them.",
 music:"Upload a song for a moment. It fades in on the TV when the moment starts and fades out when you take it off. Songs aren't included in saved archives or backups.",
 party:"Party games are quick group games for everyone, with points or silly forfeits. 21+ versions are drinking games, switched on by the administrator, and only guests who confirm they're 21 or older can play.",
 duo:"Guests can challenge each other to the nine two-player games any time from their phones. These are just for fun and don't add points. When you start a live game, it takes priority on every phone."});
function setupSteps(){const s=(D.meta&&D.meta.setup)||{},c=C();
 return [
  {k:"details",done:!!s.details,label:"Add the event details",go:"event",tip:"Event tab: title, guests of honor and date, then Save details."},
  {k:"pin",done:!!s.pin||!s.reset&&!!Object.keys(D.mods||{}).length,label:"Add your moderators",go:"event",tip:"Event tab → Moderators. Give each teammate their own PIN. You can remove anyone at any time."},
  {k:"content",done:!!s.content,label:"Review the games and questions",go:"content",tip:"Content tab. Edit questions or use Get ideas with AI."},
  {k:"moments",done:!!s.moments,label:"Plan the moments",go:"moments",tip:"Moments tab. Add photos and songs, set up the reveal and check the evening order."},
  {k:"menu",done:!!s.menu,label:"Set up the menu (optional)",go:"menu",tip:"Menu tab. Type it or upload a picture, and choose a fixed menu or let guests choose."},
  {k:"practice",done:!!s.practice,label:"Do a practice run",go:"event",tip:"Event tab → Start a practice run, then try every button."},
  {k:"share",done:!!s.share,label:"Print the kit or share the link",go:"print",tip:"Printable kit has the door sign, cheat sheet, answer key and kitchen list."}]}
(function(){const i=TOUR.findIndex(x=>/k=custom/.test(x.sel));const add=[{sel:'[data-act=mtab][data-k=menu]',title:"Menu",text:"Show the menu on guests' phones, or let them choose their meal and add notes. You get counts and a kitchen list."},
 {sel:'[data-act=mtab][data-k=party]',title:"Party games",text:"Quick group games with points or silly forfeits. The 21+ drinking versions appear here once the administrator turns them on."}];TOUR.splice(i<0?TOUR.length:i,0,...add);
 const ev=TOUR.find(x=>/k=event/.test(x.sel));if(ev)ev.text="Details, colors and fonts, picture, moderators, links, the printable kit and practice runs. To start a different event, use Start a new event."})();
const _privacy0=privacyText;
privacyText=function(){return _privacy0().replace("<h4>How it's used</h4>",`<h4>Meal choices and notes</h4><p>If the host turns on the menu, your meal picks and any note you add (for example an allergy or "no onions") are shared with the host, moderators and kitchen so they can prepare your food. Only add health details you're comfortable sharing.</p>
<h4>Party and 21+ games</h4><p>If you confirm you're 21 or older to play 21+ games, that confirmation and your game activity (including sip counts) are stored with the event.</p>
<h4>Event records</h4><p>The host may keep a saved record of the event after the party (names, scores, wishes, meal orders and game results) and may download a backup copy. Songs and the photo album aren't part of that record. Ask the host if you'd like your details removed.</p>
<h4>How it's used</h4>`)};
const _print0=printView;
printView=function(){let h=_print0();const m=menuCfg();if(!m||m.mode!=="choose")return h;
 h=h.replace(`${'<label class="row small"><input type="checkbox" data-act="printSel" data-k="wishes"'}`,`<label class="row small"><input type="checkbox" data-act="printSel" data-k="kitchen" ${L.printSel.kitchen?"checked":""}> Kitchen list</label><label class="row small"><input type="checkbox" data-act="printSel" data-k="wishes"`);
 if(L.printSel.kitchen)h+=`<div class="sheetp"><div class="tc"><div class="eyebrow">${esc(C().title||"")}</div><h2>Kitchen list</h2></div>${kitchenCounts()}${kitchenTable()}</div>`;return h};
function kitchenCounts(){const m=menuCfg();const orders=D.orders||{};const counts=m.groups.map(g=>g.items.map(()=>0));Object.values(orders).forEach(o=>{const p=o.picks||{};Object.keys(p).forEach(gi=>arr(p[gi]).forEach(ii=>{if(counts[gi]&&counts[gi][ii]!=null)counts[gi][ii]++}))});
 return `<div class="grid2 g8">${m.groups.map((g,gi)=>`<div><h3>${esc(g.name)}</h3>${g.items.map((it,ii)=>`<div class="row between small"><span>${esc(it.n)}</span><b>${counts[gi][ii]}</b></div>`).join("")}</div>`).join("")}</div><p class="small">${Object.keys(orders).length} orders</p>`}

/* ================= ANYTIME TWO-PLAYER GAMES (guest portal, no moderator, no points) ================= */
const DUO={parsed:{},busy:false,q:[]};
const duoOn=()=>C().duoOff!==true&&!st().ended;
const duoCode=k=>DUEL_SRC.framework+"\n"+DUEL_SRC[k];
function duoState(k){const r=(D.anytime||{})[k];if(!r||!r.state)return null;const c=DUO.parsed[k];if(c&&c.v===r.v)return c.s;let s=null;try{s=JSON.parse(r.state)}catch(e){}DUO.parsed[k]={v:r.v,s};return s}
function duoMine(k){const s=duoState(k);if(!s||!L.me)return {};const id=s.playing&&s.playing[L.me];const m=id&&s.matches[id];return {inv:s.invites&&s.invites[L.me]?s.invites[L.me]:null,match:m&&!m.done?m:null,wait:!!(s.waiting&&s.waiting[L.me])}}
function duoIncoming(){return BUILTIN_GAMES.map(g=>g[0]).filter(k=>duoMine(k).inv)}
function duoCtx(){const pl=ids().filter(i=>!P(i).bot).map(i=>({id:i,name:P(i).name,team:teamOf(i),teamName:teamName(teamOf(i)),avatar:(P(i).av||{}).e||"",photo:(P(i).av||{}).img||""}));
 return {settings:{points:0,drawPoints:0,showFlyer:true},players:pl,teams:{A:teamName("A"),B:teamName("B")},theme:{image:C().image||"",title:C().title||""},me:L.me,role:"player",now:now()}}
function pDuo(){if(!duoOn())return `<div class="card muted">${t("Two-player games are closed right now.")}</div>`;
 const live=st().live?gameById(st().live):null;const k=L.duoGame;
 const head=live?`<div class="banner"><span>${t("A live game is on")}: <b>${esc(gname(live))}</b>. ${t("Play it first. Your match will wait.")}</span><button class="btn sm" data-act="ptab" data-k="live">${t("Go")}</button></div>`:"";
 if(!k){return `${head}<section class="card stack"><div class="eyebrow">${t("Anytime")}</div><h2>${t("Two-player games")}</h2><p class="small muted m0">${t("Pick a game, then choose a partner or play someone random. Just for fun, no points.")}</p>
  <div class="duogrid">${BUILTIN_GAMES.map(([gk,name,desc])=>{const m=duoMine(gk);const badge=m.inv?`<span class="pill live">${t("Invite from {n}",{n:esc(P(m.inv).name)})}</span>`:m.match?`<span class="pill ok">${t("In a match")}</span>`:m.wait?`<span class="pill">${t("Waiting")}</span>`:"";
   return `<button class="duocard" data-act="duoPick" data-k="${gk}"><b>${esc(t(name))}</b><span class="small muted">${esc(t(desc))}</span>${badge}</button>`}).join("")}</div></section>`}
 const name=(BUILTIN_GAMES.find(g=>g[0]===k)||[k,k])[1];
 return `${head}<div class="row between"><button class="btn sm" data-act="duoPick" data-k="">← ${t("All games")}</button><b>${esc(t(name))}</b></div>${duoState(k)?`<div class="cgph" data-slot="duo"></div>`:`<div class="card muted">${t("Setting up the game…")}</div>`}<p class="small muted tc">${t("Just for fun. These games don't change the leaderboard.")}</p>`}
function duoUpdate(){if(VIEW!=="guest")return;const k=L.ptab==="duo"&&duoOn()?L.duoGame:null;
 if(!k||!L.me||!D.players[L.me]){if(CG.frames.duo)CG.frames.duo.box.style.display="none";return}
 const s=duoState(k);if(!s){duoInit(k);return}
 const f=getFrame("duo","player",duoCode(k));f.onAct=a=>duoAct(k,a);f.onError=m=>{console.warn("duo",m);};f.duoKey=k;f.render(s,duoCtx());syncFrames()}
async function duoInit(k){if(DUO.init===k||!db)return;DUO.init=k;try{const f=getFrame("duo","player",duoCode(k));const r=await f.call("setup",{state:{},ctx:duoCtx()});
  if(r.ok)await ER("anytime/"+k).transaction(cur=>cur&&cur.state?undefined:{state:JSON.stringify(r.state),v:1})}catch(e){console.warn(e)}DUO.init=null;renderSoon()}
function duoAct(k,a){if(!a||!a.type||!L.me)return;DUO.q.push({k,a:Object.assign({},a,{from:L.me,name:P(L.me).name,team:teamOf(L.me)})});duoPump()}
async function duoPump(){if(DUO.busy)return;const job=DUO.q.shift();if(!job)return;DUO.busy=true;buzz(20);
 try{const f=CG.frames.duo;if(!f||f.duoKey!==job.k)throw new Error("frame gone");
  for(let tries=0;tries<6;tries++){const snap=(await ER("anytime/"+job.k).once("value")).val();if(!snap||!snap.state)break;let cur;try{cur=JSON.parse(snap.state)}catch(e){break}
   const ctx=duoCtx();ctx.now=now();const r=await f.call("action",{state:cur,action:job.a,ctx});if(!r.ok){console.warn(r.error);break}if(!r.changed)break;
   const out=await ER("anytime/"+job.k).transaction(c=>{if(!c||c.v!==snap.v)return;return {state:JSON.stringify(r.state),v:(snap.v||0)+1}});
   if(out&&out.committed)break;await new Promise(z=>setTimeout(z,80+Math.random()*200))}}
 catch(e){console.warn(e)}DUO.busy=false;if(DUO.q.length)duoPump()}
Object.assign(ACT,{duoPick:el=>{L.duoGame=el.dataset.k||null;render(true);window.scrollTo({top:0})},
 duoToggle:()=>ER("content/duoOff").set(!(C().duoOff===true)),
 duoReset:el=>{const k=el.dataset.k;if(L.confirm!=="duoReset"+k){L.confirm="duoReset"+k;render(true);return}L.confirm=null;ER("anytime/"+k).remove().then(()=>toast("Reset"))}});
function duoModPanel(){const any=D.anytime||{};return `<section class="card stack"><div class="row between"><h2>Anytime two-player games ${hint("duo")}</h2><button class="toggle tg-sm" data-act="duoToggle" aria-pressed="${C().duoOff!==true}"><span>${C().duoOff!==true?"On":"Off"}</span><i></i></button></div>
 <p class="small muted m0">Guests find these on their Home screen and play with anyone, any time. No points. Your live games always come first.</p>
 <div class="stack tight">${BUILTIN_GAMES.map(([k,name])=>{const s=duoState(k);const ms=s?Object.values(s.matches||{}):[];const act=ms.filter(m=>!m.done).length,done=ms.filter(m=>m.done).length;
  return `<div class="row between small"><span><b>${esc(name)}</b> · ${act} playing now · ${done} finished</span>${s?(L.confirm==="duoReset"+k?`<span class="row"><button class="btn xs gold" data-act="duoReset" data-k="${k}">Yes, reset</button><button class="btn xs" data-act="cancelConfirm">No</button></span>`:`<button class="btn xs" data-act="duoReset" data-k="${k}">Reset</button>`):""}</div>`}).join("")}</div></section>`}

/* ================= PARTY & 21+ GAMES (app side) ================= */
const PARTY_LIST=[["mlt","Most Likely To","Most Likely To","Vote for who in the room is most likely to do it."],["tod","Truth or Drink","Truth or Forfeit","One guest answers a truth question, or takes the penalty."],
 ["kings","Kings Cup","King's Deck","Draw cards, follow the rule on each one."],["hol","Higher or Lower","Higher or Lower","Guess if the next card is higher or lower."],["hot","Hot Seat","Hot Seat","Guess how the guest in the hot seat will answer."],
 ["roulette","Drink Roulette","Party Roulette","Spin the wheel and do what it says."],["ttl","Two Truths and a Lie","Two Truths and a Lie","Spot the lie."],["trivia","Trivia Shots","Quick Trivia","Fast trivia. Wrong answers take the hit."],
 ["wyr","Would You Rather","Would You Rather","Pick a side. The smaller side takes the hit."],["paranoia","Paranoia","Paranoia","A secret question answered with a name."],["bomb","Pass the Bomb","Pass the Bomb","Name one, pass it fast, before it goes off."],
 ["survey","Survey Says","Survey Says","Guess the top answers from the survey board."],["spin","Spin and Solve","Spin and Solve","Letters appear one at a time. Solve it first."],["deal","Deal or Drink","Lucky Cases","Open cases and take the banker's deal, or don't."],
 ["bingo","Watch-along Bingo","Watch-along Bingo","Mark squares as they happen on a show or movie."],["cwgo","Closest Without Going Over","Closest Without Going Over","Guess the number without going over."],
 ["rlgl","Red Light, Green Light","Red Light, Green Light","Tap RUN as late as you dare before the red light."],["owc","One-Word Clue","One-Word Clue","Guess the secret word from one-word clues."],["sixty","60-Second Challenge","60-Second Challenge","Quick Draw and Perfect Five, one tap each."]];
const adultOn=()=>C().adultOn===true;
const partyGid=(k,m)=>"p_"+k+"_"+m;
const partyInstalled=()=>Object.keys(cgAll()).filter(id=>cgAll()[id].party);
const partyOn=()=>partyInstalled().length>0||adultOn();
const liveParty=()=>{const g=liveCg()&&cgGame(liveCg());return g&&g.party?g:null};
const partyLiveName=()=>{const g=liveParty();return g?g.name:""};
const partyCode=(k,m)=>`var PARTY_MODE=${JSON.stringify(m)};\n`+PARTY_SRC.framework+"\n"+PARTY_SRC[k];
const isAdult=id=>!!(P(id).adult||P(id).bot&&D.meta&&D.meta.practice);

/* the live engine, aware of 21+ games */
function cgCtx(me,role,players){const g=cgGame(liveCg());const adult=!!(g&&g.adult);const set=Object.assign({},cgSettings(g));if(g&&g.party){set._paused=adult&&!!st().waterBreak;set._hideSips=!!C().hideSips}
 return {settings:set,players:players||ids().filter(i=>!adult||isAdult(i)).map(i=>({id:i,name:P(i).name,team:teamOf(i),teamName:teamName(teamOf(i)),avatar:(P(i).av||{}).e||"",photo:(P(i).av||{}).img||"",bot:!!P(i).bot})),teams:{A:teamName("A"),B:teamName("B")},theme:{image:C().image||"",title:C().title||""},me:me||null,role,now:now()}}
async function cgCommit(gid,r,force){if(!r.ok){cgReportError({where:r.where,message:r.error,gid});return}const g=cgGame(gid)||{};
 if(r.changed||force){CG.liveState=r.state;await ER(`cg/${gid}/state`).set(JSON.stringify(r.state));feedFrames()}
 (r.effects||[]).forEach(fx=>{if(fx.t==="award"&&D.players[fx.id])award([fx.id],fx.pts,teamOf(fx.id),fx.pts);else if(fx.t==="team")ER("team/"+fx.team).transaction(v=>(v||0)+fx.pts);else if(fx.t==="celebrate")setState({celebrate:{text:fx.text,t:now()}});
  else if(fx.t==="sip"&&g.adult&&D.players[fx.id]&&isAdult(fx.id))ER("sips/"+fx.id).transaction(v=>(v||0)+(fx.n||1))})}
const _pLive0=pLive;
pLive=function(){const g=liveParty();if(g&&g.adult&&!isAdult(L.me))return `<div class="row between"><div><span class="eyebrow">${t("Live game")}</span><h2>${esc(g.name)}</h2></div><span class="pill live"><span class="dot"></span>${t("Live")}</span></div>${adultGate(true)}`;return _pLive0()};
function houseRules(){return `<ul class="small m0 rules21"><li>${t("Drinking is always optional. A sip of anything counts: water, soda or a mocktail.")}</li><li>${t("Pace yourself. Take the water breaks.")}</li><li>${t("Plan your ride home before you play.")} 🚗</li></ul>`}
function adultGate(live){if(!adultOn())return `<div class="card muted">${t("21+ games are off for this event.")}</div>`;
 return `<section class="card stack"><div class="eyebrow">21+</div><h2>${live?t("This is a 21+ game"):t("21+ games")}</h2><p class="small m0">${t("These are drinking games for guests 21 and older.")}</p>${houseRules()}
 <div class="row"><button class="btn primary" data-act="adultYes">${t("I'm 21 or older")}</button><button class="btn" data-act="ptab" data-k="home">${live?t("Sit this one out"):t("Not now")}</button></div></section>`}
function sipRows(n){const s=D.sips||{};const ks=Object.keys(s).filter(id=>D.players[id]&&s[id]>0).sort((a,b)=>s[b]-s[a]).slice(0,n||10);return ks.map((id,i)=>`<div class="row between"><span>${i===0?"👑 ":""}${av(id,22)} ${esc(P(id).name)}</span><b class="num">${s[id]}</b></div>`).join("")}
function pParty(){const g=liveParty();let h="";
 if(g)h+=`<button class="livebtn" data-act="ptab" data-k="live"><span><span class="pill live"><span class="dot"></span>${t("Live now")}</span><br><strong>${esc(g.name)}</strong></span>${ic("play")}</button>`;
 if(st().waterBreak&&adultOn())h+=`<div class="banner"><span>💧 ${t("Water break! Drinking games are paused.")}</span></div>`;
 h+=`<section class="card stack"><div class="eyebrow">${t("Party games")}</div><h2>${t("Party games")}</h2><p class="small muted m0">${t("The host starts these live. Your phone switches to the game automatically.")}</p></section>`;
 if(adultOn()){if(!isAdult(L.me))h+=adultGate(false);
  else{h+=`<section class="card stack"><div class="row between"><h2>21+</h2><span class="pill ok">${t("You're in")}</span></div>${houseRules()}<button class="btn sm as" data-act="adultNo">${t("Leave 21+ games")}</button></section>`;
   if(!C().hideSips){const rows=sipRows(10);h+=`<section class="card stack"><h2>${t("Most sips")}</h2><p class="small muted m0">${t("Most sips takes the crown. A sip of anything counts.")}</p>${rows||`<p class="small muted m0">${t("No sips yet.")}</p>`}</section>`}}}
 return h}
function partyUpdate(){if(VIEW!=="screen")return;let el=$("#wb");if(!el){el=document.createElement("div");el.id="wb";document.body.appendChild(el)}
 const show=st().showSips&&adultOn()&&!C().hideSips;const wb=st().waterBreak&&adultOn();const key=[show,wb,JSON.stringify(D.sips||{})].join("|");if(el.dataset.k===key)return;el.dataset.k=key;
 el.className=show?"wb on big":wb?"wb on":"wb";
 el.innerHTML=show?`<div class="wb-in"><div class="eyebrow">21+</div><div class="mo-title" style="font-size:clamp(2.4rem,7vw,5rem)">Most sips</div><div class="wb-list">${sipRows(10)||'<p>No sips yet.</p>'}</div><p class="small">A sip of anything counts · Plan your ride home 🚗</p></div>`:wb?`<div class="wb-pill">💧 Water break · drinking games are paused</div>`:""}

/* ---------- moderator: Party & 21+ tab ---------- */
function mParty(){markSetup("party");const on=adultOn(),inst=cgAll(),live=st().live;const s=D.sips||{};
 const row=([k,dn,pn,desc])=>{const btn=m=>{const gid=partyGid(k,m),g=inst[gid];if(!g)return L.partyBusy===gid?`<button class="btn sm" disabled>Adding…</button>`:`<button class="btn sm ${m==="drink"?"gold":""}" data-act="partyAdd" data-k="${k}" data-m="${m}">${m==="drink"?"Add 21+ version":"Add party version"}</button>`;
   return live==="c:"+gid?`<span class="pill live">Live</span>`:`<span class="row"><button class="btn sm primary" data-act="goLive" data-id="c:${gid}">Go live${m==="drink"?" (21+)":""}</button><button class="btn xs" data-act="partyDel" data-id="${gid}">Remove</button></span>`};
  return `<div class="gamerow evrow"><div class="mw0"><b>${esc(pn)}</b>${dn!==pn?` <span class="small muted">· 21+: ${esc(dn)}</span>`:""}<div class="small muted">${esc(desc)}</div></div><div class="row">${btn("party")}${on?btn("drink"):""}</div></div>`};
 return `<section class="card stack"><div class="row between"><h2>Party games ${hint("party")}</h2>${on?'<span class="pill ok">21+ is on</span>':'<span class="pill">21+ is off</span>'}</div>
 <p class="small muted m0">Add a game, then tap Go live (or start it from the Live tab). Party versions give points or silly forfeits and work at any event. You can change prompts and rounds under Custom games → Quick settings.</p>
 ${on?"":`<div class="banner soft"><span>21+ drinking versions are off for this event.${L.isAdmin?"":" The administrator can turn them on."}</span>${L.isAdmin?`<button class="btn sm" data-act="adultToggle" data-code="${esc(EV)}">Turn on 21+</button>`:""}</div>`}
 ${PARTY_LIST.map(row).join("")}</section>
 ${on?`<section class="card stack"><div class="row between"><h2>21+ controls</h2>${L.isAdmin?`<button class="btn sm" data-act="adultToggle" data-code="${esc(EV)}">Turn off 21+</button>`:""}</div>
 <p class="small muted m0">Only guests who tap <b>I'm 21 or older</b> on their phone can play the 21+ versions. Everyone else sees a friendly note and can sit it out.</p>
 <div class="row"><button class="btn ${st().waterBreak?"gold":"primary"}" data-act="waterBreak">${st().waterBreak?"End the water break":"💧 Water break"}</button><span class="small muted">Pauses every drinking game and shows a water reminder.</span></div>
 <div class="row"><button class="btn sm" data-act="sipsTv" ${C().hideSips?"disabled":""}>${st().showSips?"Hide the sips board from the TV":"Show the sips board on the TV"}</button>${L.isAdmin?`<label class="row small"><input type="checkbox" data-act="hideSips" ${C().hideSips?"checked":""}> Hide the sips leaderboard (admin)</label>`:""}</div>
 <h3>Most sips ${C().hideSips?'<span class="pill">hidden from guests</span>':""}</h3>${sipRows(10)||'<p class="small muted m0">No sips yet.</p>'}
 <p class="small muted m0">${(n=>n===1?"1 guest has":n+" guests have")(ids().filter(isAdult).length)} confirmed 21+.</p>
 ${L.isAdmin&&Object.keys(s).length?(L.confirm==="sipsReset"?`<div class="row"><span class="small">Clear every sip count?</span><button class="btn sm gold" data-act="sipsReset">Yes, clear</button><button class="btn sm" data-act="cancelConfirm">No</button></div>`:`<button class="btn sm as" data-act="sipsReset">Reset sip counts</button>`):""}</section>`:""}
 ${duoModPanel()}`}
Object.assign(ACT,{
 adultYes:()=>{if(!adultOn()||!L.me)return;ER("players/"+L.me+"/adult").set(true).then(()=>{toast(t("You're in for 21+ games"));render(true)})},
 adultNo:()=>{if(L.me)ER("players/"+L.me+"/adult").remove()},
 partyAdd:async el=>{const k=el.dataset.k,m=el.dataset.m;if(m==="drink"&&!adultOn())return toast("21+ is off for this event");const gid=partyGid(k,m),meta=PARTY_LIST.find(x=>x[0]===k);L.partyBusy=gid;render(true);
  const code=partyCode(k,m);const r=await cgCheck(code,{});L.partyBusy=null;if(!r.ok){toast("Couldn't add it: "+r.message);render(true);return}
  await ER("content/custom/"+gid).set({name:(m==="drink"?meta[1]+" (21+)":meta[2]).slice(0,40),desc:meta[3],code,uid:"party-"+k+"-"+m,schemaJson:JSON.stringify(r.schema||{}),settingsJson:"{}",checked:true,tested:true,wentLive:true,party:k,adult:m==="drink",t:Date.now()});toast("Added. Tap Go live when you're ready.")},
 partyDel:el=>{const id=el.dataset.id;if(st().live==="c:"+id)return toast("End the game on the Live tab first");ER("content/custom/"+id).remove();ER("cg/"+id).remove()},
 waterBreak:()=>{const on=!st().waterBreak;setState({waterBreak:on?{t:now()}:null});toast(on?"Water break: drinking games paused":"Back to the games")},
 sipsTv:()=>setState({showSips:!st().showSips}),
 hideSips:el=>{if(!L.isAdmin)return;ER("content/hideSips").set(!!el.checked);if(el.checked)setState({showSips:null})},
 sipsReset:()=>{if(!L.isAdmin)return;if(L.confirm!=="sipsReset"){L.confirm="sipsReset";render(true);return}L.confirm=null;ER("sips").remove().then(()=>toast("Sip counts cleared"))}
});

/* Spanish for the new guest-facing text */
Object.assign(ES,{"Menu":"Menú","The menu isn't ready yet.":"El menú todavía no está listo.","Choose your meal":"Elige tu comida","Orders are closed.":"Los pedidos están cerrados.","Pick {n}":"Elige {n}",
 "Notes for the kitchen":"Notas para la cocina","(allergies, no onions…)":"(alergias, sin cebolla…)","Update my order":"Actualizar mi pedido","Save my order":"Guardar mi pedido","Your order is saved":"Tu pedido está guardado",
 "You can pick {n} from this group":"Puedes elegir {n} de este grupo","You haven't picked everything in {g}. Tap save again to send it anyway.":"No elegiste todo en {g}. Toca guardar otra vez para enviarlo así.",
 "Anytime":"Cuando quieras","Two-player games":"Juegos de dos","Challenge someone, just for fun":"Reta a alguien, solo por diversión","{n} invites":"{n} invitaciones",
 "Two-player games are closed right now.":"Los juegos de dos están cerrados por ahora.","A live game is on":"Hay un juego en vivo","Play it first. Your match will wait.":"Juégalo primero. Tu partida te espera.","Go":"Ir",
 "Pick a game, then choose a partner or play someone random. Just for fun, no points.":"Elige un juego y luego una pareja o alguien al azar. Solo por diversión, sin puntos.",
 "Invite from {n}":"Invitación de {n}","In a match":"Jugando","Waiting":"Esperando","All games":"Todos los juegos","Setting up the game…":"Preparando el juego…","Just for fun. These games don't change the leaderboard.":"Solo por diversión. Estos juegos no cambian la tabla.",
 "Tic-Tac-Toe":"Gato","Connect Four":"Conecta cuatro","Dots and Boxes":"Puntos y cajas","Rock Paper Scissors":"Piedra, papel o tijera","Memory Match":"Memoria","Battleship":"Batalla naval","Checkers":"Damas","Word Guess":"Adivina la palabra",
 "Party games":"Juegos de fiesta","Party & 21+ games":"Juegos de fiesta y +21","See what's playing":"Mira qué se está jugando","Live now":"En vivo",
 "Water break! Drinking games are paused.":"¡Pausa para tomar agua! Los juegos con bebida están en pausa.","The host starts these live. Your phone switches to the game automatically.":"El anfitrión los inicia en vivo. Tu teléfono cambia al juego solo.",
 "You're in":"Estás dentro","Leave 21+ games":"Salir de los juegos +21","Most sips":"Más sorbos","Most sips takes the crown. A sip of anything counts.":"Quien tome más sorbos gana la corona. Un sorbo de cualquier bebida cuenta.","No sips yet.":"Todavía no hay sorbos.",
 "21+ games are off for this event.":"Los juegos +21 están apagados en este evento.","This is a 21+ game":"Este es un juego para mayores de 21","21+ games":"Juegos +21","These are drinking games for guests 21 and older.":"Son juegos con bebida para invitados de 21 años o más.",
 "I'm 21 or older":"Tengo 21 años o más","Sit this one out":"No juego esta vez","Not now":"Ahora no","You're in for 21+ games":"Ya puedes jugar los juegos +21",
 "Drinking is always optional. A sip of anything counts: water, soda or a mocktail.":"Beber siempre es opcional. Un sorbo de cualquier bebida cuenta: agua, refresco o un cóctel sin alcohol.","Pace yourself. Take the water breaks.":"Ve con calma. Aprovecha las pausas para tomar agua.","Plan your ride home before you play.":"Planea cómo regresar a casa antes de jugar.",
 "Tap anywhere to close":"Toca en cualquier parte para cerrar","Tap to enable sound":"Toca para activar el sonido","Scan to join the games":"Escanea para unirte a los juegos","The answer appears here":"Aquí aparece la respuesta"});
/* songs are removed with the photo cleanup */
const _cleanup0=cleanupEvent;
cleanupEvent=async function(code,days){let n=await _cleanup0(code,days);if(!db||!(days>0))return n;const cut=now()-days*86400000;
 const mu=(await ER("music",code).once("value")).val()||{};for(const k of Object.keys(mu))if((mu[k].t||0)<cut){await ER("music/"+k,code).remove();await ER("musicData/"+k,code).remove();n++}return n};

/* ---------- boot ---------- */
function loadDict(){fetch("https://cdn.jsdelivr.net/npm/an-array-of-english-words@2.0.0/index.json").then(r=>r.json()).then(a=>{L.dict=new Set(a.map(w=>w.toUpperCase()))}).catch(()=>{L.dict=false})}
