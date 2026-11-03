/* ================= Host Mode — core =================
   Firebase settings: Host Mode's database. The project ID below still reads spark-drinks; Firebase IDs can't be renamed, and guests never see it. Games live under "partygames" in the database.
   DEFAULT_MASTER_PIN works for the host console until you set your own there. */
var FIREBASE_CONFIG={apiKey:"AIzaSyAMWgxbGsq4yiQrsuLYJ1pEb5Qc-8o4zg0",authDomain:"spark-drinks-2d185.firebaseapp.com",databaseURL:"https://spark-drinks-2d185-default-rtdb.firebaseio.com",projectId:"spark-drinks-2d185",appId:"1:497288236361:web:468bd29601daa92e621e98"};
var DEFAULT_MASTER_PIN="0102";
var ROOT="partygames";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MON_ES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const store={get(k,d){try{const v=localStorage.getItem("pg_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("pg_"+k,JSON.stringify(v))}catch(e){}}};
const arr=v=>Array.isArray(v)?v.filter(x=>x!=null):(v&&typeof v==="object"?Object.keys(v).sort((a,b)=>a-b).map(k=>v[k]).filter(x=>x!=null):[]);
const clone=o=>JSON.parse(JSON.stringify(o));
const reduceMotion=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

const QS=new URLSearchParams(location.search);
const EV=((QS.get("e")||"").toUpperCase().replace(/[^A-Z0-9-]/g,""))||null;
/* planner space: client, teammate and feedback links carry ?p=<planner id>; the planner portal sets it after sign-in */
let PSP=/^[A-Za-z0-9_-]{1,64}$/.test(QS.get("p")||"")?"planners/"+QS.get("p")+"/":"";
const VIEW=(()=>{const h=location.hash.slice(1);if(new URLSearchParams(location.search).has("vendor"))return "vendor";if(new URLSearchParams(location.search).has("mate"))return "mate";if(new URLSearchParams(location.search).has("client"))return "client";if(new URLSearchParams(location.search).has("fb"))return "fb";{const q=new URLSearchParams(location.search);if(q.has("p")&&(q.has("show")||q.has("inquire")))return "show"}return ["host","planner","support","signin","moderator","screen","album","print","keepsake","new"].includes(h)?h:"guest"})();
const baseURL=()=>location.origin+location.pathname;
const eventURL=(code,hash)=>baseURL()+"?"+(window.__HMPDEMO?"pdemo=1&":"")+"e="+encodeURIComponent(code)+(hash?"#"+hash:"");

const D={meta:null,content:null,state:{},players:{},scores:{},team:{A:0,B:0},mine:{hunt:{},lw:{},cw:{},badges:{},wishes:{}},
 photos:{},tv:{},tvr:{},sup:{},claims:{},album:{},wishes:{},sugg:{},lwAll:{},events:{},themes:{},admin:{},huntAll:{}};
const L={lang:store.get("lang","en"),large:store.get("large",false),hc:store.get("hc",false),sound:store.get("sound",true),vib:store.get("vib",true),
 me:EV?store.get("active_"+EV,null):null,profiles:EV?store.get("profiles_"+EV,[]):[],joining:false,ptab:"home",mtab:"live",ctab:"trivia",
 modOK:false,hostOK:false,lwSel:null,lwNew:-1,cwAct:null,cwEntry:EV?store.get("cw_"+EV,{}):{},cwPartners:[],cwSent:{},marks:EV?store.get("marks_"+EV,{}):{},
 dict:null,connected:false,offline:false,offset:0,loaded:false,missing:false,drafts:{},lightbox:null,settings:false,lastKey:"",lastLive:null,
 masterHash:null,defaultHash:null,cmode:{},albumOn:false,recapPhotos:null,seenBadges:null,seenRes:{},confirm:null,printSel:{door:true,table:true,hints:true,key:true}};
let db=null;
const RT=p=>db.ref(ROOT+"/"+p);
const ER=(p,code)=>db.ref(ROOT+"/events/"+(code||EV)+(p?"/"+p:""));
const SERVER_TS=()=>(window.firebase&&firebase.database&&firebase.database.ServerValue)?firebase.database.ServerValue.TIMESTAMP:Date.now();
const now=()=>Date.now()+L.offset;

/* translations */
function t(s,v){let o=(L.lang==="es"&&ES[s])||s;if(v)o=o.replace(/\{(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:m);return o}
const loc=(item,field)=>{if(L.lang==="es"&&item&&item.es){const e=typeof item.es==="string"?item.es:item.es[field];if(e!=null&&e!=="")return e}return item?item[field]:""};
const gname=g=>g?(L.lang==="es"?g.es:g.name):"";

/* hashing for PINs (kept out of plain text in the database) */
async function hashPin(pin){const s="pg|"+String(pin).trim();
 try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}
 catch(e){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return "x"+h}}

/* content accessors */
const C=()=>D.content||DEFAULT_CONTENT;
const enabledGames=()=>GAMES.filter(g=>(C().games||ALL_GAMES_ON)[g.id]!==false);
const TRV=()=>arr(C().trivia).map(x=>Object.assign({},x,{o:arr(x.o),es:x.es?Object.assign({},x.es,{o:arr(x.es.o)}):null}));
const HUNTS=()=>arr(C().hunt);
const CWW=()=>arr(C().cw);
const SUPS=()=>arr(C().sups);
const SUPOPT=()=>{const o=arr(C().supOpts).filter(Boolean);return o.length>=2?o:["Guest of honor 1","Guest of honor 2"]};
const pv=k=>{const p=C().pv||{};return p[k]!=null?+p[k]:DEFAULT_PV[k]};
const trivQ=it=>loc(it,"q");
const trivO=it=>L.lang==="es"&&it.es&&arr(it.es.o).length===4?arr(it.es.o):arr(it.o);
const supQ=it=>{const s=L.lang==="es"?(typeof it.es==="string"&&it.es?it.es:it.q):it.q;return s.charAt(0).toLowerCase()+s.slice(1)};
const supLine=it=>L.lang==="es"&&it.es?`${t("Who is most likely to")} ${supQ(it)}`:`Who is most likely to ${supQ(it)}`;

/* state helpers */
const st=()=>D.state||{};
const P=id=>D.players[id]||{name:"Guest",m:1,d:1,fq:0,fa:0,word:"APPLE",t:0};
const ids=()=>Object.keys(D.players).sort((a,b)=>(D.players[a].t||0)-(D.players[b].t||0));
const DAYS_IN=[31,29,31,30,31,30,31,31,30,31,30,31];
const fixDay=(m,d)=>Math.min(DAYS_IN[(m||1)-1],Math.max(1,+d||1));
/* Seasons: "month" = Dec–May is winter & spring; "dates" = winter starts Dec 21, summer starts Jun 21 */
function inWinterSpring(m,d){if((st().seasonMode||"month")==="dates"){if(m===12)return d>=21;if(m===6)return d<=20;return m<=5}return m===12||m<=5}
/* ---- N teams: up to 7 are "teams", 8+ are "pods" (max 12) ---- */
const NEWSPLIT=m=>m==="random"||m==="prox"||m==="hand";
const TKEYS="ABCDEFGHIJKL".split("");
const nTeams=()=>Math.min(12,Math.max(2,+st().nTeams||2));
const teamKeys=n=>TKEYS.slice(0,n||nTeams());
const grpWord=n=>(n||nTeams())>7?"pod":"team";
const TCOL=["var(--sky)","var(--flame)","#3aa56b","#8a5cc9","#d9578a","#2aa6a6","#c9a227","#6b7a8f","#b5533c","#5a9a2a","#3b5bdb","#a0522d"];
function hashN(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function winnerKey(){let best=-Infinity,w=null,tie=false;teamKeys().forEach(k=>{const v=D.team[k]||0;if(v>best){best=v;w=k;tie=false}else if(v===best)tie=true});return tie?null:w}
function tiedTop(){const ks=teamKeys();const m=Math.max(...ks.map(k=>D.team[k]||0));return ks.filter(k=>(D.team[k]||0)===m)}
const captainOf=tm=>{const c=(st().captains||{})[tm];return c&&D.players[c]&&teamOf(c)===tm?c:null};
function teamOf(id){const o=(st().override||{})[id];if(o&&teamKeys().includes(o))return o;const p=P(id);
 if(NEWSPLIT(st().split)||nTeams()>2)return teamKeys()[hashN(String(id))%nTeams()];
 if((st().split||"seasons")==="seasons")return inWinterSpring(p.m,p.d)?"A":"B";return p.d%2?"A":"B"}
function teamName(tm){const n=(st().teamNames||{})[tm];if(n)return n;const s=st().split||"seasons";
 if(NEWSPLIT(s)||nTeams()>2){const i=TKEYS.indexOf(tm)+1,pod=nTeams()>7;return (L.lang==="es"?(pod?"Grupo ":"Equipo "):(pod?"Pod ":"Team "))+i}
 if(L.lang==="es")return s==="seasons"?(tm==="A"?"Invierno y primavera":"Verano y otoño"):(tm==="A"?"Cumpleaños impares":"Cumpleaños pares");
 return s==="seasons"?(tm==="A"?"Winter & Spring":"Summer & Fall"):(tm==="A"?"Odd birthdays":"Even birthdays")}
const members=tm=>ids().filter(i=>teamOf(i)===tm);
function makePods(){const out={};teamKeys().forEach(tm=>{const m=members(tm);const n=Math.max(1,Math.ceil(m.length/8));m.forEach((x,k)=>out[x]=tm+(k%n+1))});return out}
const podOf=id=>(st().pods||{})[id]||null;
const podMembers=pk=>Object.keys(st().pods||{}).filter(i=>st().pods[i]===pk&&D.players[i]);
const score=id=>D.scores[id]||0;
const ranked=()=>ids().sort((a,b)=>score(b)-score(a));
const letter=n=>"BINGO"[Math.floor((n-1)/15)];
const fmtLeft=end=>{const s=Math.max(0,Math.round((end-now())/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const bday=p=>L.lang==="es"?`${p.d} de ${MON_ES[p.m-1]}`:`${MON[p.m-1]} ${p.d}`;
function av(id,size){const p=P(id),a=p.av||{};const s=size?` style="width:${size}px;height:${size}px;font-size:${Math.round(size*.58)}px"`:"";
 return a.img?`<span class="av"${s}><img src="${a.img}" alt=""></span>`:`<span class="av"${s}>${esc(a.e||(p.name||"?")[0])}</span>`}

let toastT;function toast(m){const el=$("#toast");if(!el)return;el.textContent=m;el.hidden=false;el.classList.remove("in");void el.offsetWidth;el.classList.add("in");clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2800)}

/* points: every point goes to the person; team points are passed separately so a pod's win counts once */
function award(pids,pts,team,teamPts){if(!db)return;pids.forEach(id=>ER("scores/"+id).transaction(v=>(v||0)+pts));if(team&&teamPts)ER("team/"+team).transaction(v=>(v||0)+teamPts)}
function badge(pid,id){if(db)ER("badges/"+pid+"/"+id).transaction(v=>v?undefined:Date.now())}

/* ---------- theme ---------- */
function applyTheme(){const c=(C().colors)||{};["rose","flame","gold","violet","leaf"].forEach(k=>{if(c[k])document.documentElement.style.setProperty("--"+k,c[k])});
 const r=document.documentElement;r.classList.toggle("large",!!L.large);r.classList.toggle("hc",!!L.hc);r.lang=L.lang==="es"?"es":"en";
 document.title=(VIEW==="host"?"Host Mode":C().title||"Host Mode")+(VIEW==="moderator"?" · Moderator":VIEW==="screen"?" · Big screen":VIEW==="host"?" · Host":"")}
function paletteFrom(src,cb){const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");x.drawImage(img,0,0,64,64);
 const d=x.getImageData(0,0,64,64).data,b=[...Array(18)].map(()=>({w:0,r:0,g:0,bl:0}));
 for(let i=0;i<d.length;i+=4){const r=d[i]/255,g=d[i+1]/255,bl=d[i+2]/255,mx=Math.max(r,g,bl),mn=Math.min(r,g,bl),s=mx?(mx-mn)/mx:0;if(s<.45||mx<.4)continue;
  let h;if(mx===r)h=((g-bl)/(mx-mn))%6;else if(mx===g)h=(bl-r)/(mx-mn)+2;else h=(r-g)/(mx-mn)+4;h=(h*60+360)%360;const o=b[Math.floor(h/20)],w=s*mx;o.w+=w;o.r+=d[i]*w;o.g+=d[i+1]*w;o.bl+=d[i+2]*w}
 const top=b.map((o,k)=>({...o,k})).filter(o=>o.w>0).sort((p,q)=>q.w-p.w);const pick=[];
 for(const o of top){if(pick.every(p=>Math.min(Math.abs(p.k-o.k),18-Math.abs(p.k-o.k))>=2))pick.push(o);if(pick.length===5)break}
 const hex=o=>"#"+[o.r,o.g,o.bl].map(v=>Math.round(v/o.w).toString(16).padStart(2,"0")).join("");
 const near=h=>pick.slice().sort((a,b)=>Math.min(Math.abs(a.k-h),18-Math.abs(a.k-h))-Math.min(Math.abs(b.k-h),18-Math.abs(b.k-h)))[0];
 const out={};if(pick.length){out.rose=hex(near(17));out.flame=hex(near(1));out.gold=hex(near(2.5));out.violet=hex(near(14));out.leaf=hex(near(6))}cb(out)};img.src=src}
function shrinkImage(file,max,q,cb){const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",q))};img.onerror=()=>toast("That file isn't a photo we can read");img.src=fr.result};fr.readAsDataURL(file)}
function squareImage(file,size,cb){const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const m=Math.min(img.width,img.height);const c=document.createElement("canvas");c.width=c.height=size;c.getContext("2d").drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,size,size);cb(c.toDataURL("image/jpeg",.7))};img.src=fr.result};fr.readAsDataURL(file)}

/* ---------- sound, haptics, confetti ---------- */
let AC=null;
function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==="suspended")AC.resume().catch(()=>{});return AC}
document.addEventListener("pointerdown",()=>audio(),{passive:true});
function tone(f,d,type,vol,delay){const a=AC;if(!a||a.state!=="running"||!L.sound)return;const o=a.createOscillator(),g=a.createGain();o.type=type||"sine";o.frequency.value=f;const t0=a.currentTime+(delay||0);
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol||.16,t0+.012);g.gain.exponentialRampToValueAtTime(.0008,t0+(d||.15));o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+(d||.15)+.05)}
const SND={tick:()=>{tone(660,.14,"triangle",.2)},go:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.6,"triangle",.15,i*.07)),
 win:()=>[784,988,1175,1568].forEach((f,i)=>tone(f,.4,"sine",.14,i*.09)),ding:()=>{tone(988,.2,"sine",.14);tone(1319,.3,"sine",.11,.09)},pop:()=>tone(880,.06,"sine",.06)};
const buzz=p=>{if(!L.vib)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
function confetti(n){if(reduceMotion())return;const c=document.createElement("canvas");c.className="confetti";document.body.appendChild(c);const dpr=Math.min(2,window.devicePixelRatio||1);
 const W=c.width=innerWidth*dpr,H=c.height=innerHeight*dpr;const x=c.getContext("2d");const cs=getComputedStyle(document.documentElement);
 const cols=["--rose","--flame","--gold","--violet","--leaf","--sky"].map(k=>cs.getPropertyValue(k).trim()||"#e8338f");
 const ps=[...Array(n||140)].map(()=>({x:W*(.2+Math.random()*.6),y:H*.62,vx:(Math.random()-.5)*16*dpr,vy:-(Math.random()*16+12)*dpr,r:(Math.random()*7+5)*dpr,c:cols[rnd(cols.length)],a:Math.random()*6,va:(Math.random()-.5)*.35,s:Math.random()<.6}));
 const t0=performance.now();(function f(tm){x.clearRect(0,0,W,H);ps.forEach(p=>{p.vy+=.42*dpr;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;
  if(p.s)x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);else{x.beginPath();x.arc(0,0,p.r/2.4,0,7);x.fill()}x.restore()});if(tm-t0<3400)requestAnimationFrame(f);else c.remove()})(t0)}

/* ---------- crossword layout ---------- */
let cwCache={key:null,val:null};
function buildCW(list){
 const key=JSON.stringify(list.map(x=>x.w));if(cwCache.key===key)return cwCache.val;
 const g={},placed=[];const words=list.map(x=>String(x.w||"").toUpperCase().replace(/[^A-Z]/g,"")).filter(w=>w.length>=2);
 const can=(w,r,c,d)=>{const[dr,dc]=d==="A"?[0,1]:[1,0];let k=0;
  if(g[(r-dr)+","+(c-dc)]||g[(r+dr*w.length)+","+(c+dc*w.length)])return -1;
  for(let i=0;i<w.length;i++){const p=[r+dr*i,c+dc*i],ch=g[p];
   if(ch){if(ch!==w[i])return -1;k++}else if(g[(p[0]+dc)+","+(p[1]+dr)]||g[(p[0]-dc)+","+(p[1]-dr)])return -1}return k};
 const put=(w,r,c,d)=>{const[dr,dc]=d==="A"?[0,1]:[1,0];for(let i=0;i<w.length;i++)g[(r+dr*i)+","+(c+dc*i)]=w[i];placed.push({w,r,c,d})};
 const order=words.slice().sort((a,b)=>b.length-a.length);let rest=[];
 if(order.length){put(order[0],0,0,"A");rest=order.slice(1)}
 for(let pass=0;pass<4;pass++){const left=[];for(const w of rest){let best=null;
   for(const key2 of Object.keys(g)){const[pr,pc]=key2.split(",").map(Number),ch=g[key2];
    for(let i=0;i<w.length;i++){if(w[i]!==ch)continue;for(const d of["A","D"]){const r=d==="A"?pr:pr-i,c=d==="A"?pc-i:pc;const k=can(w,r,c,d);if(k>0&&(!best||k>best[0]))best=[k,r,c,d]}}}
   if(best)put(w,best[1],best[2],best[3]);else left.push(w)}rest=left}
 if(!placed.length){cwCache={key,val:{R:0,C:0,placed:[],starts:{},sol:{},unplaced:words}};return cwCache.val}
 const ks=Object.keys(g).map(k=>k.split(",").map(Number));const r0=Math.min(...ks.map(k=>k[0])),c0=Math.min(...ks.map(k=>k[1]));
 const Rr=Math.max(...ks.map(k=>k[0]))-r0+1,Cc=Math.max(...ks.map(k=>k[1]))-c0+1;
 placed.forEach(p=>{p.r-=r0;p.c-=c0;const idx=list.findIndex(x=>String(x.w||"").toUpperCase().replace(/[^A-Z]/g,"")===p.w);p.id=idx;p.item=list[idx]});
 const starts={};let n=0;placed.slice().sort((a,b)=>a.r-b.r||a.c-b.c).forEach(p=>{const k=p.r+","+p.c;if(!starts[k])starts[k]=++n;p.num=starts[k]});
 const sol={};placed.forEach(p=>{for(let i=0;i<p.w.length;i++)sol[p.d==="A"?p.r+","+(p.c+i):(p.r+i)+","+p.c]=p.w[i]});
 cwCache={key,val:{R:Rr,C:Cc,placed,starts,sol,unplaced:rest}};return cwCache.val}
const CWG=()=>buildCW(CWW());
const cellsOf=p=>[...Array(p.w.length)].map((_,i)=>p.d==="A"?p.r+","+(p.c+i):(p.r+i)+","+p.c);
const cwClue=p=>L.lang==="es"&&p.item&&p.item.es?p.item.es:(p.item?p.item.c:"");

/* ---------- bingo ---------- */
function seeded(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}
 return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296}}
function cardFor(id,round){const r=seeded(EV+"|"+id+"|"+round);const cols=[];for(let c=0;c<5;c++){const a=[...Array(15)].map((_,i)=>c*15+i+1);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}cols.push(a.slice(0,5))}cols[2][2]=0;return cols}
function hasBingo(card,isOn){const m=n=>n===0||isOn(n);for(let i=0;i<5;i++){if([0,1,2,3,4].every(j=>m(card[j][i])))return true;if([0,1,2,3,4].every(j=>m(card[i][j])))return true}
 return [0,1,2,3,4].every(j=>m(card[j][j]))||[0,1,2,3,4].every(j=>m(card[j][4-j]))}

/* ---------- QR ---------- */
function qrInto(el,text,size){if(!el)return;el.innerHTML="";if(!window.QRCode){el.textContent=text;return}new QRCode(el,{text,width:size||160,height:size||160,colorDark:"#2a1530",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel?QRCode.CorrectLevel.M:undefined})}
function drawQRs(){document.querySelectorAll("[data-qr]").forEach(el=>{if(el.dataset.done===el.dataset.qr)return;el.dataset.done=el.dataset.qr;qrInto(el,el.dataset.qr,+el.dataset.size||160)})}

/* ---------- download & copy ---------- */
function download(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
function copyText(text,el){const done=()=>toast("Copied");if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>sel())}else sel();
 function sel(){if(el){el.focus();el.select&&el.select()}toast("Select the text and copy it")}}

/* ================= connection, rendering, overlays ================= */
const dv=(k,def)=>L.drafts[k]!=null?L.drafts[k]:(def==null?"":def);

function connect(){
 if(!window.firebase||!FIREBASE_CONFIG.apiKey){L.offline=true;render();return}
 try{firebase.initializeApp(FIREBASE_CONFIG);db=firebase.database()}catch(e){L.offline=true;render();return}
 db.ref(".info/connected").on("value",s=>{L.connected=!!s.val();renderSoon()});
 supMineSubs();
 if(VIEW==="moderator"){try{const a=firebase.auth&&firebase.auth();if(a)a.onAuthStateChanged(u=>{L.navUid=u?u.uid:null;checkAuth();renderSoon()})}catch(e){}}
 db.ref(".info/serverTimeOffset").on("value",s=>{L.offset=s.val()||0});
 hashPin(DEFAULT_MASTER_PIN).then(h=>{L.defaultHash=h;RT("admin").on("value",s=>{D.admin=s.val()||{};L.masterHash=D.admin.pinHash||L.defaultHash;checkAuth();renderSoon()})});
 if(VIEW==="new"){L.loaded=true;renderSoon();return}
 if(VIEW==="mate"){mateConnect();return}
 if(VIEW==="client"){clConnect();return}
 if(VIEW==="fb"){fbConnect();return}
 if(VIEW==="show"){shConnect();return}
 if(VIEW==="planner"){plConnect();return}
 if(VIEW==="support"){supConnect();return}
 if(VIEW==="signin"){signinConnect();return}
 if(VIEW==="vendor"){vendorConnect();return}
 if(VIEW==="host"){hostConnect();return}
 if(!EV){routeWithoutCode();return}
 subscribeEvent();
}
function checkAuth(){const m=L.masterHash;
 L.hostOK=!!m&&store.get("host",null)===m;
 if(EV&&D.meta){const s=store.get("mod_"+EV,null);L.modOK=!!s&&(s===D.meta.pinHash||s===m)}}

async function routeWithoutCode(){
 const def=(await RT("admin/defaultEvent").once("value")).val();
 if(def){location.replace(eventURL(def,VIEW==="guest"?"":VIEW));return}
 const idx=(await RT("index/SHOWER").once("value").catch(()=>null));
 if(idx&&!idx.val()){ // first run: set up the baby shower as the main event
  await createEvent("SHOWER","Baby shower · Raveen & Stafford Jr.",clone(DEFAULT_CONTENT),await hashPin("0102"),false);
  await RT("admin/defaultEvent").set("SHOWER");location.replace(eventURL("SHOWER",VIEW==="guest"?"":VIEW));return}
 L.loaded=true;renderSoon()}

function createEvent(code,name,content,pinHash,practice){const tm=Date.now();const u={};
 u["events/"+code+"/meta"]={name,pinHash,created:tm,practice:!!practice};u["events/"+code+"/content"]=content;u["index/"+code]={name,created:tm,practice:!!practice};
 return db.ref(ROOT).update(u)}

function subscribeEvent(){
 const on=(p,fn)=>ER(p).on("value",s=>{fn(s.val());renderSoon()});
 ER("meta").on("value",s=>{D.meta=s.val();L.missing=!D.meta;if(VIEW==="moderator"&&D.meta&&D.meta.planner&&!L.evVenSub){L.evVenSub=1;RT("planners/"+D.meta.planner+"/tv/"+EV).on("value",x=>{D.evVen=x.val()||{};renderSoon()},()=>{})}if(!D.meta&&EV)ER("movedTo").once("value").then(m=>{const to=m.val();if(to&&to!==EV)location.replace(eventURL(to,location.hash.slice(1)))}).catch(()=>{});L.loaded=true;checkAuth();renderSoon()});
 on("content",v=>{D.content=v||null;D.contentLoaded=true;cwCache.key=null;applyTheme()});
 on("state",v=>{D.state=v||{};onState()});
 on("players",v=>{D.players=v||{};L.playersLoaded=true});
 on("scores",v=>D.scores=v||{});
 on("team",v=>D.team=Object.assign({A:0,B:0},v||{}));
 on("tv",v=>D.tv=v||{});on("tvr",v=>D.tvr=v||{});on("sup",v=>D.sup=v||{});on("claims",v=>D.claims=v||{});on("sugg",v=>D.sugg=v||{});
 if(VIEW==="moderator"||VIEW==="screen")on("lw",v=>D.lwAll=v||{});
 if(VIEW==="moderator"||VIEW==="screen")on("music",v=>D.music=v||{});
 if(VIEW==="moderator"||VIEW==="print")on("orders",v=>D.orders=v||{});
 if(VIEW==="guest"||VIEW==="moderator")on("anytime",v=>D.anytime=v||{});
 if(VIEW!=="print")on("sips",v=>D.sips=v||{});
 if(VIEW==="moderator"||VIEW==="print")ER("mods").on("value",x=>{D.mods=x.val()||{};checkAuth();renderSoon()});
 if(VIEW==="moderator"){RT("themes").on("value",x=>{D.themes=x.val()||{};renderSoon()});RT("library").on("value",x=>{D.library=x.val()||{};renderSoon()});on("photos",v=>D.photos=v||{});on("wishes",v=>D.wishes=v||{});on("hunt",v=>D.huntAll=v||{});
  ER("album").limitToLast(400).on("value",s=>{D.album=s.val()||{};renderSoon()})}
 if(VIEW==="screen"||VIEW==="moderator"){ER("honor").on("value",x=>{D.honor=x.val()||{};renderSoon()})}
 if(VIEW==="moderator")ER("secret").on("value",x=>{D.secret=x.val()||{};renderSoon()});
 if(VIEW==="screen"||VIEW==="keepsake")on("wishes",v=>D.wishes=v||{});
 if(VIEW==="keepsake")ER("album").limitToLast(400).on("value",s=>{D.album=s.val()||{};renderSoon()});
 if(VIEW==="screen"){ER("album").limitToLast(60).on("value",s=>{D.album=s.val()||{};renderSoon()});
  ER("reactions").limitToLast(12).on("child_added",s=>{const r=s.val();if(r&&now()-(r.t||0)<8000)floatReaction(r.e)})}
 if(VIEW==="print")on("wishes",v=>D.wishes=v||{});
 if(VIEW==="album")ER("album").limitToLast(400).on("value",s=>{D.album=s.val()||{};renderSoon()});
 if(VIEW==="guest")watchMine();
}
let mineRefs=[];
function watchMine(){mineRefs.forEach(r=>r.off());mineRefs=[];L.seenBadges=null;if(!db||!L.me)return;
 ["hunt","lw","cw"].forEach(k=>{const r=ER(k+"/"+L.me);r.on("value",s=>{D.mine[k]=s.val()||{};renderSoon()});mineRefs.push(r)});
 const b=ER("badges/"+L.me);b.on("value",s=>{const v=s.val()||{};D.mine.badges=v;const keys=Object.keys(v);
  if(L.seenBadges===null)L.seenBadges=new Set(keys);else keys.forEach(k=>{if(!L.seenBadges.has(k)){L.seenBadges.add(k);showBadge(k)}});renderSoon()});mineRefs.push(b);
 const od=ER("orders/"+L.me);od.on("value",s=>{D.mine.order=s.val()||null;renderSoon()});mineRefs.push(od);
 const w=ER("wishes").orderByChild("pid").equalTo(L.me);w.on("value",s=>{D.mine.wishes=s.val()||{};renderSoon()});mineRefs.push(w);
 if(L.albumOn)watchAlbum(true)}
let albumRef=null;
function watchAlbum(force){if(albumRef&&!force)return;if(albumRef)albumRef.off();albumRef=ER("album").limitToLast(150);albumRef.on("value",s=>{D.album=s.val()||{};renderSoon()})}

/* ---------- state events: entrances, celebrations ---------- */
let firstState=true,lastEnt=0,lastCel=0;
function onState(){const s=st();
 if(firstState){firstState=false;lastEnt=(s.entrance||{}).t||0;lastCel=(s.celebrate||{}).t||0;return}
 const e=s.entrance;if(e&&e.t>lastEnt){lastEnt=e.t;
  if(VIEW==="screen")showEntrance(e);
  else if(VIEW==="guest"&&L.me&&teamOf(L.me)===e.team){toast(t("Your team won the round!"));confetti(70);buzz([60,40,120]);SND.win()}}
 const c=s.celebrate;if(c&&c.t>lastCel){lastCel=c.t;if(VIEW==="screen")showCelebrate(c.text)}}
let ovT=null;
function showOverlay(html,ms){const o=$("#ov");o.innerHTML=html;o.classList.remove("on");void o.offsetWidth;o.classList.add("on");clearTimeout(ovT);ovT=setTimeout(()=>{o.classList.remove("on");setTimeout(()=>o.innerHTML="",500)},ms||4200)}
function showEntrance(e){showOverlay(`<div class="ent"><div class="ent-sweep"></div><div class="eyebrow">${esc(e.label||"Round winner")}</div><div class="ent-name">${esc(teamName(e.team))}</div></div>`,4800);confetti(180);SND.win()}
function showCelebrate(text){showOverlay(`<div class="cel"><div class="cel-text">${esc(text)}</div></div>`,3400);confetti(160);SND.win()}
function showBadge(id){const b=BADGES[id];if(!b)return;showOverlay(`<div class="bdg"><div class="bdg-i">${b.i}</div><div class="eyebrow">${t("New badge!")}</div><div class="bdg-n">${esc(L.lang==="es"?b.es:b.n)}</div><p class="muted">${esc(L.lang==="es"?b.des:b.d)}</p></div>`,3200);SND.ding();buzz([40,30,90]);confetti(60)}
function floatReaction(e){const layer=$("#rx");if(!layer)return;const s=document.createElement("span");s.className="rxf";s.textContent=e;s.style.left=(8+Math.random()*84)+"%";s.style.setProperty("--dx",((Math.random()-.5)*120)+"px");s.style.fontSize=(32+Math.random()*30)+"px";layer.appendChild(s);setTimeout(()=>s.remove(),4200)}

/* ---------- countdown ---------- */
let cdLast=null,cdDismiss=null;
function cdTick(){const el=$("#cd");if(!el)return;const cd=st().countdown;
 if(!cd||VIEW==="host"||VIEW==="album"||VIEW==="print"||cdDismiss===cd.at){return hideCd()}
 const left=cd.at-now();if(left>6200||left<-1900)return hideCd();
 if(!el.classList.contains("on"))el.classList.add("on");
 const g=gameById(cd.game);
 if(left>0){const n=Math.max(1,Math.min(5,Math.ceil(left/1000)));if(cdLast!==n){cdLast=n;el.innerHTML=`<div class="cd-in"><div class="cd-top">${t("Get ready")}</div><div class="cd-n">${n}</div><div class="cd-g">${esc(gname(g))}</div></div>`;SND.tick();buzz(70)}}
 else if(cdLast!=="go"){cdLast="go";el.innerHTML=`<div class="cd-in"><div class="cd-rays"></div><div class="cd-go">${esc(gname(g))}</div><div class="cd-top">${t("Let's play!")}</div></div>`;SND.go();buzz([90,50,200]);confetti(120);
  if(VIEW==="guest"){L.ptab="live";renderSoon()}}}
function hideCd(){const el=$("#cd");if(el&&el.classList.contains("on")){el.classList.remove("on");el.innerHTML=""}cdLast=null}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#cd")){const cd=st().countdown;if(cd&&(cdLast==="go"||VIEW==="moderator")){cdDismiss=cd.at;hideCd()}}});

/* ---------- render ---------- */
let rq=null;function renderSoon(){if(rq)return;rq=requestAnimationFrame(()=>{rq=null;render()})}
function viewKey(){const s=st();return [VIEW,L.ptab,L.mtab,L.ctab,s.live,s.tvQ,s.supQ,L.me,s.ended,L.joining,s.bingoRound,s.showWinner,L.loaded,L.modOK,L.hostOK,L.missing,L.hostTab].join("|")}
/* While someone is typing in a box, live updates wait until they leave it, so the box never loses focus or the phone keyboard. */
function typingHold(){const a=document.activeElement;if(!a||!a.closest||!a.closest("#app")||(a.dataset&&a.dataset.cell))return false;
 if(a.tagName==="TEXTAREA"&&!a.readOnly)return true;return a.tagName==="INPUT"&&/^(text|number|password|search|email|tel|url)$/.test(a.type||"text")}
document.addEventListener("focusout",()=>{if(L.heldRender)setTimeout(()=>{if(L.heldRender&&!typingHold()){L.heldRender=false;render()}},260)});
function render(force){
 if(!force&&typingHold()){L.heldRender=true;try{cgUpdate()}catch(e){}return}L.heldRender=false;
 const a=document.activeElement;let keep=null;
 if(a&&a.closest&&a.closest("#app")&&/INPUT|SELECT|TEXTAREA/.test(a.tagName))keep={id:a.id,cell:a.dataset.cell,draft:a.dataset.draft,ss:a.selectionStart,se:a.selectionEnd};
 applyTheme();
 let html;
 if(L.offline)html=`<div class="card stack"><h2>${t("Can't reach the game server")}</h2><p class="muted">${t("Check the internet connection, then reload this page.")}</p></div>`;
 else if(VIEW==="host")html=hostView();
 else if(VIEW==="new")html=newEventView();
 else if(VIEW==="mate")html=mateView();
 else if(VIEW==="client")html=clientView();
 else if(VIEW==="fb")html=fbView();
 else if(VIEW==="planner")html=plannerView();
 else if(VIEW==="show")html=showView();
 else if(VIEW==="support")html=supportView();
 else if(VIEW==="signin")html=signinView();
 else if(VIEW==="vendor")html=vendorView();
 else if(!EV)html=L.loaded?landing():loadingView();
 else if(L.missing)html=landing(true);
 else if(!L.loaded)html=loadingView();
 else if(VIEW==="moderator")html=L.modOK?moderator():pinScreen();
 else if(VIEW==="screen")html=bigscreen();
 else if(VIEW==="album")html=galleryView();
 else if(VIEW==="keepsake")html=keepsakeView();
 else if(VIEW==="print")html=L.modOK?printView():pinScreen();
 else html=player();
 const app=$("#app");app.innerHTML=html+supFoot();$("#hdr").innerHTML=headerView();
 const key=viewKey(),changed=key!==L.lastKey,liveNow=st().live||null;
 const swiped=changed&&L.lastLive!==null&&liveNow!==L.lastLive;
 L.lastKey=key;L.lastLive=liveNow;
 if(changed&&!reduceMotion()){let i=0;app.querySelectorAll(".card,.livebtn,.tbar,.gamerow,.item,.choice,.cwbox,.banner,.lw .col,.stage,.ph,.hero").forEach(el=>{if(i>24)return;el.classList.add("ai");el.style.animationDelay=Math.min(i,12)*45+"ms";i++});
  if(swiped){app.classList.remove("swipe");void app.offsetWidth;app.classList.add("swipe")}}
 bind(app);bind($("#hdr"));
 $("#sheet").innerHTML=L.legal?legalSheet():L.settings?settingsSheet():L.report?supSheet():"";bind($("#sheet"));
 $("#lb").innerHTML=L.lightbox?lightboxView():"";bind($("#lb"));
 if(keep){const el=keep.cell?app.querySelector(`[data-cell="${keep.cell}"]`):keep.id?document.getElementById(keep.id):keep.draft?app.querySelector(`[data-draft="${keep.draft}"]`):null;
  if(el){el.focus({preventScroll:true});try{if(keep.ss!=null&&el.setSelectionRange)el.setSelectionRange(keep.ss,keep.se)}catch(e){}}}
 document.querySelectorAll("[data-timer]").forEach(el=>el.textContent=fmtLeft(+el.dataset.timer));
 drawQRs();try{cgUpdate()}catch(e){console.warn(e)}try{duoUpdate();partyUpdate()}catch(e){console.warn(e)}
 try{updateMoment();updateReveal()}catch(e){console.warn(e)}
 if((VIEW==="moderator"&&L.modOK&&D.content!==undefined&&L.loaded)||(VIEW==="host"&&L.hostOK&&L.loaded))runCleanup();
 if(VIEW==="moderator"&&L.modOK&&L.loaded&&!L.tourAuto&&!store.get("tourDone",false)&&!(D.meta&&D.meta.practice)){L.tourAuto=true;L.mtab="live";setTimeout(()=>{L.tourI=0;render(true);tourStep()},1200)}
}
function bind(root){if(!root)return;root.querySelectorAll("[data-act]").forEach(el=>{const ev=el.tagName==="BUTTON"||el.tagName==="A"||el.tagName==="SUMMARY"?"click":(el.type==="color"?"input":"change");
 el.addEventListener(ev,e=>{if(el.tagName==="A")e.preventDefault();const f=ACT[el.dataset.act];if(f)f(el,e);else console.warn("no action",el.dataset.act)})})}
function draftVal(el){return el.type==="checkbox"?(el.checked?"1":"0"):el.value}
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.draft;if(k){L.drafts[k]=draftVal(e.target);try{liveDraft(k,e.target.value)}catch(err){}}});
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.draft;if(k)L.drafts[k]=draftVal(e.target)});
document.addEventListener("click",e=>{const r=e.target.closest&&e.target.closest("#rv");if(r){const s=st().reveal;if(s&&now()>s.at+1500){r.classList.remove("on");r.innerHTML=""}}});

function headerView(){
 const c=C();const noEv=(!EV||L.missing)&&VIEW==="guest";const title=noEv||VIEW==="host"||VIEW==="planner"||VIEW==="support"||VIEW==="signin"||VIEW==="vendor"||VIEW==="new"||VIEW==="mate"||VIEW==="client"||VIEW==="fb"?"Host Mode":(c.title||"Host Mode");
 const sub=VIEW==="mate"?"Your tasks":VIEW==="client"?"Your event portal":VIEW==="planner"?(D.plMe&&D.plMe.kind==="host"?"Event dashboard":"Planner portal"):VIEW==="fb"?"Quick feedback":VIEW==="host"?"Admin console":VIEW==="support"?"Staff area":VIEW==="signin"?"Sign in":VIEW==="vendor"?"Your event page":VIEW==="new"?"Create your event":noEv?"Plan it. Run it. Remember it.":(c.tagline||"");
 const showAa=VIEW==="guest"||VIEW==="album"||VIEW==="keepsake";
 return `<div class="brand"><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:""}</div>${showAa?`<button class="btn sm aa" data-act="settings" aria-label="${t("Settings")}">Aa</button>`:""}${VIEW==="moderator"&&L.modOK?`<span class="row"><span class="pill ${D.meta&&D.meta.practice?"warn":"live"}">${D.meta&&D.meta.practice?"Practice run":L.isAdmin?"Administrator":"Moderator"} · ${esc(EV)}</span><span class="small muted">${esc(L.isAdmin?"":L.modName||"")}</span>${modBackLinks()}<button class="btn xs" data-act="modSignOut">Sign out</button></span>`:""}`}
/* back buttons from an event console to the admin console and the planner portal */
function modBackLinks(){if(window.__HMDEMO||window.__HMPDEMO)return "";const pl=D.meta&&D.meta.planner;
 return (L.isAdmin?`<a class="btn xs" href="${esc(baseURL())}#host">Admin console</a>`:"")+(pl&&L.navUid&&L.navUid===pl?`<a class="btn xs" href="${esc(baseURL())}#planner">${(store.get("hmRoles",null)||{}).host?"My event dashboard":"My planner portal"}</a>`:"")}
function loadingView(){return `<div class="card muted">${t("Loading…")}</div>`}
const status=()=>L.connected||!db||!L.everConnected||VIEW==="guest"?"":`<div class="banner soft"><span>Weak signal. Changes are saved on this device and send when the signal is back.</span></div>`;
function landing(notFound){return `<section class="card stack narrow"><div class="eyebrow">${t("Welcome")}</div><h2>${t("Enter your event code")}</h2>${notFound?`<p class="small" style="color:var(--bad);margin:0">${t("We couldn't find that event. Check the code and try again.")}</p>`:""}
 <input type="text" id="evCode" data-draft="evCode" value="${esc(dv("evCode",""))}" autocapitalize="characters" autocomplete="off" aria-label="${t("Event code")}" placeholder="${t("Event code")}"><button class="btn primary" data-act="goCode">${t("Go")}</button><a class="small muted" href="${esc(baseURL())}#signin">Sign in</a></section>`}
function settingsSheet(){const row=(k,label,on)=>`<button class="toggle" data-act="setToggle" data-k="${k}" aria-pressed="${!!on}"><span>${label}</span><i></i></button>`;
 return `<div class="sheet-bg" data-act-bg="1"></div><div class="sheet" role="dialog" aria-label="${t("Settings")}"><div class="row between"><h2>${t("Settings")}</h2><button class="btn sm" data-act="settings">${t("Close")}</button></div>
 ${row("large",t("Large text"),L.large)}${row("hc",t("High contrast"),L.hc)}${row("lang","Español",L.lang==="es")}${row("sound",t("Sounds"),L.sound)}${row("vib",t("Vibration"),L.vib)}</div>`}
function lightboxView(){const x=L.lightbox;return `<div class="lb" ><button class="btn sm lb-x" data-act="closeLb">${t("Close")}</button>${x.full?`<img src="${x.full}" alt="">`:`<div class="muted">${t("Loading…")}</div>`}<div class="lb-cap">${esc(x.name||"")}${x.mine?` <button class="btn sm" data-act="delMyPhoto" data-key="${x.key}">${t("Delete my photo")}</button>`:""}${x.mod?` <button class="btn sm" data-act="modDelPhoto" data-key="${x.key}">Remove photo</button>`:""}</div></div>`}

setInterval(()=>{document.querySelectorAll("[data-timer]").forEach(el=>el.textContent=fmtLeft(+el.dataset.timer))},1000);
setInterval(cdTick,100);
window.addEventListener("hashchange",()=>location.reload());

