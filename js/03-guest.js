/* ================= GUEST ================= */
const ICON={home:'<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',play:'<path d="M7 5v14l12-7z"/>',hunt:'<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
 board:'<path d="M5 20V10M12 20V4M19 20v-7"/>',photo:'<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>'};
const ic=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
function teamBar(){if(nTeams()>2)return `<div class="tbar n">${teamKeys().map((k,i)=>`<div style="background:color-mix(in srgb,${TCOL[i]} 18%,var(--card))"><span class="small">${esc(teamName(k))}</span><b class="num">${D.team[k]||0}</b></div>`).join("")}</div>`;return `<div class="tbar"><div class="ta"><span class="small">${esc(teamName("A"))}</span><b class="num">${D.team.A||0}</b></div><div class="tb"><span class="small">${esc(teamName("B"))}</span><b class="num">${D.team.B||0}</b></div></div>`}

function player(){
 if(L.me&&L.playersLoaded&&!D.players[L.me]){L.profiles=L.profiles.filter(i=>D.players[i]);store.set("profiles_"+EV,L.profiles);L.me=L.profiles[0]||null;store.set("active_"+EV,L.me);watchMine()}
 if(!L.me||L.joining)return `<div class="phone">${status()}${joinScreen()}</div>`;
 if(!D.players[L.me])return `<div class="phone">${loadingView()}</div>`;
 const A=st().announce,seen=store.get("ann_"+EV,0);
 const ann=A&&A.t>seen?`<div class="banner"><span>${esc(A.text)}</span><button class="btn sm" data-act="dismiss">${t("OK")}</button></div>`:"";
 const body=({home:pHome,live:pLive,hunt:pHunt,photos:pAlbum,board:pBoard,me:pProfile}[L.ptab]||pHome)();
 const tab=(k,l,i)=>`<button data-act="ptab" data-k="${k}" aria-pressed="${L.ptab===k}">${ic(i)}${l}</button>`;
 return `<div class="phone">${status()}${ann}${body}<nav class="tabs">${tab("home",t("Home"),"home")}${tab("live",t("Live game"),"play")}${tab("hunt",t("Hunt"),"hunt")}${tab("photos",t("Photos"),"photo")}${tab("board",t("Leaders"),"board")}</nav></div>`}

function joinScreen(){
 const d=store.get("draft",{name:"",m:1,d:1,fq:0,fa:null,av:{e:AVATARS[rnd(AVATARS.length)]}});
 const f=FQ[d.fq];const opts=L.lang==="es"?f.es.o:f.o;
 const months=L.lang==="es"?["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]:["January","February","March","April","May","June","July","August","September","October","November","December"];
 return `<section class="card stack"><div class="eyebrow">${t("Welcome")}</div><h2>${t("Join the games")}</h2>
 <label class="stack tight"><span class="small">${t("Your name")}</span><input type="text" id="jName" maxlength="24" value="${esc(d.name)}" placeholder="${t("First name and last initial")}" autocomplete="off"></label>
 ${st().askSeat&&st().split==="prox"?`<label class="stack tight"><span class="small">${t("Where are you sitting?")}</span><input type="text" id="jSit" maxlength="30" value="${esc(d.sit||"")}" placeholder="${t("Table number or area")}" autocomplete="off"></label>`:""}
 <div class="row"><label class="stack tight grow"><span class="small">${t("Birth month")}</span><select id="jMonth">${months.map((x,k)=>`<option value="${k+1}" ${k+1===d.m?"selected":""}>${x}</option>`).join("")}</select></label>
 <label class="stack tight"><span class="small">${t("Day")}</span><input type="number" id="jDay" min="1" max="${DAYS_IN[d.m-1]}" value="${fixDay(d.m,d.d)}"></label></div>
 <div class="stack tight"><span class="small">${t("Pick your picture")}</span><div class="avpick">${AVATARS.map(e=>`<button data-act="jAv" data-e="${e}" aria-pressed="${d.av&&d.av.e===e&&!d.av.img}">${e}</button>`).join("")}
  </div><div class="row">${d.av&&d.av.img?`<span class="avsel on"><img src="${d.av.img}" alt=""></span>`:""}<label class="btn upl">📷 ${d.av&&d.av.img?t("Retake selfie"):t("Take a selfie")}<input type="file" accept="image/*" capture="user" data-act="jSelfie" aria-label="${t("Take a selfie")}"></label>${d.av&&d.av.img?`<span class="small muted">${t("Using your selfie")}</span>`:`<span class="small muted">${t("or pick a picture above")}</span>`}</div></div>
 <label class="stack tight"><span class="small">${t("Pick a fun-fact question about you")}</span><select id="jQ" data-act="jQ">${FQ.map((q,k)=>`<option value="${k}" ${k===d.fq?"selected":""}>${esc(L.lang==="es"?q.es.q:q.q)}</option>`).join("")}</select></label>
 <div class="stack tight"><span class="small">${t("Your answer")}</span><div class="row">${opts.map((o,k)=>`<button class="btn sm ${k===d.fa?"gold":""}" data-act="jA" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>
 <p class="small muted m0">${t("Other guests have to ask you this in person to unlock your secret word.")}</p>
 <button class="btn primary" data-act="join">${t("Join")}</button>${legalLinks()}${L.profiles.length?`<button class="btn" data-act="cancelJoin">${t("Back")}</button>`:""}</section>`}
function draftFromForm(){const d=store.get("draft",{name:"",m:1,d:1,fq:0,fa:null,av:{e:AVATARS[0]}});const n=$("#jName"),m=$("#jMonth"),dd=$("#jDay"),sq=$("#jSit");
 if(sq)d.sit=sq.value;if(n)d.name=n.value;if(m)d.m=+m.value;if(dd)d.d=+dd.value||1;d.d=fixDay(d.m,d.d);store.set("draft",d);return d}
const rank=id=>ranked().indexOf(id)+1;

function pHome(){
 if(st().ended)return pRecap();
 const tm=teamOf(L.me),g=st().live?gameById(st().live):null;const found=Object.values(D.mine.hunt||{}).filter(v=>v==="ok").length;
 const sw=L.profiles.length>1?`<div class="row">${L.profiles.filter(id=>D.players[id]).map(id=>`<button class="btn sm ${id===L.me?"gold":""}" data-act="switchP" data-id="${id}">${av(id,20)} ${esc(P(id).name)}</button>`).join("")}</div>`:"";
 const img=C().image?`<img class="ev-art" src="${C().image}" alt="">`:"";
 const nW=Object.keys(D.mine.wishes||{}).length,h=C().honorees;
 const mo=st().moment?momentsList().find(x=>x.id===st().moment.id):null;
 return `${sw}${mo?`<div class="banner mo-ban"><span>${t("Now on the big screen")}: <b>${esc(fillH(mo.title))}</b></span></div>`:""}${img}<section class="card hero"><button class="hero-av" data-act="ptab" data-k="me" aria-label="${t("Profile")}">${av(L.me,52)}</button><div class="grow"><div class="eyebrow">${t("Welcome")}, ${esc(P(L.me).name)}</div><h2 class="mt4">${t("You're on")} <span class="pill ${tm.toLowerCase()}">${esc(teamName(tm))}</span></h2><p class="muted small m0 mt6">${t("Rank #{r} of {n} in the room",{r:rank(L.me),n:ids().length})}</p></div><div class="tr"><div class="score num">${score(L.me)}</div><div class="small muted">${t("your points")}</div></div></section>
 ${g?`<button class="livebtn" data-act="ptab" data-k="live"><span><span class="pill live"><span class="dot"></span>${t("Live now")}</span><br><strong>${esc(gname(g))}</strong></span>${ic("play")}</button>`:`<div class="card muted">${t("The next game starts soon. Your phone will switch to it automatically.")}</div>`}
 ${teamBar()}${reactBar()}
 ${HUNTS().length&&(C().games||ALL_GAMES_ON).hunt!==false?`<button class="card row between w100 tl" data-act="ptab" data-k="hunt"><span><span class="eyebrow">${t("Open all night")}</span><br><b>${esc(gname(GAMES[2]))}</b> <span class="muted small">· ${t("{f} of {n} found",{f:found,n:HUNTS().length})}</span></span>${ic("hunt")}</button>`:""}
 <section class="card stack"><h3>${h?t("Leave a wish for {h}",{h:esc(h)}):t("Leave a wish")}</h3><textarea id="wishTxt" data-draft="wish" rows="3" maxlength="400" placeholder="${t("Write a short note or wish…")}">${esc(dv("wish",""))}</textarea><div class="row between"><span class="small muted">${nW?t("You've sent {n} wish(es).",{n:nW}):""}</span><button class="btn primary" data-act="sendWish">${t("Send wish")}</button></div></section>`}
function reactBar(){return `<section class="card stack tight"><span class="small muted">${t("Send a reaction to the big screen")}</span><div class="rxbar">${REACTIONS.map(e=>`<button data-act="react" data-e="${e}" aria-label="${e}">${e}</button>`).join("")}</div></section>`}

function pRecap(){
 const me=L.me,tm=teamOf(me),w=winnerKey();
 if(L.recapPhotos===null||L.recapPhotos===undefined){L.recapPhotos=[];const hs=D.mine.hunt||{};Object.keys(hs).filter(k=>hs[k]==="ok").forEach(k=>ER("photos/"+me+"_"+k).once("value").then(s=>{const v=s.val();if(v&&v.img&&!v.removed){L.recapPhotos.push(v.img);renderSoon()}}))}
 const bs=Object.keys(D.mine.badges||{}).filter(k=>BADGES[k]);
 return `<section class="card stack tc recap"><div class="eyebrow">${esc(C().title||"")}</div><div class="winner sm">${t("Thanks for celebrating!")}</div>${w?`<p class="m0"><b>${t("{team} won the night!",{team:esc(teamName(w))})}</b></p>`:`<p class="m0"><b>${t("It's a tie!")}</b></p>`}</section>
 <section class="card"><h3>${t("Your night")}</h3><div class="stats"><div><b class="num">${score(me)}</b><span>${t("Points")}</span></div><div><b class="num">#${rank(me)}</b><span>${t("Rank")}</span></div><div><b>${av(me,34)}</b><span>${esc(teamName(tm))}</span></div></div></section>
 <section class="card stack"><h3>${t("Your badges")}</h3>${bs.length?`<div class="badges">${bs.map(k=>`<div class="bd"><span>${BADGES[k].i}</span><b>${esc(L.lang==="es"?BADGES[k].es:BADGES[k].n)}</b></div>`).join("")}</div>`:`<p class="small muted m0">${t("No badges yet. Keep playing!")}</p>`}</section>
 ${L.recapPhotos.length?`<section class="card stack"><h3>${t("Your hunt photos")}</h3><div class="album">${L.recapPhotos.map(s=>`<img src="${s}" alt="">`).join("")}</div></section>`:""}
 <a class="btn primary tc" href="${esc(eventURL(EV,"keepsake"))}" target="_blank" rel="noopener">${t("Keepsake page")}</a><a class="btn tc" href="${esc(eventURL(EV,"album"))}" target="_blank" rel="noopener">${t("See the shared album")}</a>${reactBar()}`}

function pLive(){
 const live=st().live;if(!live)return `<div class="card muted">${t("No game is live right now. Your phone will switch when one starts.")}</div>`;
 const g=gameById(live);const head=`<div class="row between"><div><span class="eyebrow">${t("Live game")}</span><h2>${esc(gname(g))}</h2></div><span class="pill live"><span class="dot"></span>${t("Live")}</span></div>`;
 if(g&&g.custom)return head+`<div class="cgph" data-slot="p"></div>`;
 return head+({split:gSplit,longword:gLong,hunt:pHunt,trivia:gTrivia,crossword:gCross,sup:gSup,bingo:gBingo}[live])()}

function gSplit(){
 const tm=teamOf(L.me),p=P(L.me);
 const md=st().split||"seasons";const cap=captainOf(tm);
 const why=md==="prox"?t("You were grouped with people sitting near you."):(md==="random"||md==="hand")?t("The host dealt the teams at random."):(st().split||"seasons")==="seasons"?t("Your birthday is {d}, so you're with everyone born in {s}.",{d:bday(p),s:t(tm==="A"?"winter or spring":"summer or fall")}):t(p.d%2?"Your birthday falls on an odd day of the month.":"Your birthday falls on an even day of the month.");
 const mates=members(tm).filter(i=>i!==L.me);
 const fixed=(st().teamNames||{})[tm];
 const sg=(D.sugg||{})[tm]||{};const list=Object.keys(sg).map(k=>({k,name:sg[k].name,votes:Object.keys(sg[k].v||{}).length,mine:!!(sg[k].v||{})[L.me]})).sort((a,b)=>b.votes-a.votes);
 return `<section class="card stack tc"><div class="eyebrow">${t("Your team for the whole night")}</div><div class="winner">${esc(teamName(tm))}</div><p class="muted m0">${(!NEWSPLIT(md)&&(st().override||{})[L.me])?t("The moderator placed you on this team."):why}</p>${cap?`<p class="m0">★ ${cap===L.me?`<b>${t("You are the captain!")}</b>`:`${t("Your captain:")} <b>${esc(P(cap).name)}</b>`}</p>`:""}</section>
 <section class="card stack"><h3>${t("Name your team")}</h3>${fixed?`<p class="m0">${t("Your team name is set:")} <b>${esc(fixed)}</b></p>`:`<p class="small muted m0">${t("Suggest a fun name, or vote for one you like.")}</p>
 <div class="row"><input type="text" id="sgTxt" data-draft="sg" class="grow" maxlength="28" value="${esc(dv("sg",""))}"><button class="btn primary" data-act="suggest">${t("Suggest")}</button></div>
 <div class="stack tight">${list.map(s=>`<div class="row between"><span>${esc(s.name)} <span class="muted small">· ${s.votes}</span></span><button class="btn sm ${s.mine?"gold":""}" data-act="voteName" data-k="${s.k}">${s.mine?t("Voted"):t("Vote")}</button></div>`).join("")}</div>`}</section>
 <section class="card"><h3>${t("Find your teammates")}</h3><p class="small muted">${t("Go say hello to these {n} people.",{n:mates.length})}</p><div class="row">${mates.map(i=>`<span class="pill ${tm.toLowerCase()}">${cap===i?"★ ":""}${av(i,18)} ${esc(P(i).name)}</span>`).join("")}</div></section>`}

/* Long Word Wins */
function myTiles(){const lw=D.mine.lw||{},got=lw.got||{};const out=[{l:P(L.me).word[0],from:"your word"}];Object.keys(got).sort((a,b)=>(+got[a]||0)-(+got[b]||0)).forEach(id=>{if(D.players[id])out.push({l:P(id).word[0],from:P(id).name})});return out}
function gLong(){
 const lw=D.mine.lw||{},got=lw.got||{},lock=lw.lock||{},end=st().lwEnd,over=end&&now()>end;
 const timer=end?(over?`<span class="pill no">${t("Time's up")}</span>`:`<span class="pill warn num" data-timer="${end}">${fmtLeft(end)}</span>`):`<span class="pill warn">${t("Waiting for the timer")}</span>`;
 const tiles=myTiles().map((x,k,a)=>`<div class="tile ${k===a.length-1&&L.lwNew===k?"new":""}" title="${esc(x.from)}">${x.l}<small>1</small></div>`).join("");
 const names=ids().filter(i=>i!==L.me).map(i=>{const cls=got[i]?"got":lock[i]?"lock":"";return `<button class="${cls}" data-act="lwSel" data-id="${i}" aria-pressed="${L.lwSel===i}"><span>${av(i,18)} ${esc(P(i).name)}</span><span>${got[i]?"✓":lock[i]?"✕":""}</span></button>`}).join("");
 let q=`<p class="muted small">${t("Tap a name, then ask that person their question in person.")}</p>`;
 if(L.lwSel&&D.players[L.lwSel]){const i=L.lwSel,p=P(i),f=FQ[p.fq]||FQ[0],opts=L.lang==="es"?f.es.o:f.o;
  if(got[i])q=`<p>${t("{name}'s word is {w}. You earned the tile {l}.",{name:`<b>${esc(p.name)}</b>`,w:`<b>${p.word}</b>`,l:`<b>${p.word[0]}</b>`})}</p>`;
  else if(lock[i])q=`<p>${t("{name}'s word is locked. You get one try per person.",{name:`<b>${esc(p.name)}</b>`})}</p>`;
  else q=`<div class="eyebrow">${t("Ask {name}",{name:esc(p.name)})}</div><p class="qtext">${esc(L.lang==="es"?f.es.q:f.q)}</p><div class="opts">${opts.map((o,k)=>`<button data-act="lwAns" data-k="${k}" ${over?"disabled":""}>${esc(o)}</button>`).join("")}</div>`}
 const sub=lw.word?`<p class="pill ok">${t("You played {w} for {p} points",{w:lw.word,p:lw.pts})}</p>`:
  `<div class="row"><input type="text" id="lwWord" class="grow" placeholder="${t("Spell a word with your tiles")}" autocomplete="off" autocapitalize="characters"><button class="btn primary" data-act="lwSubmit">${t("Play word")}</button></div><div class="tiles preview" id="lwPrev"></div><p class="small muted m0">${t("Each tile can be used once. One point per letter. You get one play.")}</p>`;
 return `<div class="row between"><span class="muted small">${t("Your secret word:")} <b>${P(L.me).word}</b> · ${t("{n} tiles",{n:myTiles().length})}</span>${timer}</div>
 <div class="lw"><div class="col"><h3>${t("Your tiles")}</h3><div class="tiles">${tiles}</div></div><div class="col"><h3>${t("Who you're talking to")}</h3><div class="names">${names||`<span class="small muted">${t("Waiting for guests to join")}</span>`}</div></div><div class="col q"><h3>${t("Their question")}</h3>${q}</div></div>
 <section class="card stack">${sub}</section>`}

/* Trivia */
function gTrivia(){
 const list=TRV(),qi=Math.min(st().tvQ||0,list.length-1),it=list[qi];if(!it)return `<div class="card muted">${t("Starting soon")}</div>`;
 const opts=trivO(it),ans=it.a,pk=podOf(L.me);
 if(!pk)return `<div class="card muted">${t("You joined after pods were set. Ask the moderator to reset the pods, or cheer on this round.")}</div>`;
 const votes=D.tv[qi]||{},res=(votes._res||{})[pk],phase=st().tvPhase||"vote",tie=st().tvTie||{};
 const inRevote=phase==="revote"&&tie[pk];
 const myVote=inRevote?((D.tvr||{})[qi]||{})[L.me]:votes[L.me];
 const locked=res||(phase!=="vote"&&!inRevote);
 const ch=opts.map((o,k)=>`<button class="choice ${res&&k===ans?"right":""}" data-act="tvVote" data-k="${k}" aria-pressed="${myVote===k}" ${locked?"disabled":""}><span><b class="gnum il">${"ABCD"[k]}</b> ${esc(o)}</span></button>`).join("");
 let msg=`<p class="small muted m0">${t("Your pod: {names}. Talk it over. The majority picks your pod's answer. No speed bonus.",{names:podMembers(pk).map(i=>esc(P(i).name)).join(", ")})}</p>`;
 if(inRevote)msg=`<div class="banner"><span>${t("Your pod tied. Talk it over and vote again.")}</span><span class="num" data-timer="${st().tvRevoteEnd}">${fmtLeft(st().tvRevoteEnd)}</span></div>`;
 if(res){msg=`<div class="card soft">${res.tie?`<b>${t("Your pod stayed tied. No points this question.")}</b>`:res.correct?`<b>${t("Your pod picked \"{a}\". Correct!",{a:esc(opts[res.pick])})}</b> ${t("Everyone in your pod gets {p} points.",{p:pv("trivia")})}`:`<b>${t("Your pod picked \"{a}\".",{a:esc(opts[res.pick])})}</b> ${t("The answer was \"{a}\".",{a:esc(opts[ans])})}`}</div>`;
  const rk=qi+"|"+pk;if(!L.seenRes[rk]){L.seenRes[rk]=1;if(res.correct){setTimeout(()=>{confetti(90);SND.ding();buzz([50,30,100])},50)}}}
 else if(myVote!=null&&!inRevote)msg+=`<p class="pill ok as">${t("Vote in. Waiting for the moderator to close voting.")}</p>`;
 return `<section class="card stack"><div class="row between"><span class="eyebrow">${t("Question {i} of {n}",{i:qi+1,n:list.length})}</span><span class="pill ${teamOf(L.me).toLowerCase()}">${t("Pod {p}",{p:pk})}</span></div><h2 class="qh">${esc(trivQ(it))}</h2>${it.hard?`<span class="pill no as">${t("Hard one")}</span>`:""}<div class="choices">${ch}</div>${msg}</section>`}

/* Crossword */
const foot=(x,y,r,f)=>`<g transform="translate(${x} ${y}) rotate(${r})" fill="${f}"><ellipse cx="0" cy="0" rx="9" ry="15"/><ellipse cx="1" cy="-6" rx="7" ry="7"/><circle cx="-6" cy="-19" r="3.2"/><circle cx="-1.5" cy="-21" r="2.7"/><circle cx="2.5" cy="-20.5" r="2.4"/><circle cx="6" cy="-18.5" r="2.1"/><circle cx="8.5" cy="-15.5" r="1.8"/></g>`;
const hand=(x,y,r,f)=>`<g transform="translate(${x} ${y}) rotate(${r})" fill="${f}"><rect x="-11" y="-6" width="22" height="22" rx="10"/><rect x="-10" y="-24" width="5" height="20" rx="2.5"/><rect x="-4.5" y="-28" width="5" height="24" rx="2.5"/><rect x="1" y="-26" width="5" height="22" rx="2.5"/><rect x="6.5" y="-20" width="4.5" height="17" rx="2.2"/><rect x="-21" y="0" width="5" height="15" rx="2.5" transform="rotate(-40 -18 7)"/></g>`;
const rose=(x,y,s)=>{let p=`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 30 C-6 60 -2 90 0 120" stroke="var(--leaf)" stroke-width="5" fill="none"/><path d="M0 70 C-30 55 -45 70 -50 80 C-30 88 -12 82 0 70Z" fill="var(--leaf)"/><path d="M0 92 C28 78 44 90 48 100 C28 108 12 102 0 92Z" fill="var(--leaf)"/>`;
 [0,72,144,216,288].forEach(a=>p+=`<ellipse cx="0" cy="-21" rx="23" ry="29" fill="var(--rose)" transform="rotate(${a})"/>`);
 [36,108,180,252,324].forEach(a=>p+=`<ellipse cx="0" cy="-12.6" rx="15.4" ry="18.2" fill="var(--violet)" transform="rotate(${a})"/>`);
 return p+`<path d="M-12 0 C-12 -14 12 -14 12 0 C12 10 -6 12 -6 2 C-6 -4 4 -4 3 1" stroke="var(--rose)" stroke-width="3" fill="none"/></g>`};
const WM=`<svg class="wm" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${foot(48,70,-18,"var(--violet)")}${foot(78,40,-8,"var(--violet)")}${foot(330,330,160,"var(--leaf)")}${foot(360,300,170,"var(--leaf)")}${foot(60,350,20,"var(--flame)")}${hand(340,70,15,"var(--rose)")}${hand(300,55,-10,"var(--flame)")}${hand(150,360,-5,"var(--violet)")}${rose(200,190,1.15)}</svg>`;
function gCross(){
 const G=CWG(),solved=D.mine.cw||{};let cells="";
 const act=L.cwAct!=null?G.placed[L.cwAct]:null,actCells=new Set(act?cellsOf(act):[]);
 const done=new Set();G.placed.forEach(p=>{if(solved[p.id])cellsOf(p).forEach(k=>done.add(k))});
 for(let r=0;r<G.R;r++)for(let c=0;c<G.C;c++){const k=r+","+c;
  if(!G.sol[k]){cells+=`<div class="cell blk"></div>`;continue}
  const v=done.has(k)?G.sol[k]:(L.cwEntry[k]||"");
  cells+=`<div class="cell">${G.starts[k]?`<span class="n">${G.starts[k]}</span>`:""}<input maxlength="1" data-cell="${k}" value="${v}" class="${done.has(k)?"done":actCells.has(k)?"hl":""}" ${done.has(k)?"readonly":""} autocomplete="off" autocapitalize="characters" aria-label="Row ${r+1} column ${c+1}"></div>`}
 const list=d=>G.placed.map((p,k)=>({p,k})).filter(o=>o.p.d===d).sort((a,b)=>a.p.num-b.p.num).map(({p,k})=>`<li data-clue="${k}" class="${solved[p.id]?"done":""} ${L.cwAct===k?"act":""}"><b>${p.num}.</b> ${esc(cwClue(p))} (${p.w.length})</li>`).join("");
 const n=G.placed.filter(p=>solved[p.id]).length,partners=L.cwPartners.filter(i=>D.players[i]);
 return `<div class="row between"><span class="muted small">${t("{n} of {m} words · {p} pt each",{n,m:G.placed.length,p:pv("crossword")})}</span>${L.lang==="es"?`<span class="small muted">${t("Answers are in English.")}</span>`:""}</div>
 <section class="card stack tight"><span class="small"><b>${t("Sharing this screen?")}</b> ${t("Add who's solving with you. Everyone here gets full points.")}</span>
 <div class="row">${partners.map(i=>`<span class="pill ok">${esc(P(i).name)} <button class="btn xs" data-act="cwDrop" data-id="${i}" aria-label="Remove">×</button></span>`).join("")}<select id="cwAdd" data-act="cwAdd"><option value="">${t("Add a partner…")}</option>${ids().filter(i=>i!==L.me&&!partners.includes(i)).map(i=>`<option value="${i}">${esc(P(i).name)}</option>`).join("")}</select></div></section>
 <section class="cwbox">${WM}<div class="cw" style="grid-template-columns:repeat(${G.C},minmax(0,1fr))">${cells}</div></section>
 <section class="card clues"><div><h3>${t("Across")}</h3><ol>${list("A")}</ol></div><div><h3>${t("Down")}</h3><ol>${list("D")}</ol></div></section>`}

/* Superlatives */
function gSup(){
 const list=SUPS(),qi=Math.min(st().supQ||0,list.length-1),it=list[qi];if(!it)return "";
 const votes=D.sup[qi]||{},res=votes._res,pair=st().supPair||[],my=votes[L.me],opts=SUPOPT();
 const upFront=pair.filter(i=>D.players[i]).map(i=>esc(P(i).name)).join(" &amp; ")||t("to be picked");
 const ch=opts.map((o,k)=>`<button class="choice" data-act="supVote" data-k="${k}" aria-pressed="${my===k}" ${res?"disabled":""}><span>${esc(o)}</span></button>`).join("");
 let out=`<section class="card stack"><div class="row between"><span class="eyebrow">${t("Question {i} of {n}",{i:qi+1,n:list.length})}</span><span class="small muted">${t("Up front: {names}",{names:upFront})}</span></div><h2 class="qh">${esc(supLine(it))}</h2><div class="choices">${ch}</div>
 <p class="small muted m0">${pair.includes(L.me)?t("You're up front! Vote without looking at your partner."):t("You're voting with {team}.",{team:esc(teamName(teamOf(L.me)))})} ${t("If the pair agrees, they each score. If not, the team that agrees more strongly takes the round.")}</p>${my!=null&&!res?`<p class="pill ok as">${t("Vote in")}</p>`:""}</section>`;
 if(res)out+=supResult(res);return out}
function supResult(r){const opts=SUPOPT();const row=(tm,pct,top)=>`<div class="stack tight"><div class="row between small"><span class="pill ${tm.toLowerCase()}">${esc(teamName(tm))}</span><span class="num">${t("{pct}% picked {name}",{pct,name:esc(opts[top]||"")})}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
 return `<section class="card stack"><h3>${t("Results")}</h3>${r.pa!=null?`<p class="small m0">${esc(r.na)} → <b>${esc(opts[r.pa]||"")}</b> · ${esc(r.nb)} → <b>${r.pb!=null?esc(opts[r.pb]||""):"—"}</b></p>`:""}${row("A",r.pctA,r.topA)}${row("B",r.pctB,r.topB)}<p class="m0"><b>${esc(r.msg)}</b></p></section>`}

/* Bingo */
function gBingo(){
 const round=st().bingoRound||1,called=st().called||[],card=cardFor(L.me,round),mk=L.marks[round]||[];
 const last=called[called.length-1],claim=((D.claims||{})[round]||{})[L.me];
 let grid='<div class="bingo">'+"BINGO".split("").map(l=>`<div class="h">${l}</div>`).join("");
 for(let r=0;r<5;r++)for(let c=0;c<5;c++){const n=card[c][r];grid+=n===0?`<button class="free" disabled>FREE</button>`:`<button class="${mk.includes(n)?"m":""}" data-act="bMark" data-n="${n}">${n}</button>`}
 grid+="</div>";
 const claimUI=claim?(claim.ok?`<p class="pill ok asc">${t("Bingo confirmed! +{p} points",{p:pv("bingo")})}</p>`:`<p class="pill warn asc">${t("Bingo sent. Waiting for the moderator to confirm.")}</p>`):`<button class="btn gold big" data-act="bCall">BINGO!</button>`;
 return `<section class="card row between"><div><span class="eyebrow">${t("Round {r} · last call",{r:round})}</span><h2>${last?letter(last)+"-"+last:t("Starting soon")}</h2><span class="small muted">${t("{n} numbers called",{n:called.length})}</span></div>${last?`<div class="ball" key="${last}">${letter(last)}${last}</div>`:""}</section>
 <section class="card stack">${grid}${claimUI}<p class="small muted m0 tc">${t("Tap numbers as they're called. A full row, column or diagonal wins.")}</p></section>`}

/* Scavenger hunt */
function pHunt(){
 const mine=D.mine.hunt||{},list=HUNTS();
 const items=list.map((it,k)=>{const s=mine[k];
  const tag=s==="ok"?`<span class="pill ok">${t("Found")}</span>`:s==="up"?`<span class="pill warn">${t("Saving…")}</span>`:`<label class="btn sm primary upl">${s==="removed"?t("Try again"):t("Snap it")}<input type="file" accept="image/*" capture="environment" data-act="huntUp" data-k="${k}" aria-label="${t("Mystery item {n}",{n:k+1})}"></label>`;
  return `<div class="item"><div class="thumb">${k+1}</div><div><b class="db">${s==="ok"?esc(loc(it,"n")):t("Mystery item {n}",{n:k+1})}</b><span class="small muted">${esc(loc(it,"h"))}</span>${s==="removed"?`<span class="small db bad">${t("The moderator didn't accept that photo.")}</span>`:""}</div>${tag}</div>`}).join("");
 const found=Object.values(mine).filter(v=>v==="ok").length;
 return `<section class="card stack"><div class="row between"><div><span class="eyebrow">${t("Open until the end of the night")}</span><h2>${esc(gname(GAMES[2]))}</h2></div><div class="score num sm">${found}/${list.length}</div></div><p class="small muted m0">${t("Find them in any order and take a photo of each. {p} points per item. The moderators check every photo.",{p:pv("hunt")})}</p></section><div class="hunt">${items}</div>`}

/* Album */
function albumGrid(mod){const a=D.album||{};const keys=Object.keys(a).sort((x,y)=>(a[y].t||0)-(a[x].t||0));
 return keys.length?`<div class="album">${keys.map(k=>`<button class="ph" data-act="openPhoto" data-key="${k}" ${mod?'data-mod="1"':""} aria-label="Photo by ${esc(a[k].name||"")}"><img src="${a[k].thumb}" alt="" loading="lazy"></button>`).join("")}</div>`:`<p class="small muted m0">${t("No photos yet. Be the first!")}</p>`}
function pAlbum(){if(!L.albumOn){L.albumOn=true;watchAlbum()}
 return `<section class="card stack"><div class="row between"><div><span class="eyebrow">${esc(C().title||"")}</span><h2>${t("Shared album")}</h2></div><label class="btn primary upl">${L.uploading?t("Uploading…"):t("Add a photo")}<input type="file" accept="image/*" data-act="albumUp" aria-label="${t("Add a photo")}"></label></div><p class="small muted m0">${t("Everyone's photos from tonight, live.")}</p></section><section class="card">${albumGrid(false)}</section>`}

function pBoard(){const order=ranked();
 return `${teamBar()}<section class="card tscroll"><table><thead><tr><th>#</th><th>${t("Guest")}</th><th>${t("Team")}</th><th class="tr">${t("Pts")}</th></tr></thead><tbody>${order.map((i,k)=>`<tr ${i===L.me?'class="me"':""}><td class="num">${k+1}</td><td>${av(i,24)} ${esc(P(i).name)}${i===L.me?" "+t("(you)"):""}</td><td><span class="pill ${teamOf(i).toLowerCase()}">${teamOf(i)}</span></td><td class="num tr">${score(i)}</td></tr>`).join("")}</tbody></table></section>`}
function pProfile(){const p=P(L.me),f=FQ[p.fq]||FQ[0];const bs=Object.keys(D.mine.badges||{}).filter(k=>BADGES[k]);
 return `<section class="card stack"><div class="row">${av(L.me,56)}<div><div class="eyebrow">${t("Your profile")}</div><h2>${esc(p.name)}</h2></div></div><p class="small m0">${t("Birthday:")} ${bday(p)} · ${esc(teamName(teamOf(L.me)))}</p><p class="small m0">${t("Your question:")} ${esc(L.lang==="es"?f.es.q:f.q)} <b>${esc((L.lang==="es"?f.es.o:f.o)[p.fa])}</b></p><p class="small m0">${t("Your secret word:")} <b>${p.word}</b></p><button class="btn as" data-act="settings">Aa · ${t("Settings")}</button></section>
 <section class="card stack"><h3>${t("Your picture")}</h3><div class="avpick">${AVATARS.map(e=>`<button data-act="pAv" data-e="${e}" aria-pressed="${!!(p.av&&p.av.e===e&&!p.av.img)}">${e}</button>`).join("")}</div>
 <div class="row">${p.av&&p.av.img?`<span class="avsel on"><img src="${p.av.img}" alt=""></span>`:""}<label class="btn upl">📷 ${p.av&&p.av.img?t("Retake selfie"):t("Take a selfie")}<input type="file" accept="image/*" capture="user" data-act="pSelfie" aria-label="${t("Take a selfie")}"></label></div></section>
 <section class="card stack"><h3>${t("Your badges")}</h3>${bs.length?`<div class="badges">${bs.map(k=>`<div class="bd"><span>${BADGES[k].i}</span><b>${esc(L.lang==="es"?BADGES[k].es:BADGES[k].n)}</b><small>${esc(L.lang==="es"?BADGES[k].des:BADGES[k].d)}</small></div>`).join("")}</div>`:`<p class="small muted m0">${t("No badges yet. Keep playing!")}</p>`}</section>
 <section class="card stack"><h3>${t("Sharing this phone?")}</h3><p class="small muted m0">${t("A friend without a smartphone can join here too. Each of you keeps your own points, and you can switch players from Home.")}</p><button class="btn" data-act="addFriend">${t("Add another player on this phone")}</button></section>${legalFoot()}`}

