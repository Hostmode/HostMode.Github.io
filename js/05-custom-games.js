/* ================= CUSTOM GAMES (AI-written, run in a sealed frame) ================= */
const CG={frames:{},session:Math.random().toString(36).slice(2,10),stateRef:null,stateGid:null};
const CGR={gid:null,ref:null,queue:{},busy:false,ready:false,setupAsked:false,lastBot:0};
const cgAll=()=>(C().custom)||{};
const cgGame=gid=>cgAll()[gid]||null;
const liveCg=()=>{const l=st().live;return l&&String(l).startsWith("c:")?l.slice(2):null};
function gameById(id){if(id&&String(id).startsWith("c:")){const g=cgGame(id.slice(2));const n=g?g.name:"Custom game";return {id,name:n,es:n,note:g&&g.desc?g.desc:"Custom game",custom:true}}return GAMES.find(x=>x.id===id)}
function themeVars(){const cs=getComputedStyle(document.documentElement),o={};["--rose","--flame","--gold","--violet","--leaf","--sky","--ink","--muted","--card","--ground-2","--line"].forEach(k=>{const v=cs.getPropertyValue(k).trim();if(v)o[k]=v});o["--fs"]=L.large?"17.5px":"15px";return o}
/* settings are stored as JSON text so lists and empty values survive the database */
function cgSettings(g){if(!g||!g.settingsJson)return {};try{return JSON.parse(g.settingsJson)||{}}catch(e){return {}}}
function cgSchema(g){if(!g||!g.schemaJson)return {};try{return JSON.parse(g.schemaJson)||{}}catch(e){return {}}}
function cgCtx(me,role,players){const g=cgGame(liveCg());return {settings:cgSettings(g),players:players||ids().map(i=>({id:i,name:P(i).name,team:teamOf(i),teamName:teamName(teamOf(i)),avatar:(P(i).av||{}).e||"",photo:(P(i).av||{}).img||"",bot:!!P(i).bot})),teams:{A:teamName("A"),B:teamName("B")},theme:{image:C().image||"",title:C().title||""},me:me||null,role,now:now()}}

class CGFrame{
 constructor(slot,role,code){this.slot=slot;this.role=role;this.code=code;this.ready=false;this.calls={};this.waiting=[];this.h=140;this.info={};this.last=null;
  const box=document.createElement("div");box.className="cgdock";box.dataset.dock=slot;box.style.display="none";document.body.appendChild(box);this.box=box;
  const f=document.createElement("iframe");f.setAttribute("sandbox","allow-scripts");f.setAttribute("title","Game");f.setAttribute("allow","");f.srcdoc=CG_SRCDOC;box.appendChild(f);this.f=f}
 post(m){try{this.f.contentWindow&&this.f.contentWindow.postMessage(m,"*")}catch(e){}}
 onMsg(m){
  if(m.type==="boot"){this.post({type:"load",code:this.code,role:this.role,vars:themeVars(),offset:L.offset})}
  else if(m.type==="ready"){this.ready=true;this.info=m;this.waiting.splice(0).forEach(go=>go());if(this.last)this.post(this.last);this.onReady&&this.onReady(m)}
  else if(m.type==="height"){this.h=Math.max(60,m.h);syncFrames()}
  else if(m.type==="act"){this.onAct&&this.onAct(m.action)}
  else if(m.type==="error"){this.onError?this.onError(m):cgReportError(m)}
  else if(m.type==="result"){const c=this.calls[m.id];if(c){clearTimeout(c.t);delete this.calls[m.id];c.res(m)}}
  else if(m.type==="media"){const k=String(m.key||"").replace(/[^A-Za-z0-9_-]/g,"");if(!k)return;(this.mediaSrc?Promise.resolve(this.mediaSrc(k)):ER("cgmedia/"+k).once("value").then(s=>{const v=s.val();return v&&typeof v==="object"?v.img:v})).then(src=>{if(src)this.post({type:"media",key:k,src})})}}
 render(state,ctx){this.last={type:"render",state:state||{},ctx,offset:L.offset};if(this.ready)this.post(this.last)}
 call(fn,payload){return new Promise((res,rej)=>{const id=Math.random().toString(36).slice(2);const go=()=>{this.calls[id]={res,t:setTimeout(()=>{delete this.calls[id];rej(new Error("The game took too long to answer. It may be stuck in a loop."))},fn==="check"?7500:5000)};this.post(Object.assign({type:"call",id,fn},payload))};this.ready?go():this.waiting.push(go)})}
 destroy(){Object.values(this.calls).forEach(c=>clearTimeout(c.t));this.box.remove();if(CG.frames[this.slot]===this)delete CG.frames[this.slot]}}
window.addEventListener("message",e=>{const m=e.data;if(!m||!m.__cg)return;const fr=Object.values(CG.frames).find(x=>x.f.contentWindow===e.source);if(fr)fr.onMsg(m)});
function getFrame(slot,role,code){let f=CG.frames[slot];if(f&&f.code===code&&f.role===role)return f;if(f)f.destroy();f=new CGFrame(slot,role,code);CG.frames[slot]=f;return f}
function dropFrame(slot){const f=CG.frames[slot];if(f)f.destroy()}
/* frames float over placeholders, so re-drawing the page never reloads a running game */
function syncFrames(){Object.values(CG.frames).forEach(fr=>{const ph=document.querySelector(`.cgph[data-slot="${fr.slot}"]`);
 if(!ph||!ph.offsetParent&&ph.getClientRects().length===0){fr.box.style.display="none";return}
 ph.style.height=fr.h+"px";const r=ph.getBoundingClientRect();
 Object.assign(fr.box.style,{display:"block",left:(r.left+window.scrollX)+"px",top:(r.top+window.scrollY)+"px",width:r.width+"px",height:fr.h+"px"})})}
setInterval(syncFrames,300);window.addEventListener("resize",syncFrames);

/* ---------- live game wiring (called after every render) ---------- */
function cgLiveState(){return CG.liveState||null}
function cgUpdate(){
 const gid=liveCg(),g=gid?cgGame(gid):null;
 // subscribe to the shared state
 if(gid!==CG.stateGid){if(CG.stateRef)CG.stateRef.off();CG.stateRef=null;CG.liveState=null;CG.stateGid=gid;
  if(gid&&db){CG.stateRef=ER("cg/"+gid+"/state");CG.stateRef.on("value",s=>{const v=s.val();try{CG.liveState=v?JSON.parse(v):null}catch(e){CG.liveState=null}feedFrames();if(!v)cgEnsureSetup()})}}
 const want={};
 if(g&&EV&&L.loaded){
  if(VIEW==="guest"&&L.me&&D.players[L.me]&&(!g.adult||isAdult(L.me)))want.p=["player",g.code];
  if(VIEW==="screen")want.s=["screen",g.code];
  if(VIEW==="moderator"&&L.modOK)want.h=["host",g.code]}
 ["p","s","h"].forEach(slot=>{if(want[slot]){const f=getFrame(slot,want[slot][0],want[slot][1]);
   if(slot==="p")f.onAct=a=>cgPushAction(gid,a,L.me);if(slot==="h"){f.onAct=a=>cgPushAction(gid,a,"host");f.onReady=()=>{CGR.ready=true;cgEnsureSetup();cgPump()}}}
  else dropFrame(slot)});
 cgRunner(gid);feedFrames();syncFrames()}
function feedFrames(){const gid=liveCg();if(!gid)return;const s=CG.liveState;if(!s)return;
 const pl=cgCtx(null,"x").players;
 if(CG.frames.p)CG.frames.p.render(s,cgCtx(L.me,"player",pl));if(CG.frames.s)CG.frames.s.render(s,cgCtx(null,"screen",pl));if(CG.frames.h)CG.frames.h.render(s,cgCtx(null,"host",pl))}
async function cgPushAction(gid,a,from){if(!db||!a||!a.type)return;let value=a.value;
 if(a.photo&&typeof value==="string"&&value.startsWith("data:")){const k=ER("cgmedia").push().key;await ER("cgmedia/"+k).set({img:value,t:Date.now()});value=k}
 const who=from==="host"?{from:"host",name:"Host",team:null}:{from,name:P(from).name,team:teamOf(from)};
 ER(`cg/${gid}/actions`).push(Object.assign({type:String(a.type).slice(0,60),value:value==null?null:value,form:a.form||{},at:SERVER_TS()},who));buzz(20)}
/* the console that started the game runs it; another moderator can take over */
const amRunner=gid=>{const r=st().cgRun||{};return !!gid&&VIEW==="moderator"&&L.modOK&&r.id===gid&&r.runner===CG.session};
function cgRunner(gid){const mine=amRunner(gid);
 if(mine&&CGR.gid!==gid){if(CGR.ref)CGR.ref.off();CGR.gid=gid;CGR.queue={};CGR.setupAsked=false;CGR.ref=ER(`cg/${gid}/actions`);CGR.ref.on("value",s=>{CGR.queue=s.val()||{};cgPump()})}
 if(!mine&&CGR.gid){if(CGR.ref)CGR.ref.off();CGR.ref=null;CGR.gid=null}}
async function cgEnsureSetup(){const gid=CGR.gid;const fr=CG.frames.h;if(!gid||!fr||!fr.ready||CG.liveState||CGR.setupAsked||CG.stateGid!==gid)return;
 const snap=await ER(`cg/${gid}/state`).once("value");if(snap.val()){return}CGR.setupAsked=true;
 try{const r=await fr.call("setup",{state:{},ctx:cgCtx(null,"host")});if(!r.ok)return cgReportError({where:r.where,message:r.error,gid});await cgCommit(gid,r,true)}catch(e){cgReportError({where:"starting the game",message:e.message,gid})}}
async function cgCommit(gid,r,force){if(!r.ok){cgReportError({where:r.where,message:r.error,gid});return}
 if(r.changed||force){CG.liveState=r.state;await ER(`cg/${gid}/state`).set(JSON.stringify(r.state));feedFrames()}
 (r.effects||[]).forEach(fx=>{if(fx.t==="award"&&D.players[fx.id])award([fx.id],fx.pts,teamOf(fx.id),fx.pts);else if(fx.t==="team")ER("team/"+fx.team).transaction(v=>(v||0)+fx.pts);else if(fx.t==="celebrate")setState({celebrate:{text:fx.text,t:now()}})})}
async function cgPump(){const gid=CGR.gid,fr=CG.frames.h;if(CGR.busy||!gid||!fr||!fr.ready||!CG.liveState)return;const keys=Object.keys(CGR.queue||{}).sort();if(!keys.length)return;
 CGR.busy=true;const k=keys[0],a=CGR.queue[k];delete CGR.queue[k];
 try{const r=await fr.call(a.from==="host"?"hostAction":"action",{state:CG.liveState,action:a,ctx:cgCtx(null,"host")});await cgCommit(gid,r)}catch(e){cgReportError({where:"handling a tap",message:e.message,gid})}
 try{await ER(`cg/${gid}/actions/${k}`).remove()}catch(e){}CGR.busy=false;if(Object.keys(CGR.queue||{}).length)setTimeout(cgPump,0)}
setInterval(async()=>{const gid=CGR.gid,fr=CG.frames.h;if(!gid||!fr||!fr.ready||!CG.liveState||CGR.busy)return;
 if(st().countdown&&now()<st().countdown.at)return;
 if(fr.info.hasTick){CGR.busy=true;try{const r=await fr.call("tick",{state:CG.liveState,ctx:cgCtx(null,"host")});await cgCommit(gid,r)}catch(e){cgReportError({where:"the timer",message:e.message,gid})}CGR.busy=false;cgPump()}
 if(D.meta&&D.meta.practice&&Date.now()-CGR.lastBot>1100){CGR.lastBot=Date.now();const bots=ids().filter(i=>P(i).bot);if(bots.length&&Math.random()<.7){const b=bots[rnd(bots.length)];
  try{const r=await fr.call("bot",{state:CG.liveState,botId:b,ctx:cgCtx(b,"player")});if(r.action&&r.action.type)cgPushAction(gid,r.action,b)}catch(e){}}}},1000);
function cgReportError(m){L.cgErr={where:m.where||"",message:m.message||"Unknown problem",gid:m.gid||liveCg(),t:Date.now()};if(VIEW==="moderator")renderSoon()}

/* ---------- AI request for writing or fixing a game ---------- */
const CG_API=`HOW MY GAME ENGINE WORKS
- Your code must call defineGame({...}) exactly once. Plain JavaScript only: no imports, no network requests, no setTimeout or setInterval, no localStorage, no alert. Helper functions outside defineGame are fine.
- The game has ONE shared state: a plain JSON object (objects, arrays, strings, numbers, booleans; no functions or Dates). Only the host's device changes it, through setup, onAction, onHostAction and onTick. Every phone, the host controls and the TV then redraw from it.
- Render functions return an HTML string and must never change state or award points.

defineGame({
  title: "Short game name",
  settings: { /* quick settings the host can change later without code, see below */ },
  setup(ctx) { return { /* starting state */ }; },
  onAction(state, action, ctx) { /* a guest tapped something */ return state; },
  onHostAction(state, action, ctx) { /* the host tapped something on the host controls */ return state; },
  onTick(state, ctx) { /* optional: runs once a second on the host's device; use it to end timed rounds */ return state; },
  renderPlayer(state, ctx) { return "..."; },   // each guest's phone. ctx.me is that guest's id
  renderHost(state, ctx) { return "..."; },     // the host's controls (start rounds, reveal answers, next round, finish...)
  renderScreen(state, ctx) { return "..."; },   // the big TV everyone watches
  botAction(state, botId, ctx) { return { type: "...", value: ..., form: {...} } or null; }  // optional: what a pretend guest does in practice runs
});

QUICK SETTINGS (very important)
Put every choice a host might want to change later into settings, so it can be changed without touching code: game pieces and symbols (emoji, or a photo),
using guests' pictures as pieces, colors, line or border styles, words and labels, lists of questions or items, number of rounds, seconds per round and points.
Read the current values from ctx.settings everywhere, including setup. Example:
  settings: {
    pieceA:   { label: "Team A's piece", type: "text", default: "❌" },
    pieceB:   { label: "Team B's piece", type: "text", default: "⭕" },
    useAvatars: { label: "Use guests' pictures as pieces", type: "toggle", default: false },
    lineStyle: { label: "Board lines", type: "choice", options: ["solid", "dashed", "dotted", "double"], default: "solid" },
    lineColor: { label: "Line color", type: "color", default: "#7b3fb8" },
    seconds:  { label: "Seconds per turn", type: "number", default: 20, min: 5, max: 120 },
    backdrop: { label: "Background picture", type: "image", default: "" },
    words:    { label: "Words, one per line", type: "lines", default: ["CRIB", "BOTTLE"] }
  }
  Types: text, number, toggle (true/false), choice (needs options), color, image (a picture address, or "" when none; show it with <img src="...">),
  lines (an array of strings; for lists like "Item | price", split each line yourself). Add help: "..." to explain a setting.

action = { type, value, form, from, name, team }
  type  = the tapped element's data-action
  value = its data-value (number-looking values arrive as numbers), or a photo id for photo actions
  form  = values of all elements with a name="" inside the closest element that has data-form
  from  = the guest's id ("host" for host actions); name and team ("A" or "B") of that guest

ctx gives you:
  ctx.settings   current quick-setting values
  ctx.players    array of { id, name, team ("A"/"B"), teamName, avatar (an emoji), photo (picture address or "") }; guests can join at any time
  ctx.me         the guest's id on a phone; null on the host controls and the TV
  ctx.myTeam, ctx.teams = { A: "team name", B: "team name" }, ctx.player(id), ctx.name(id), ctx.playersOn("A")
  ctx.now        current time in ms, the same clock on every device
  ctx.random(), ctx.randInt(n), ctx.shuffle(array), ctx.pick(array)
  ctx.esc(text)  ALWAYS use this on names and anything guests typed before putting it in HTML
  ctx.award(guestId, points)        points to that guest and to their team (only in setup/onAction/onHostAction/onTick)
  ctx.awardTeam("A" or "B", points) team points only
  ctx.celebrate("Short message")    confetti and a big message on the TV
  ctx.formatTime(ms)                "1:05"

HTML building blocks
  Button:  <button class="btn primary" data-action="vote" data-value="2">Vote</button>
  Typing:  <div data-form><input name="guess" type="number" placeholder="Your guess"><button class="btn primary" data-action="guess">Send</button></div>
           (Enter also sends; the boxes clear after sending; typed text survives redraws)
  Photo:   <label class="btn primary">Take a photo<input type="file" accept="image/*" data-photo="photo"></label>
           sends an action with type "photo" and value = a photo id. Show a photo id with <img data-media="PHOTO_ID">. Store only ids in state.
  Timer:   <span class="timer" data-countdown="\${state.endsAt}" data-done="Time's up!"></span>  (counts down live; end the round in onTick)
  Animate: add data-anim-key="something-unique" to make an element pop in the first time it appears.
  Classes: card, stack, row, grid2, center, title (fancy script headline), big (huge word or number), muted, small, btn, btn primary, btn gold,
           choices + choice (big tappable answer buttons; add selected, right or wrong), pill, pill a, pill b (team colors), avatar, list, timer.
           Inline styles and CSS grid are fine (good for boards). Theme colors are CSS variables: --rose --flame --gold --violet --leaf --ink --muted.

Rules for a game that works on the night
  - Check every action in onAction: right phase, right player's turn, not answered twice, values make sense. Ignore anything else.
  - Every phase must show something useful on all three views, including guests who joined late and the host before the game starts.
  - Keep state small (well under 100 KB). Never put photos in state.
  - Guests can't see the host controls, so the host must be able to move the game forward from renderHost (start, reveal, next, finish).
  - Show a clear final result and award points with ctx.award or ctx.awardTeam.`;
const CG_EXAMPLE=`defineGame({
  title: "Guess the Price",
  settings: {
    items: { label: "Items, one per line as Name | price", type: "lines", default: ["Diaper Genie | 45", "Box of 100 wipes | 6", "Baby monitor | 89"] },
    seconds: { label: "Seconds to guess", type: "number", default: 45, min: 10, max: 180 },
    points: { label: "Points for the closest guess", type: "number", default: 5, min: 1, max: 50 },
    currency: { label: "Money symbol", type: "text", default: "$" }
  },
  setup(ctx) {
    const items = ctx.settings.items.map(line => { const [name, price] = line.split("|"); return { name: (name || "").trim(), price: Number(price) || 0 }; }).filter(i => i.name);
    return { items, round: 0, phase: "waiting", guesses: {}, endsAt: 0, winner: null };
  },
  onHostAction(state, a, ctx) {
    if (a.type === "open" && state.phase === "waiting") { state.phase = "guessing"; state.guesses = {}; state.endsAt = ctx.now + ctx.settings.seconds * 1000; }
    if (a.type === "reveal" && state.phase === "guessing") reveal(state, ctx);
    if (a.type === "next" && state.phase === "reveal" && state.round < state.items.length - 1) { state.round++; state.phase = "waiting"; state.winner = null; }
    return state;
  },
  onAction(state, a, ctx) {
    const g = Number(a.form.guess);
    if (a.type === "guess" && state.phase === "guessing" && !(a.from in state.guesses) && g > 0) state.guesses[a.from] = g;
    return state;
  },
  onTick(state, ctx) { if (state.phase === "guessing" && ctx.now > state.endsAt) reveal(state, ctx); return state; },
  renderPlayer(state, ctx) {
    const item = state.items[state.round], mine = state.guesses[ctx.me], $ = ctx.esc(ctx.settings.currency);
    if (!item) return '<div class="card center"><h2>No items yet</h2></div>';
    if (state.phase === "waiting") return \`<div class="card center"><p class="muted">Item \${state.round + 1} of \${state.items.length}</p><h2>Get ready to guess!</h2></div>\`;
    if (state.phase === "guessing") return mine ? \`<div class="card center"><h2>You guessed \${$}\${mine}</h2><p class="muted">Waiting for the reveal…</p></div>\`
      : \`<div class="card"><h2>How much is the \${ctx.esc(item.name)}?</h2><span class="timer" data-countdown="\${state.endsAt}" data-done="Time's up"></span>
         <div data-form class="row"><input name="guess" type="number" min="1" placeholder="Price"><button class="btn primary" data-action="guess">Guess</button></div></div>\`;
    return \`<div class="card center"><p class="muted">\${ctx.esc(item.name)}</p><div class="big" data-anim-key="price\${state.round}">\${$}\${item.price}</div>
      <p>\${state.winner ? ctx.esc(ctx.name(state.winner)) + " was closest!" : "No guesses this round."}</p></div>\`;
  },
  renderHost(state, ctx) {
    const item = state.items[state.round], n = Object.keys(state.guesses).length;
    if (!item) return '<p class="muted">Add items in Quick settings.</p>';
    return \`<div class="card"><h3>Item \${state.round + 1}: \${ctx.esc(item.name)} (\${ctx.esc(ctx.settings.currency)}\${item.price})</h3><p class="muted">\${n} guesses in</p><div class="row">
      \${state.phase === "waiting" ? '<button class="btn primary" data-action="open">Open guessing</button>' : ""}
      \${state.phase === "guessing" ? '<button class="btn primary" data-action="reveal">Reveal price</button>' : ""}
      \${state.phase === "reveal" && state.round < state.items.length - 1 ? '<button class="btn primary" data-action="next">Next item</button>' : ""}</div></div>\`;
  },
  renderScreen(state, ctx) {
    const item = state.items[state.round];
    if (!item) return '<div class="title center">Guess the Price</div>';
    if (state.phase === "reveal") return \`<div class="center stack"><div class="title">\${ctx.esc(item.name)}</div><div class="big" data-anim-key="s\${state.round}">\${ctx.esc(ctx.settings.currency)}\${item.price}</div><h2>\${state.winner ? ctx.esc(ctx.name(state.winner)) + " wins " + ctx.settings.points + " points!" : ""}</h2></div>\`;
    return \`<div class="center stack"><div class="title">Guess the Price</div><h2>\${state.phase === "guessing" ? ctx.esc(item.name) : "Next item coming up"}</h2>\${state.phase === "guessing" ? \`<span class="timer" data-countdown="\${state.endsAt}"></span>\` : ""}</div>\`;
  },
  botAction(state, botId, ctx) {
    return state.phase === "guessing" && !(botId in state.guesses) ? { type: "guess", form: { guess: String(1 + ctx.randInt(100)) } } : null;
  }
});
function reveal(state, ctx) {
  const price = state.items[state.round].price;
  let best = null;
  for (const id in state.guesses) { const d = Math.abs(state.guesses[id] - price); if (!best || d < best.d) best = { id, d }; }
  state.phase = "reveal"; state.winner = best ? best.id : null;
  if (best) { ctx.award(best.id, ctx.settings.points); ctx.celebrate(ctx.name(best.id) + " was closest!"); }
}`;
function themeLine(){const c=C();return ((c.themeDesc||c.title||"a party")+(c.honorees?` honoring ${c.honorees}`:"")).replace(/[.\s]+$/,"")}
function cgPromptNew(desc){return `I'm hosting ${themeLine()}. Guests play party games on their phones through my web app, with a host control panel and a big TV screen. Please write a brand-new game for it:\n\n${desc.trim()}\n\nThe app splits guests into two teams, A and B, for the whole night. Make the game fun for a room of about ${Math.max(10,ids().filter(i=>!P(i).bot).length||60)} people of all ages, give it a clear ending with points, and put every look-and-feel choice into quick settings.\n\n${CG_API}\n\nHere is a complete example game that follows these rules:\n\`\`\`js\n${CG_EXAMPLE}\n\`\`\`\n\nReply with only the complete code for the new game in one \`\`\`js code block.`}
function cgPromptEdit(g,change,err){return `I have a custom party game for my web app's game engine. ${err?`It hit this problem while ${err.where}: "${err.message}". Please fix it`:"Please change it"}${change&&change.trim()?` as follows:\n\n${change.trim()}`:"."}\n\nKeep everything else working, and keep or add quick settings for anything a host may want to change later.\n\n${CG_API}\n\nHere is the current code:\n\`\`\`js\n${g.code}\n\`\`\`\n\nReply with only the complete updated code in one \`\`\`js code block.`}
function cgExtractCode(text){const s=String(text||"");const m=s.match(/```(?:js|javascript)?[^\n]*\n([\s\S]*?)```/i);return (m?m[1]:s).trim()}

/* ---------- checking code before it is saved: setup, then simulated rounds on all three views ---------- */
function cgCheck(code,settings){return new Promise(res=>{if(!/defineGame\s*\(/.test(code))return res({ok:false,message:"This doesn't look like game code. Paste Claude's whole reply, including the code block."});
 const slot="chk"+Math.random().toString(36).slice(2,6);const f=getFrame(slot,"host",code);let done=false;
 const finish=r=>{if(done)return;done=true;clearTimeout(to);f.destroy();res(r)};const to=setTimeout(()=>finish({ok:false,message:"The code didn't finish within 8 seconds. It may be stuck in a loop."}),8000);
 f.onError=m=>finish({ok:false,message:`${m.message} (while ${m.where})`});
 f.onReady=async info=>{try{const pl=[["t1","Ana","A","🐣"],["t2","Ben","B","🦉"],["t3","Cleo","A","🌸"],["t4","Dev","B","🐝"]].map(([id,name,team,avatar])=>({id,name,team,teamName:"Team "+team,avatar,photo:""}));
  const r=await f.call("check",{state:{},ctx:{settings:settings||{},players:pl,teams:{A:"Team A",B:"Team B"},me:null,role:"host",now:now()}});if(!r.ok)return finish({ok:false,message:r.error});
  finish({ok:true,title:info.title,schema:info.settings||{}})}catch(e){finish({ok:false,message:e.message})}}})}

/* ---------- the shared game library (all events) ---------- */
const BUILTIN_GAMES=[["ttt","Tic-Tac-Toe","Two players, three in a row."],["sos","SOS","Two players spell S-O-S on a grid to score."],["c4","Connect Four","Two players drop discs, four in a row wins."],["dots","Dots and Boxes","Two players draw lines and claim boxes."],["rps","Rock Paper Scissors","Best of five, both pick at the same time."],["memory","Memory Match","Two players flip cards to find pairs."],["battleship","Battleship","Hide ships, take turns firing."],["checkers","Checkers","The classic, with kings and forced jumps."],["words","Word Guess","Pick a secret word, then guess each other's letters."]];
const libAll=()=>{const out={};BUILTIN_GAMES.forEach(([k,name,desc],i)=>{out["b-"+k]={name,desc:desc+" Guests pair up on their own phones.",code:DUEL_SRC.framework+"\n"+DUEL_SRC[k],schemaJson:"",settingsJson:"{}",from:"Starter pack",t:i,removed:false,builtin:true}});
 const db2=D.library||{};Object.keys(db2).forEach(u=>{out[u]=Object.assign({},out[u]||{},db2[u])});Object.keys(out).forEach(u=>{if(!out[u].code)delete out[u]});return out};
const newUid=()=>"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const cgStage=g=>({checked:!!(g&&(g.checked||g.code)),tested:!!(g&&g.tested),live:!!(g&&g.wentLive)});
async function cgFlag(id,flag){const g=cgGame(id);if(!g)return;if(!g[flag])await ER(`content/custom/${id}/${flag}`).set(true);
 const s=Object.assign(cgStage(g),{[flag==="wentLive"?"live":flag]:true});if(!(s.checked&&s.tested&&s.live))return;
 let uid=g.uid;if(!uid){uid=newUid();await ER(`content/custom/${id}/uid`).set(uid)}
 RT("library/"+uid).transaction(cur=>cur?undefined:{name:g.name,desc:g.desc||"",code:g.code,schemaJson:g.schemaJson||"{}",settingsJson:g.settingsJson||"{}",from:EV,t:Date.now(),removed:false},
  (e,ok)=>{if(ok)toast(`"${g.name}" was added to the game library`)})}
function libInEvent(uid){return Object.keys(cgAll()).some(id=>cgAll()[id].uid===uid)}

/* ---------- test bench: phone, host and TV side by side, with pretend guests ---------- */
const TEST_PLAYERS=[{id:"you",name:"Jamie (you)",team:"A"},{id:"tb1",name:"Aunt May",team:"A"},{id:"tb2",name:"Uncle Ray",team:"B"},{id:"tb3",name:"Kayla",team:"B"},{id:"tb4",name:"Omar",team:"A"},{id:"tb5",name:"Grandma Lou",team:"B"}].map((p,i)=>Object.assign(p,{teamName:p.team==="A"?"Team A":"Team B",avatar:AVATARS[i],photo:""}));
const T={on:false};
function testCtx(me,role){return {settings:cgSettings(cgGame(T.gid)),theme:{image:C().image||"",title:C().title||""},players:TEST_PLAYERS,teams:{A:"Team A",B:"Team B"},me:me||null,role,now:now()}}
function testStart(gid){const g=cgGame(gid);if(!g)return;testStop();Object.assign(T,{on:true,gid,code:g.code,state:null,log:[],q:[],busy:false,bots:false,media:{},lastErr:null});
 const h=getFrame("th","host",g.code),p=getFrame("tp","player",g.code),s=getFrame("ts","screen",g.code);
 [h,p,s].forEach(f=>{f.mediaSrc=k=>T.media[k];f.onError=m=>testLog(`Problem while ${m.where}: ${m.message}`,true)});
 p.onAct=a=>testQueue(a,"you");h.onAct=a=>testQueue(a,"host");h.onReady=()=>testReset()}
function testStop(){["th","tp","ts"].forEach(dropFrame);T.on=false;clearInterval(T.iv)}
async function testReset(){const h=CG.frames.th;if(!h)return;T.lastErr=null;const r=await h.call("setup",{state:{},ctx:testCtx(null,"host")}).catch(e=>({ok:false,error:e.message,where:"starting"}));
 if(!r.ok){testLog(`Problem while ${r.where}: ${r.error}`,true);return}T.state=r.state;T.log=[];testLog("Game started");testDraw();clearInterval(T.iv);
 T.iv=setInterval(async()=>{if(!T.on||T.busy)return;const h2=CG.frames.th;if(!h2)return;
  if(h2.info.hasTick){T.busy=true;const r2=await h2.call("tick",{state:T.state,ctx:testCtx(null,"host")}).catch(e=>({ok:false,error:e.message,where:"the timer"}));T.busy=false;testApply(r2)}
  if(T.bots&&Math.random()<.6){const b=TEST_PLAYERS[1+rnd(5)];const r3=await h2.call("bot",{state:T.state,botId:b.id,ctx:testCtx(b.id,"player")}).catch(()=>null);if(r3&&r3.action&&r3.action.type)testQueue(r3.action,b.id)}},1000)}
function testQueue(a,from){if(a.photo&&typeof a.value==="string"){const k="m"+Math.random().toString(36).slice(2,8);T.media[k]=a.value;a=Object.assign({},a,{value:k})}
 const p=TEST_PLAYERS.find(x=>x.id===from);T.q.push(Object.assign({},a,{from,name:p?p.name:"Host",team:p?p.team:null}));testPump()}
async function testPump(){if(T.busy||!T.q.length)return;T.busy=true;const a=T.q.shift();const h=CG.frames.th;
 const r=await h.call(a.from==="host"?"hostAction":"action",{state:T.state,action:a,ctx:testCtx(null,"host")}).catch(e=>({ok:false,error:e.message,where:"handling a tap"}));T.busy=false;testApply(r,a);testPump()}
function testApply(r,a){if(!r)return;if(!r.ok){testLog(`Problem while ${r.where}: ${r.error}`,true);return}
 (r.effects||[]).forEach(fx=>testLog(fx.t==="award"?`${(TEST_PLAYERS.find(p=>p.id===fx.id)||{name:fx.id}).name} +${fx.pts} points`:fx.t==="team"?`Team ${fx.team} +${fx.pts} points`:`TV celebrates: ${fx.text}`));
 if(a&&(a.from==="you"||a.from==="host"||r.changed))testLog(`${a.name} tapped "${a.type}"`);
 if(a&&(a.from==="you"||a.from==="host")&&!T.lastErr&&T.gid&&!(cgGame(T.gid)||{}).tested)cgFlag(T.gid,"tested");
 if(r.changed){T.state=r.state;testDraw()}}
function testDraw(){if(!T.state)return;const h=CG.frames.th,p=CG.frames.tp,s=CG.frames.ts;h&&h.render(T.state,testCtx(null,"host"));p&&p.render(T.state,testCtx("you","player"));s&&s.render(T.state,testCtx(null,"screen"));if(VIEW==="moderator"&&L.mtab==="custom")renderSoon()}
function testLog(msg,bad){T.log=T.log||[];T.log.unshift({msg,bad,t:Date.now()});T.log=T.log.slice(0,30);if(bad)T.lastErr={where:"testing",message:msg};renderSoon()}

/* ---------- keeping the AI request boxes current while typing (no redraw needed) ---------- */
function liveDraft(k,v){
 if(k==="cg_desc"){const el=$("#cgPrompt");if(el)el.value=v.trim()?cgPromptNew(v):"Describe your game first, and the request appears here."}
 const m=k.match(/^cge_(event|lib)_(.+)$/);if(m){const el=$("#cgEditPrompt");const g=m[1]==="lib"?libAll()[m[2]]:cgGame(m[2]);if(el&&g)el.value=cgPromptEdit(g,v,!v.trim()?cgErrFor(m[1],m[2]):null)}}
function cgErrFor(kind,id){if(kind!=="event")return null;return L.cgErr&&L.cgErr.gid===id?L.cgErr:(T.on&&T.gid===id&&T.lastErr?T.lastErr:null)}

/* ---------- views ---------- */
function cgGuide(){return `<div class="advnote"><b>Advanced feature.</b> Custom games are written by AI from your description. They can be almost anything you imagine, but a new game can have mistakes, so always check it, test it here and do a practice run before a party.</div>
 <details class="guide"${L.guideOpen?" open":""}><summary data-act="toggleGuide">How to make a great custom game</summary><div class="guide-body">
 <h4>How it works</h4><ol><li><b>Describe</b> the game in plain words in "Create a new game" below.</li><li><b>Copy the request</b> and paste it into Claude. The request already explains this app's game engine, so Claude knows exactly what to write.</li><li><b>Paste Claude's whole reply</b> back here and tap <b>Check and save</b>. The app plays simulated rounds on the phone, host controls and TV before anything is saved, and tells you if something is broken.</li><li><b>Test it</b> on the test bench: play as "Jamie (you)", run it from the host controls, and let pretend guests join in.</li><li><b>Practice</b> with a practice run (Event tab), then <b>go live</b> from the Live tab. It gets the same 5-second countdown as every other game.</li></ol>
 <h4>What to put in your description</h4><ul><li><b>The idea</b> in one sentence, plus a name.</li><li><b>Who plays:</b> everyone at once, the two teams, pairs, or one guest at a time.</li><li><b>Rounds:</b> how a round starts, what happens, and how it ends.</li><li><b>Each screen:</b> what guests see and tap on their phones, what the TV shows the room, and which buttons you need on the host controls (start, reveal, next, finish).</li><li><b>Timing:</b> seconds per round or turn, if any.</li><li><b>Scoring:</b> who gets points, how many, and when. Mention team points if teams compete.</li><li><b>What you might want to change later:</b> pieces, symbols, colors, lines, words, questions, time limits, points. These become <b>Quick settings</b> you can change without code.</li></ul>
 <h4>Example description</h4><p class="example">Team tic-tac-toe. The two teams take turns. The TV shows a big 3×3 board. On their turn, each guest on that team taps a square on their phone, and the most-tapped square wins the move after 15 seconds. Three in a row wins 10 points for the team. Quick settings: Team A's piece (default ❌), Team B's piece (default ⭕), use guests' pictures as pieces, board line style and color, seconds per turn, and points for a win.</p>
 <h4>Testing tips</h4><ul><li>Play every phase on the test bench and watch all three screens.</li><li>Tap "Let pretend guests play" to see how it handles a crowd.</li><li>Try odd things: tapping twice, typing nothing, a guest joining mid-round.</li><li>If something breaks, tap <b>Fix it with AI</b>. The request includes the error, so paste it into Claude and paste the new code back.</li></ul>
 <h4>Changing a game later</h4><ul><li><b>Quick settings:</b> swap pieces (for example 🥢 and 🍩), use guests' pictures, change colors, lines, words, timers and points. No AI needed.</li><li><b>Change with AI:</b> for bigger changes, describe what to change and paste the new code back. It's checked again before saving.</li></ul>
 <h4>The game library</h4><ul><li>A game joins the shared library automatically once it has passed its check, been tested here and gone live.</li><li>Library games can be added to any event, including your cousin's, from the library list below.</li><li>The host decides what stays: remove or put back games, and change their quick settings or code, from the admin console's Game inventory tab.</li></ul>
 <h4>Good to know</h4><ul><li>Only one game runs at a time. Keep the console that tapped Go live open, because it handles every guest's tap. Your assistant can take over from their device.</li><li>Games can't reach other websites, play sound files or open other apps. They can use photos guests take.</li><li>Want Spanish too? Say so in your description.</li></ul></div></details>`}
function stagePills(g){const s=cgStage(g),lib=g.uid?libAll()[g.uid]:null;const pill=(ok,label)=>`<span class="pill ${ok?"ok":""}">${ok?"✓":"○"} ${label}</span>`;
 return `<div class="row small">${pill(s.checked,"Checked")}${pill(s.tested,"Tested")}${pill(s.live,"Gone live")}${lib?(lib.removed?'<span class="pill warn">Removed from library</span>':'<span class="pill live">In the library</span>'):'<span class="pill">Joins the library after all three</span>'}</div>`}
function qsPanel(kind,id,schema,values){const keys=Object.keys(schema||{}).filter(k=>k[0]!=="_");
 if(!keys.length)return `<div class="stack evfull"><p class="small muted m0">This game has no quick settings yet. Use <b>Change with AI</b> and ask for the settings you want, for example "add quick settings for the pieces, board lines and points".</p><button class="btn sm as" data-act="cgMode" data-kind="${kind}" data-id="" data-m="">Close</button></div>`;
 const key=k=>`qs_${kind}_${id}_${k}`;const val=k=>{const d=L.drafts[key(k)];if(d!=null)return d;const v=values&&k in values?values[k]:schema[k].default;return schema[k].type==="lines"?(Array.isArray(v)?v.join("\n"):String(v||"")):v};
 const field=k=>{const s=schema[k],v=val(k),help=s.help?`<span class="small muted">${esc(s.help)}</span>`:"";let ctl;
  if(s.type==="number")ctl=`<input type="number" data-draft="${key(k)}" value="${esc(v)}" ${s.min!=null?`min="${s.min}"`:""} ${s.max!=null?`max="${s.max}"`:""}>`;
  else if(s.type==="toggle")ctl=`<select data-draft="${key(k)}"><option value="true" ${String(v)==="true"?"selected":""}>Yes</option><option value="false" ${String(v)!=="true"?"selected":""}>No</option></select>`;
  else if(s.type==="choice")ctl=`<select data-draft="${key(k)}">${(s.options||[]).map(o=>`<option ${String(v)===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  else if(s.type==="color")ctl=`<input type="color" data-draft="${key(k)}" value="${esc(/^#[0-9a-f]{6}$/i.test(v)?v:"#7b3fb8")}">`;
  else if(s.type==="image")ctl=`<div class="row">${v?`<img class="qsimg" src="${esc(v)}" alt="">`:'<span class="small muted">No picture</span>'}<label class="btn sm upl">Choose picture<input type="file" accept="image/*" data-act="qsImg" data-k="${esc(key(k))}"></label>${v?`<button class="btn sm" data-act="qsImgClear" data-k="${esc(key(k))}">Remove</button>`:""}</div>`;
  else if(s.type==="lines")ctl=`<textarea data-draft="${key(k)}" rows="4">${esc(v)}</textarea>`;
  else ctl=`<input type="text" data-draft="${key(k)}" value="${esc(v)}">`;
  return `<label class="stack tight"><span class="small"><b>${esc(s.label)}</b></span>${ctl}${help}</label>`};
 return `<div class="stack evfull qs"><div class="grid2 g8">${keys.map(field).join("")}</div><div class="row"><button class="btn primary" data-act="qsSave" data-kind="${kind}" data-id="${id}">Save settings</button><button class="btn" data-act="qsDefaults" data-kind="${kind}" data-id="${id}">Back to defaults</button><button class="btn" data-act="cgMode" data-kind="${kind}" data-id="" data-m="">Close</button></div>
 <p class="small muted m0">${kind==="lib"?"These become the starting settings whenever this game is added to an event.":"Changes apply right away, even while the game is live."} Tip: pieces can be any emoji, like 🥢 🍩 🥯 🥁.</p></div>`}
function cgEditPanel(kind,id,g){const ch=dv(`cge_${kind}_${id}`,"");const err=cgErrFor(kind,id);
 return `<div class="stack evfull"><ol class="steps"><li>Say what to change${err?`, or leave it blank to fix the last problem: <span class="bad">${esc(err.message)}</span>`:""}.<textarea data-draft="cge_${kind}_${id}" rows="3" placeholder="Example: use the guests' pictures as the pieces and make each turn 10 seconds">${esc(ch)}</textarea></li>
 <li>Copy this request into Claude.<textarea id="cgEditPrompt" rows="4" readonly>${esc(cgPromptEdit(g,ch,!ch.trim()&&err?err:null))}</textarea><div class="row"><button class="btn primary" data-act="copyEl" data-el="cgEditPrompt">Copy request</button><a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a></div></li>
 <li>Paste Claude's whole reply.<textarea data-draft="cgp_${kind}_${id}" rows="6" spellcheck="false" class="code" placeholder="Paste the reply…">${esc(dv(`cgp_${kind}_${id}`,""))}</textarea><div class="row"><button class="btn primary" data-act="cgSaveEdit" data-kind="${kind}" data-id="${id}">${L.cgChecking?"Checking…":"Check and save"}</button><button class="btn" data-act="cgMode" data-kind="${kind}" data-id="" data-m="">Cancel</button></div></li></ol></div>`}
function mCustom(){const all=cgAll();const keys=Object.keys(all).sort((a,b)=>(all[a].t||0)-(all[b].t||0));const mode=L.cgMode||{};
 const list=keys.length?keys.map(id=>{const g=all[id];const m=mode.kind==="event"&&mode.id===id?mode.m:null;
  return `<div class="gamerow evrow"><span class="gnum">★</span><div class="mw0"><b>${esc(g.name)}</b><div class="small muted">${esc(g.desc||"")}</div>${stagePills(g)}</div>
  <div class="row">${L.confirm==="cgdel:"+id?`<span class="small">Delete this game from this event?</span><button class="btn sm gold" data-act="cgDel" data-id="${id}">Delete</button><button class="btn sm" data-act="cancelConfirm">Keep</button>`:
  `<button class="btn sm primary" data-act="cgTest" data-id="${id}">${T.on&&T.gid===id?"Testing below":"Test it"}</button><button class="btn sm" data-act="cgMode" data-kind="event" data-id="${id}" data-m="qs">Quick settings</button><button class="btn sm" data-act="cgMode" data-kind="event" data-id="${id}" data-m="edit">Change with AI</button><button class="btn sm" data-act="cgMode" data-kind="event" data-id="${id}" data-m="code">Code</button><button class="btn sm" data-act="cgAskDel" data-id="${id}">Delete</button>`}</div>
  ${m==="qs"?qsPanel("event",id,cgSchema(g),cgSettings(g)):""}${m==="edit"?cgEditPanel("event",id,g):""}${m==="code"?`<div class="stack evfull"><textarea data-draft="cgc_${id}" rows="14" spellcheck="false" class="code">${esc(dv("cgc_"+id,g.code))}</textarea><div class="row"><button class="btn primary" data-act="cgSaveCode" data-id="${id}">${L.cgChecking?"Checking…":"Check and save"}</button><button class="btn" data-act="cgMode" data-kind="event" data-id="" data-m="">Close</button></div></div>`:""}</div>`}).join(""):`<p class="small muted m0">No custom games in this event yet. Create one below, or add one from the library.</p>`;
 const lib=libAll();const lk=Object.keys(lib).filter(u=>!lib[u].removed&&!libInEvent(u)).sort((a,b)=>(lib[b].t||0)-(lib[a].t||0));
 const desc=dv("cg_desc","");
 return `<section class="card stack"><div class="row between"><h2>Custom games</h2><span class="small muted">Saved games show up in the Live tab, ready to go live.</span></div>${cgGuide()}${list}</section>
 ${T.on?testBench():""}
 <section class="card stack"><div class="row between"><h2>From the game library</h2><span class="small muted">Proven games from all your events</span></div>${lk.length?lk.map(u=>`<div class="gamerow evrow"><span class="gnum">📚</span><div class="mw0"><b>${esc(lib[u].name)}</b><div class="small muted">${esc(lib[u].desc||"")}</div></div><div class="row"><button class="btn sm primary" data-act="libAdd" data-uid="${u}">Add to this event</button></div></div>`).join(""):'<p class="small muted m0">Nothing new in the library yet. Games join it after they pass their check, get tested and go live.</p>'}</section>
 <section class="card stack"><h2>Create a new game</h2><ol class="steps">
 <li>Describe the game in your own words. Open the guide above for what to include.<textarea data-draft="cg_desc" rows="5" placeholder="Example: Team tic-tac-toe. The teams take turns, each guest on the team taps a square, and the most-tapped square wins the move. Quick settings for the pieces, board lines, seconds per turn and points.">${esc(desc)}</textarea></li>
 <li>Copy this request and paste it into Claude.<textarea id="cgPrompt" rows="5" readonly>${esc(desc.trim()?cgPromptNew(desc):"Describe your game first, and the request appears here.")}</textarea><div class="row"><button class="btn primary" data-act="copyNew">Copy request</button><a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a></div></li>
 <li>Paste Claude's whole reply here.<textarea data-draft="cg_paste" rows="7" spellcheck="false" class="code" placeholder="Paste the reply…">${esc(dv("cg_paste",""))}</textarea>
 <div class="row"><button class="btn primary" data-act="cgSaveNew">${L.cgChecking?"Checking…":"Check and save"}</button></div>${L.cgCheckMsg?`<div class="nudge">${esc(L.cgCheckMsg)}</div>`:""}</li></ol></section>`}
function testBench(){const g=cgGame(T.gid)||{name:"Game"};
 return `<section class="card stack"><div class="row between"><h2>Test bench · ${esc(g.name)}</h2><div class="row"><button class="btn sm ${T.bots?"gold":""}" data-act="cgBots">${T.bots?"Stop pretend guests":"Let pretend guests play"}</button><button class="btn sm" data-act="cgReset">Start over</button><button class="btn sm" data-act="cgTestClose">Close</button></div></div>
 <p class="small muted m0">Play as "Jamie (you)" on the phone, run it from the host controls, and watch the TV. Nothing here touches real scores.</p>
 <div class="bench"><div class="stack tight"><span class="eyebrow">Guest phone</span><div class="cgph benchph phonew" data-slot="tp"></div></div><div class="stack tight"><span class="eyebrow">Host controls</span><div class="cgph benchph" data-slot="th"></div></div><div class="stack tight"><span class="eyebrow">Big screen</span><div class="cgph benchph tvw" data-slot="ts"></div></div></div>
 <div class="stack tight"><span class="eyebrow">What happened</span>${(T.log||[]).slice(0,10).map(x=>`<span class="small ${x.bad?"bad":"muted"}">${esc(x.msg)}</span>`).join("")||'<span class="small muted">Nothing yet.</span>'}${T.lastErr?`<button class="btn sm as" data-act="cgMode" data-kind="event" data-id="${T.gid}" data-m="edit">Fix it with AI</button>`:""}</div></section>`}
function cgLiveTools(gid){const g=cgGame(gid);const mine=amRunner(gid);const q=Object.keys(CGR.queue||{}).length;const err=L.cgErr&&L.cgErr.gid===gid?L.cgErr:null;
 return `<section class="card stack"><div class="row between"><h3>${esc(g?g.name:"Custom game")}</h3><span class="row"><span class="pill ${mine?"ok":"warn"}">${mine?"Running from this device":"Running from another device"}</span>${hint("runner")}</span></div>
 ${err?`<div class="nudge">This game hit a problem while ${esc(err.where)}: ${esc(err.message)} <button class="btn xs" data-act="cgFix" data-id="${gid}">Fix it with AI</button></div>`:""}
 ${mine?(q>3?`<div class="nudge">${q} taps are waiting. Keep this screen open so the game keeps moving.</div>`:`<p class="small muted m0">Keep this screen open while the game runs. It handles every guest's tap.</p>`):`<button class="btn sm as" data-act="cgTakeOver">Run it from this device</button>`}
 <div class="cgph" data-slot="h"></div>
 <div class="row"><button class="btn sm" data-act="cgRestart">Start this game over</button><button class="btn sm" data-act="cgFix" data-id="${gid}" data-m="qs">Quick settings</button></div></section>`}
function watchHostCustom(code){D.hostCustom=D.hostCustom||{};if(D.hostCustom["_w"+code])return;D.hostCustom["_w"+code]=1;ER("content/custom",code).on("value",s=>{D.hostCustom[code]=s.val()||{};renderSoon()})}
function invUntested(){const lib=libAll(),ev=D.events||{},hc=D.hostCustom||{},out={};
 Object.keys(ev).forEach(code=>{const cs=hc[code]||{};Object.keys(cs).forEach(id=>{const g=cs[id];if(!g||g.party)return;if(g.uid&&lib[g.uid])return;
  const key=g.uid||("n:"+(g.name||id).toLowerCase());const o=out[key]=out[key]||{name:g.name||id,desc:g.desc||"",events:[]};const st=cgStage(g);
  o.events.push({code,name:ev[code].name||code,checked:st.checked,tested:st.tested,live:st.live})})});return out}
function hLibrary(){const lib=libAll();Object.keys(D.events||{}).forEach(watchHostCustom);const mode=L.cgMode||{};
 const libRow=u=>{const g=lib[u],m=mode.kind==="lib"&&mode.id===u?mode.m:null;return `<div class="gamerow evrow ${g.removed?"dim":""}"><span class="gnum">📚</span><div class="mw0"><b>${esc(g.name)}</b> ${g.removed?'<span class="pill warn">Removed</span>':'<span class="pill ok">In the library</span>'}<div class="small muted">${esc(g.desc||"")}${g.from?` · first made in ${esc(g.from)}`:""}</div></div>
  <div class="row"><button class="btn sm" data-act="cgMode" data-kind="lib" data-id="${u}" data-m="qs">Quick settings</button><button class="btn sm" data-act="cgMode" data-kind="lib" data-id="${u}" data-m="edit">Change with AI</button>${g.removed?`<button class="btn sm primary" data-act="libRestore" data-uid="${u}">Put back</button>`:`<button class="btn sm" data-act="libRemove" data-uid="${u}">Remove from library</button>`}</div>
  ${m==="qs"?qsPanel("lib",u,cgSchema(g),cgSettings(g)):""}${m==="edit"?cgEditPanel("lib",u,g):""}</div>`};
 const starter=Object.keys(lib).filter(u=>lib[u].builtin).sort((x,y)=>(lib[x].t||0)-(lib[y].t||0));
 const proven=Object.keys(lib).filter(u=>!lib[u].builtin).sort((x,y)=>(lib[y].t||0)-(lib[x].t||0));
 const un=invUntested(),uk=Object.keys(un).sort((x,y)=>un[x].name.localeCompare(un[y].name));
 const simple=(icon,name,desc,pills)=>`<div class="gamerow evrow"><span class="gnum">${icon}</span><div class="mw0"><b>${esc(name)}</b> ${pills||""}<div class="small muted">${esc(desc||"")}</div></div></div>`;
 const step=(ok,l)=>`<span class="pill ${ok?"ok":""}">${ok?"✓":"○"} ${l}</span>`;
 const total=GAMES.length+PARTY_LIST.length+starter.length+proven.length+uk.length;
 return `<section class="card stack"><h2>Game inventory</h2><p class="small muted m0">Every game in the app, in one place: <b>${total}</b> in all. ${GAMES.length} built in, ${PARTY_LIST.length} party games, ${starter.length} two-player games, ${proven.length} in the library and ${uk.length} not proven yet.</p></section>
 <section class="card stack"><h2>Built into every event · ${GAMES.length}</h2><p class="small muted m0">These come with every event. Each event turns them on or off on its moderator Event tab.</p>${GAMES.map((g,i)=>simple(i+1,g.name,g.note,'<span class="pill ok">Ready</span>')).join("")}</section>
 <section class="card stack"><h2>Party games · ${PARTY_LIST.length}</h2><p class="small muted m0">Ready-made. A moderator adds them from the console. Each has a family version, and a 21+ version when 21+ is on.</p>${PARTY_LIST.map(x=>simple("🎉",x[2]===x[1]?x[1]:`${x[2]} · 21+: ${x[1]}`,x[3],'<span class="pill ok">Ready</span>')).join("")}</section>
 <section class="card stack"><h2>Two-player games · ${starter.length}</h2><p class="small muted m0">Guests pair up on their own phones. Built in and ready.</p>${starter.map(libRow).join("")}</section>
 <section class="card stack"><h2>Game library · ${proven.length}</h2><p class="small muted m0">Custom games join automatically once they've passed their check, been tested and gone live in any event. You decide what stays. Removed games stay listed so you can put them back.</p>${proven.length?proven.map(libRow).join(""):'<p class="small muted m0">No custom games have been proven yet.</p>'}</section>
 <section class="card stack"><h2>Not proven yet · ${uk.length}</h2><p class="small muted m0">Custom games in your events that haven't finished all three steps. They join the library once one event checks, tests and runs them live.</p>${uk.length?uk.map(k=>{const g=un[k];return `<div class="gamerow evrow"><span class="gnum">🧪</span><div class="mw0"><b>${esc(g.name)}</b><div class="small muted">${esc(g.desc)}</div>${g.events.map(e=>`<div class="row small">${esc(e.name)} · ${esc(e.code)} ${step(e.checked,"Checked")}${step(e.tested,"Tested")}${step(e.live,"Gone live")}</div>`).join("")}</div><div class="row"><button class="btn sm" data-act="openMod" data-k="${esc(g.events[0].code)}">Open event</button></div></div>`}).join(""):'<p class="small muted m0">Nothing waiting.</p>'}</section>`}

DEFAULT_CONTENT.custom={sample:{name:"Guess the Price",desc:"Sample custom game: guests guess what baby items cost, closest guess wins.",code:CG_EXAMPLE,t:1,checked:true}};

