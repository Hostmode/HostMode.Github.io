/* ================= ACTIONS & GAME LOGIC ================= */
const setState=patch=>db&&ER("state").update(patch);
const waitFor=(fn,ms)=>new Promise(res=>{const t0=Date.now();(function chk(){if(fn()||Date.now()-t0>(ms||3000))res();else setTimeout(chk,60)})()});
const saveContent=(k,v)=>db&&ER("content/"+k).set(v);
let lastReact=0;
const ACT={
 /* ---- shared ---- */
 settings:()=>{L.settings=!L.settings;render()},
 setToggle:el=>{const k=el.dataset.k;if(k==="lang"){L.lang=L.lang==="es"?"en":"es";store.set("lang",L.lang)}else{L[k]=!L[k];store.set(k,L[k])}render()},
 closeLb:()=>{L.lightbox=null;render()},
 goCode:()=>{const c=(dv("evCode","")).toUpperCase().replace(/[^A-Z0-9-]/g,"");if(c)location.href=eventURL(c)},
 openPhoto:el=>{const k=el.dataset.key,a=(D.album||{})[k]||{};L.lightbox={key:k,name:a.name,full:a.thumb,mine:a.pid&&a.pid===L.me,mod:el.dataset.mod==="1"};render();
  ER("albumFull/"+k).once("value").then(s=>{if(L.lightbox&&L.lightbox.key===k&&s.val()){L.lightbox.full=s.val();render()}})},
 delMyPhoto:el=>{const k=el.dataset.key;ER("album/"+k).remove();ER("albumFull/"+k).remove();L.lightbox=null;render()},
 modDelPhoto:el=>{const k=el.dataset.key;ER("album/"+k).remove();ER("albumFull/"+k).remove();L.lightbox=null;toast("Photo removed");render()},

 /* ---- guest ---- */
 ptab:el=>{L.ptab=el.dataset.k;if(L.ptab!=="home")L.recapPhotos=L.recapPhotos;render();window.scrollTo({top:0})},
 dismiss:()=>{store.set("ann_"+EV,(st().announce||{}).t||0);render()},
 jQ:el=>{const d=draftFromForm();d.fq=+el.value;d.fa=null;store.set("draft",d);render()},
 jA:el=>{const d=draftFromForm();d.fa=+el.dataset.k;store.set("draft",d);render()},
 jAv:el=>{const d=draftFromForm();d.av={e:el.dataset.e};store.set("draft",d);render()},
 jSelfie:el=>{const f=el.files[0];if(!f)return;squareImage(f,120,img=>{const d=draftFromForm();d.av={img};store.set("draft",d);render()})},
 join:()=>{const d=draftFromForm();if(!d.name.trim())return toast(t("Enter your name first"));if(d.fa==null)return toast(t("Pick your answer to the fun-fact question"));if(!db)return toast(t("Not connected yet"));
  const id=ER("players").push().key;const p={name:d.name.trim().slice(0,24),m:d.m,d:d.d,fq:d.fq,fa:d.fa,word:pickWord(),t:Date.now(),av:d.av||{e:AVATARS[0]}};if(st().askSeat&&st().split==="prox"&&(d.sit||"").trim())p.sit=d.sit.trim().slice(0,30);
  const u={};u["players/"+id]=p;u["scores/"+id]=0;
  if(NEWSPLIT(st().split)||nTeams()>2||st().locked){const ks=teamKeys();let tm=null;
   if(st().split==="prox"&&p.sit){const key=sitKey(p.sit),mate=ids().find(i=>P(i).sit&&sitKey(P(i).sit)===key);if(mate)tm=teamOf(mate)}
   if(!tm){const c={};ks.forEach(k=>c[k]=members(k).length);tm=ks.reduce((a,b)=>c[b]<c[a]?b:a)}u["state/override/"+id]=tm}
  ER().update(u).then(()=>{L.profiles.push(id);store.set("profiles_"+EV,L.profiles);L.me=id;store.set("active_"+EV,id);L.joining=false;
   store.set("draft",{name:"",m:1,d:1,fq:0,fa:null,av:{e:AVATARS[rnd(AVATARS.length)]}});watchMine();L.ptab="home";render();toast(t("You're in!"));confetti(80);SND.ding()})},
 cancelJoin:()=>{L.joining=false;render()},
 addFriend:()=>{L.joining=true;render()},
 switchP:el=>{L.me=el.dataset.id;store.set("active_"+EV,L.me);L.recapPhotos=null;watchMine();render()},
 react:el=>{if(Date.now()-lastReact<700)return;lastReact=Date.now();ER("reactions").push({e:el.dataset.e,t:SERVER_TS()});el.classList.remove("pulse");void el.offsetWidth;el.classList.add("pulse");buzz(20)},
 sendWish:()=>{const txt=(dv("wish","")).trim();if(!txt)return;ER("wishes").push({pid:L.me,name:P(L.me).name,text:txt.slice(0,400),t:SERVER_TS()}).then(()=>{L.drafts.wish="";badge(L.me,"wish");toast(t("Wish sent. Thank you!"));render()})},
 suggest:()=>{const n=(dv("sg","")).trim().slice(0,28);if(!n)return;const tm=teamOf(L.me);clearMyNameVotes(tm);ER("sugg/"+tm).push({name:n,by:L.me,v:{[L.me]:true}});L.drafts.sg="";render()},
 voteName:el=>{const tm=teamOf(L.me),k=el.dataset.k;clearMyNameVotes(tm);ER(`sugg/${tm}/${k}/v/${L.me}`).set(true)},
 lwSel:el=>{L.lwSel=el.dataset.id;L.lwNew=-1;render()},
 lwAns:el=>{const i=L.lwSel,p=P(i);if(+el.dataset.k===p.fa){ER(`lw/${L.me}/got/${i}`).set(Date.now());L.lwNew=myTiles().length;toast(t("New tile: {l}",{l:p.word[0]}));SND.pop();buzz(40);if(myTiles().length+1>=10)badge(L.me,"social10")}
  else{ER(`lw/${L.me}/lock/${i}`).set(true);toast(t("Not quite. {name}'s word is now locked for you.",{name:p.name}));buzz([30,30,30])}},
 lwSubmit:()=>{const w=(($("#lwWord")||{}).value||"").trim().toUpperCase().replace(/[^A-Z]/g,"");if(w.length<2)return toast(t("Type a word first"));
  const pool=myTiles().map(x=>x.l);for(const ch of w){const k=pool.indexOf(ch);if(k<0)return toast(t("You don't have a tile for {l}",{l:ch}));pool.splice(k,1)}
  if(L.dict===null)return toast(t("Still loading the dictionary. Try again in a moment."));
  if(L.dict&&!L.dict.has(w))return toast(t("{w} isn't in the dictionary",{w}));
  const pts=w.length*pv("longword");const me=L.me;
  ER(`lw/${me}/word`).transaction(cur=>cur?undefined:w,(e,ok)=>{if(ok){ER(`lw/${me}/pts`).set(pts);award([me],pts,teamOf(me),pts);if(w.length>=7)badge(me,"word7");toast(t("{w} scores {p} points",{w,p:pts}));confetti(70);SND.win()}})},
 tvVote:el=>{const qi=st().tvQ||0,pk=podOf(L.me);const rev=st().tvPhase==="revote"&&(st().tvTie||{})[pk];ER((rev?"tvr/":"tv/")+qi+"/"+L.me).set(+el.dataset.k);SND.pop();buzz(25)},
 supVote:el=>{ER("sup/"+(st().supQ||0)+"/"+L.me).set(+el.dataset.k);SND.pop();buzz(25)},
 bMark:el=>{const n=+el.dataset.n,round=st().bingoRound||1;if(!(st().called||[]).includes(n)){el.classList.remove("shake");void el.offsetWidth;el.classList.add("shake");buzz([20,20,20]);return toast(t("{n} hasn't been called yet",{n:letter(n)+"-"+n}))}
  const mk=L.marks[round]||[];L.marks[round]=mk.includes(n)?mk.filter(x=>x!==n):mk.concat(n);store.set("marks_"+EV,L.marks);SND.pop();render()},
 bCall:()=>{const round=st().bingoRound||1,mk=L.marks[round]||[];if(!hasBingo(cardFor(L.me,round),n=>mk.includes(n)))return toast(t("Not yet. Mark a full row, column or diagonal first."));
  ER(`claims/${round}/${L.me}`).set({t:Date.now(),ok:false});toast(t("Bingo sent to the moderator"));buzz([60,40,60])},
 huntUp:el=>{const k=+el.dataset.k,f=el.files[0];if(!f)return;const me=L.me;ER(`hunt/${me}/${k}`).set("up");
  shrinkImage(f,360,.6,img=>{ER(`photos/${me}_${k}`).set({who:me,k,img,t:Date.now(),checked:false}).then(()=>ER(`hunt/${me}/${k}`).transaction(v=>v==="ok"?undefined:"ok",(e,ok)=>{if(!ok)return;
   award([me],pv("hunt"),teamOf(me),pv("hunt"));toast(t("Found it! +{p} points",{p:pv("hunt")}));confetti(70);SND.ding();buzz([40,30,80]);
   ER("huntFirst/"+k).transaction(v=>v?undefined:me,(e2,ok2)=>{if(ok2)badge(me,"firstFind")});
   const found=Object.values(D.mine.hunt||{}).filter(v=>v==="ok").length;if(found>=HUNTS().length)badge(me,"huntAll")}))})},
 albumUp:el=>{const f=el.files[0];if(!f)return;L.uploading=true;render();const me=L.me;
  shrinkImage(f,1280,.72,full=>shrinkImage(f,360,.6,thumb=>{const key=ER("album").push().key;ER("albumFull/"+key).set(full).then(()=>ER("album/"+key).set({pid:me||"",name:me?P(me).name:"",thumb,t:SERVER_TS()})).then(()=>{L.uploading=false;toast(t("Photo added"));SND.ding();render();
   if(me)ER("album").orderByChild("pid").equalTo(me).once("value").then(s=>{if(Object.keys(s.val()||{}).length>=3)badge(me,"shutter")})})}))},
 cwAdd:el=>{if(el.value){L.cwPartners.push(el.value);render()}},
 cwDrop:el=>{L.cwPartners=L.cwPartners.filter(i=>i!==el.dataset.id);render()},

 /* ---- moderator ---- */
 pin:async()=>{const h=await hashPin(dv("pin",""));if(D.meta&&(h===D.meta.pinHash||h===L.masterHash)){store.set("mod_"+EV,h);L.modOK=true;L.drafts.pin="";render()}else toast("That PIN isn't right")},
 mtab:el=>{L.mtab=el.dataset.k;L.confirm=null;render();window.scrollTo({top:0})},
 goLive:el=>{const id=el.dataset.id,tm=now(),patch={live:id,liveT:tm,showWinner:false,countdown:{game:id,at:tm+5600}};
  if(id!=="split"&&!st().locked)patch.locked=true;
  if(id==="trivia"){if(!st().pods)patch.pods=makePods();patch.tvAt=tm+5600}
  if(id==="sup"){patch.supAt=tm+5600;if(!(st().supPair||[]).filter(Boolean).length){const a=ids();if(a.length>1){const x=a[rnd(a.length)];let y=x;while(y===x)y=a[rnd(a.length)];patch.supPair=[x,y]}}}
  if(String(id).startsWith("c:")){patch.cgRun={id:id.slice(2),runner:CG.session};L.cgErr=null;cgFlag(id.slice(2),"wentLive")}
  setState(patch);toast(gameById(id).name+" is counting down on every phone")},
 endGame:()=>setState({live:null,countdown:null}),
 announce:()=>{const tx=(dv("ann","")).trim();if(!tx)return toast("Type a message first");setState({announce:{text:tx,t:now()}});L.drafts.ann="";toast("Sent to every phone");render()},
 tvClose:()=>resolveTrivia(false),tvFinish:()=>resolveTrivia(true),
 tvNext:()=>setState({tvQ:Math.min(TRV().length-1,(st().tvQ||0)+1),tvPhase:"vote",tvTie:null,tvRevoteEnd:null,tvAt:now()}),
 podsReset:()=>{setState({pods:makePods()});toast("Pods reset from everyone who has joined")},
 supReveal:()=>resolveSup(),
 supNext:()=>setState({supQ:Math.min(SUPS().length-1,(st().supQ||0)+1),supAt:now()}),
 pairPick:el=>{const p=(st().supPair||["",""]).slice();p[+el.dataset.s]=el.value;setState({supPair:p})},
 bConfirm:el=>{const round=st().bingoRound||1,pid=el.dataset.id;ER(`claims/${round}/${pid}/ok`).transaction(v=>v?undefined:true,(e,ok)=>{if(ok){award([pid],pv("bingo"),teamOf(pid),pv("bingo"));badge(pid,"bingo");setState({celebrate:{text:"BINGO! "+P(pid).name,t:now()}})}})},
 bDeny:el=>ER(`claims/${st().bingoRound||1}/${el.dataset.id}`).remove(),
 callNext:()=>{const c=(st().called||[]).slice();const left=[...Array(75)].map((_,i)=>i+1).filter(n=>!c.includes(n));if(!left.length)return toast("Every number has been called");c.push(left[rnd(left.length)]);setState({called:c})},
 newBingo:()=>{setState({bingoRound:(st().bingoRound||1)+1,called:[]});toast("New round. Every guest gets a fresh card.")},
 lwStart:()=>{const m=Math.max(1,+dv("lwMins",st().lwMins||15)||15);setState({lwMins:m,lwEnd:now()+m*60000});toast("Timer started on every phone")},
 pOk:el=>ER("photos/"+el.dataset.key+"/checked").set(true),
 pNo:el=>{const x=D.photos[el.dataset.key];if(!x)return;ER("photos/"+el.dataset.key).update({checked:true,removed:true,img:null});ER(`hunt/${x.who}/${x.k}`).set("removed");award([x.who],-pv("hunt"),teamOf(x.who),-pv("hunt"));toast("Photo removed and points taken back")},
 split:el=>setState({split:el.dataset.v,override:null,pods:null,askSeat:null,captains:null}),
 seasonMode:el=>setState({seasonMode:el.dataset.v,pods:null}),
 move:el=>{const i=el.dataset.id;ER("state/override/"+i).set(teamOf(i)==="A"?"B":"A")},
 moveTo:el=>{ER("state/override/"+el.dataset.id).set(el.value)},
 captain:el=>{const tm=el.dataset.t,id=el.dataset.id;ER("state/captains/"+tm).set(captainOf(tm)===id?null:id)},
 capRandom:()=>{const c={};teamKeys().forEach(tm=>{const m=members(tm);if(m.length)c[tm]=m[Math.floor(Math.random()*m.length)]});setState({captains:c});toast("Captains picked. Change anyone with the buttons.")},
 teamN:el=>{const n=+el.dataset.v;let m=st().split||"seasons";if(n>2&&!NEWSPLIT(m))m="random";
  const p={nTeams:n,split:m,captains:null,pods:null,override:null,askSeat:null};
  if(NEWSPLIT(m)){p.override=dealGroups(m==="hand"?"random":m,n);p.askSeat=m==="prox"&&!chartOn()?true:null}
  setState(p);toast(n+" "+(n>7?"pods":"teams"))},
 splitMode:el=>{const m=el.dataset.v,n=nTeams();const p={split:m,captains:null,pods:null,askSeat:m==="prox"&&!chartOn()?true:null};
  if(m==="hand"){const o={};ids().forEach(i=>o[i]=teamOf(i));p.override=o;p.captains=st().captains||null}else p.override=dealGroups(m,n);
  setState(p)},
 reDeal:()=>{const m=st().split==="prox"?"prox":"random";setState({override:dealGroups(m,nTeams()),captains:null,pods:null});toast(m==="prox"?"Grouped by seating":"Dealt again")},
 kick:el=>{const i=el.dataset.id;ER("players/"+i).remove();ER("scores/"+i).remove();toast("Removed. Their points no longer count on the leaderboard.")},
 setTeamName:el=>{const tm=el.dataset.t,n=(dv("tn"+tm,"")).trim().slice(0,28);ER("state/teamNames/"+tm).set(n||null);toast(n?"Team name set":"Team name cleared")},
 useSugg:el=>{const tm=el.dataset.t,s=((D.sugg||{})[tm]||{})[el.dataset.k];if(s){L.drafts["tn"+tm]=s.name;ER("state/teamNames/"+tm).set(s.name);toast("Team name set")}},
 winner:()=>{const on=!st().showWinner;const p={showWinner:on};if(on){const w=winnerKey();if(w)p.entrance={team:w,label:"Tonight's champions",t:now()}}setState(p)},
 endNight:()=>{if(st().ended)return setState({ended:false});const w=winnerKey();const p={ended:true,live:null,countdown:null,showWinner:true};if(w)p.entrance={team:w,label:"Tonight's champions",t:now()};setState(p);toast("Recaps sent to every phone")},
 tbOn:()=>setState({tiebreak:{on:true}}),tbOff:()=>setState({tiebreak:null}),
 tbReveal:()=>{const a=+(C().tie||{}).a,ks=(tiedTop().length>1?tiedTop():teamKeys()),g={};
  for(const k of ks){const v=parseFloat(dv("tb"+k,""));if(isNaN(v))return toast("Enter every "+grpWord()+"'s guess");g[k]=Math.abs(v-a)}
  const best=Math.min(...ks.map(k=>g[k])),ws=ks.filter(k=>g[k]===best);let res,w=null;
  if(ws.length>1)res=`Some guesses are just as close. The answer was ${a}.`;else{w=ws[0];res=`${teamName(w)} wins the tiebreaker. The answer was ${a}.`}
  const p={tiebreak:{on:true,result:res}};if(w){ER("team/"+w).transaction(v=>(v||0)+1);p.entrance={team:w,label:"Wins the tiebreaker",t:now()}}setState(p)},
 tadj:el=>ER("team/"+el.dataset.t).transaction(v=>(v||0)+ +el.dataset.d),
 raffle:()=>{const a=ids().filter(i=>!P(i).bot);const pool=a.length?a:ids();if(!pool.length)return;setState({raffle:P(pool[rnd(pool.length)]).name})},
 adj:el=>award([el.dataset.id],+el.dataset.d,null,0),
 ctab:el=>{L.ctab=el.dataset.k;render()},
 cmode:el=>{const k=el.dataset.k;L.cmode=Object.assign({},L.cmode,{[k]:el.dataset.m});if(el.dataset.m==="edit")L.drafts["ed_"+k]=toText(k);render()},
 aiRefresh:()=>render(),
 copyPrompt:()=>copyText(($("#aiPrompt")||{}).value||"",$("#aiPrompt")),
 saveList:el=>{const k=el.dataset.k;const r=parseKind(k,dv("ed_"+k,""));if(r.errs.length)return toast(`Couldn't read line ${r.errs.join(", ")}. Check the format.`);if(!r.items.length)return toast("The list is empty");
  saveContent(k,k==="tie"?r.items[0]:r.items).then(()=>{L.cmode[k]="view";toast("Saved");render()})},
 aiApply:el=>{const k=el.dataset.k,r=parseKind(k,dv("ai_"+k,""));if(!r.items.length)return;
  const cur={trivia:TRV(),hunt:HUNTS(),cw:CWW(),sups:SUPS()}[k]||[];const next=k==="tie"?r.items[0]:(el.dataset.how==="add"?cur.concat(r.items):r.items);
  saveContent(k,next).then(()=>{L.cmode[k]="view";L.drafts["ai_"+k]="";toast(`${r.items.length} added`);render()})},
 saveDetails:()=>{const g=k=>(dv("ev_"+k,C()[k]||"")).trim();const opts=(dv("ev_supOpts",SUPOPT().join(", "))).split(",").map(s=>s.trim()).filter(Boolean);
  const u={title:g("title")||"Party Games",tagline:g("tagline"),honorees:g("honorees"),date:g("date"),themeDesc:g("themeDesc")};if(opts.length>=2)u.supOpts=opts;
  ER("content").update(u).then(()=>{markSetup("details");toast(opts.length>=2?"Details saved":"Details saved. Superlatives need at least two answer choices.")})},
 themeImg:el=>{const f=el.files[0];if(!f)return;shrinkImage(f,640,.72,img=>paletteFrom(img,cols=>{ER("content").update({image:img,colors:Object.assign({},C().colors||{},cols)});toast("Image and colors updated on every screen")}))},
 removeImg:()=>ER("content/image").remove(),
 color:el=>ER("content/colors/"+el.dataset.k).set(el.value),
 toggleGame:el=>{const g=Object.assign({},ALL_GAMES_ON,C().games||{});g[el.dataset.k]=!(g[el.dataset.k]!==false);saveContent("games",g)},
 pv:el=>ER("content/pv/"+el.dataset.k).set(Math.max(0,+el.value||0)),
 saveTheme:()=>{const n=(dv("themeName",C().title||"")).trim()||"Untitled theme";RT("themes").push({name:n,content:clone(C()),t:Date.now()}).then(()=>toast("Theme saved"))},
 askTheme:el=>{L.confirm="theme:"+el.dataset.id;render()},
 useTheme:el=>{const th=(D.themes||{})[el.dataset.id];if(!th)return;ER("content").set(clone(th.content)).then(()=>{L.confirm=null;Object.keys(L.drafts).filter(k=>/^ev_|^ed_|^ai_/.test(k)).forEach(k=>delete L.drafts[k]);toast("Theme loaded");render()})},
 cancelConfirm:()=>{L.confirm=null;render()},
 askReset:()=>{L.confirm="reset";render()},
 doReset:()=>{if((dv("resetTxt","")).trim()!=="RESET")return toast("Type RESET in capitals to confirm");const keep={meta:D.meta,content:D.content||clone(DEFAULT_CONTENT)};
  ER().set(keep).then(()=>{L.confirm=null;L.drafts.resetTxt="";toast("All game data cleared");render()})},
 changePin:async()=>{const p=(dv("newPin","")).trim();if(p.length<4)return toast("Use at least 4 digits");const h=await hashPin(p);await ER("meta/pinHash").set(h);store.set("mod_"+EV,h);markSetup("pin");L.drafts.newPin="";toast("PIN changed. Share it with your assistant.");render()},
 startPractice:async()=>{markSetup("practice");const code=EV+"-P";await ER("",code).remove();await createEvent(code,(D.meta.name||EV)+" (practice)",clone(C()),D.meta.pinHash||null,true);if(D.mods)await ER("mods",code).set(D.mods);await seedBots(code);await copyDecks(EV,code);store.set("mod_"+code,store.get("mod_"+EV,null));location.href=eventURL(code,"moderator")},
 endPractice:async()=>{const base=EV.replace(/-P$/,"");await ER().remove();await RT("index/"+EV).remove();location.href=eventURL(base,"moderator")},
 copyLink:el=>copyText(el.dataset.url),
 downloadAlbum:async()=>{if(L.zipping)return;L.zipping=true;render();try{const s=await ER("albumFull").once("value");const all=s.val()||{};const keys=Object.keys(all);
  if(window.JSZip){const z=new JSZip();keys.forEach((k,i)=>{const d=all[k];if(typeof d==="string"&&d.indexOf(",")>0)z.file(`photo-${String(i+1).padStart(3,"0")}.jpg`,d.split(",")[1],{base64:true})});
   const blob=await z.generateAsync({type:"blob"});download(`${EV}-album.zip`,blob)}
  else keys.forEach((k,i)=>setTimeout(()=>{fetch(all[k]).then(r=>r.blob()).then(b=>download(`photo-${i+1}.jpg`,b))},i*400))}catch(e){toast("Couldn't download the album. Try again.")}L.zipping=false;render()},
 keepsake:()=>{const w=D.wishes||{},c=C();const items=Object.keys(w).sort((a,b)=>(w[a].t||0)-(w[b].t||0)).map(k=>`<div class="w"><p>${esc(w[k].text)}</p><span>${esc(w[k].name||"")}</span></div>`).join("");
  const cs=c.colors||{};const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wishes for ${esc(c.honorees||"you")}</title><link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Figtree:wght@400;600&display=swap" rel="stylesheet"><style>body{font-family:Figtree,system-ui,sans-serif;background:#fbf6fd;color:#33163f;margin:0;padding:32px 16px}main{max-width:820px;margin:0 auto}h1{font-family:"Great Vibes",cursive;font-weight:400;font-size:3.4rem;text-align:center;margin:0;color:${cs.rose||"#e8338f"}}.sub{text-align:center;color:${cs.violet||"#7b3fb8"};letter-spacing:.12em;text-transform:uppercase;font-size:.8rem}.grid{columns:2 260px;gap:16px;margin-top:28px}.w{break-inside:avoid;background:#fff;border:1px solid #e4d4ef;border-radius:14px;padding:16px;margin:0 0 16px}.w p{margin:0 0 8px;font-size:1.05rem;line-height:1.5}.w span{color:${cs.leaf||"#2f8a4c"};font-weight:600}</style></head><body><main><h1>Wishes for ${esc(c.honorees||"you")}</h1><p class="sub">${esc(c.tagline||"")}</p><div class="grid">${items}</div></main></body></html>`;
  download("wishes-keepsake.html",new Blob([html],{type:"text/html"}))},
 delWish:el=>ER("wishes/"+el.dataset.key).remove(),

/* ---- help, moments, reveal, legal ---- */
 hint:(el,e)=>{e&&e.preventDefault&&e.preventDefault();L.hint=L.hint===el.dataset.k?null:el.dataset.k;render(true)},
 showChecklist:()=>{store.set("ckHide_"+EV,false);L.showChecklist=true;render(true)},
 hideChecklist:()=>{store.set("ckHide_"+EV,true);L.showChecklist=false;render(true)},
 askCkReset:()=>{L.confirm="ckReset";render(true)},
 ckReset:async()=>{L.confirm=null;await ER("meta/setup").set({reset:true});store.set("ckHide_"+EV,false);L.showChecklist=true;toast("Checklist started over");render(true)},
 markShare:()=>markSetup("share"),
 tour:()=>{L.mtab="live";render(true);L.tourI=0;setTimeout(tourStep,100)},
 tourNext:()=>{L.tourI=(L.tourI||0)+1;if(L.tourI>=TOUR.length){L.tourI=null;store.set("tourDone",true)}tourStep()},
 tourBack:()=>{L.tourI=Math.max(0,(L.tourI||0)-1);tourStep()},
 tourEnd:()=>{L.tourI=null;store.set("tourDone",true);tourStep()},
 moShow:el=>{setState({moment:{id:el.dataset.id,t:now()}});toast("On the TV now")},
 moStop:()=>setState({moment:null}),
 moEdit:el=>{const i=+el.dataset.i;L.moEdit=L.moEdit===i?null:i;Object.keys(L.drafts).filter(k=>/^mo_/.test(k)).forEach(k=>delete L.drafts[k]);render(true)},
 moSave:el=>{const i=+el.dataset.i,list=momentsList();const m=list[i];if(!m)return;const g=(k,d)=>L.drafts[`mo_${k}_${i}`]!=null?L.drafts[`mo_${k}_${i}`]:d;
  list[i]=Object.assign({},m,{name:g("name",m.name).trim()||m.name,title:g("title",m.title),sub:g("sub",m.sub),album:g("album",m.album?"1":"0")==="1",honor:g("honor",m.honor?"1":"0")==="1",wishes:g("wishes",m.wishes?"1":"0")==="1"});
  ER("content/moments").set(list).then(()=>{L.moEdit=null;toast("Moment saved");render(true)})},
 moDel:el=>{const list=momentsList();list.splice(+el.dataset.i,1);ER("content/moments").set(list);L.moEdit=null;render(true)},
 moAdd:()=>{const list=momentsList();list.push({id:"m"+Date.now().toString(36),name:"New moment",title:"Your message here",sub:"",album:true,honor:true,wishes:false});ER("content/moments").set(list).then(()=>{L.moEdit=list.length-1;render(true)})},
 honorUp:el=>{const fs=[...el.files];if(!fs.length)return;L.hUp=true;render(true);let left=fs.length;
  fs.forEach(f=>shrinkImage(f,1280,.72,full=>shrinkImage(f,360,.6,thumb=>{const k=ER("honor").push().key;ER("honorFull/"+k).set(full).then(()=>ER("honor/"+k).set({thumb,t:Date.now()})).then(()=>{if(--left===0){L.hUp=false;toast("Photos added");render(true)}})})))},
 honorDel:el=>{ER("honor/"+el.dataset.k).remove();ER("honorFull/"+el.dataset.k).remove()},
 rvToggle:()=>{const r=revealCfg();ER("content/reveal").set({enabled:!r.enabled,kind:r.kind,label:r.label,sub:r.sub||""})},
 rvSave:async()=>{const r=revealCfg();const label=(L.drafts.rv_label!=null?L.drafts.rv_label:r.label).trim()||r.label;const sub=L.drafts.rv_sub!=null?L.drafts.rv_sub:(r.sub||"");
  const ans=L.drafts.rv_answer!=null?L.drafts.rv_answer:((D.secret||{}).revealAnswer!=null?D.secret.revealAnswer:r.answer);
  await ER("content/reveal").set({enabled:true,kind:r.kind,label,sub});await ER("secret/revealAnswer").set(String(ans==null?"":ans));toast("Reveal saved")},
 rvAsk:()=>{L.confirm="reveal";render(true)},
 rvStart:async()=>{const r=revealCfg();const ans=String(L.drafts.rv_answer!=null?L.drafts.rv_answer:((D.secret||{}).revealAnswer!=null?D.secret.revealAnswer:r.answer||""));if(!ans&&r.kind!=="gender")return toast("Enter the answer first");
  const label=(L.drafts.rv_label!=null?L.drafts.rv_label:r.label);const sub=L.drafts.rv_sub!=null?L.drafts.rv_sub:(r.sub||"");
  await ER("secret/revealAnswer").set(ans);L.confirm=null;setState({moment:null,reveal:{t:now(),at:now()+4500,kind:r.kind,label,answer:r.kind==="gender"?"":ans,style:r.kind==="gender"?(ans==="boy"?"boy":"girl"):null,sub}});toast("Revealing on every screen!")},
 rvStop:()=>setState({reveal:null}),
 legal:(el,e)=>{e&&e.preventDefault&&e.preventDefault();L.legal=el.dataset.k;render(true)},
 legalClose:()=>{L.legal=null;render(true)},
 setType:el=>{ER("content/eventType").set(el.value).then(()=>{ER("content/moments").remove();ER("content/reveal").remove();toast("Event type set to "+EVENT_TYPES[el.value].label)})},
 askTypeContent:()=>{L.confirm="typeContent";render(true)},
 loadTypeContent:async()=>{const tpl=templateFor(evType());const u={};["trivia","hunt","cw","sups","tie","supOpts","themeDesc"].forEach(k=>{if(tpl[k]!==undefined)u[k]=tpl[k]});await ER("content").update(u);L.confirm=null;toast("Starter questions loaded");render(true)},
 saveRetention:()=>{const d=Math.max(0,Math.min(365,Math.round(+dv("ret",60)||0)));ER("content/retentionDays").set(d);toast(d?`Photos will be deleted after ${d} days`:"Photos will be kept")},
 saveLegal:()=>{RT("admin/legalName").set((dv("lg_name","")).trim()||null);RT("admin/contact").set((dv("lg_contact","")).trim()||null);toast("Saved")},

 /* ---- custom games ---- */
 copyEl:el=>{const x=document.getElementById(el.dataset.el);copyText(x?x.value:"",x)},
 copyNew:()=>{const d=(L.drafts.cg_desc||"").trim();if(!d)return toast("Describe your game in step 1 first");const x=$("#cgPrompt");if(x)x.value=cgPromptNew(d);copyText(cgPromptNew(d),x)},
 toggleGuide:(el,e)=>{e.preventDefault();L.guideOpen=!L.guideOpen;render(true)},
 pAv:el=>{ER(`players/${L.me}/av`).set({e:el.dataset.e});toast(t("Picture updated"))},
 pSelfie:el=>{const f=el.files[0];if(!f)return;squareImage(f,120,img=>{ER(`players/${L.me}/av`).set({img});toast(t("Picture updated"))})},
 cgTest:el=>{testStart(el.dataset.id);render();setTimeout(()=>{const b=document.querySelector(".bench");b&&b.scrollIntoView({behavior:"smooth",block:"start"})},150)},
 cgTestClose:()=>{testStop();render()},
 cgBots:()=>{T.bots=!T.bots;render()},
 cgReset:()=>testReset(),
 cgMode:async el=>{const kind=el.dataset.kind||"event",id=el.dataset.id,m=el.dataset.m;L.cgMode=id&&m?{kind,id,m}:{};
  if(m==="code")L.drafts["cgc_"+id]=(cgGame(id)||{}).code||"";
  if(m==="qs")Object.keys(L.drafts).filter(k=>k.startsWith(`qs_${kind}_${id}_`)).forEach(k=>delete L.drafts[k]);
  render(true);
  if(m==="qs"){const g=kind==="lib"?libAll()[id]:cgGame(id);if(g&&(!g.schemaJson||g.schemaJson==="{}")){const r=await cgCheck(g.code,cgSettings(g));if(r.ok){const sj=JSON.stringify(r.schema||{});await (kind==="lib"?RT(`library/${id}/schemaJson`):ER(`content/custom/${id}/schemaJson`)).set(sj)}}}},
 cgAskDel:el=>{L.confirm="cgdel:"+el.dataset.id;render()},
 cgDel:el=>{const id=el.dataset.id;if(T.on&&T.gid===id)testStop();ER("content/custom/"+id).remove();L.confirm=null;toast("Game deleted from this event")},
 cgSaveNew:async()=>{const raw=L.drafts.cg_paste||"";if(!raw.trim())return toast("Paste Claude's reply in step 3 first");const code=cgExtractCode(raw);
  L.cgChecking=true;L.cgCheckMsg="";render(true);const r=await cgCheck(code);L.cgChecking=false;
  if(!r.ok){L.cgCheckMsg="This code doesn't work yet: "+r.message+" Copy this message into the same Claude chat, ask it to fix the code, then paste the new reply here.";render(true);return}
  const id="g"+Date.now().toString(36);const desc=(L.drafts.cg_desc||"").trim().split(/\n/)[0].slice(0,140);
  await ER("content/custom/"+id).set({name:(r.title||"Custom game").slice(0,40),desc,code,t:Date.now(),checked:true,uid:newUid(),schemaJson:JSON.stringify(r.schema||{}),settingsJson:"{}"});
  L.drafts.cg_paste="";L.drafts.cg_desc="";L.cgCheckMsg="";toast("Checked and saved. Try it on the test bench.");await waitFor(()=>cgGame(id));testStart(id);render(true);setTimeout(()=>{const b=document.querySelector(".bench");b&&b.scrollIntoView({behavior:"smooth",block:"start"})},200)},
 cgSaveCode:async el=>{const id=el.dataset.id,g=cgGame(id);const code=cgExtractCode(L.drafts["cgc_"+id]||"");L.cgChecking=true;render(true);const r=await cgCheck(code,cgSettings(g));L.cgChecking=false;
  if(!r.ok){toast("Not saved. "+r.message);render(true);return}await ER("content/custom/"+id).update({code,name:(r.title||g.name).slice(0,40),schemaJson:JSON.stringify(r.schema||{}),checked:true,tested:false});L.cgMode={};toast("Saved. Test it again before the party.");await waitFor(()=>(cgGame(id)||{}).code===code);testStart(id);render(true)},
 cgSaveEdit:async el=>{const kind=el.dataset.kind||"event",id=el.dataset.id;const g=kind==="lib"?libAll()[id]:cgGame(id);if(!g)return;const raw=L.drafts[`cgp_${kind}_${id}`]||"";if(!raw.trim())return toast("Paste Claude's reply first");
  const code=cgExtractCode(raw);L.cgChecking=true;render(true);const r=await cgCheck(code,cgSettings(g));L.cgChecking=false;
  if(!r.ok){toast("Not saved. "+r.message);render(true);return}
  const upd={code,name:(r.title||g.name).slice(0,40),schemaJson:JSON.stringify(r.schema||{})};
  if(kind==="lib")await RT("library/"+id).update(Object.assign(upd,{t:Date.now()}));else await ER("content/custom/"+id).update(Object.assign(upd,{checked:true,tested:false}));
  L.drafts[`cgp_${kind}_${id}`]="";L.drafts[`cge_${kind}_${id}`]="";L.cgMode={};if(L.cgErr&&L.cgErr.gid===id)L.cgErr=null;T.lastErr=null;
  if(kind==="lib")toast("Library game updated. Events that add it from now on get this version.");else{toast("Updated. Testing the new version.");await waitFor(()=>(cgGame(id)||{}).code===code);testStart(id)}render(true)},
 qsImg:el=>{const f=el.files[0];if(!f)return;shrinkImage(f,420,.72,img=>{L.drafts[el.dataset.k]=img;render(true)})},
 qsImgClear:el=>{L.drafts[el.dataset.k]="";render(true)},
 qsSave:async el=>{const kind=el.dataset.kind,id=el.dataset.id;const g=kind==="lib"?libAll()[id]:cgGame(id);if(!g)return;const sc=cgSchema(g),cur=cgSettings(g),out={};
  Object.keys(sc).forEach(k=>{const d=L.drafts[`qs_${kind}_${id}_${k}`];let v=d!=null?d:(k in cur?cur[k]:sc[k].default);const t2=sc[k].type;
   if(t2==="number"){v=+v;if(isNaN(v))v=+sc[k].default||0;if(sc[k].min!=null)v=Math.max(sc[k].min,v);if(sc[k].max!=null)v=Math.min(sc[k].max,v)}
   else if(t2==="toggle")v=v===true||v==="true";else if(t2==="lines")v=Array.isArray(v)?v:String(v||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);else v=v==null?"":String(v);out[k]=v});
  const sj=JSON.stringify(out);if(sj.length>900000)return toast("The pictures are too large. Try smaller ones.");
  await (kind==="lib"?RT(`library/${id}/settingsJson`):ER(`content/custom/${id}/settingsJson`)).set(sj);
  Object.keys(L.drafts).filter(k=>k.startsWith(`qs_${kind}_${id}_`)).forEach(k=>delete L.drafts[k]);L.cgMode={};toast("Settings saved");
  if(kind==="event"){if(T.on&&T.gid===id)testDraw();feedFrames()}render(true)},
 qsDefaults:async el=>{const kind=el.dataset.kind,id=el.dataset.id;await (kind==="lib"?RT(`library/${id}/settingsJson`):ER(`content/custom/${id}/settingsJson`)).set("{}");Object.keys(L.drafts).filter(k=>k.startsWith(`qs_${kind}_${id}_`)).forEach(k=>delete L.drafts[k]);toast("Back to the default settings");render(true)},
 libAdd:async el=>{const u=el.dataset.uid,g=libAll()[u];if(!g)return;const id="g"+Date.now().toString(36);
  if(!g.schemaJson||g.schemaJson==="{}"){const r=await cgCheck(g.code,cgSettings(g));if(r.ok)g.schemaJson=JSON.stringify(r.schema||{})}
  await ER("content/custom/"+id).set({name:g.name,desc:g.desc||"",code:g.code,uid:u,schemaJson:g.schemaJson||"{}",settingsJson:g.settingsJson||"{}",checked:true,tested:true,wentLive:true,t:Date.now()});toast(`"${g.name}" added to this event`)},
 libRemove:el=>{RT(`library/${el.dataset.uid}/removed`).set(true);toast("Removed from the library")},
 libRestore:el=>{RT(`library/${el.dataset.uid}/removed`).set(false);toast("Back in the library")},
 cgFix:el=>{L.mtab="custom";L.cgMode={kind:"event",id:el.dataset.id,m:el.dataset.m||"edit"};render(true)},
 cgTakeOver:()=>{const gid=liveCg();if(gid)setState({cgRun:{id:gid,runner:CG.session}})},
 cgRestart:async()=>{const gid=liveCg();if(!gid)return;CG.liveState=null;CGR.setupAsked=false;await ER("cg/"+gid).remove();setState({cgRun:{id:gid,runner:CG.session}});toast("Starting the game over")},

 /* ---- host ---- */
 hostPin:async()=>{const h=await hashPin(dv("hpin",""));if(h===L.masterHash){store.set("host",h);L.hostOK=true;L.drafts.hpin="";render()}else toast("That PIN isn't right")},
 hostTab:el=>{L.hostTab=el.dataset.k;L.confirm=null;render()},
 hostOut:()=>{store.set("host",null);L.hostOK=false;render()},
 openMod:el=>{store.set("mod_"+el.dataset.k,L.masterHash);location.href=eventURL(el.dataset.k,"moderator")},
 setMain:el=>RT("admin/defaultEvent").set(el.dataset.k),
 askDel:el=>{L.confirm="del:"+el.dataset.k;render()},
 delEvent:el=>{const k=el.dataset.k;ER("",k).remove();RT("index/"+k).remove();if(D.admin.defaultEvent===k)RT("admin/defaultEvent").remove();L.confirm=null;toast("Event deleted")},
 newEvent:async()=>{const name=(dv("ne_name","")).trim();if(!name)return toast("Give the event a name");const pin=(dv("ne_pin","")).trim();if(pin.length<4)return toast("Choose a PIN with at least 4 digits");
  let code=(dv("ne_code","")).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);if(!code){const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";code=[...Array(5)].map(()=>A[rnd(A.length)]).join("")}
  if((D.events||{})[code])return toast("That code is taken. Try another.");
  const from=dv("ne_from","starter"),type=dv("ne_type","baby");let content=from.startsWith("t:")?clone(((D.themes||{})[from.slice(2)]||{}).content||BLANK_CONTENT):from==="blank"?clone(BLANK_CONTENT):templateFor(type,name);
  content.eventType=type;if(from==="blank")content.title=name;
  await createEvent(code,name,content,await hashPin(pin),false);["ne_name","ne_code","ne_pin"].forEach(k=>L.drafts[k]="");toast("Event "+code+" created");render()},
 renameTheme:el=>{const id=el.dataset.id;RT("themes/"+id+"/name").set((dv("tn_"+id,"")).trim()||"Untitled theme").then(()=>toast("Renamed"))},
 dupTheme:el=>{const th=(D.themes||{})[el.dataset.id];if(th)RT("themes").push({name:th.name+" copy",content:clone(th.content),t:Date.now()})},
 askDelTheme:el=>{L.confirm="dt:"+el.dataset.id;render()},
 delTheme:el=>{RT("themes/"+el.dataset.id).remove();L.confirm=null},
 changeHostPin:async()=>{const p=(dv("newHost","")).trim();if(p.length<6)return toast("Use at least 6 digits");if(/^(\d)\1+$|^(0123|1234|2345|0102)/.test(p))return toast("Pick something harder to guess");const h=await hashPin(p);await RT("admin/pinHash").set(h);store.set("host",h);L.drafts.newHost="";toast("Host PIN saved");render()},

 /* ---- print ---- */
 printSel:el=>{L.printSel[el.dataset.k]=el.checked;render()},
 print:()=>window.print()
};
function clearMyNameVotes(tm){const sg=(D.sugg||{})[tm]||{};Object.keys(sg).forEach(k=>{if((sg[k].v||{})[L.me])ER(`sugg/${tm}/${k}/v/${L.me}`).remove()})}

/* balanced secret words: keep about 4 in 10 first letters as vowels */
function pickWord(){const firsts=ids().map(i=>P(i).word[0]);const vow=firsts.filter(l=>VOWELS.includes(l)).length;
 const pool=(firsts.length===0||vow/firsts.length<.38?VOWELS:CONS_ORDER).split("");
 const cnt=l=>firsts.filter(x=>x===l).length,min=Math.min(...pool.map(cnt)),ls=pool.filter(l=>cnt(l)===min);const l=ls[rnd(ls.length)];const ws=WORDBANK[l];return ws[rnd(ws.length)]}

/* trivia: majority per pod; tied pods get 15 seconds to revote; still tied means no points */
function resolveTrivia(finish){
 const list=TRV(),qi=st().tvQ||0,it=list[qi];if(!it)return;const opts=it.o,ans=it.a,pods=st().pods||{},votes=D.tv[qi]||{},rev=(D.tvr||{})[qi]||{},tie=st().tvTie||{};
 const keys=[...new Set(Object.values(pods))];const results={},newTie={};
 keys.forEach(pk=>{if((votes._res||{})[pk])return;if(finish&&!tie[pk])return;const mem=Object.keys(pods).filter(i=>pods[i]===pk);const src=finish?rev:votes;
  const tl=opts.map(()=>0);mem.forEach(i=>{if(src[i]!=null)tl[src[i]]++});const max=Math.max(...tl);
  if(max===0){results[pk]={tie:true,none:true};return}
  const tops=tl.map((n,k)=>n===max?k:-1).filter(k=>k>=0);
  if(tops.length>1){if(finish)results[pk]={tie:true};else newTie[pk]=true;return}
  const pick=tops[0],correct=pick===ans;results[pk]={pick,correct};
  const live=mem.filter(i=>D.players[i]);if(correct)award(live,pv("trivia"),pk[0],pv("trivia"));
  live.forEach(pid=>ER("streak/"+pid).transaction(v=>correct?(v||0)+1:0,(e,ok,snap)=>{if(ok&&snap&&snap.val()>=3)badge(pid,"streak3")}))});
 Object.keys(results).forEach(pk=>{if(results[pk].tie)Object.keys(pods).filter(i=>pods[i]===pk&&D.players[i]).forEach(pid=>ER("streak/"+pid).set(0))});
 const u={};Object.keys(results).forEach(pk=>u["tv/"+qi+"/_res/"+pk]=results[pk]);
 if(Object.keys(newTie).length){u["state/tvPhase"]="revote";u["state/tvTie"]=newTie;u["state/tvRevoteEnd"]=now()+15000}
 else{u["state/tvPhase"]="done";u["state/tvTie"]=null;const all=Object.assign({},votes._res||{},results);const right=Object.values(all).filter(r=>r.correct).length;
  if(right)u["state/celebrate"]={text:`${right} pod${right>1?"s":""} got it right!`,t:now()}}
 ER().update(u)}
let finishing=false;
function modTick(){const s=st();if(VIEW!=="moderator"||!L.modOK)return;
 if(s.live==="trivia"&&s.tvPhase==="revote"&&s.tvRevoteEnd&&now()>s.tvRevoteEnd+1500&&!finishing){finishing=true;resolveTrivia(true);setTimeout(()=>finishing=false,4000)}
 botTick()}
setInterval(modTick,1000);

/* superlatives: pair agrees -> each of the pair scores; otherwise the team that agrees more strongly wins */
function resolveSup(){
 const qi=st().supQ||0,v=D.sup[qi]||{};if(v._res)return;const [a,b]=st().supPair||[];
 const pa=a?v[a]:null,pb=b?v[b]:null,pts=pv("sup"),opts=SUPOPT();
 const count=tm=>{const m=members(tm).filter(i=>i!==a&&i!==b&&v[i]!=null);const c=opts.map(()=>0);m.forEach(i=>c[v[i]]=(c[v[i]]||0)+1);const top=c.indexOf(Math.max(...c));return{top:top<0?0:top,pct:m.length?Math.round(100*c[top]/m.length):0}};
 const A=count("A"),B=count("B");let msg,win=null;
 if(pa!=null&&pa===pb){award([a,b],pts,null,0);msg=`The pair agreed on ${opts[pa]}. ${P(a).name} and ${P(b).name} each get ${pts} points.`}
 else if(A.pct===B.pct)msg=`The teams tied at ${A.pct}%. No point this round.`;
 else{win=A.pct>B.pct?"A":"B";award(members(win),pts,win,pts);msg=`${teamName(win)} agreed more strongly and takes the round. Each member gets ${pts} points.`}
 ER(`sup/${qi}/_res`).transaction(cur=>cur?undefined:{pa:pa==null?null:pa,pb:pb==null?null:pb,na:a?P(a).name:"",nb:b?P(b).name:"",topA:A.top,pctA:A.pct,topB:B.top,pctB:B.pct,msg},(e,ok)=>{if(ok&&win)setState({entrance:{team:win,label:"Wins the round",t:now()}})})}

/* ---------- rehearsal bots ---------- */
const BOT_NAMES=["Aunt May","Uncle Ray","Cousin Tia","Grandma Lou","Jordan","Kayla","Marcus","Nina","Omar","Priya","Quinn","Rosa","Sam","Tasha","Victor","Wendy"];
function seedBots(code){const u={};const letters=["A","S","E","T","I","R","O","N","U","L","A","D","E","M","O","P"];
 BOT_NAMES.forEach((n,i)=>{const id="bot"+String(i).padStart(2,"0"),fq=rnd(FQ.length);const ws=WORDBANK[letters[i]];
  u[`events/${code}/players/${id}`]={name:n,m:1+rnd(12),d:1+rnd(28),fq,fa:rnd(FQ[fq].o.length),word:ws[rnd(ws.length)],t:Date.now()+i,bot:true,av:{e:AVATARS[i%AVATARS.length]}};u[`events/${code}/scores/${id}`]=0});
 ["Can't wait to meet the little one!","You two are going to be amazing parents.","Wishing you sweet dreams and lots of giggles."].forEach((tx,i)=>u[`events/${code}/wishes/w${i}`]={pid:"bot0"+i,name:BOT_NAMES[i],text:tx,t:Date.now()+i});
 return db.ref(ROOT).update(u)}
function botTick(){if(!D.meta||!D.meta.practice)return;const s=st(),bots=ids().filter(i=>P(i).bot);if(!bots.length)return;
 if(s.countdown&&now()<s.countdown.at)return;
 if(s.live==="trivia"){const list=TRV(),qi=s.tvQ||0,it=list[qi];if(it){if((s.tvPhase||"vote")==="vote"){const v=D.tv[qi]||{};bots.filter(b=>v[b]==null&&podOf(b)).forEach(b=>{if(Math.random()<.2)ER(`tv/${qi}/${b}`).set(Math.random()<.62?it.a:rnd(4))})}
  else if(s.tvPhase==="revote"){const v=(D.tvr||{})[qi]||{},tie=s.tvTie||{};bots.filter(b=>v[b]==null&&tie[podOf(b)]).forEach(b=>{if(Math.random()<.3)ER(`tvr/${qi}/${b}`).set(Math.random()<.6?it.a:rnd(4))})}}}
 if(s.live==="sup"){const qi=s.supQ||0,v=D.sup[qi]||{};if(!v._res)bots.filter(b=>v[b]==null).forEach(b=>{if(Math.random()<.2)ER(`sup/${qi}/${b}`).set(Math.random()<.6?0:1)})}
 if(s.live==="split"&&Math.random()<.06){const b=bots[rnd(bots.length)],tm=teamOf(b),names=["The Night Owls","Rattle Rousers","Garden Gnomes","Lullaby Legends","Snack Pack","Bottle Rockets"];ER("sugg/"+tm).push({name:names[rnd(names.length)],by:b,v:{[b]:true}})}
 const items=HUNTS();if(items.length&&Math.random()<.05){const b=bots[rnd(bots.length)],k=rnd(items.length),h=(D.huntAll||{})[b]||{};if(h[k]!=="ok"){ER(`hunt/${b}/${k}`).set("ok");ER(`photos/${b}_${k}`).set({who:b,k,img:null,t:Date.now(),checked:false});award([b],pv("hunt"),teamOf(b),pv("hunt"))}}
 if(s.live==="bingo"){const round=s.bingoRound||1,called=s.called||[],cl=(D.claims||{})[round]||{};bots.forEach(b=>{if(!cl[b]&&hasBingo(cardFor(b,round),n=>called.includes(n)))ER(`claims/${round}/${b}`).set({t:Date.now(),ok:false})})}
 if(s.live==="longword"&&s.lwEnd&&now()>s.lwEnd)bots.forEach(b=>{const lw=(D.lwAll||{})[b]||{};if(!lw.word&&Math.random()<.3){const w=["TEA","NEST","PETAL","GARDEN","LANTERN","BLOSSOM"][rnd(6)],p=w.length*pv("longword");ER(`lw/${b}`).update({word:w,pts:p});award([b],p,teamOf(b),p)}});
 if(Math.random()<.04)ER("reactions").push({e:REACTIONS[rnd(REACTIONS.length)],t:SERVER_TS()})}

/* ---------- crossword typing ---------- */
document.addEventListener("click",e=>{const li=e.target.closest&&e.target.closest("[data-clue]");if(!li)return;L.cwAct=+li.dataset.clue;render();const p=CWG().placed[L.cwAct];const el=document.querySelector(`[data-cell="${p.r},${p.c}"]`);el&&el.focus()});
document.addEventListener("click",e=>{if(e.target.classList&&e.target.classList.contains("sheet-bg")){L.settings=false;render()}if(e.target.classList&&e.target.classList.contains("lb")){L.lightbox=null;render()}});
document.addEventListener("focusin",e=>{const k=e.target.dataset&&e.target.dataset.cell;if(!k)return;const G=CWG(),[r,c]=k.split(",").map(Number);
 const inW=p=>p.d==="A"?r===p.r&&c>=p.c&&c<p.c+p.w.length:c===p.c&&r>=p.r&&r<p.r+p.w.length;
 if(L.cwAct!=null&&G.placed[L.cwAct]&&inW(G.placed[L.cwAct]))return;L.cwAct=G.placed.findIndex(inW);
 document.querySelectorAll("[data-cell]").forEach(el=>{if(!el.classList.contains("done"))el.classList.toggle("hl",cellsOf(G.placed[L.cwAct]).includes(el.dataset.cell))});
 document.querySelectorAll("[data-clue]").forEach(el=>el.classList.toggle("act",+el.dataset.clue===L.cwAct))});
document.addEventListener("input",e=>{
 if(e.target.id==="lwWord"){const v=e.target.value.toUpperCase().replace(/[^A-Z]/g,"");const pr=$("#lwPrev");if(pr){const have=myTiles().map(x=>x.l);pr.innerHTML=v.split("").map(ch=>{const k=have.indexOf(ch);const ok=k>=0;if(ok)have.splice(k,1);return `<span class="tile sm pop ${ok?"":"miss"}">${ch}</span>`}).join("")}return}
 if(["jName","jDay"].includes(e.target.id)){draftFromForm();return}
 const k=e.target.dataset&&e.target.dataset.cell;if(!k||e.target.readOnly)return;
 const v=e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(-1);e.target.value=v;L.cwEntry[k]=v;store.set("cw_"+EV,L.cwEntry);
 if(v){e.target.classList.remove("pop");void e.target.offsetWidth;e.target.classList.add("pop");SND.pop()}
 const G=CWG(),solved=D.mine.cw||{};const cellOK=(kk,ch)=>L.cwEntry[kk]===ch||G.placed.some(q=>solved[q.id]&&cellsOf(q).includes(kk));
 G.placed.forEach(p=>{if(solved[p.id]||L.cwSent[L.me+"|"+p.id])return;if(cellsOf(p).every((kk,j)=>cellOK(kk,p.w[j]))){L.cwSent[L.me+"|"+p.id]=1;
  const people=[L.me].concat(L.cwPartners.filter(i=>D.players[i]));
  people.forEach(pid=>ER(`cw/${pid}/${p.id}`).transaction(cur=>cur?undefined:true,(err,ok)=>{if(ok){award([pid],pv("crossword"),teamOf(pid),pv("crossword"));
   if(pid===L.me&&G.placed.every(q=>solved[q.id]||L.cwSent[L.me+"|"+q.id]))badge(pid,"cwAll")}}));
  toast(t("Solved: {w}",{w:p.w}));SND.ding();buzz(50)}});
 if(v&&L.cwAct!=null){const p=G.placed[L.cwAct],cs=cellsOf(p),i=cs.indexOf(k);if(i>=0&&i<cs.length-1){const nx=document.querySelector(`[data-cell="${cs[i+1]}"]`);nx&&nx.focus()}}});
document.addEventListener("change",e=>{if(e.target.id==="jMonth")draftFromForm()});


