/* ================= EDDIE, HOST MODE'S SUPER ASSISTANT (planner portal) =================
   A little animated Eddie floats in the planner portal (not the host dashboard, not view-only support visits, not the 3D designer tab).
   Tap him, then type or talk. He can:
     - add things to a pull list (planners/{uid}/gearRes, the Inventory tab's own record shape)
     - put a date on a client's calendar (planners/{uid}/clientDates/{cid}, which the client also sees)
     - add a client (planners/{uid}/clients) or a lead (planners/{uid}/inquiries)
     - answer how-to questions from the Help desk (HELP.pl) and point at the tab to tap
   Every change waits for Yes on a card the planner can edit first, and can be undone right after.
   Understanding: Eddie's brain (workers/eddie-brain, Cloudflare Workers AI, free) reads ONLY the sentence, today's date and the
   Help desk titles. Names are matched to the planner's own clients, bookings and inventory here on the phone, never sent.
   If the brain can't be reached (or the free daily amount is used up), eddieLocal() understands the simple, common ways to say each job.
   Lives in its own #eddie layer outside #app, so redraws never wipe it; eddieSync() (called at the end of render) shows or hides it. */
const EDDIE_URL="https://eddie-brain.hostmode.workers.dev/ask";
const ED={open:false,say:"",prop:null,busy:false,undo:null,done:null,log:[],listening:false,rec:null,point:null};
const edImg=k=>"img/eddie/eddie-"+k+".webp";
const edToday=()=>ymdOf(new Date());
const edOn=()=>VIEW==="planner"&&L.plOK&&L.authReady&&L.loaded!==false&&!!PSP&&!(D.plMe&&D.plMe.kind==="host")&&!L.viewOnly;
/* On the 3D designer tab Eddie docks beside "Open full screen", out of the designer's way, and what's asked there goes to the designer first. */
const edD3=()=>L.plTab==="d3";
const ed3dWin=()=>{try{const f=document.querySelector("iframe.pl3dfloat");return f&&!f.hidden&&f.contentWindow&&f.contentWindow.hm3d?f.contentWindow:null}catch(e){return null}};
function eddieDock(r){r.classList.toggle("edd3",edD3()&&!ED.open);if(!edD3()||ED.open){r.style.top=r.style.left="";return}
 /* the portal page keeps settling after a redraw (the designer window, pictures), so re-check the spot while docked */
 if(!ED.dockT)ED.dockT=setInterval(()=>{const x=document.getElementById("eddie");if(!x||!edOn()||!edD3()||ED.open){clearInterval(ED.dockT);ED.dockT=0;return}eddieDock(x)},400);
 const slot=document.querySelector("#app .hmfloat"),card=slot&&slot.closest(".card");if(!card){r.style.top=r.style.left="";return}
 const btn=[...card.querySelectorAll("a,button")].find(b=>/full screen/i.test(b.textContent)),c=card.getBoundingClientRect(),W=40,H=64,top=btn?btn.getBoundingClientRect().bottom-H:c.top+10;
 const L2=Math.round(c.right+scrollX-W-14)+"px",T2=Math.round(top+scrollY)+"px";if(r.style.left!==L2)r.style.left=L2;if(r.style.top!==T2)r.style.top=T2}

/* ---- matching words to the planner's own records ---- */
const edNorm=s=>String(s||"").toLowerCase().replace(/['’]s\b/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const ED_SKIP=new Set("the a an for of to my our and with on at party event wedding shower birthday list pull".split(" "));
const edStem=w=>w.replace(/(ies)$/,"y").replace(/(es|s)$/,"");
const edWords=s=>edNorm(s).split(" ").filter(w=>w&&!ED_SKIP.has(w)).map(edStem);
function edScore(q,name){const a=edWords(q),b=edWords(name);if(!a.length||!b.length)return 0;let hit=0;a.forEach(w=>{if(b.some(x=>x===w||(w.length>3&&x.startsWith(w))||(x.length>3&&w.startsWith(x))))hit++});
 return hit/a.length+(edNorm(name)===edNorm(q)?1:0)}
function edBest(q,list,label){let best=null,sc=0,tie=false;list.forEach(x=>{const s=edScore(q,label(x));if(s>sc){best=x;sc=s;tie=false}else if(s&&s===sc)tie=true});return sc>=0.5&&!tie?best:null}
/* who or what an event is for: clients (by name or event name) and venue bookings, like the pull list's "For" box */
function edRefs(){const out=[],cs=D.clients||{};Object.keys(cs).forEach(id=>{const c=cs[id];out.push({ref:"c:"+id,cid:id,name:c.name||"Client",ev:c.evName||"",date:c.date||""})});
 try{bkList().filter(b=>b.status!=="cancelled").forEach(b=>out.push({ref:"b:"+b.k,cid:"",name:b.name||"Venue booking",ev:"",date:b.date||""}))}catch(e){}
 return out}
const edRefLabel=r=>r.name+(r.ev?" "+r.ev:"");
const edRefShow=r=>(r.ev||r.name)+(r.date?" · "+clFmtDate(r.date):"");

/* ---- the backup: simple, common ways to say each job, when the brain can't be reached ---- */
const ED_WD=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
function edDateIn(t){const s=edNorm(t),today=edToday();let m;
 if(/\btoday\b/.test(s))return today;if(/\btomorrow\b/.test(s))return dayAdd(today,1);
 if((m=String(t).match(/\b(\d{4}-\d{2}-\d{2})\b/)))return m[1];
 for(let i=0;i<7;i++)if(new RegExp("\\b"+ED_WD[i]+"\\b").test(s)){const d=new Date(today+"T12:00:00");let n=(i-d.getDay()+7)%7;if(n===0)n=7;return dayAdd(today,n)}
 if((m=s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})\b/))){const mo="janfebmaraprmayjunjulaugsepoctnovdec".indexOf(m[1])/3,y=+today.slice(0,4),c=`${y}-${String(mo+1).padStart(2,"0")}-${String(+m[2]).padStart(2,"0")}`;return c<today?`${y+1}${c.slice(4)}`:c}
 return ""}
function edTimeIn(t){const m=String(t).toLowerCase().match(/\bat (\d{1,2})(?::(\d{2}))? ?(am|pm|a\.m\.|p\.m\.)?/);if(!m)return "";let h=+m[1];const mi=m[2]||"00",ap=m[3]||"";
 if(h>23||+mi>59)return "";if(/^p/.test(ap)&&h<12)h+=12;else if(/^a/.test(ap)&&h===12)h=0;else if(!ap&&h>=1&&h<=7)h+=12;return String(h).padStart(2,"0")+":"+mi}
function eddieLocal(text){const t=String(text||"").trim(),s=t.toLowerCase();let m;
 const base={job:"none",for:"",items:[],title:"",date:edDateIn(t),time:edTimeIn(t),name:"",email:"",phone:"",kind:"",guests:0,help:0,say:""};
 if((m=t.match(/\b(?:add|reserve|put|pull)\s+(\d+)\s+(.+?)(?:\s+(?:to|on|onto|in|into)\s+(?:the\s+|my\s+)?(?:.*?pull ?list|inventory))(?:\s+(?:for|to)\s+(.+))?$/i))||(m=t.match(/\b(?:add|reserve)\s+(\d+)\s+(.+?)\s+for\s+(.+)$/i)))
  return Object.assign(base,{job:"pull",items:[{what:m[2].replace(/\s+(?:for|to)\s+.*$/i,""),qty:+m[1]}],for:(m[3]||"").replace(/\b(?:on|this|next)\s+\w+day.*$/i,"").trim()});
 if((m=t.match(/\b(?:add|new|create)\s+(?:a\s+)?lead\s*(?:named|called|for|:)?\s*(.+)$/i)))return Object.assign(base,{job:"lead",name:m[1].replace(/[,.].*$/,"").trim(),email:(t.match(/\S+@\S+\.\w+/)||[""])[0]});
 if((m=t.match(/\b(?:add|new|create)\s+(?:a\s+)?client\s*(?:named|called|:)?\s*(.+)$/i)))return Object.assign(base,{job:"client",name:m[1].replace(/[,.].*$/,"").replace(/\s+(?:on|for)\s+.*$/i,"").trim()});
 if(base.date&&/\b(put|add|schedule|book|set up|calendar)\b/.test(s)){
  const fm=t.match(/\b(?:for|with)\s+(.+?)(?:\s+(?:on|at|this|next|tomorrow|today)\b|$)/i);
  let title=t.replace(/^(?:please\s+)?(?:put|add|schedule|book|set up)\s+(?:a\s+|an\s+|the\s+)?/i,"").replace(/\s+(?:on|for|with|at|this|next|tomorrow|today)\b.*$/i,"").replace(/\s+(?:to|on)\s+(?:the\s+)?calendar.*$/i,"").trim();
  return Object.assign(base,{job:"date",title:title.charAt(0).toUpperCase()+title.slice(1),for:fm?fm[1].trim():""})}
 const help=(HELP.pl||[]).map((x,i)=>({i,s:helpScore(x,t)})).sort((a,b)=>b.s-a.s)[0];
 if(help&&help.s>=10)return Object.assign(base,{job:"help",help:help.i+1});
 return base}

/* ---- asking: the brain first, the backup if it's busy or unreachable ---- */
async function eddieAsk(text){
 const body={text:String(text).slice(0,300),today:edToday(),help:(HELP.pl||[]).map(x=>x[0])};
 try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),12000);
  const r=await fetch(EDDIE_URL,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:ctl.signal});clearTimeout(tm);
  const j=await r.json();if(j&&j.ok&&j.job){const lo=eddieLocal(text);
   /* the brain can miss a job the backup is sure about; keep the brain's answer otherwise */
   if(j.job==="none"&&lo.job!=="none")return Object.assign(lo,{src:"local"});return Object.assign(j,{src:"brain"})}}catch(e){}
 return Object.assign(eddieLocal(text),{src:"local"})}

/* ---- turning an answer into a card the planner checks ---- */
function eddiePropose(a){const refs=edRefs(),ref=a.for?edBest(a.for,refs,edRefLabel):null;
 if(a.job==="pull"){const gear=gearList(),items=(a.items||[]).map(x=>({what:x.what,qty:x.qty||1,gk:(edBest(x.what,gear,g=>g.name+" "+(g.color||""))||{}).k||""}));
  if(!items.length)return {job:"none",say:"What should I add to the pull list? Try “add 20 gold chairs to the pull list for the Lopez wedding”."};
  if(!gear.length)return {job:"none",say:"Your Inventory is empty, so there's nothing to pull yet. Add your rentals in Inventory first.",tab:"inv"};
  const open=ref?gresList().find(r=>r.ref===ref.ref&&r.status!=="back"):null;
  return {job:"pull",ref:ref?ref.ref:"",label:ref?(ref.ev||ref.name):a.for||"",from:a.date||(open&&open.from)||(ref&&ref.date)||"",items,into:open?open.k:"",
   say:a.say||`Adding ${items.map(x=>x.qty+" "+x.what).join(" and ")} to ${open?"the pull list for "+(open.label||"that event"):"a new pull list"}.`}}
 if(a.job==="date"){return {job:"date",cid:ref&&ref.cid?ref.cid:"",title:a.title||"",date:a.date||"",time:a.time||"",forWords:a.for||"",say:a.say||`Putting ${a.title||"that"} on the calendar.`}}
 if(a.job==="client"){if(!a.name)return {job:"none",say:"What's the new client's name?"};return {job:"client",name:a.name,date:a.date||"",say:a.say||`Adding ${a.name} as a new client.`}}
 if(a.job==="lead"){if(!a.name)return {job:"none",say:"What's the lead's name?"};return {job:"lead",name:a.name,email:a.email||"",phone:a.phone||"",kind:a.kind||"",guests:a.guests||0,date:a.date||"",say:a.say||`Adding ${a.name} to your leads.`}}
 if(a.job==="help"){const h=(HELP.pl||[])[(a.help||0)-1];if(h)return {job:"help",h,say:h[1]}}
 return {job:"none",say:a.say&&a.job==="none"?a.say:"I'm not sure what you need. I can add to a pull list, the calendar, your clients or your leads, or show you how to do something."}}

/* ---- doing it, with the portal's own record shapes ---- */
const edVal=id=>{const el=document.getElementById(id);return el?String(el.value).trim():""};
async function eddieDo(){const p=ED.prop;if(!p)return;let undo=null,msg="",tab="";
 try{
 if(p.job==="pull"){const ref=edVal("ed_ref"),ri=refInfo(ref),label=edVal("ed_label").slice(0,80)||(ri&&ri.name)||"",from=edVal("ed_from")||(ri&&ri.date)||"";
  const add={};p.items.forEach((x,i)=>{const gk=edVal("ed_gk"+i),q=Math.floor(+edVal("ed_q"+i));if(gk&&q>0)add[gk]=(add[gk]||0)+q});
  if(!Object.keys(add).length)return eddieSay("Pick an item from your inventory and how many, then tap Yes.");
  const into=edVal("ed_into");
  if(into&&(D.gres||{})[into]){const old=Object.assign({},D.gres[into].items||{}),items=Object.assign({},old);Object.keys(add).forEach(k=>items[k]=(+items[k]||0)+add[k]);
   await RT(PSP+"gearRes/"+into+"/items").set(items);undo=()=>RT(PSP+"gearRes/"+into+"/items").set(old);msg="Added to the pull list for "+(D.gres[into].label||"that event")+"."}
  else{if(!label)return eddieSay("Who is the pull list for? Pick them, or type a name.");if(!from)return eddieSay("Pick the day it goes out, then tap Yes.");
   const r=RT(PSP+"gearRes").push();await r.set({label,ref,from,to:from,items:add,note:"",status:"held",t:Date.now()});undo=()=>r.remove();msg="New pull list made for "+label+"."}
  const sh=gresShort({items:add,from,to:from,status:"held"});if(sh.length)msg+=" Heads up: you're short on "+sh.map(x=>x.name).join(", ")+" that day.";tab="inv"}
 else if(p.job==="date"){const cid=edVal("ed_cid"),title=edVal("ed_title").slice(0,80),date=edVal("ed_date"),time=edVal("ed_time");
  if(!cid||!(D.clients||{})[cid])return eddieSay("Which client is this for? Pick one, then tap Yes.");if(!title)return eddieSay("What should it say on the calendar?");if(!date)return eddieSay("Pick the date, then tap Yes.");
  const r=RT(PSP+"clientDates/"+cid).push();await r.set({title,date,time,note:"",t:Date.now()});undo=()=>r.remove();msg=`On the calendar: ${title}, ${clFmtDate(date)}${time?" at "+clFmtTime(time):""}. ${D.clients[cid].name||"Your client"} will see it too.`;tab="cal"}
 else if(p.job==="client"){const name=edVal("ed_name").slice(0,40),date=edVal("ed_date");if(!name)return eddieSay("Type the client's name, then tap Yes.");
  const r=RT(PSP+"clients").push();await r.set({name,ev:"",evName:"",date,t:Date.now()});undo=()=>r.remove();msg=name+" is added. Open Clients to send them their link.";tab="clients"}
 else if(p.job==="lead"){const name=edVal("ed_name").slice(0,80);if(!name)return eddieSay("Type the lead's name, then tap Yes.");const dt=edVal("ed_date");
  const r=RT(PSP+"inquiries").push();await r.set({name,email:edVal("ed_email").slice(0,120).toLowerCase(),phone:edVal("ed_phone").slice(0,30),type:edVal("ed_kind").slice(0,40),date:/^\d{4}-\d{2}-\d{2}$/.test(dt)?dt:"",guests:Math.max(0,parseInt(edVal("ed_guests"),10)||0),budget:"",msg:"Added by you with Eddie.",src:"",status:"new",t:Date.now()});
  undo=()=>r.remove();msg=name+" is in your leads.";tab="leads"}
 }catch(e){return eddieSay("That didn't save. Check your connection and try again.")}
 ED.prop=null;ED.undo=undo;ED.done=tab;eddieSay(msg,"cheer");try{render()}catch(e){}}
async function eddieUndo(){const u=ED.undo;ED.undo=null;ED.done=null;if(!u)return;try{await u();eddieSay("Undone. It's back the way it was.")}catch(e){eddieSay("I couldn't undo that. Check your connection.")}try{render()}catch(e){}}

/* ---- the card the planner checks before Yes ---- */
const edSel=(id,opts,sel,blank)=>`<select id="${id}">${blank?`<option value="">${esc(blank)}</option>`:""}${opts.map(([v,l])=>`<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
const edIn=(id,label,val,type="text",ph="")=>`<label class="stack tight"><span class="small">${esc(label)}</span><input id="${id}" type="${type}" value="${esc(val||"")}" placeholder="${esc(ph)}"${type==="text"?' maxlength="80"':""}></label>`;
function eddieCard(p){if(!p||p.job==="none")return "";
 if(p.job==="help")return `<div class="edcard"><div class="row">${p.h[2]?`<button class="btn sm primary" data-ed="show" data-k="${esc(p.h[2])}">Show me</button>`:""}<button class="btn sm" data-ed="no">Thanks</button></div></div>`;
 let body="";
 if(p.job==="pull"){const gear=gearList().map(g=>[g.k,g.name+(g.color?" · "+g.color:"")]),refs=edRefs().filter(r=>r.ref.startsWith("c:")||r.date>=dayAdd(edToday(),-7)).map(r=>[r.ref,edRefShow(r)]);
  const lists=gresList().filter(r=>r.status!=="back").map(r=>[r.k,(r.label||"Event")+(r.from?" · "+clFmtDate(r.from):"")]);
  body=`<label class="stack tight"><span class="small">Add to</span>${edSel("ed_into",lists,p.into,"A new pull list")}</label>
  <label class="stack tight"><span class="small">For</span>${edSel("ed_ref",refs,p.ref,"Something else (type a name below)")}</label>
  ${edIn("ed_label","Name on a new pull list",p.label,"text","Lopez wedding")}${edIn("ed_from","Goes out (new pull list)",p.from,"date")}
  ${p.items.map((x,i)=>`<div class="row edrow"><span class="small mw0">“${esc(x.what)}”</span>${edSel("ed_gk"+i,gear,x.gk,x.gk?"":"Pick from your inventory")}<input id="ed_q${i}" type="number" min="1" inputmode="numeric" value="${esc(x.qty)}" aria-label="How many ${esc(x.what)}" style="width:5em"></div>`).join("")}`}
 else if(p.job==="date"){const cl=Object.keys(D.clients||{}).map(id=>[id,(D.clients[id].name||"Client")+(D.clients[id].evName?" · "+D.clients[id].evName:"")]);
  body=`<label class="stack tight"><span class="small">Client</span>${edSel("ed_cid",cl,p.cid,p.forWords?`Pick a client (I heard “${p.forWords}”)`:"Pick a client")}</label>${edIn("ed_title","What it is",p.title,"text","Venue walkthrough")}<div class="grid2 g8">${edIn("ed_date","Date",p.date,"date")}${edIn("ed_time","Time",p.time,"time")}</div><span class="small muted">Your client sees this date in their portal too.</span>`}
 else if(p.job==="client")body=`${edIn("ed_name","Client's name",p.name)}${edIn("ed_date","Event date (if you know it)",p.date,"date")}`;
 else if(p.job==="lead")body=`${edIn("ed_name","Name",p.name)}<div class="grid2 g8">${edIn("ed_email","Email",p.email,"email")}${edIn("ed_phone","Phone",p.phone,"tel")}${edIn("ed_kind","Kind of event",p.kind,"text","Wedding")}${edIn("ed_guests","Guests",p.guests||"","number")}</div>${edIn("ed_date","Event date",p.date,"date")}`;
 return `<div class="edcard stack tight">${body}<div class="row"><button class="btn sm primary" data-ed="yes">Yes, do it</button><button class="btn sm" data-ed="no">No</button></div></div>`}

/* ---- the layer ---- */
function eddieRoot(){let r=document.getElementById("eddie");if(r)return r;r=document.createElement("div");r.id="eddie";document.body.appendChild(r);
 r.addEventListener("click",eddieClick);r.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="ed_in"){e.preventDefault();eddieSend()}if(e.key==="Escape")eddieClose()});return r}
function eddieDraw(){const r=eddieRoot();if(!edOn()){r.hidden=true;return}r.hidden=false;eddieDock(r);
 const speech=!!(window.SpeechRecognition||window.webkitSpeechRecognition),pose=ED.pose||"wave";
 if(!ED.open){r.innerHTML=`<button class="edfab" data-ed="open" aria-label="Ask Eddie, your assistant"><img src="${edImg("wave")}" alt="" width="54" height="101"></button>${ED.say&&!edD3()?`<div class="edbub edtip" role="status">${esc(ED.say)}<span class="row"><button class="btn xs primary" data-ed="open">Try it</button><button class="btn xs" data-ed="hush">Got it</button></span></div>`:""}`;return}
 r.innerHTML=`<section class="edpanel" role="dialog" aria-label="Eddie, your assistant"><div class="edhead"><img src="${edImg(pose)}" alt="Eddie" class="edface"><div class="edbub" aria-live="polite">${ED.busy?'<span class="eddots" aria-label="Eddie is thinking"><i></i><i></i><i></i></span>':esc(ED.say||"Hi! What can I do for you?")}</div><button class="btn xs edx" data-ed="close" aria-label="Close Eddie">✕</button></div>
 ${ED.busy?"":eddieCard(ED.prop)}
 ${!ED.busy&&ED.undo?`<div class="row"><button class="btn sm" data-ed="undo">Undo</button>${ED.done?`<button class="btn sm" data-ed="go" data-k="${ED.done}">Open it</button>`:""}</div>`:""}
 ${!ED.busy&&!ED.prop&&!ED.undo?`<div class="row small edchips">${(edD3()?["Arrange ten round tables with eight chairs at each table","Add a dance floor in the center","Put tall centerpieces on every table","Add 20 gold chairs to the pull list for the Lopez wedding"]:["Add 20 gold chairs to the pull list for the Lopez wedding","Put a walkthrough with Ana on Thursday at 3","Add a new lead, Maria Lopez","How do I send an invoice?"]).map(c=>`<button class="btn xs" data-ed="chip">${esc(c)}</button>`).join("")}</div>`:""}
 <div class="row edask"><input id="ed_in" type="text" maxlength="300" placeholder="${ED.listening?"Listening…":"Tell Eddie what you need"}" aria-label="Tell Eddie what you need" autocomplete="off">${speech?`<button class="btn sm ${ED.listening?"primary":""}" data-ed="mic" aria-label="${ED.listening?"Stop listening":"Talk to Eddie"}" aria-pressed="${ED.listening}">🎤</button>`:""}<button class="btn sm primary" data-ed="send">Send</button></div>
 <div class="small muted edfoot">Eddie always asks before he changes anything. <button class="linkbtn" data-ed="report">Report a problem</button></div></section>`;
 if(!ED.prop&&!ED.busy){const i=document.getElementById("ed_in");if(i&&document.activeElement!==i&&ED.focus){i.focus();ED.focus=false}}}
function eddieSay(t,pose){ED.say=t;ED.busy=false;ED.pose=pose||(ED.prop&&ED.prop.job==="help"?"point":"wave");eddieDraw()}
function eddieSync(){try{if(!edOn()){const r=document.getElementById("eddie");if(r)r.hidden=true;eddieUnpoint();return}
 const r=document.getElementById("eddie");if(!r||r.hidden||!r.innerHTML||r.classList.contains("edd3")!==(edD3()&&!ED.open))eddieDraw();else eddieDock(r);
 const k="eddieHi_"+PLID();if(!ED.greeted&&!store.get(k,false)){ED.greeted=true;store.set(k,true);ED.say="Hi, I'm Eddie, your super assistant! Tap me and tell me what you need, like “add 20 gold chairs to the pull list for the Lopez wedding”.";eddieDraw()}}catch(e){}}
function eddieClose(){ED.open=false;ED.say="";ED.prop=null;ED.undo=null;ED.done=null;eddieStopMic();eddieDraw()}
async function eddieSend(text){const i=document.getElementById("ed_in"),t=String(text!=null?text:i?i.value:"").trim();if(!t||ED.busy)return;
 ED.prop=null;ED.undo=null;ED.done=null;
 /* on the 3D designer tab, room requests go to the designer, which shows a preview to keep or undo */
 const w=edD3()&&ed3dWin();if(w){let shown=false;try{shown=w.hm3d.ask(t)}catch(e){}if(shown){ED.open=false;ED.say="";eddieStopMic();eddieDraw();toast("Eddie set it up in the room. Tap Keep it to keep it.");return}}
 ED.busy=true;ED.pose="wave";eddieDraw();
 const a=await eddieAsk(t),p=eddiePropose(a);ED.log.push({t,job:p.job,src:a.src});ED.prop=p.job==="none"?null:p;eddieSay(p.say,p.job==="help"?"point":"wave");
 if(p.job==="none"&&p.tab)ED.done=p.tab}
function eddieClick(e){const b=e.target.closest("[data-ed]");if(!b)return;const k=b.dataset.ed;
 if(k==="open"){ED.open=true;ED.say=ED.say&&!ED.greetDone?"":ED.say;ED.greetDone=true;ED.focus=true;eddieDraw()}
 else if(k==="hush"){ED.say="";eddieDraw()}
 else if(k==="close")eddieClose();
 else if(k==="send")eddieSend();
 else if(k==="chip")eddieSend(b.textContent);
 else if(k==="yes")eddieDo();
 else if(k==="no"){ED.prop=null;eddieSay("Okay, nothing changed. What else can I do?")}
 else if(k==="undo")eddieUndo();
 else if(k==="go"){const t=b.dataset.k;eddieClose();L.plTab=t;L.confirm=null;render(true);scrollTo(0,0)}
 else if(k==="show"){const t=b.dataset.k;ED.prop=null;eddieClose();eddiePoint(t)}
 else if(k==="mic")ED.listening?eddieStopMic():eddieMic();
 else if(k==="report"){eddieClose();try{ACT.supOpen({dataset:{k:"new"}})}catch(err){}}}

/* ---- talking: the phone's own free speech-to-text ---- */
function eddieMic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
 try{const rec=new SR();rec.lang=navigator.language||"en-US";rec.interimResults=true;rec.maxAlternatives=1;ED.rec=rec;ED.listening=true;eddieDraw();
  rec.onresult=ev=>{const res=ev.results[ev.results.length-1],txt=res[0].transcript,i=document.getElementById("ed_in");if(i)i.value=txt;if(res.isFinal){eddieStopMic();eddieSend(txt)}};
  rec.onerror=ev=>{eddieStopMic();if(ev&&ev.error==="not-allowed")eddieSay("I need permission to use the microphone. You can also type.")};rec.onend=()=>{if(ED.listening)eddieStopMic()};rec.start()}catch(err){eddieStopMic()}}
function eddieStopMic(){const r=ED.rec;ED.rec=null;if(ED.listening){ED.listening=false;try{r&&r.stop()}catch(e){}eddieDraw()}}

/* ---- pointing: Eddie walks over to the tab to tap and points at it ---- */
function eddieUnpoint(){const p=document.getElementById("edpoint");if(p)p.remove();document.querySelectorAll(".edring").forEach(x=>x.classList.remove("edring"));ED.point=null}
function eddiePoint(tab){eddieUnpoint();if(!tab)return;const el=document.querySelector(`#app [data-act="plTab"][data-k="${CSS.escape(tab)}"]`);if(!el)return;
 el.scrollIntoView({block:"center",inline:"center",behavior:reduceMotion()?"auto":"smooth"});
 const w=document.createElement("div");w.id="edpoint";w.setAttribute("role","status");w.innerHTML=`<img src="${edImg("point")}" alt="Eddie pointing"><div class="edbub">Tap here!</div>`;document.body.appendChild(w);ED.point=tab;
 const place=()=>{if(!document.body.contains(el)){eddieUnpoint();return}const b=el.getBoundingClientRect(),H=118,W=Math.round(H*547/420),flip=b.left-W*0.96<4;
  w.classList.toggle("flip",flip);w.style.width=W+"px";w.style.left=Math.round(flip?b.right-W*0.04:b.left-W*0.96)+"px";w.style.top=Math.round(Math.max(4,b.top+b.height/2-H*0.71))+"px"};
 setTimeout(()=>{el.classList.add("edring");place();w.classList.add("in")},reduceMotion()?0:380);
 const done=()=>{eddieUnpoint();removeEventListener("scroll",place,true);removeEventListener("resize",place)};addEventListener("scroll",place,true);addEventListener("resize",place);
 el.addEventListener("click",done,{once:true});w.addEventListener("click",done,{once:true});setTimeout(()=>{if(ED.point===tab)done()},9000)}
