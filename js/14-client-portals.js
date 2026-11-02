/* ================= CLIENT PORTALS: one private link per client, no account needed =================
   partygames/clients/{id}      = {name, ev, evName, t, plSeen}      (the id is the link: games.html?client=ID)
   partygames/clientTasks/{id}/{tid} = {title, owner:"client"|"planner", due, note, show, done, doneAt, by, t}
   partygames/clientMsgs/{id}/{mid}  = {from:"client"|"planner", text, t}
   partygames/clientFiles/{id}/{fid} = {name, kind:"photo"|"guests"|"doc", size, by, t, thumb?, share?, count?, status?}
   partygames/clientBlobs/{id}/{fid} = the file itself as a data URL (kept apart so lists stay light) */
D.clients={};D.ctasks={};D.cmsgs={};D.cfiles={};D.cliMe=null;
const CL_MAX=10*1024*1024;
function clKey(){return new URLSearchParams(location.search).get("client")||""}
function clConnect(){const id=clKey();if(!id){L.loaded=true;renderSoon();return}
 RT(PSP+"brand").on("value",s=>{D.brand=s.val();applyTheme();renderSoon()});
 RT(PSP+"clients/"+id).on("value",s=>{D.cliMe=s.val();L.loaded=true;renderSoon()});
 RT(PSP+"clientTasks/"+id).on("value",s=>{D.ctasks=Object.assign({},D.ctasks,{[id]:s.val()||{}});renderSoon()});
 RT(PSP+"clientMsgs/"+id).on("value",s=>{D.cmsgs=Object.assign({},D.cmsgs,{[id]:s.val()||{}});renderSoon()});
 RT(PSP+"clientFiles/"+id).on("value",s=>{D.cfiles=Object.assign({},D.cfiles,{[id]:s.val()||{}});renderSoon()});
 RT(PSP+"clientApprovals/"+id).on("value",s=>{D.caps=Object.assign({},D.caps,{[id]:s.val()||{}});renderSoon()});
 [["clientPayments","cpay"],["clientDates","cdates"],["clientVendors","cven"],["clientInvoices","cinv"]].forEach(([p,k])=>RT(PSP+p+"/"+id).on("value",s=>{D[k]=Object.assign({},D[k],{[id]:s.val()||{}});renderSoon()}))}
const clList=(src,id)=>{const o=(D[src]||{})[id]||{};return Object.keys(o).map(k=>Object.assign({k},o[k]))};
const clVisible=x=>x.owner==="client"||!!x.show;
const clTasksOf=(id,all)=>clList("ctasks",id).filter(x=>all||clVisible(x)).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||String(a.due||"9999").localeCompare(String(b.due||"9999"))||(a.t||0)-(b.t||0));
const clStats=(id,all)=>{const l=clTasksOf(id,all),d=l.filter(x=>x.done).length;return {total:l.length,done:d,open:l.length-d,pct:l.length?Math.round(d/l.length*100):0}};
const clMsgsOf=id=>clList("cmsgs",id).sort((a,b)=>(a.t||0)-(b.t||0));
const clFilesOf=(id,forClient)=>clList("cfiles",id).filter(f=>!forClient||f.by==="client"||f.share).sort((a,b)=>(b.t||0)-(a.t||0));
const clUnread=id=>{const c=(D.clients||{})[id]||{};return clMsgsOf(id).filter(m=>m.from==="client"&&(m.t||0)>(c.plSeen||0)).length};
const clPending=id=>clFilesOf(id).filter(f=>f.kind==="guests"&&f.status==="pending").length;
const clAttention=()=>Object.keys(D.clients||{}).reduce((n,id)=>n+clUnread(id)+clPending(id)+clApNew(id),0);
const clLate=x=>!x.done&&x.due&&x.due<mateToday();
function clLink(id){return location.origin+location.pathname.replace(/[^/]*$/,"")+"games.html?client="+encodeURIComponent(id)+(PLID()?"&p="+encodeURIComponent(PLID()):"")}
const clMB=n=>n<1048576?Math.max(1,Math.round(n/1024))+" KB":(n/1048576).toFixed(n>=10485760?0:1)+" MB";
const clAgo=t=>{const s=Math.max(0,(Date.now()-t)/1000);return s<60?"just now":s<3600?Math.floor(s/60)+" min ago":s<86400?Math.floor(s/3600)+" hr ago":new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric"})};

/* ---- reading and shrinking files ---- */
const clUnesc=s=>String(s).replace(/&#(x[0-9a-f]+|\d+);/gi,(m,c)=>{try{return String.fromCodePoint(c[0].toLowerCase()==="x"?parseInt(c.slice(1),16):+c)}catch(e){return m}}).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
async function clXlsxToCsv(file){if(!window.JSZip)throw new Error("nozip");const z=await JSZip.loadAsync(await file.arrayBuffer());const strs=[];const ss=z.file("xl/sharedStrings.xml");
 if(ss){const x=await ss.async("string");(x.match(/<si[\s\S]*?<\/si>/g)||[]).forEach(si=>strs.push(clUnesc((si.match(/<t[^>]*>[\s\S]*?<\/t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,"")).join(""))))}
 const sh=z.file("xl/worksheets/sheet1.xml");if(!sh)throw new Error("nosheet");const x=await sh.async("string");const rows=[];
 (x.match(/<row[\s\S]*?<\/row>/g)||[]).forEach(r=>{const cells=[];(r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)||[]).forEach(c=>{const ref=(c.match(/ r="([A-Z]+)\d+"/)||[])[1]||"A",col=ref.split("").reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1;
  const t=(c.match(/ t="(\w+)"/)||[])[1],v=(c.match(/<v>([\s\S]*?)<\/v>/)||[])[1],is=(c.match(/<is>[\s\S]*?<\/is>/)||[])[0];cells[col]=t==="s"?strs[+v]||"":is?clUnesc(is.replace(/<[^>]+>/g,"")):clUnesc(v||"")});rows.push(Array.from(cells,c=>c==null?"":c))});
 return rows.map(r=>r.map(c=>/[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c).join(",")).join("\n")}
function clShrink(file,max,q){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej(new Error("read"));fr.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error("img"));img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*k));c.height=Math.max(1,Math.round(img.height*k));c.getContext("2d").drawImage(img,0,0,c.width,c.height);res({data:c.toDataURL("image/jpeg",q),w:c.width,h:c.height})};img.src=fr.result};fr.readAsDataURL(file)})}
const clReadURL=f=>new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej(new Error("read"));fr.onload=()=>res(String(fr.result));fr.readAsDataURL(f)});
async function clSave(id,meta,data){const k=RT(PSP+"clientFiles/"+id).push().key;await RT(PSP+`clientBlobs/${id}/${k}`).set(data);await RT(PSP+`clientFiles/${id}/${k}`).set(Object.assign({t:Date.now()},meta));return k}
async function clGetBlob(id,k){const s=await RT(PSP+`clientBlobs/${id}/${k}`).once("value");return s.val()||""}
async function clOpen(id,k,name,kind){toast("Opening…");const d=await clGetBlob(id,k);if(!d)return toast("That file is no longer there");
 try{let url=d,rev=false;if(d.startsWith("data:")){const b=await (await fetch(d)).blob();url=URL.createObjectURL(b);rev=true}
  if(kind==="guests"){const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}else{const w=window.open(url,"_blank");if(!w){const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}}
  if(rev)setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){toast("Couldn't open that file")}}

/* ---- the client's portal ---- */
function clientView(){
 const id=clKey();
 if(!id||(L.loaded&&!D.cliMe))return `<section class="card stack narrow"><h2>This link isn't working</h2><p class="muted m0">Ask your planner to send you your personal link again.</p></section>`;
 if(!L.loaded)return loadingView();
 const me=D.cliMe,tab=L.clTab||"home",ms=clMsgsOf(id),seen=+(store.get("clSeen_"+id,0)||0),newMsgs=ms.filter(m=>m.from==="planner"&&(m.t||0)>seen).length;
 const nav=(k,l,b)=>`<button data-act="clTab" data-k="${k}" aria-pressed="${tab===k}">${l}${b?` <span class="pill warn">${b}</span>`:""}</button>`;
 const head=`<section class="card stack"><div class="eyebrow">${esc(me.evName||"Your event")}</div><h2>Hi ${esc(me.name||"there")}</h2><div class="seg wrap" role="group" aria-label="Sections">${nav("home","Overview")}${nav("todo","To-do")}${nav("files","Uploads")}${nav("approve","Approvals",clApPending(id))}${nav("plan","Plan",clPayDue(id).length)}${nav("chat","Messages",newMsgs)}</div></section>`;
 const err=L.clErr?`<section class="banner"><span><b>${esc(L.clErr.title)}</b> ${esc(L.clErr.text)}</span><span class="row"><button class="btn xs primary" data-act="clHelp">Message my planner</button><button class="btn xs" data-act="clErrX">Close</button></span></section>`:"";
 return head+err+({home:clHome,todo:clTodo,files:clFilesView,approve:clApprovalsView,plan:clPlanView,chat:clChat}[tab]||clHome)(id,me)+(tab==="home"||!({todo:1,files:1,approve:1,plan:1,chat:1})[tab]?brContactCard():"")}
const clRow=(x,mine)=>`<label class="mrow ${x.done?"done":""} ${clLate(x)?"late":""}"><input type="checkbox" data-act="clTick" data-k="${x.k}" ${x.done?"checked":""} ${mine?"":"disabled"} aria-label="${esc(x.title)}"><span class="mw0"><b>${esc(x.title)}</b>${x.note?`<span class="small muted db">${esc(x.note)}</span>`:""}${x.due?`<span class="small ${clLate(x)?"bad":"muted"} db">${clLate(x)?"Overdue · ":"Due "}${esc(mateDue(x.due))}</span>`:""}</span></label>`;
function clHome(id,me){const s2=clStats(id),l=clTasksOf(id),mine=l.filter(x=>x.owner==="client"&&!x.done),soon=l.filter(x=>!x.done&&x.due).slice(0,3);
 return `${qaClientCard(id,me||D.cliMe||{})}<section class="card stack"><h3>Where things stand</h3>${s2.total?`<div class="row between small"><span>${s2.done} of ${s2.total} done</span><span class="muted">${s2.open?s2.open+" to go":"All done. Nice work!"}</span></div>${mateBar(s2.pct)}`:`<p class="muted m0">Your planner will add your checklist here soon.</p>`}</section>
 ${clPayDue(id).length?`<section class="banner"><span><b>Payment reminder:</b> ${clPayDue(id).map(x=>esc(x.title)+" "+clMoney(x.amount)+" ("+(x.due<mateToday()?"overdue":"due "+esc(mateDue(x.due)))+")").join(", ")}</span><button class="btn xs" data-act="clTab" data-k="plan">Details</button></section>`:""}
 ${clWeekCard(id)}
 ${clApPending(id)?`<section class="card stack"><h3>Needs your approval</h3>${clAps(id).filter(a=>a.status==="pending").map(a=>`<div class="row between small"><span>${esc(a.title)}</span><button class="btn xs primary" data-act="clTab" data-k="approve">Review</button></div>`).join("")}</section>`:""}
 ${mine.length?`<section class="card stack"><h3>Waiting on you</h3><div class="stack tight">${mine.slice(0,5).map(x=>clRow(x,true)).join("")}</div>${mine.length>5?`<button class="btn sm as" data-act="clTab" data-k="todo">See all ${mine.length}</button>`:""}</section>`:s2.total?`<section class="card"><p class="m0">Nothing is waiting on you right now. 🎉</p></section>`:""}
 ${soon.length?`<section class="card stack"><h3>Coming up</h3><div class="stack tight">${soon.map(x=>`<div class="row between small"><span>${esc(x.title)}${x.owner==="planner"?' <span class="muted">· your planner</span>':""}</span><span class="${clLate(x)?"bad":"muted"}">${esc(mateDue(x.due))}</span></div>`).join("")}</div></section>`:""}
 <section class="card stack"><h3>Send something to your planner</h3><div class="row"><button class="btn" data-act="clTab" data-k="files">Upload photos, a guest list or a PDF</button><button class="btn" data-act="clTab" data-k="chat">Ask a question</button></div></section>`}
function clTodo(id){const l=clTasksOf(id),mine=l.filter(x=>x.owner==="client"),pl=l.filter(x=>x.owner==="planner");
 return `<section class="card stack"><h3>Yours to do</h3>${mine.length?`<div class="stack tight">${mine.map(x=>clRow(x,true)).join("")}</div>`:'<p class="small muted m0">Nothing yet.</p>'}</section>
 ${pl.length?`<section class="card stack"><h3>Your planner is handling</h3><div class="stack tight">${pl.map(x=>clRow(x,false)).join("")}</div></section>`:""}`}
function clFilesView(id){const fs=clFilesOf(id,true);
 return `<section class="card stack"><h3>Upload</h3><p class="small muted m0">Photos you'd like printed, your guest list, a contract or a floor plan. Files can be up to 10 MB.</p>
 <div class="row"><label class="btn upl">📷 Photos<input type="file" accept="image/*" multiple data-act="clFile" data-kind="photo"></label><label class="btn upl">📄 PDF or document<input type="file" accept=".pdf,.doc,.docx,.txt,application/pdf" data-act="clFile" data-kind="doc"></label><label class="btn upl">👥 Guest list<input type="file" accept=".csv,.txt,.xlsx,text/csv" data-act="clFile" data-kind="guests"></label></div>
 <details><summary class="small">Or type or paste guest names</summary><div class="stack tight"><textarea data-draft="cl_names" rows="5" placeholder="One name per line">${esc(dv("cl_names",""))}</textarea><button class="btn sm primary as" data-act="clNames">Send this guest list</button></div></details></section>
 <section class="card stack"><h3>Your files</h3>${fs.length?`<div class="stack tight">${fs.map(f=>clFileRow(id,f,"client")).join("")}</div>`:'<p class="small muted m0">Nothing uploaded yet.</p>'}</section>`}
function clFileRow(id,f,who){const icon=f.kind==="photo"?(f.thumb?`<img class="clthumb" src="${f.thumb}" alt="">`:"🖼"):f.kind==="guests"?"👥":"📄";
 const st3=f.kind==="guests"?(f.status==="imported"?'<span class="pill ok">Added to the guest list</span>':f.status==="dismissed"?'<span class="pill">Not used</span>':'<span class="pill warn">Waiting for your planner</span>'):"";
 const mineF=(who==="client"&&f.by==="client")||who==="planner";
 return `<div class="row between clfile"><span class="row mw0"><span class="clic">${icon}</span><span class="mw0"><b class="db">${esc(f.name)}</b><span class="small muted">${f.kind==="guests"&&f.count!=null?f.count+" names · ":""}${clMB(f.size||0)} · ${who==="planner"?(f.by==="client"?"from the client":"you"):(f.by==="planner"?"from your planner":"you")} · ${clAgo(f.t||0)} ${st3}</span></span></span>
  <span class="row"><button class="btn xs" data-act="clOpen" data-m="${id}" data-k="${f.k}">${f.kind==="guests"?"Download":"Open"}</button>${mineF&&!(who==="client"&&f.kind==="guests"&&f.status==="imported")?`<button class="btn xs" data-act="clFileDel" data-m="${id}" data-k="${f.k}" aria-label="Delete ${esc(f.name)}">×</button>`:""}</span></div>`}
function clChat(id){store.set("clSeen_"+id,Date.now());const ms=clMsgsOf(id);
 return `<section class="card stack"><h3>Messages</h3><div class="chat">${ms.length?ms.map(m=>`<div class="bub ${m.from==="client"?"me":"them"}"><span class="small muted db">${m.from==="client"?"You":"Your planner"} · ${clAgo(m.t||0)}</span>${esc(m.text)}</div>`).join(""):'<p class="small muted m0">Ask anything here. Your planner will reply in this thread.</p>'}</div>
 <div class="row"><textarea class="grow" rows="2" data-draft="cl_msg" maxlength="1000" placeholder="Type a message">${esc(dv("cl_msg",""))}</textarea><button class="btn primary" data-act="clSend" data-from="client">Send</button></div></section>`}

/* ---- the planner's Clients tab ---- */
function hClients(){
 const cs=D.clients||{},ids3=Object.keys(cs).sort((a,b)=>(cs[b].t||0)-(cs[a].t||0)),ev=D.events||{};
 const evSel=(cur,act,extra)=>`<select ${act?`data-act="${act}" ${extra||""}`:'data-draft="cl_ev"'} aria-label="Event"><option value="">No event yet</option>${Object.keys(ev).map(k=>`<option value="${esc(k)}" ${cur===k?"selected":""}>${esc(ev[k].name||k)}</option>`).join("")}</select>`;
 const card=id=>{const c=cs[id],open=L.cliOpen===id,tab=L.cliTab||"list",s2=clStats(id,true),un=clUnread(id),pd=clPending(id);
  const sub=(k,l,b)=>`<button class="btn sm ${tab===k?"primary":""}" data-act="cliSub" data-k="${k}">${l}${b?` <span class="pill warn">${b}</span>`:""}</button>`;const apN=clApNew(id),apP=clApPending(id);
  let body="";
  if(open&&tab==="list"){const l=clTasksOf(id,true);body=`<div class="stack tight">${l.map(x=>`<div class="row between small mrow2 ${x.done?"done":""}"><span class="mw0"><button class="btn xs" data-act="clPlanTick" data-m="${id}" data-k="${x.k}">${x.done?"✓":"○"}</button> <b>${esc(x.title)}</b> <span class="pill ${x.owner==="client"?"gold":""}">${x.owner==="client"?"client":"you"}</span>${x.owner==="planner"?`<button class="btn xs" data-act="clShow" data-m="${id}" data-k="${x.k}">${x.show?"👁 shown":"hidden"}</button>`:""}${x.due?` <span class="${clLate(x)?"bad":"muted"}">${clLate(x)?"overdue ":""}${esc(mateDue(x.due))}</span>`:""}${x.done&&x.by==="client"?' <span class="pill ok">ticked by client</span>':""}</span><button class="btn xs" data-act="clTaskDel" data-m="${id}" data-k="${x.k}" aria-label="Delete">×</button></div>`).join("")||'<span class="small muted">No items yet.</span>'}</div>
   <div class="grid2 g8"><label class="stack tight" style="grid-column:1/-1"><span class="small">New checklist item</span><input type="text" data-draft="clt_title" maxlength="120" value="${esc(dv("clt_title",""))}" placeholder="Book the caterer"></label>
   <label class="stack tight"><span class="small">Whose job</span><select data-draft="clt_owner"><option value="client" ${dv("clt_owner","client")==="client"?"selected":""}>The client</option><option value="planner" ${dv("clt_owner","client")==="planner"?"selected":""}>Me</option></select></label>
   <label class="stack tight"><span class="small">Due (optional)</span><input type="date" data-draft="clt_due" value="${esc(dv("clt_due",""))}"></label>
   <label class="stack tight" style="grid-column:1/-1"><span class="small">Note (optional)</span><input type="text" data-draft="clt_note" maxlength="160" value="${esc(dv("clt_note",""))}" placeholder="Get three quotes first"></label></div>
   <label class="row small"><input type="checkbox" data-act="cltShow" ${dv("clt_show","")==="1"?"checked":""}> If it's my job, show it to the client</label><button class="btn primary as" data-act="clTaskAdd" data-m="${id}">Add item</button>
   <div class="card stack tight"><b>Templates</b><div class="row"><select data-draft="tpl_apply_${id}" aria-label="Template">${clTplSelect(dv("tpl_apply_"+id,""))}</select><button class="btn sm" data-act="clTplApply" data-m="${id}">Add its items</button></div>${c.date?"":'<span class="small muted">Set the event date above and due dates are filled in for you.</span>'}
   <div class="row"><input type="text" class="grow" data-draft="tpl_name_${id}" maxlength="50" value="${esc(dv("tpl_name_"+id,""))}" placeholder="Name this checklist to reuse it"><button class="btn sm" data-act="clTplSave" data-m="${id}">Save as template</button></div></div>`}
  if(open&&tab==="money")body=pkPlanBox(id)+invPlanBox(id)+clPlanMoney(id);
  if(open&&tab==="dates")body=clPlanDates(id);
  if(open&&tab==="ven")body=clPlanVendors(id);
  if(open&&tab==="approve"){const l=clAps(id);body=`<div class="stack tight">${l.map(a=>clApCard(id,a,"planner")).join("")||'<p class="small muted m0">Nothing sent yet.</p>'}</div>
   <div class="card stack tight"><b>Send something for approval</b><input type="text" data-draft="ap_title" maxlength="100" value="${esc(dv("ap_title",""))}" placeholder="Wedding menu"><textarea rows="2" data-draft="ap_note" maxlength="400" placeholder="Anything the client should know (optional)">${esc(dv("ap_note",""))}</textarea>
   <div class="row"><label class="btn sm upl">${L.apFile?"Change file":"Attach a file"}<input type="file" data-act="clApAttach"></label>${L.apFile?`<span class="small">📎 ${esc(L.apFile.name)}</span>`:'<span class="small muted">Photo or PDF, up to 10 MB</span>'}</div><button class="btn primary as" data-act="clApSend" data-m="${id}">Send for approval</button></div>`}
  if(open&&tab==="chat"){const ms=clMsgsOf(id);body=`${clSummaryBox(id)}<div class="chat">${ms.map(m=>`<div class="bub ${m.from==="planner"?"me":"them"}"><span class="small muted db">${m.from==="planner"?"You":esc(c.name)} · ${clAgo(m.t||0)}</span>${esc(m.text)}</div>`).join("")||'<p class="small muted m0">No messages yet.</p>'}</div>
   <div class="row"><textarea class="grow" rows="2" data-draft="cl_msg_${id}" maxlength="1000" placeholder="Reply to ${esc(c.name)}">${esc(dv("cl_msg_"+id,""))}</textarea><button class="btn primary" data-act="clSend" data-from="planner" data-m="${id}">Send</button></div>`}
  if(open&&tab==="files"){const fs=clFilesOf(id);body=`${fs.length?`<div class="stack tight">${fs.map(f=>`${clFileRow(id,f,"planner")}${f.kind==="guests"&&f.status==="pending"?clGuestApprove(id,f,c):""}${f.by==="planner"?`<div class="small muted">${f.share?"Visible to the client":"Private"} · <button class="btn xs" data-act="clFileShare" data-m="${id}" data-k="${f.k}">${f.share?"Make private":"Share with client"}</button></div>`:""}`).join("")}</div>`:'<p class="small muted m0">No files yet.</p>'}
   <div class="row"><label class="btn sm upl">Upload for the client<input type="file" data-act="clPlanFile"></label><span class="small muted">PDFs and photos, up to 10 MB. Private until you share.</span></div>`}
  return `<section class="card stack${L.landId===id&&Date.now()-(L.landT||0)<1500?" landed":""}"><div class="row between"><div class="mw0"><h3>${esc(c.name)}</h3><div class="small muted">${esc(c.evName||c.evTitle||"No event linked")} · ${s2.total?`${s2.done} of ${s2.total} done`:"no checklist yet"}</div>${clInfo(c)}</div>
  <div class="row">${un?`<span class="pill warn">${un} new</span>`:""}${pd?`<span class="pill gold">${pd} guest list${pd===1?"":"s"}</span>`:""}<button class="btn sm" data-act="copyLink" data-url="${esc(clLink(id))}">Copy link</button><a class="btn sm" href="${esc(clLink(id))}" target="_blank" rel="noopener">Preview as client</a><button class="btn sm" data-act="beoView" data-m="${id}">Event sheet</button><button class="btn sm" data-act="clExport" data-m="${id}">Export</button><button class="btn sm" data-act="cliOpen" data-k="${id}" aria-expanded="${open}">${open?"Hide":"Open"}</button></div></div>
  ${s2.total?mateBar(s2.pct):""}
  ${open?`${c.notes?`<p class="small muted m0" style="white-space:pre-line">${esc(c.notes)}</p>`:""}<div class="row">${sub("list","Checklist")}${sub("approve","Approvals",apN)}${sub("money","Money")}${sub("dates","Dates")}${sub("ven","Vendors")}${sub("chat","Messages",un)}${sub("files","Files",pd)}</div><div class="row small"><span>Event:</span>${evSel(c.ev||"","clSetEv",`data-m="${id}"`)}<span>Date:</span><input type="date" data-act="clSetDate" data-m="${id}" value="${esc(c.date||"")}" aria-label="Event date"></div>${qaPlannerBox(id)}${body}<div class="row small"><button class="btn xs" data-act="clDelete" data-k="${id}">${L.confirm==="cd"+id?"Tap again to remove "+esc(c.name):"Remove client"}</button></div>`:""}</section>`};
 return `<section class="card stack"><div class="row between"><h2>Your clients</h2><button class="btn sm" data-act="plJump" data-k="data">Import or export</button></div><p class="small muted m0">Each client gets a private link to a simple portal: a checklist, uploads, and a message thread with you. No account or app needed. Export gives you a spreadsheet you can open in Excel, Google Sheets or Numbers.</p>
 <div class="grid2 g8"><label class="stack tight"><span class="small">Event date</span><input type="date" data-draft="cl_date" value="${esc(dv("cl_date",""))}"></label><label class="stack tight"><span class="small">Start from a template</span><select data-draft="cl_tpl">${clTplSelect(dv("cl_tpl",""))}</select></label><label class="stack tight"><span class="small">Client name</span><input type="text" data-draft="cl_name" maxlength="40" value="${esc(dv("cl_name",""))}" placeholder="Maya and Jordan"></label><label class="stack tight"><span class="small">Event</span>${evSel(dv("cl_ev",""))}</label></div>
 <button class="btn primary as" data-act="clAdd">Add client</button></section>

 ${ids3.map(card).join("")||'<section class="card"><p class="small muted m0">No clients yet. Add the first one above, then copy their link and send it.</p></section>'}`}
function clGuestApprove(id,f,c){const open=L.clPrev===f.k,pv=L.clPrevList||[];
 return `<div class="card stack tight clapp"><b>Guest list from ${esc(c.name)}: ${f.count||0} names</b>${c.ev?"":`<span class="small bad">Link this client to an event above first.</span>`}
  <div class="row"><button class="btn xs" data-act="clPreview" data-m="${id}" data-k="${f.k}">${open?"Hide preview":"Preview"}</button><button class="btn xs primary" data-act="clImport" data-m="${id}" data-k="${f.k}" data-mode="merge" ${c.ev?"":"disabled"}>Add to guest list</button><button class="btn xs" data-act="clImport" data-m="${id}" data-k="${f.k}" data-mode="replace" ${c.ev?"":"disabled"}>${L.confirm==="rp"+f.k?"Tap again: replace the list":"Replace the list"}</button><button class="btn xs" data-act="clDismiss" data-m="${id}" data-k="${f.k}">Don't use</button></div>
  ${open?`<div class="small muted">${pv.slice(0,12).map(g=>esc(g.name)).join(", ")}${pv.length>12?` and ${pv.length-12} more`:""}</div>`:""}
  <span class="small muted">Adding keeps your current list and skips duplicates. Replacing clears check-ins you've already made.</span></div>`}
async function clGuestText(id,k){const d=await clGetBlob(id,k);if(!d)return "";return d.startsWith("data:")?await (await fetch(d)).text():d}
async function clDoImport(id,k,mode){const c=(D.clients||{})[id];if(!c||!c.ev)return toast("Link this client to an event first");const txt=await clGuestText(id,k);const list=parseGuests(txt);if(!list.length)return toast("No names found in that file");
 const snap=(await ER("guests",c.ev).once("value")).val()||{};const base=mode==="replace"?{}:snap;const have={};Object.keys(base).forEach(g=>{const n=normName(base[g].name);have[n]=(have[n]||0)+1});
 const seen={},u={},tm=Date.now();let added=0;list.forEach((g,i)=>{const n=normName(g.name);seen[n]=(seen[n]||0)+1;if(seen[n]<=(have[n]||0))return;const e={name:g.name,t:tm+i};if(g.rsvp)e.rsvp=g.rsvp;if(g.invited!=null)e.invited=g.invited;if(g.plusOf)e.plusOf=g.plusOf;u["g"+tm.toString(36)+i]=e;added++});
 if(mode==="replace")await ER("guests",c.ev).set(u);else if(added)await ER("guests",c.ev).update(u);
 await RT(PSP+`clientFiles/${id}/${k}/status`).set("imported");toast(mode==="replace"?`Guest list replaced with ${added} names`:added?`${added} guest${added===1?"":"s"} added`:"Everyone was already on the list");render(true)}

/* ---- importing from another app or spreadsheet: clients, vendors and guests ----
   Sources: CSV, Excel (.xlsx), a shared Google Sheets link, or a typed PDF that holds a table.
   Steps: upload, match columns (auto-guessed, or the matches saved last time for the same headers),
   preview with problems flagged, import, then undo for 24 hours.
   Each import is logged at imports/<batch> with the keys it wrote, so the whole batch can be rolled back. */
const IM_FIELDS={
 email:{l:"Email",re:/e-?mail/},
 phone:{l:"Phone",re:/phone|mobile|cell|\btel/},
 first:{l:"First name",re:/first|given/},
 last:{l:"Last name",re:/last|surname|family/},
 date:{l:"Event date",re:/date|when|\bday\b/,not:/creat|book|added|since|paid|sign|birth|modif|updat|due/},
 guests:{l:"Guest count",re:/guest|head ?count|attend|\bpax\b|count/},
 budget:{l:"Budget",re:/budget|price|total|amount|cost|value/},
 status:{l:"Status",re:/status|stage/},
 venue:{l:"Venue",re:/venue|location|place/},
 evType:{l:"Event type",re:/type|occasion|category|kind/},
 evTitle:{l:"Event name",re:/event|party|project|title/},
 notes:{l:"Notes",re:/note|comment|detail|descr|memo/},
 name:{l:"Client name",re:/name|client|customer|couple|contact|lead/},
 client:{l:"Client",re:/client|customer|couple|event/},
 vname:{l:"Vendor name",re:/vendor|company|business|name/},
 role:{l:"Role or category",re:/role|category|service|type|trade/},
 arrive:{l:"Arrival time",re:/arriv|time|load.?in|set.?up/},
 delivers:{l:"What they bring",re:/deliver|bring|provid|item|package/},
 vnote:{l:"Notes",re:/note|comment|rate|price|cost|website|\bweb|detail/},
 gname:{l:"Guest name",re:/guest|name|attendee|invitee/},
 rsvp:{l:"RSVP",re:/rsvp|status|going|attending|respon|reply|coming|accept/},
 invited:{l:"Invitation sent",re:/invit|sent/},
 plusOf:{l:"Plus-one of",re:/plus|guest of|companion|\bwith\b/}
};
const IM_T={
 clients:{l:"Clients",one:"client",many:"clients",
  guess:["email","phone","first","last","date","guests","budget","status","venue","evType","evTitle","notes","name"],
  show:["name","first","last","email","phone","date","evTitle","evType","venue","guests","budget","status","notes"],need:["name","first","last"],
  about:"Your client list from another app or spreadsheet. Each client gets a portal, with their event details on their card.",
  tpl:[["Client name","Email","Phone","Event date","Event name","Event type","Venue","Guest count","Budget","Status","Notes"],["Maya and Jordan","maya@example.com","555-201-3344","2027-06-12","Maya and Jordan's wedding","Wedding","The Grand Room","150","25000","Booked","Prefers texts"]]},
 vendors:{l:"Vendors",one:"vendor",many:"vendors",
  guess:["email","phone","arrive","delivers","role","client","vnote","vname"],
  show:["vname","role","phone","email","arrive","delivers","vnote","client"],need:["vname"],
  about:"Caterers, DJs, florists and the rest, added to a client's Vendors tab.",
  tpl:[["Vendor name","Role","Phone","Email","Arrival time","What they bring","Notes","Client"],["Sunrise Catering","Catering","555-310-2200","hello@sunrise.example","3:30 PM","Dinner for 150","Needs a power outlet","Maya and Jordan"]]},
 guests:{l:"Guests",one:"guest",many:"guests",
  guess:["rsvp","invited","plusOf","first","last","gname"],
  show:["gname","first","last","rsvp","invited","plusOf"],need:["gname","first","last"],
  about:"A guest list from an RSVP site or spreadsheet, added to one of your events.",
  tpl:[["Guest name","RSVP","Invitation sent","Plus-one of"],["Ana Ruiz","Yes","Yes",""],["Leo Ruiz","Yes","Yes","Ana Ruiz"]]}
};
function imGuess(type,head){const T=IM_T[type],used=new Set(),map={},h=head.map(x=>String(x||"").toLowerCase().trim());
 T.guess.forEach(k=>{const f=IM_FIELDS[k],i=h.findIndex((x,j)=>x&&!used.has(j)&&f.re.test(x)&&!(f.not&&f.not.test(x)));if(i>=0){map[k]=String(i);used.add(i)}});
 if(!T.need.some(k=>map[k]!=null)&&head.length){const free=head.findIndex((x,j)=>!used.has(j));if(free>=0)map[T.need[0]]=String(free)}return map}
function imSig(type,head){let h=5381;const s=type+"|"+head.map(x=>String(x||"").toLowerCase().trim()).join("|");for(const c of s)h=((h<<5)+h+c.charCodeAt(0))|0;return type+"_"+(h>>>0).toString(36)}
function imYMD(y,mo,d){if(mo<1||mo>12||d<1||d>31||y<1900||y>2200)return null;const dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCDate()===d?dt.toISOString().slice(0,10):null}
/* "" = nothing given, null = something we couldn't read */
function imDate(v){v=String(v||"").trim();if(!v)return "";let m;
 if(/^\d{5}(\.\d+)?$/.test(v)&&+v>20000&&+v<80000)return new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5).toISOString().slice(0,10);
 if((m=v.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)))return imYMD(+m[1],+m[2],+m[3]);
 if((m=v.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})\b/))){let y=+m[3],a=+m[1],b=+m[2];if(y<100)y+=2000;return a>12?imYMD(y,b,a):imYMD(y,a,b)}
 const t=Date.parse(v.replace(/(\d)(st|nd|rd|th)\b/i,"$1"));if(!isNaN(t)){const d=new Date(t);return imYMD(d.getFullYear(),d.getMonth()+1,d.getDate())}
 return null}
function imTime(v){v=String(v||"").trim().toLowerCase();if(!v)return "";let m;
 if(/^0?\.\d+$/.test(v)){const mins=Math.round(parseFloat(v)*1440);return String(Math.floor(mins/60)%24).padStart(2,"0")+":"+String(mins%60).padStart(2,"0")}
 if((m=v.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?|a|p)?$/))){let h=+m[1],mi=+(m[2]||0);const ap=m[3]?m[3][0]:"";if(!ap&&!m[2])return null;if(h>23||mi>59||(ap&&(h<1||h>12)))return null;if(ap==="p"&&h<12)h+=12;if(ap==="a"&&h===12)h=0;return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0")}
 if(v==="noon")return "12:00";return null}
function imNum(v){const s=String(v||"").replace(/[$£€,\s]/g,"").replace(/usd$/i,"");if(!s)return "";const m=s.match(/^(-?\d*\.?\d+)(k)?$/i);return m?parseFloat(m[1])*(m[2]?1000:1):null}
const imOkEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const IM2=["gear","spaces","bookings","blocks","packages","payments"];
function imBuild(){const I=L.im,off=I.off||{};return imBuild0().map(r=>{if(!r.skip&&off[r.line]){r.skip="you chose to skip it";r.mine=true}return r})}
function imBuild0(){const I=L.im,m=I.map,g=(r,k)=>m[k]!=null&&m[k]!==""?String(r[+m[k]]==null?"":r[+m[k]]).replace(/\s+/g," ").trim():"";
 const used=new Set(Object.values(m).filter(v=>v!==""&&v!=null).map(Number));
 const extras=r=>I.keep?I.head.map((h,j)=>{if(used.has(j))return "";const v=String(r[j]==null?"":r[j]).trim();return v?`${h||"Column "+(j+1)}: ${v}`:""}).filter(Boolean):[];
 const cs=D.clients||{},seen={};
 const person=(r,k)=>(g(r,k)||[g(r,"first"),g(r,"last")].filter(Boolean).join(" "));
 if(IM2.includes(I.type))return imBuild2(I,g,extras);
 if(I.type==="clients"){const byEm={},byNd={};Object.keys(cs).forEach(id=>{const c=cs[id];if(c.email)byEm[String(c.email).toLowerCase()]=id;byNd[normName(c.name)+"|"+(c.date||"")]=id});
  const evs=D.events||{},evBy={};Object.keys(evs).forEach(k=>{evBy[normName(k)]=k;evBy[normName(evs[k].name||k)]=k});
  return I.rows.map((r,i)=>{const name=person(r,"name"),o={line:I.start+i+2,name:name.slice(0,40),warn:[],skip:""};if(!name){o.skip="no name";return o}
   const em=g(r,"email").toLowerCase();if(em){if(imOkEmail(em))o.email=em.slice(0,120);else o.warn.push("email doesn't look right")}
   const ph=g(r,"phone");if(ph)o.phone=ph.slice(0,40);
   const dr=g(r,"date"),d=imDate(dr);if(d)o.date=d;else if(d===null)o.warn.push(`couldn't read the date "${dr.slice(0,20)}"`);
   const et=g(r,"evTitle");if(et){const k=evBy[normName(et)];if(k){o.ev=k;o.evName=evs[k].name||k}else o.evTitle=et.slice(0,80)}
   [["evType",40],["venue",120],["status",40]].forEach(([k,n])=>{const v=g(r,k);if(v)o[k]=v.slice(0,n)});
   [["guests","guest count"],["budget","budget"]].forEach(([k,l])=>{const raw=g(r,k),n=imNum(raw);if(n===null)o.warn.push(`couldn't read the ${l} "${raw.slice(0,20)}"`);else if(n!==""&&n>=0)o[k]=k==="guests"?Math.round(n):Math.round(n*100)/100});
   const nt=[g(r,"notes")].concat(extras(r)).filter(Boolean).join("\n");if(nt)o.notes=nt.slice(0,1000);
   const nd=normName(o.name)+"|"+(o.date||"");if((o.email&&(byEm[o.email]||seen["e"+o.email]))||byNd[nd]||seen[nd]){o.dup=true;o.ex=(o.email&&byEm[o.email])||byNd[nd]||""}if(o.email)seen["e"+o.email]=1;seen[nd]=1;
   return o})}
 if(I.type==="vendors"){const cBy={};Object.keys(cs).forEach(id=>{cBy[normName(cs[id].name)]=id});const have={};
  return I.rows.map((r,i)=>{const name=g(r,"vname"),o={line:I.start+i+2,name:name.slice(0,60),warn:[],skip:""};if(!name){o.skip="no vendor name";return o}
   let cid=I.target;if(cid==="col"){const cn=g(r,"client");cid=cBy[normName(cn)];if(!cid){o.skip=cn?`no client named "${cn.slice(0,30)}"`:"no client given";return o}}
   if(!cs[cid]){o.skip="pick a client";return o}o.cid=cid;o.cname=cs[cid].name;
   const ro=g(r,"role");if(ro)o.role=ro.slice(0,40);const ph=g(r,"phone");if(ph)o.phone=ph.slice(0,30);
   const em=g(r,"email").toLowerCase();if(em){if(imOkEmail(em))o.email=em.slice(0,80);else o.warn.push("email doesn't look right")}
   const ar=g(r,"arrive"),t=imTime(ar);if(t)o.arrive=t;else if(t===null)o.warn.push(`couldn't read the arrival time "${ar.slice(0,20)}"`);
   const dl=g(r,"delivers");if(dl)o.delivers=dl.slice(0,80);
   const nt=[g(r,"vnote")].concat(extras(r)).filter(Boolean).join("; ");if(nt)o.note=nt.slice(0,300);
   if(!have[cid]){have[cid]={};clVendors(cid).forEach(v=>have[cid][normName(v.name)]=v.k)}const nk=cid+"|"+normName(o.name);if(have[cid][normName(o.name)]||seen[nk]){o.dup=true;o.ex=have[cid][normName(o.name)]||""}seen[nk]=1;
   return o})}
 /* guests */
 const have=Object.assign({},I.have||{});
 return I.rows.map((r,i)=>{const name=person(r,"gname"),o={line:I.start+i+2,name:name.slice(0,80),warn:[],skip:""};if(!name){o.skip="no name";return o}
  if(m.rsvp!=null&&m.rsvp!==""){const raw=g(r,"rsvp");o.rsvp=rsvpOf(raw)}else o.rsvp="yes";
  if(m.invited!=null&&m.invited!==""){const v=g(r,"invited");o.invited=/^(y|yes|true|sent|x|✓|1)/i.test(v)}
  const po=g(r,"plusOf");if(po&&normName(po)!==normName(name))o.plusOf=po.slice(0,80);
  const n=normName(o.name);if(have[n]>0){o.dup=true;have[n]--}else if(seen[n])o.dup=true;seen[n]=1;
  return o})}
function imLog(){const l=D.imLog||{},cut=now()-864e5;return Object.keys(l).map(k=>Object.assign({id:k},l[k])).filter(x=>x.t>cut).sort((a,b)=>b.t-a.t)}
function imSubLog(){if(L.imSub===PSP||!db)return;L.imSub=PSP;RT(PSP+"imports").on("value",s=>{D.imLog=s.val()||{};const cut=Date.now()-864e5;Object.keys(D.imLog).forEach(k=>{if(!(D.imLog[k].t>cut))RT(PSP+"imports/"+k).remove()});renderSoon()})}
async function imLoadHave(){const I=L.im;if(!I||I.type!=="guests"||!I.target||I.haveFor===I.target)return;const code=I.target;I.haveFor=code;I.have=null;
 const snap=(await ER("guests",code).once("value")).val()||{},h={};Object.values(snap).forEach(x=>{const n=normName(x&&x.name);if(n)h[n]=(h[n]||0)+1});
 if(L.im===I&&I.haveFor===code){I.have=h;render(true)}}
async function imLoadRows(name,rows,sheet){rows=(rows||[]).map(r=>(r||[]).map(c=>String(c==null?"":c).replace(/\s+/g," ").trim()));
 const start=rows.findIndex(r=>r.some(Boolean));if(start<0)return toast("That file looks empty");
 const head=rows[start];let body=rows.slice(start+1).filter(r=>r.some(Boolean));if(!body.length)return toast("We found headers but nothing under them");
 if(body.length>5000){body=body.slice(0,5000);toast("Reading the first 5,000 rows")}
 const auto=!L.imType||L.imType==="auto"||!IM_T[L.imType],type=auto?imDetect(head,sheet||name):L.imType,sig=imSig(type,head);let map=imGuess(type,head),saved=false;
 try{const sv=(await RT(PSP+"imMaps/"+sig).once("value")).val();if(sv&&typeof sv==="object"&&Object.values(sv).every(v=>v===""||(+v>=0&&+v<head.length))){map=Object.assign({},sv);saved=true}}catch(e){}
 const cl=Object.keys(D.clients||{});
 const tabs=L.imTabs||1;
 L.im={type,auto,sheet:sheet||"",tabs,tabN:tabs-(L.imQ||[]).length,step:"map",file:String(name).slice(0,80),head,rows:body,start,map,sig,saved,dup:"skip",keep:true,off:{},
  target:type==="vendors"?(map.client!=null&&map.client!==""?"col":(L.cliOpen&&D.clients[L.cliOpen]?L.cliOpen:"")):type==="payments"?(map.payclient!=null&&map.payclient!==""?"col":(L.cliOpen&&D.clients[L.cliOpen]?L.cliOpen:"")):type==="guests"?((L.cliOpen&&(D.clients[L.cliOpen]||{}).ev)||""):""};
 render(true)}
/* PDFs: pdf.js reads the text and where it sits on the page; lines become rows and the header line's positions become the columns. */
async function imPdfLib(){if(window.pdfjsLib)return window.pdfjsLib;const base="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
 await new Promise((res,rej)=>{const s=document.createElement("script");s.src=base+"pdf.min.js";s.onload=res;s.onerror=()=>rej(new Error("net"));document.head.appendChild(s)});
 window.pdfjsLib.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.js";return window.pdfjsLib}
async function imPdfRows(file){const lib=await imPdfLib(),pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,lines=[];
 for(let p=1;p<=Math.min(pdf.numPages,60);p++){const tc=await (await pdf.getPage(p)).getTextContent();
  const its=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],w:i.width||0,s:i.str.trim()})).sort((a,b)=>b.y-a.y||a.x-b.x);
  let cur=null,cy=0;its.forEach(i=>{if(cur&&Math.abs(cy-i.y)<=3)cur.push(i);else{cur=[i];cy=i.y;lines.push(cur)}})}
 if(!lines.length)throw new Error("scan");
 const cells=lines.map(l=>{l.sort((a,b)=>a.x-b.x);const out=[];l.forEach(i=>{const c=out[out.length-1];if(c&&i.x-(c.x+c.w)<6){c.s+=(i.x-(c.x+c.w)>1.5?" ":"")+i.s;c.w=i.x+i.w-c.x}else out.push({x:i.x,w:i.w,s:i.s})});return out})
  .filter(c=>!/^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(c.map(x=>x.s).join(" ")));
 let hi=-1,best=1;cells.slice(0,20).forEach((c,i)=>{if(c.length>best){best=c.length;hi=i}});if(hi<0)throw new Error("notable");
 const anchors=cells[hi].map(c=>c.x),key=cells[hi].map(c=>c.s).join("|"),rows=[cells[hi].map(c=>c.s)];
 cells.slice(hi+1).forEach(c=>{if(c.map(x=>x.s).join("|")===key)return;const r=anchors.map(()=>"");
  c.forEach(x=>{let j=0;anchors.forEach((a,k)=>{if(a-12<=x.x)j=k});r[j]=r[j]?r[j]+" "+x.s:x.s});
  const prev=rows.length>1?rows[rows.length-1]:null;
  if(prev&&!r[0]&&r.filter(Boolean).length<=Math.max(1,anchors.length/2))r.forEach((v,j)=>{if(v)prev[j]=prev[j]?prev[j]+" "+v:v});else rows.push(r)});
 return rows}
const imPill=(n,l,cls)=>n?`<span class="pill ${cls||""}">${n} ${l}</span>`:"";
function imRow(r){const I=L.im,fd=d=>new Date(d+"T12:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
 const det=IM2.includes(I.type)?imDet2(r,I):I.type==="clients"?[r.date?fd(r.date):"",r.evName||r.evTitle,r.venue,r.guests?r.guests+" guests":"",r.budget?clMoney(r.budget):"",r.email,r.phone]
  :I.type==="vendors"?[r.role,r.arrive?"arrives "+clFmtTime(r.arrive):"",r.delivers,r.phone,r.email,I.target==="col"&&r.cname?"for "+r.cname:""]
  :[r.rsvp==="yes"?"coming":r.rsvp==="no"?"not coming":r.rsvp==="maybe"?"maybe":"no reply yet",r.invited===true?"invited":r.invited===false?"not invited yet":"",r.plusOf?"plus-one of "+r.plusOf:""];
 const T=IM_T[I.type],flags=(r.skip?[`skipped: ${r.skip}`]:[]).concat(r.dup?[I.dup==="skip"||(I.dup==="update"&&!r.ex)?"already there, will be skipped":I.dup==="update"?"already there, will be updated":"already there, will be added again"]:[],r.warn);
 const tog=(!r.skip||r.mine)&&(r.mine||r.warn.length||r.dup)?`<button class="btn xs" data-act="imOff" data-k="${r.line}">${r.mine?"Include it":"Skip this row"}</button>`:"";
 return `<div class="mrow2 small"><div class="row between"><b>${esc(r.name||"(no name)")}</b><span class="row"><span class="muted">row ${r.line}</span>${tog}</span></div>${det.filter(Boolean).length?`<div class="muted">${det.filter(Boolean).map(esc).join(" · ")}</div>`:""}${flags.length?`<div class="row">${flags.map(f=>`<span class="pill warn">${esc(f)}</span>`).join("")}</div>`:""}</div>`}
function imTargetSel(){const I=L.im,cs=D.clients||{},ev=D.events||{};
 if(I.type==="vendors"){const ids=Object.keys(cs).sort((a,b)=>String(cs[a].name).localeCompare(String(cs[b].name)));const hasCol=I.map.client!=null&&I.map.client!=="";
  return `<label class="stack tight"><span class="small"><b>Add these vendors to</b></span><select data-act="imTarget"><option value="">Pick a client</option>${hasCol?`<option value="col" ${I.target==="col"?"selected":""}>Each row's client, from the Client column</option>`:""}${ids.map(id=>`<option value="${esc(id)}" ${I.target===id?"selected":""}>${esc(cs[id].name)}</option>`).join("")}</select></label>`}
 if(I.type==="payments"){const ids=Object.keys(cs).sort((a,b)=>String(cs[a].name).localeCompare(String(cs[b].name)));const hasCol=I.map.payclient!=null&&I.map.payclient!=="";
  return `<label class="stack tight"><span class="small"><b>Add these payments to</b></span><select data-act="imTarget"><option value="">Pick a client</option>${hasCol?`<option value="col" ${I.target==="col"?"selected":""}>Each row's client, from the Client column</option>`:""}${ids.map(id=>`<option value="${esc(id)}" ${I.target===id?"selected":""}>${esc(cs[id].name)}</option>`).join("")}</select>${ids.length?"":'<span class="small bad">Add your clients first, then their payments.</span>'}</label>`}
 if(I.type==="guests"){const ks=Object.keys(ev);return `<label class="stack tight"><span class="small"><b>Add these guests to</b></span><select data-act="imTarget"><option value="">Pick an event</option>${ks.map(k=>`<option value="${esc(k)}" ${I.target===k?"selected":""}>${esc(ev[k].name||k)}</option>`).join("")}</select>${ks.length?"":'<span class="small bad">Create an event first, then import its guests.</span>'}</label>`}
 return ""}
function imCard(){imSubLog();const I=L.im,type=(I&&I.type)||L.imType||"auto",T=IM_T[type]||null,log=imLog();
 const undo=log.map(x=>{const t=IM_T[x.type]||IM_T.clients;return `<div class="row between small"><span>Imported ${x.n} ${x.n===1?t.one:t.many}${x.where?" to "+esc(x.where):""} ${esc(clAgo(x.t))}</span><button class="btn xs" data-act="imUndo" data-k="${esc(x.id)}">${L.confirm==="iu"+x.id?`Tap again to remove those ${x.n}`:"Undo this import"}</button></div>`}).join("");
 const undoBox=undo?`<div class="stack tight">${undo}</div>`:"";
 const head=`<div class="row between"><h2>Import from another app</h2>${T?`<button class="btn sm" data-act="imTemplate">Download a ${T.one} template</button>`:""}</div>`;
 if(!I)return `<section class="card stack">${head}
  <span class="small"><b>What's in the file?</b></span><div class="row"><button class="btn sm ${type==="auto"?"primary":""}" data-act="imType" data-k="auto">Figure it out for me</button>${Object.keys(IM_T).map(k=>`<button class="btn sm ${type===k?"primary":""}" data-act="imType" data-k="${k}">${IM_T[k].l}</button>`).join("")}</div>
  <p class="small muted m0">${T?T.about:"Upload one spreadsheet or a whole workbook. Host Mode looks at each tab and sends clients, vendors, guests, inventory, venue spaces, bookings, blocked days, packages and payments where they belong."} Export from the app you use now, upload the file here, and Host Mode sorts each column into the right place. You check everything before it saves, matches you fix are remembered for next time, and any import can be undone for 24 hours.</p>
  <div class="row"><label class="btn primary upl">Upload a file<input type="file" accept=".csv,.tsv,.txt,.xlsx,.pdf,text/csv,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-act="imFile"></label><span class="small muted">CSV, Excel or PDF</span></div>
  <div class="row"><input type="url" class="grow" data-draft="im_url" value="${esc(dv("im_url",""))}" placeholder="Or paste a Google Sheets link"><button class="btn sm" data-act="imSheet">Open sheet</button></div>
  ${undoBox}</section>`;
 let body="";
 if(I.step==="map"){const used=new Set(Object.values(I.map).filter(v=>v!==""&&v!=null).map(Number)),rest=I.head.map((h,i)=>used.has(i)?"":(h||"Column "+(i+1))).filter(Boolean);
  const opts=sel=>`<option value="">Don't import</option>`+I.head.map((h,i)=>`<option value="${i}" ${String(sel)===String(i)?"selected":""}>${esc(h||"Column "+(i+1))}${I.rows[0]&&I.rows[0][i]?` (e.g. ${esc(String(I.rows[0][i]).slice(0,24))})`:""}</option>`).join("");
  body=`${I.tabs>1?`<span class="pill">Tab ${I.tabN} of ${I.tabs}</span>`:""}<p class="small muted m0"><b>${esc(I.file)}</b> · ${I.rows.length} row${I.rows.length===1?"":"s"}. ${I.saved?"We used the matches you saved for this kind of file.":"We matched your columns where we could."} Fix any that look wrong.</p>
  <label class="stack tight"><span class="small"><b>${I.auto?"This looks like":"This is"}</b></span><select data-act="imRetype">${Object.keys(IM_T).map(k=>`<option value="${k}" ${I.type===k?"selected":""}>${IM_T[k].l}</option>`).join("")}</select>${I.auto?`<span class="small muted">Not right? Pick what this ${I.tabs>1?"tab":"file"} really holds.</span>`:""}</label>
  ${imTargetSel()}
  <div class="grid2 g8">${T.show.map(k=>`<label class="stack tight"><span class="small">${IM_FIELDS[k].l}${k===T.need[0]&&T.need.length>1?" <span class='muted'>(or use first + last)</span>":""}${k==="client"?" <span class='muted'>(optional)</span>":""}</span><select data-act="imMap" data-k="${k}">${opts(I.map[k])}</select></label>`).join("")}</div>
  ${rest.length&&type!=="guests"?`<label class="row small"><input type="checkbox" data-act="imKeep" ${I.keep?"checked":""}> Keep the other columns in the notes (${esc(rest.slice(0,4).join(", "))}${rest.length>4?` and ${rest.length-4} more`:""})</label>`:""}
  <div class="row"><button class="btn primary" data-act="imStep" data-k="preview">Preview</button>${(L.imQ||[]).length?`<button class="btn" data-act="imNextTab">Skip this tab</button>`:""}<button class="btn" data-act="imCancel">Start over</button></div>`}
 if(I.step==="preview"){
  if(type==="guests"&&I.have==null){imLoadHave();body=`<p class="small muted m0">Checking who's already on the guest list…</p>`}
  else{const recs=imBuild(),sk=recs.filter(r=>r.skip).length,dup=recs.filter(r=>!r.skip&&r.dup).length,wn=recs.filter(r=>!r.skip&&r.warn.length).length,go=recs.filter(r=>!r.skip&&!(r.dup&&(I.dup==="skip"||(I.dup==="update"&&!r.ex)))).length,nsp=I.type==="bookings"?Object.values(I.newSpaces||{}):[];
   const bad=recs.filter(r=>r.skip||r.dup||r.warn.length),good=recs.filter(r=>!(r.skip||r.dup||r.warn.length)),show=bad.slice(0,30).concat(good.slice(0,Math.max(0,8-Math.min(bad.length,8))));
   const dupWhy=type==="clients"?"Clients already in Host Mode (same email, or same name and date)":type==="vendors"?"Vendors this client already has":type==="guests"?"Guests already on this event's list":`${T.l} already in Host Mode`;
   body=`<div class="row">${imPill(go,"ready to import","ok")}${imPill(wn,"with something to check","warn")}${imPill(dup,"already there","gold")}${imPill(sk,"will be skipped","")}</div>
   ${dup?`<label class="stack tight"><span class="small">${dupWhy}</span><select data-act="imDup"><option value="skip" ${I.dup==="skip"?"selected":""}>Skip them</option>${T.upd?`<option value="update" ${I.dup==="update"?"selected":""}>Update them with the new details</option>`:""}<option value="add" ${I.dup==="add"?"selected":""}>Add them anyway</option></select></label>`:""}
   ${nsp.length?`<span class="small">New spaces will be added for: <b>${nsp.map(esc).join(", ")}</b></span>`:""}
   ${sk||wn?`<div class="row"><span class="small muted">Rows with a problem can be skipped one by one below, or downloaded, fixed and uploaded again.</span><button class="btn xs" data-act="imProblems">Download the problem rows</button></div>`:""}
   ${type==="clients"?`<label class="stack tight"><span class="small">Give each new client a checklist (optional)</span><select data-draft="im_tpl">${clTplSelect(dv("im_tpl",""))}</select></label>`:""}
   <div class="stack tight">${show.map(imRow).join("")}</div>${recs.length>show.length?`<span class="small muted">and ${recs.length-show.length} more rows that look fine</span>`:""}
   ${type!=="guests"?`<span class="small muted">Fields we couldn't read are left blank. You can fill them in later.</span>`:""}
   <div class="row"><button class="btn primary" data-act="imGo" ${go&&!I.busy?"":"disabled"}>${I.busy?"Importing…":`${I.dup==="update"&&dup&&go===dup?"Update":"Import"} ${go} ${go===1?T.one:T.many}`}</button><button class="btn" data-act="imStep" data-k="map">Back</button><button class="btn" data-act="imCancel">Cancel</button></div>`}}
 if(I.step==="done"){const r=I.result||{};
  body=`${I.tabs>1?`<span class="pill">Tab ${I.tabN} of ${I.tabs}</span>`:""}<p class="m0"><b>${r.n||0} ${r.n===1?T.one:T.many} ${r.up&&r.up===r.n?"updated":"imported"}${r.where?" to "+esc(r.where):""}.</b>${r.nt?` ${r.nt} checklist items added.`:""}</p>
  <div class="row">${r.up&&r.up!==r.n?imPill(r.up,"updated","ok"):""}${imPill(r.dup,"duplicates skipped","gold")}${imPill(r.skip,"rows skipped","")}${imPill(r.warn,"with a blank field to fill in","warn")}</div>
  ${r.err?`<p class="small bad m0">The import stopped partway through. You can undo what was saved below and try again.</p>`:""}
  <span class="small muted">Your column matches are saved, so the next file like this one is quicker. Undo removes this whole import for the next 24 hours.</span>
  <div class="row">${(L.imQ||[]).length?`<button class="btn primary" data-act="imNextTab">Next tab: ${esc(L.imQ[0].sheet||"")}</button><button class="btn" data-act="imCancel">Stop here</button>`:`<button class="btn primary" data-act="imCancel">Done</button>`}</div>`}
 return `<section class="card stack">${head}${body}${undoBox}</section>`}
const clInfo=c=>{const p=[c.pkg?c.pkg.name:"",c.evType,c.venue,c.guests?c.guests+" guests":"",c.budget?clMoney(c.budget)+" budget":"",c.status,c.email,c.phone].filter(Boolean);return p.length?`<div class="small muted">${p.map(esc).join(" · ")}</div>`:""};
const IM_CL_PATHS=["clientTasks","clientMsgs","clientFiles","clientBlobs","clientApprovals","clientPayments","clientDates","clientVendors","clientInvoices","clients"];

Object.assign(ACT,{
 imType:el=>{L.imType=el.dataset.k;render(true)},
 imFile:async el=>{const f=el.files&&el.files[0];el.value="";if(!f)return;const ext=(f.name.split(".").pop()||"").toLowerCase();
  if(ext==="xls"||ext==="numbers")return toast("Save it as .xlsx or CSV first, then upload it");
  if(f.size>CL_MAX)return toast("That file is over 10 MB");toast("Reading the file…");
  L.imQ=[];L.imTabs=1;
  if(ext==="xlsx"){let sh;try{sh=await clXlsxSheets(f)}catch(e){return toast("Couldn't read that file. Try saving it as CSV.")}if(!sh.length)return toast("That file looks empty");
   /* tabs from Download everything that are for reading only */
   const ro=sh.filter(x=>/^(pull lists|invoices|leads)$/i.test(String(x.name).trim()));if(ro.length&&sh.length>ro.length){sh=sh.filter(x=>!ro.includes(x));toast(`Skipping ${ro.map(x=>x.name).join(", ")}: those tabs are for reading only.`)}
   L.imTabs=sh.length;L.imQ=sh.slice(1).map(x=>({file:f.name+" · "+x.name,rows:x.rows,sheet:x.name}));if(sh.length>1)toast(`Found ${sh.length} tabs. We'll go through them one at a time.`);
   return await imLoadRows(f.name+(sh.length>1?" · "+sh[0].name:""),sh[0].rows,sh[0].name)}
  if(ext==="pdf"){try{return await imLoadRows(f.name,await imPdfRows(f),f.name)}catch(e){const w=e&&e.message;return toast(w==="scan"?"That PDF is a scanned picture, so there's no text to read. Export a CSV or Excel file instead.":w==="notable"?"We couldn't find a table in that PDF. Export a CSV or Excel file instead.":w==="net"?"Reading PDFs needs a connection. Try again in a moment.":"Couldn't read that PDF. Try a CSV or Excel file.")}}
  let txt="";try{txt=ext==="xlsx"?await clXlsxToCsv(f):await f.text()}catch(e){return toast("Couldn't read that file. Try saving it as CSV.")}
  await imLoadRows(f.name,csvRows(String(txt).replace(/^﻿/,"")),f.name)},
 imSheet:async()=>{const u=dv("im_url","").trim(),m=u.match(/\/spreadsheets\/d\/([\w-]{20,})/);if(!m)return toast("Paste the link to a Google Sheet");
  const gid=(u.match(/[#&?]gid=(\d+)/)||[])[1]||"0";toast("Opening the sheet…");
  try{const r=await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&headers=1&gid=${gid}`);const t=await r.text();if(!r.ok||/^\s*<(!doctype|html)/i.test(t))throw new Error("closed");
   delete L.drafts.im_url;L.imQ=[];L.imTabs=1;await imLoadRows("Google Sheet",csvRows(t),"")}catch(e){toast('Couldn\'t open it. Share the sheet as "Anyone with the link", or download it as CSV.')}},
 imMap:el=>{const I=L.im;if(!I)return;I.map[el.dataset.k]=el.value;if(el.dataset.k==="client"||el.dataset.k==="payclient"){if(el.value!==""&&!I.target)I.target="col";if(el.value===""&&I.target==="col")I.target=""}render(true)},
 imTarget:el=>{const I=L.im;if(!I)return;I.target=el.value;render(true)},
 imKeep:el=>{if(L.im){L.im.keep=el.checked;render(true)}},
 imDup:el=>{if(L.im){L.im.dup=el.value;render(true)}},
 imStep:el=>{const I=L.im;if(!I)return;const k=el.dataset.k,T=IM_T[I.type],has=x=>I.map[x]!=null&&I.map[x]!=="";
  if(k==="preview"){if(!T.need.some(has))return toast(`Pick the column with the ${T.one}'s name`);
   if(["vendors","guests","payments"].includes(I.type)&&!I.target)return toast(I.type==="vendors"?"Pick which client these vendors are for":I.type==="payments"?"Pick which client these payments are for":"Pick which event these guests are for");
   if(I.type==="guests"&&I.haveFor!==I.target)I.have=null}
  I.step=k;render(true)},
 imCancel:()=>{L.im=null;L.imQ=[];L.imTabs=1;delete L.drafts.im_tpl;render(true)},
 imGo:async()=>{const I=L.im;if(!I||I.busy)return;const all=imBuild(),upd=I.dup==="update",ok=all.filter(r=>!r.skip&&!(r.dup&&(I.dup==="skip"||(upd&&!r.ex)))),toUpd=upd?ok.filter(r=>r.dup&&r.ex):[],recs=IM2.includes(I.type)?ok:ok.filter(r=>!(upd&&r.dup));if(!ok.length)return toast("Nothing to import");
  I.busy=true;render(true);const tm=Date.now(),batch="i"+tm.toString(36),tk=dv("im_tpl",""),keys={};let n=0,nt=0,err=0,where="",paths={},prev={},up=0;
  const ev=D.events||{},cs=D.clients||{};
  try{
   if(I.type==="clients"){for(let s=0;s<recs.length;s+=300){const u={},ks=[];
     recs.slice(s,s+300).forEach((r,j)=>{const k=RT(PSP+"clients").push().key,o={name:r.name,ev:r.ev||"",evName:r.evName||"",date:r.date||"",t:tm+s+j,imp:batch,impT:tm};
      ["email","phone","evTitle","evType","venue","guests","budget","status","notes"].forEach(f=>{if(r[f]!=null&&r[f]!=="")o[f]=r[f]});u[k]=o;ks.push([k,o.date])});
     await RT(PSP+"clients").update(u);ks.forEach(([k])=>keys[k]=1);n+=ks.length;if(tk)for(const [k,d] of ks)nt+=(await clApplyTpl(k,tk,d))||0}}
   if(I.type==="vendors"){const by={};recs.forEach((r,j)=>{const k=RT(PSP+"clientVendors/"+r.cid).push().key,o={name:r.name,role:r.role||"",phone:r.phone||"",email:r.email||"",arrive:r.arrive||"",delivers:r.delivers||"",show:true,team:true,t:tm+j,imp:batch};if(r.note)o.note=r.note;(by[r.cid]=by[r.cid]||{})[k]=o});
     for(const cid of Object.keys(by)){await RT(PSP+"clientVendors/"+cid).update(by[cid]);Object.keys(by[cid]).forEach(k=>keys[cid+"~"+k]=1);n+=Object.keys(by[cid]).length}
     const ids=Object.keys(by);where=ids.length===1?(cs[ids[0]]||{}).name||"":ids.length+" clients"}
   if(I.type==="guests"){where=(ev[I.target]||{}).name||I.target;for(let s=0;s<recs.length;s+=500){const u={};
     recs.slice(s,s+500).forEach((r,j)=>{const o={name:r.name,t:tm+s+j,imp:batch};if(r.rsvp)o.rsvp=r.rsvp;if(r.invited!=null)o.invited=r.invited;if(r.plusOf)o.plusOf=r.plusOf;u["g"+tm.toString(36)+(s+j)]=o});
     await ER("guests",I.target).update(u);Object.keys(u).forEach(k=>keys[k]=1);n+=Object.keys(u).length}}
   if(IM2.includes(I.type)){const res=await imSave2(I,ok,batch,tm);n=res.n;where=res.where;paths=res.paths;prev=res.prev;up=Object.keys(prev).length}
   if(toUpd.length&&(I.type==="clients"||I.type==="vendors")){const u={};
    toUpd.forEach(r=>{if(I.type==="clients"){const old=(D.clients||{})[r.ex];if(!old)return;const nw=Object.assign({},old);["email","phone","date","ev","evName","evTitle","evType","venue","guests","budget","status","notes"].forEach(f=>{if(r[f]!=null&&r[f]!=="")nw[f]=r[f]});u["clients/"+r.ex]=nw;prev[imPath("clients/"+r.ex)]=old}
     else{const old=((D.cven||{})[r.cid]||{})[r.ex];if(!old)return;const nw=Object.assign({},old);["role","phone","email","arrive","delivers","note"].forEach(f=>{if(r[f]!=null&&r[f]!=="")nw[f]=r[f]});u[`clientVendors/${r.cid}/${r.ex}`]=nw;prev[imPath(`clientVendors/${r.cid}/${r.ex}`)]=old}});
    if(Object.keys(u).length){await RT(PSP.replace(/\/$/,"")).update(u);up=Object.keys(u).length;n+=up}}
  }catch(e){err=1}
  if(n){try{await RT(PSP+"imports/"+batch).set(Object.assign({type:I.type,t:tm,n,file:I.file,keys,paths,prev},where?{where:String(where).slice(0,60)}:{},I.type==="guests"?{ev:I.target}:{}))}catch(e){}
   try{await RT(PSP+"imMaps/"+I.sig).set(I.map)}catch(e){}}
  I.result={n,nt,err,where,up,dup:all.filter(r=>!r.skip&&r.dup&&(I.dup==="skip"||(upd&&!r.ex))).length,skip:all.filter(r=>r.skip).length,warn:recs.filter(r=>r.warn.length).length};
  I.busy=false;I.step="done";delete L.drafts.im_tpl;const T=IM_T[I.type];toast(err?"The import stopped partway":`${n} ${n===1?T.one:T.many} imported`);render(true)},
 imUndo:async el=>{const id=el.dataset.k;if(L.confirm!=="iu"+id){L.confirm="iu"+id;return render(true)}L.confirm=null;
  const x=(D.imLog||{})[id];if(!x)return toast("That import is already gone");const ks=Object.keys(x.keys||{});let refs=[];
  if(x.type==="clients"){if(ks.includes(L.cliOpen))L.cliOpen=null;refs=ks.flatMap(k=>IM_CL_PATHS.map(p=>RT(PSP+p+"/"+k)))}
  else if(x.type==="vendors")refs=ks.map(k=>RT(PSP+"clientVendors/"+imUnpath(k)));
  else if(x.type==="guests"&&x.ev)refs=ks.map(k=>ER("guests/"+k,x.ev));
  refs=refs.concat(Object.keys(x.paths||{}).map(p=>RT(PSP+imUnpath(p))));
  toast("Undoing…");for(let i=0;i<refs.length;i+=200)await Promise.all(refs.slice(i,i+200).map(r=>r.remove()));
  for(const p of Object.keys(x.prev||{}))await RT(PSP+imUnpath(p)).set(x.prev[p]||null);
  await RT(PSP+"imports/"+id).remove();const T=IM_T[x.type]||IM_T.clients;toast(Object.keys(x.prev||{}).length?`Undid that import of ${x.n} ${x.n===1?T.one:T.many}`:`Removed ${x.n} imported ${x.n===1?T.one:T.many}`);render(true)},
 imTemplate:()=>{const type=(L.im&&L.im.type)||L.imType||"clients",T=IM_T[type];if(!T)return;
  download(`Host Mode ${T.one} import template.csv`,new Blob([T.tpl.map(r=>r.map(c=>/[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c).join(",")).join("\r\n")],{type:"text/csv"}))}
});

/* ---- importer, part 2: inventory, venue, packages and payments; whole workbooks; updating duplicates ----
   A workbook with several tabs is read tab by tab. Each tab's kind is worked out from its name and headers
   ("Figure it out for me"), and the planner can change it before anything saves.
   Duplicates can be skipped, updated with the new details, or added again. Updates keep the old record in the
   import log (prev), so Undo puts it back. Log paths are stored with "~" for "/" because database keys can't hold "/". */
Object.assign(IM_FIELDS,{
 iname:{l:"Item",re:/item|product|description|name|article|sku/},
 iqty:{l:"How many you own",re:/qty|quant|on ?hand|in ?stock|owned|stock|count|total|units|#/},
 icat:{l:"Category",re:/categ|type|group|kind|class/},
 icolor:{l:"Color, size or style",re:/colou?r|size|style|finish|dimension|shape|variant/},
 ispot:{l:"Where it's stored",re:/stor|shelf|bin|location|where|warehouse|rack|spot/},
 icost:{l:"Replacement cost each",re:/cost|price|value|replace/},
 irep:{l:"In repair or cleaning",re:/repair|damag|clean|broken|out of service/},
 ilow:{l:"Warn me when fewer than",re:/reorder|min|low|par/},
 inote:{l:"Notes",re:/note|comment|memo|detail/},
 sname:{l:"Space name",re:/space|room|hall|area|name/},
 scap:{l:"Holds up to (guests)",re:/capac|max|seat|guest|holds|occupan/},
 srate:{l:"Usual fee",re:/rate|fee|price|cost|rent/},
 snote:{l:"Notes",re:/note|feature|detail|descr|amenit/},
 bname:{l:"Event or client name",re:/event|client|name|booked by|customer|party|couple|title/},
 bdate:{l:"Date",re:/date|day|when/,not:/creat|book(ed|ing) on|added|paid|due|hold/},
 bstart:{l:"Starts",re:/start|from|begin|arriv|time in|load.?in/},
 bend:{l:"Ends",re:/end|until|finish|to\b|out|depart/},
 bspace:{l:"Space",re:/space|room|hall|area|venue/},
 bkind:{l:"Type of event",re:/type|kind|occasion|category/},
 bguests:{l:"Guests",re:/guest|head ?count|attend|pax|people/},
 bstatus:{l:"Status",re:/status|stage|confirm|hold/},
 bprice:{l:"Rental fee",re:/fee|price|rent|total|amount|cost/,not:/deposit/},
 bdep:{l:"Deposit",re:/deposit|retainer/},
 bdepPaid:{l:"Deposit paid",re:/deposit.*(paid|rec)|paid/},
 bphone:{l:"Phone",re:/phone|mobile|cell|\btel/},
 bemail:{l:"Email",re:/e-?mail/},
 bnote:{l:"Notes",re:/note|comment|detail|memo/},
 kfrom:{l:"First day",re:/from|start|begin|date|first/},
 kto:{l:"Last day",re:/to\b|until|end|through|thru|last/},
 kspace:{l:"Space",re:/space|room|hall|area/},
 kreason:{l:"Reason",re:/reason|why|note|descr|what/},
 pname:{l:"Package name",re:/package|tier|plan|service|name|title/},
 pprice:{l:"Price",re:/price|cost|fee|rate|total|amount/,not:/deposit/},
 pdep:{l:"Deposit",re:/deposit|retainer|down/},
 pitems:{l:"What's included",re:/includ|item|feature|descr|detail|what/},
 payclient:{l:"Client",re:/client|customer|couple|name|event/},
 paytitle:{l:"What it's for",re:/for|descr|title|item|memo|invoice|payment/,not:/date|due|paid|amount/},
 payamt:{l:"Amount",re:/amount|total|price|sum|\$|value/},
 paydue:{l:"Due date",re:/due|date/,not:/paid/},
 paypaid:{l:"Paid?",re:/paid|status|received|settled/}
});
Object.assign(IM_T,{
 gear:{l:"Inventory",one:"item",many:"items",nm:/invent|stock|item|rental|equip|linen|decor|chair|table|light|centerp/,sig:[/qty|quant|on ?hand|in ?stock|owned|units/,/item|product|sku/,/stor|shelf|bin|warehouse|rack/,/colou?r|size/],
  guess:["iqty","irep","ilow","icost","ispot","icolor","icat","inote","iname"],show:["iname","icat","iqty","icolor","ispot","irep","icost","ilow","inote"],need:["iname"],upd:true,
  about:"Tablecloths, centerpieces, chairs, tables, lights and anything else you own, added to Inventory.",
  tpl:[["Item","Category","How many","Color or size","Where it's stored","In repair","Cost each","Reorder below","Notes"],["Ivory 120\" round tablecloth","Linens","40","Ivory","Shelf A","2","22","30","Steam before use"]]},
 spaces:{l:"Venue spaces",one:"space",many:"spaces",nm:/space|room|hall|area/,sig:[/capac|max guest|occupan|seat/,/room|space|hall/,/rate|rent/],
  guess:["scap","srate","snote","sname"],show:["sname","scap","srate","snote"],need:["sname"],upd:true,
  about:"The rooms and areas of your venue, with how many guests each holds.",
  tpl:[["Space","Capacity","Fee","Notes"],["Grand Ballroom","250","4500","Dance floor and stage"]]},
 bookings:{l:"Venue bookings",one:"booking",many:"bookings",nm:/book|reserv|calendar|schedule|venue/,sig:[/room|space|hall/,/start|begin/,/end|until|finish/,/deposit/,/hold|confirm/],
  guess:["bemail","bphone","bdepPaid","bdep","bprice","bguests","bstatus","bstart","bend","bspace","bkind","bdate","bnote","bname"],show:["bname","bdate","bstart","bend","bspace","bkind","bguests","bstatus","bprice","bdep","bdepPaid","bphone","bemail","bnote"],need:["bname"],upd:true,
  about:"Holds and confirmed bookings for your venue, added to the Venue calendar.",
  tpl:[["Event","Date","Start","End","Space","Type","Guests","Status","Fee","Deposit","Deposit paid","Phone","Email","Notes"],["Patel wedding","2027-05-22","2:00 PM","11:00 PM","Grand Ballroom","Wedding","200","Confirmed","9500","3000","Yes","704-555-0177","anika@example.com",""]]},
 blocks:{l:"Blocked days",one:"blocked period",many:"blocked periods",nm:/block|closed|blackout|unavail|holiday/,sig:[/block|closed|blackout|unavail/,/reason|why/,/from|through|thru|until/],
  guess:["kreason","kspace","kto","kfrom"],show:["kfrom","kto","kspace","kreason"],need:["kfrom"],
  about:"Days your venue, or one space in it, can't be booked.",
  tpl:[["From","Through","Space","Reason"],["2027-12-24","2027-12-26","","Closed for the holiday"]]},
 packages:{l:"Packages",one:"package",many:"packages",nm:/package|pricing|service|offer|menu/,sig:[/package|tier|plan/,/includ/,/deposit|retainer/],
  guess:["pdep","pitems","pprice","pname"],show:["pname","pprice","pdep","pitems"],need:["pname"],upd:true,
  about:"Your standard offers and prices, added to Packages.",
  tpl:[["Package","Price","Deposit","What's included"],["Wedding Signature","3800","1200","Partial planning; Vendor booking; Day-of coordination"]]},
 payments:{l:"Payments",one:"payment",many:"payments",nm:/pay|invoice|billing|money|ledger|transact/,sig:[/paid|payment|received/,/due/,/amount/,/client|customer/],
  guess:["paypaid","paydue","payamt","paytitle","payclient"],show:["payclient","paytitle","payamt","paydue","paypaid"],need:["payamt"],upd:true,
  about:"Payment history and what clients still owe, added to each client's Money tab.",
  tpl:[["Client","What it's for","Amount","Due date","Paid"],["Maya and Jordan","Deposit","1500","2027-01-15","Yes"]]}
});
IM_T.clients.upd=true;IM_T.vendors.upd=true;
IM_T.clients.nm=/client|customer|lead|contact|couple|crm/;IM_T.clients.sig=[/client|customer|couple|lead/,/e-?mail/,/budget/,/event date|wedding date/];
IM_T.vendors.nm=/vendor|supplier|partner/;IM_T.vendors.sig=[/vendor|supplier/,/arriv|load.?in/,/role|service|trade/];
IM_T.guests.nm=/guest|rsvp|attend|invite/;IM_T.guests.sig=[/rsvp|attending/,/plus|guest of/,/invit/,/meal|table|dietary/];
/* which kind of data a tab holds: its name counts most, then how many of its headers look like that kind's columns */
function imDetect(head,sheet){const h=head.map(x=>String(x||"").toLowerCase().trim()).filter(Boolean),sn=String(sheet||"").toLowerCase();let best="clients",bs=0;
 Object.keys(IM_T).forEach(k=>{const T=IM_T[k];let s=0;if(T.nm&&sn&&T.nm.test(sn))s+=4;(T.sig||[]).forEach(re=>{if(h.some(x=>re.test(x)))s+=2});
  T.guess.forEach(f=>{const F=IM_FIELDS[f];if(h.some(x=>F.re.test(x)&&!(F.not&&F.not.test(x))))s+=0.5});if(s>bs){bs=s;best=k}});
 return best}
const imPath=p=>String(p).replace(/\//g,"~"),imUnpath=p=>String(p).replace(/~/g,"/");
const imYes=v=>/^(y|yes|true|paid|x|✓|1|done|received|settled|complete)/i.test(String(v||"").trim());
function imGearCat(v){const s=normName(v);if(!s)return "";const hit=GEAR_CATS.find(c=>s.includes(c.toLowerCase().replace(/s$/,"")));if(hit)return hit;
 return /cloth|napkin|runner|overlay/.test(s)?"Linens":/vase|centre|floral|arrangement/.test(s)?"Centerpieces":/seat|stool|bench/.test(s)?"Chairs":/light|lamp|candle|bulb/.test(s)?"Lighting":/drape|curtain|backdrop/.test(s)?"Draping":/plate|glass|cutlery|flatware|charger|dish/.test(s)?"Tableware":/sign|easel|board/.test(s)?"Signs":"Other"}
/* builds the rows for the new kinds; same shape as imBuild: {line,name,warn,skip,dup,ex} */
function imBuild2(I,g,extras){const seen={},type=I.type;
 const money=(o,raw,k,l)=>{const n=imNum(raw);if(n===null)o.warn.push(`couldn't read the ${l} "${String(raw).slice(0,20)}"`);else if(n!==""&&n>=0)o[k]=Math.round(n*100)/100};
 const count=(o,raw,k,l)=>{const n=imNum(raw);if(n===null)o.warn.push(`couldn't read the ${l} "${String(raw).slice(0,20)}"`);else if(n!==""&&n>=0)o[k]=Math.round(n)};
 const note=(r,k,sep)=>[g(r,k)].concat(extras(r)).filter(Boolean).join(sep||"; ");
 if(type==="gear"){const byN={};gearList().forEach(it=>(byN[normName(it.name)]=byN[normName(it.name)]||[]).push(it));
  /* same item: same name, and the colors match, or one of them has no color, or only one item has that name */
  const match=(nm,co)=>{const l=byN[nm]||[],c=normName(co);if(!l.length)return "";const exact=l.find(it=>normName(it.color)===c);if(exact)return exact.k;if(!c||l.length===1)return l.length===1?l[0].k:"";const near=l.filter(it=>{const ic=normName(it.color);return !ic||ic.includes(c)||c.includes(ic)});return near.length===1?near[0].k:""};
  return I.rows.map((r,i)=>{const name=g(r,"iname"),o={line:I.start+i+2,name:name.slice(0,80),warn:[],skip:""};if(!name){o.skip="no item name";return o}
   count(o,g(r,"iqty"),"qty","count");if(o.qty==null&&!o.warn.length)o.warn.push("no count given, saved as 0");
   const c=g(r,"icat");o.cat=imGearCat(c)||"Other";const co=g(r,"icolor");if(co)o.color=co.slice(0,80);const sp=g(r,"ispot");if(sp)o.spot=sp.slice(0,80);
   count(o,g(r,"irep"),"rep","repair count");count(o,g(r,"ilow"),"low","reorder level");money(o,g(r,"icost"),"cost","cost");
   if(o.rep>(o.qty||0)){o.warn.push("more in repair than owned, repair count set to 0");o.rep=0}
   const nt=note(r,"inote");if(nt)o.note=nt.slice(0,300);
   const dk=normName(o.name)+"|"+normName(o.color),ex=match(normName(o.name),o.color);if(ex){o.dup=true;o.ex=ex}else if(seen[dk])o.dup=true;seen[dk]=1;return o})}
 if(type==="spaces"){const have={};spaceList().forEach(s=>have[normName(s.name)]=s.k);
  return I.rows.map((r,i)=>{const name=g(r,"sname"),o={line:I.start+i+2,name:name.slice(0,60),warn:[],skip:""};if(!name){o.skip="no space name";return o}
   count(o,g(r,"scap"),"cap","capacity");money(o,g(r,"srate"),"rate","fee");const nt=note(r,"snote");if(nt)o.note=nt.slice(0,200);
   const dk=normName(o.name);if(have[dk]){o.dup=true;o.ex=have[dk]}else if(seen[dk])o.dup=true;seen[dk]=1;return o})}
 if(type==="bookings"){const sp={};spaceList().forEach(s=>sp[normName(s.name)]=s.k);const have={};bkList().forEach(b=>have[b.date+"|"+(b.space||"")+"|"+normName(b.name)]=b.k);I.newSpaces={};
  return I.rows.map((r,i)=>{const name=g(r,"bname"),o={line:I.start+i+2,name:name.slice(0,80),warn:[],skip:""};if(!name){o.skip="no event or client name";return o}
   const dr=g(r,"bdate"),d=imDate(dr);if(!d){o.skip=d===null?`couldn't read the date "${dr.slice(0,20)}"`:"no date";return o}o.date=d;
   [["bstart","start"],["bend","end"]].forEach(([k,f])=>{const raw=g(r,k),t=imTime(raw);if(t)o[f]=t;else if(t===null)o.warn.push(`couldn't read the time "${raw.slice(0,20)}"`)});
   const sn=g(r,"bspace");o.space="";if(sn&&!/^(whole|all|entire|full)\b/i.test(sn)){const k=sp[normName(sn)];if(k)o.space=k;else{o.spaceNew=sn.slice(0,60);I.newSpaces[normName(sn)]=sn.slice(0,60)}}o.sname=sn&&!o.space&&!o.spaceNew?"Whole venue":(o.spaceNew||spaceName(o.space));
   const kd=g(r,"bkind");o.kind=BK_KINDS.find(x=>normName(x)===normName(kd))||BK_KINDS.find(x=>kd&&normName(kd).includes(normName(x).split(" ")[0]))||(kd?"Other":"Other");
   count(o,g(r,"bguests"),"guests","guest count");money(o,g(r,"bprice"),"price","fee");money(o,g(r,"bdep"),"deposit","deposit");
   const st=g(r,"bstatus");o.status=/cancel/i.test(st)?"cancelled":/hold|tentat|pencil|pending|inquir/i.test(st)?"hold":"confirmed";
   if(I.map.bdepPaid!=null&&I.map.bdepPaid!=="")o.depPaid=imYes(g(r,"bdepPaid"));
   const ph=g(r,"bphone");if(ph)o.phone=ph.slice(0,30);const em=g(r,"bemail").toLowerCase();if(em){if(imOkEmail(em))o.email=em.slice(0,120);else o.warn.push("email doesn't look right")}
   const nt=note(r,"bnote");if(nt)o.note=nt.slice(0,400);
   const dk=o.date+"|"+(o.space||normName(o.spaceNew||""))+"|"+normName(o.name);if(have[dk]){o.dup=true;o.ex=have[dk]}else if(seen[dk])o.dup=true;seen[dk]=1;
   if(o.status!=="cancelled"&&!o.dup&&o.space){const cl=bkClashes(Object.assign({},o),null);if(cl.length)o.warn.push("overlaps "+cl.map(x=>x.name).join(", "))}
   return o})}
 if(type==="blocks"){const sp={};spaceList().forEach(s=>sp[normName(s.name)]=s.k);const have={};blkList().forEach(b=>have[b.from+"|"+blkTo(b)+"|"+(b.space||"")]=1);
  return I.rows.map((r,i)=>{const fr=g(r,"kfrom"),f=imDate(fr),o={line:I.start+i+2,name:"",warn:[],skip:""};if(!f){o.name=fr||"(no date)";o.skip=f===null?`couldn't read the date "${fr.slice(0,20)}"`:"no date";return o}
   const tr=g(r,"kto"),t=imDate(tr);o.from=f;o.to=t&&t>=f?t:f;if(t===null)o.warn.push(`couldn't read the last day "${tr.slice(0,20)}", blocked one day`);
   const sn=g(r,"kspace");o.space="";if(sn&&!/^(whole|all|entire|full)\b/i.test(sn)){const k=sp[normName(sn)];if(k)o.space=k;else o.warn.push(`no space named "${sn.slice(0,30)}", blocked the whole venue`)}
   o.reason=note(r,"kreason").slice(0,80);o.name=clFmtDate(o.from)+(o.to>o.from?" to "+clFmtDate(o.to):"");
   const dk=o.from+"|"+o.to+"|"+o.space;if(have[dk]||seen[dk])o.dup=true;seen[dk]=1;return o})}
 if(type==="packages"){const have={};pkList().forEach(p=>have[normName(p.name)]=p.k);
  return I.rows.map((r,i)=>{const name=g(r,"pname"),o={line:I.start+i+2,name:name.slice(0,60),warn:[],skip:""};if(!name){o.skip="no package name";return o}
   money(o,g(r,"pprice"),"price","price");if(o.price==null){o.skip="no price";return o}money(o,g(r,"pdep"),"deposit","deposit");if(o.deposit>o.price){o.warn.push("deposit was more than the price, set to 0");o.deposit=0}
   const it=note(r,"pitems","\n");if(it)o.items=it.split(/\n|;|•|\|/).map(x=>x.trim()).filter(Boolean).join("\n").slice(0,1500);
   const dk=normName(o.name);if(have[dk]){o.dup=true;o.ex=have[dk]}else if(seen[dk])o.dup=true;seen[dk]=1;return o})}
 if(type==="payments"){const cs=D.clients||{},cBy={};Object.keys(cs).forEach(id=>{cBy[normName(cs[id].name)]=id;if(cs[id].evName)cBy[normName(cs[id].evName)]=cBy[normName(cs[id].evName)]||id});const have={};
  return I.rows.map((r,i)=>{const amt=imNum(g(r,"payamt")),o={line:I.start+i+2,name:"",warn:[],skip:""};
   let cid=I.target;if(cid==="col"){const cn=g(r,"payclient");cid=cBy[normName(cn)];if(!cid){o.name=cn||"(no client)";o.skip=cn?`no client named "${cn.slice(0,30)}"`:"no client given";return o}}
   if(!cs[cid]){o.skip="pick a client";return o}o.cid=cid;o.cname=cs[cid].name;
   if(amt===null||amt===""){o.name=g(r,"paytitle")||"Payment";o.skip=amt===null?`couldn't read the amount "${g(r,"payamt").slice(0,20)}"`:"no amount";return o}o.amount=Math.round(amt*100)/100;
   o.title=(g(r,"paytitle")||"Payment").slice(0,80);o.name=o.title;const dr=g(r,"paydue"),d=imDate(dr);if(d)o.due=d;else if(d===null)o.warn.push(`couldn't read the date "${dr.slice(0,20)}"`);
   const pv=g(r,"paypaid"),pd=imDate(pv);o.paid=!!pv&&(imYes(pv)||!!pd);if(pd)o.paidOn=pd;
   if(!have[cid]){have[cid]={};clPays(cid).forEach(p=>have[cid][normName(p.title)+"|"+(+p.amount||0)+"|"+(p.due||"")]=p.k)}
   const dk=normName(o.title)+"|"+o.amount+"|"+(o.due||"");if(have[cid][dk]){o.dup=true;o.ex=have[cid][dk]}else if(seen[cid+dk])o.dup=true;seen[cid+dk]=1;return o})}
 return []}
/* what one row looks like in the preview, for the new kinds */
function imDet2(r,I){const fd=d=>d?clFmtDate(d):"";
 if(I.type==="gear")return [r.cat,r.qty!=null?r.qty+" owned":"",r.color,r.spot?"stored: "+r.spot:"",r.rep?r.rep+" in repair":"",r.cost?clMoney(r.cost)+" each":""];
 if(I.type==="spaces")return [r.cap?"up to "+r.cap:"",r.rate?clMoney(r.rate):"",r.note];
 if(I.type==="bookings")return [fd(r.date),r.start||r.end?bkTimes(r):"",r.sname+(r.spaceNew?" (new space)":""),r.kind,r.guests?r.guests+" guests":"",BK_ST[r.status][0],r.price?clMoney(r.price):"",r.deposit?clMoney(r.deposit)+" deposit"+(r.depPaid?" paid":""):""];
 if(I.type==="blocks")return [r.space?spaceName(r.space):"Whole venue",r.reason];
 if(I.type==="packages")return [r.price!=null?clMoney(r.price):"",r.deposit?clMoney(r.deposit)+" deposit":"",r.items?r.items.split("\n").length+" things included":""];
 if(I.type==="payments")return [r.amount!=null?clMoney(r.amount):"",r.due?"due "+fd(r.due):"",r.paid?"paid"+(r.paidOn?" "+fd(r.paidOn):""):"not paid yet",I.target==="col"&&r.cname?"for "+r.cname:""];
 return []}
/* saves the new kinds. Returns {n, paths, prev, where}. Updates keep the old record in prev so Undo can restore it. */
async function imSave2(I,recs,batch,tm){const out={n:0,paths:{},prev:{},where:""},u={},upd=I.dup==="update";
 const put=(path,obj)=>{u[path]=obj;out.paths[imPath(path)]=1};
 const change=(path,old,obj)=>{u[path]=obj;out.prev[imPath(path)]=old==null?null:old};
 if(I.type==="gear")recs.forEach((r,j)=>{const o={name:r.name,cat:r.cat||"Other",qty:r.qty||0,rep:r.rep||0,cost:r.cost||0,low:r.low!=null?r.low:"",color:r.color||"",spot:r.spot||"",note:r.note||"",t:tm+j,imp:batch};
  if(r.dup&&upd&&r.ex){const old=(D.gear||{})[r.ex]||{},n={};Object.keys(o).forEach(f=>{if(f!=="t"&&f!=="imp"&&(r[f]!=null&&r[f]!==""||f==="name"||f==="cat"))n[f]=o[f]});change("gear/"+r.ex,old,Object.assign({},old,n))}else put("gear/"+RT(PSP+"gear").push().key,o)});
 if(I.type==="spaces")recs.forEach((r,j)=>{const o={name:r.name,cap:r.cap||0,rate:r.rate||0,note:r.note||"",t:tm+j,imp:batch};
  if(r.dup&&upd&&r.ex){const old=(D.spaces||{})[r.ex]||{};change("spaces/"+r.ex,old,Object.assign({},old,{name:r.name},r.cap!=null?{cap:r.cap}:{},r.rate!=null?{rate:r.rate}:{},r.note?{note:r.note}:{}))}else put("spaces/"+RT(PSP+"spaces").push().key,o)});
 if(I.type==="bookings"){const made={};Object.keys(I.newSpaces||{}).forEach((nk,j)=>{if(!recs.some(r=>r.spaceNew&&normName(r.spaceNew)===nk))return;const k=RT(PSP+"spaces").push().key;made[nk]=k;put("spaces/"+k,{name:I.newSpaces[nk],cap:0,rate:0,note:"Added by an import",t:tm+j,imp:batch})});
  recs.forEach((r,j)=>{const o={name:r.name,date:r.date,space:r.spaceNew?made[normName(r.spaceNew)]||"":r.space||"",start:r.start||"",end:r.end||"",kind:r.kind||"Other",guests:r.guests||0,status:r.status,holdUntil:r.status==="hold"?dayAdd(mateToday(),7):"",price:r.price||0,deposit:r.deposit||0,depPaid:!!r.depPaid,phone:r.phone||"",email:r.email||"",ref:"",note:r.note||"",t:tm+j,imp:batch};
   if(r.dup&&upd&&r.ex){const old=(D.bks||{})[r.ex]||{},n={};Object.keys(o).forEach(f=>{if(!["t","imp","ref","holdUntil"].includes(f)&&(r[f]!=null&&r[f]!==""))n[f]=o[f]});change("bookings/"+r.ex,old,Object.assign({},old,n))}else put("bookings/"+RT(PSP+"bookings").push().key,o)})}
 if(I.type==="blocks")recs.forEach((r,j)=>put("blocks/"+RT(PSP+"blocks").push().key,{from:r.from,to:r.to,space:r.space||"",reason:r.reason||"",t:tm+j,imp:batch}));
 if(I.type==="packages")recs.forEach((r,j)=>{const o={name:r.name,price:r.price,deposit:r.deposit||0,items:r.items||"",t:tm+j,imp:batch};
  if(r.dup&&upd&&r.ex){const old=(D.pkgs||{})[r.ex]||{};change("packages/"+r.ex,old,Object.assign({},old,{price:r.price},r.deposit!=null?{deposit:r.deposit}:{},r.items?{items:r.items}:{}))}else put("packages/"+RT(PSP+"packages").push().key,o)});
 if(I.type==="payments"){const ids={};recs.forEach((r,j)=>{ids[r.cid]=1;const o={title:r.title,amount:r.amount,due:r.due||"",paid:!!r.paid,t:tm+j,imp:batch};if(r.paid)o.paidAt=r.paidOn?Date.parse(r.paidOn+"T12:00:00"):tm;
   if(r.dup&&upd&&r.ex){const old=((D.cpay||{})[r.cid]||{})[r.ex]||{};change(`clientPayments/${r.cid}/${r.ex}`,old,Object.assign({},old,{amount:r.amount,paid:!!r.paid},r.due?{due:r.due}:{},r.paid?{paidAt:o.paidAt}:{}))}else put(`clientPayments/${r.cid}/${RT(PSP+"clientPayments/"+r.cid).push().key}`,o)});
  const k=Object.keys(ids);out.where=k.length===1?((D.clients||{})[k[0]]||{}).name||"":k.length+" clients"}
 if(["spaces","bookings","blocks"].includes(I.type)&&!venueOn())u["venue/on"]=true;
 const ks=Object.keys(u);for(let i=0;i<ks.length;i+=400){const part={};ks.slice(i,i+400).forEach(k=>part[k]=u[k]);await RT(PSP.replace(/\/$/,"")).update(part)}
 out.n=recs.length;return out}
/* reads every tab of an .xlsx file: [{name, rows}] */
async function clXlsxSheets(file){if(!window.JSZip)throw new Error("nozip");const z=await JSZip.loadAsync(await file.arrayBuffer()),strs=[],ss=z.file("xl/sharedStrings.xml");
 if(ss){const x=await ss.async("string");(x.match(/<si[\s\S]*?<\/si>/g)||[]).forEach(si=>strs.push(clUnesc((si.match(/<t[^>]*>[\s\S]*?<\/t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,"")).join(""))))}
 const wb=z.file("xl/workbook.xml")?await z.file("xl/workbook.xml").async("string"):"",rel=z.file("xl/_rels/workbook.xml.rels")?await z.file("xl/_rels/workbook.xml.rels").async("string"):"",tg={};
 (rel.match(/<Relationship [^>]*>/g)||[]).forEach(r=>{const id=(r.match(/Id="([^"]+)"/)||[])[1],t=(r.match(/Target="([^"]+)"/)||[])[1];if(id&&t)tg[id]=t.replace(/^\/?(xl\/)?/,"xl/")});
 let list=(wb.match(/<sheet [^>]*\/?>/g)||[]).map(s=>({name:clUnesc((s.match(/name="([^"]*)"/)||[])[1]||"Sheet"),path:tg[(s.match(/r:id="([^"]+)"/)||[])[1]]})).filter(s=>s.path&&z.file(s.path));
 if(!list.length)list=Object.keys(z.files).filter(f=>/^xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort().map((p,i)=>({name:"Sheet "+(i+1),path:p}));
 const out=[];for(const s of list){const x=await z.file(s.path).async("string"),rows=[];
  (x.match(/<row[\s\S]*?<\/row>/g)||[]).forEach(r=>{const cells=[];(r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)||[]).forEach(c=>{const ref=(c.match(/ r="([A-Z]+)\d+"/)||[])[1]||"A",col=ref.split("").reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1;
   const t=(c.match(/ t="(\w+)"/)||[])[1],v=(c.match(/<v>([\s\S]*?)<\/v>/)||[])[1],is=(c.match(/<is>[\s\S]*?<\/is>/)||[])[0];cells[col]=t==="s"?strs[+v]||"":is?clUnesc(is.replace(/<[^>]+>/g,"")):clUnesc(v||"")});rows.push(Array.from(cells,c=>c==null?"":c))});
  if(rows.some(r=>r.some(c=>String(c).trim())))out.push({name:s.name,rows})}
 return out}
/* problem rows, as a spreadsheet the planner can fix and upload again */
function imProblemCsv(){const I=L.im;if(!I)return;const recs=imBuild(),bad=recs.filter(r=>r.skip||r.warn.length);if(!bad.length)return toast("No problem rows");
 const q=c=>/[",\n]/.test(String(c))?'"'+String(c).replace(/"/g,'""')+'"':String(c),rows=[I.head.concat(["Problem"])].concat(bad.map(r=>(I.rows[r.line-I.start-2]||[]).concat([[r.skip?"skipped: "+r.skip:""].concat(r.warn).filter(Boolean).join("; ")])));
 download(xFile(I.file)+" - rows to fix.csv",new Blob([rows.map(r=>r.map(q).join(",")).join("\r\n")],{type:"text/csv"}))}
/* export everything: one workbook, one tab per kind, with headers the importer reads back */
function exAllSheets(){const cs=D.clients||{},cn=id=>(cs[id]||{}).name||"",sh=[];
 sh.push({name:"Clients",rows:clExportAllRows()});
 const ven=[["Vendor name","Role","Phone","Email","Arrival time","What they bring","Notes","Client","Pickup time","Notes for the vendor","Details by vendor type","Vendor page"]];Object.keys(cs).forEach(id=>clVendors(id).forEach(v=>ven.push([v.name,v.role||"",v.phone||"",v.email||"",v.arrive?clFmtTime(v.arrive):"",v.delivers||"",v.note||"",cn(id),v.pickup?clFmtTime(v.pickup):"",v.vnote||"",v.extra||"",v.tok?vpLink(v.tok):""])));sh.push({name:"Vendors",rows:ven});
 sh.push({name:"Inventory",rows:[["Item","Category","How many","Color or size","Where it's stored","In repair","Cost each","Reorder below","Notes"]].concat(gearList().map(it=>[it.name,it.cat||"",+it.qty||0,it.color||"",it.spot||"",+it.rep||0,+it.cost||0,it.low===""||it.low==null?"":+it.low,it.note||""]))});
 sh.push({name:"Pull lists",rows:[["Pull list","Goes out","Comes back","Status","Items","Notes"]].concat(gresList().map(r=>[r.label||"",r.from||"",gresTo(r)||"",GR_ST[r.status||"held"][0],gresWhat(r).join("; "),r.note||""]))});
 sh.push({name:"Venue spaces",rows:[["Space","Capacity","Fee","Notes"]].concat(spaceList().map(s=>[s.name,+s.cap||0,+s.rate||0,s.note||""]))});
 sh.push({name:"Venue bookings",rows:[["Event","Date","Start","End","Space","Type","Guests","Status","Fee","Deposit","Deposit paid","Phone","Email","Notes"]].concat(bkList().map(b=>[b.name||"",b.date||"",b.start?clFmtTime(b.start):"",b.end?clFmtTime(b.end):"",spaceName(b.space),b.kind||"",+b.guests||0,BK_ST[b.status||"hold"][0],+b.price||0,+b.deposit||0,b.depPaid?"Yes":"No",b.phone||"",b.email||"",b.note||""]))});
 sh.push({name:"Blocked days",rows:[["From","Through","Space","Reason"]].concat(blkList().map(x=>[x.from,blkTo(x),x.space?spaceName(x.space):"Whole venue",x.reason||""]))});
 sh.push({name:"Packages",rows:[["Package","Price","Deposit","What's included"]].concat(pkList().map(p=>[p.name,+p.price||0,+p.deposit||0,pkLines(p).join("; ")]))});
 const pay=[["Client","What it's for","Amount","Due date","Paid"]];Object.keys(cs).forEach(id=>clPays(id).forEach(p=>pay.push([cn(id),p.title||"",+p.amount||0,p.due||"",p.paid?"Yes":"No"])));sh.push({name:"Payments",rows:pay});
 const inv=[["Invoice","Client","Total","Due","Status"]];Object.keys(cs).forEach(id=>invList(id).forEach(x=>inv.push([x.no||"",cn(id),+x.total||0,x.due||"",invStatus(id,x)])));sh.push({name:"Invoices",rows:inv});
 const ld=[["Name","Email","Phone","Event type","Event date","Guests","Budget","Status","Message"]].concat(inqList().map(x=>[x.name||"",x.email||"",x.phone||"",x.type||"",x.date||"",x.guests||"",x.budget||"",(LEAD_ST[x.status||"new"]||["New"])[0],x.msg||""]));sh.push({name:"Leads",rows:ld});
 return sh}
Object.assign(ACT,{
 imRetype:el=>{const I=L.im;if(!I)return;const type=el.value;if(!IM_T[type])return;I.type=type;I.auto=false;I.map=imGuess(type,I.head);I.sig=imSig(type,I.head);I.saved=false;I.dup="skip";I.off={};
  I.target=(type==="vendors"&&I.map.client!=null&&I.map.client!=="")||(type==="payments"&&I.map.payclient!=null&&I.map.payclient!=="")?"col":type==="guests"?((L.cliOpen&&(D.clients[L.cliOpen]||{}).ev)||""):"";
  RT(PSP+"imMaps/"+I.sig).once("value").then(s=>{const sv=s.val();if(L.im===I&&sv&&typeof sv==="object"&&Object.values(sv).every(v=>v===""||(+v>=0&&+v<I.head.length))){I.map=Object.assign({},sv);I.saved=true;render(true)}}).catch(()=>{});render(true)},
 imOff:el=>{const I=L.im;if(!I)return;I.off=I.off||{};const k=el.dataset.k;if(I.off[k])delete I.off[k];else I.off[k]=1;render(true)},
 imProblems:()=>imProblemCsv(),
 imNextTab:async()=>{const q=L.imQ||[];if(!q.length){L.im=null;return render(true)}const nx=q.shift();L.im=null;await imLoadRows(nx.file,nx.rows,nx.sheet)},
 exAll:async()=>{if(!window.JSZip)return toast("Exports need a connection. Try again in a moment.");
  try{download(xFile((D.plMe||{}).biz||"Host Mode")+" - everything.xlsx",await xlsxBlob(exAllSheets()));toast("Downloaded")}catch(e){toast("Couldn't make the export: "+e.message)}}
});

/* ---- packages and invoices ----
   planners/{uid}/packages/{k}             = {name, price, deposit, items, t}   (items: one included thing per line)
   planners/{uid}/clientInvoices/{cid}/{k} = {no, lines:[{d,amt}], total, issued, due, note, pay, status: sent|paid, paidAt, payKeys, t}
   planners/{uid}/invSettings              = {next, pay}
   Tracked only: the app never takes or sends money. Every invoice is tied to entries in the client's payments,
   so Paid and Left stay right and ticking a payment off counts toward the invoice. */
D.pkgs={};D.cinv={};D.invSet={};
const pkList=()=>Object.keys(D.pkgs||{}).map(k=>Object.assign({k},D.pkgs[k])).sort((a,b)=>(+a.price||0)-(+b.price||0)||String(a.name).localeCompare(String(b.name)));
const pkLines=p=>String((p&&p.items)||"").split("\n").map(x=>x.trim()).filter(Boolean);
const invList=id=>clList("cinv",id).sort((a,b)=>(b.t||0)-(a.t||0));
const invNo=()=>"INV-"+((D.invSet||{}).next||1001);
const invTotal=lines=>Math.round((lines||[]).reduce((n,l)=>n+(+l.amt||0),0)*100)/100;
const invParse=v=>{const s=String(v==null?"":v).replace(/[$,\s]/g,"");if(!s)return null;const n=Number(s);return isFinite(n)?Math.round(n*100)/100:null};
const invLinked=(id,k)=>clPays(id).filter(p=>p.inv===k);
const invIsPaid=(id,x)=>x.status==="paid"||(()=>{const l=invLinked(id,x.k);return l.length>0&&l.every(p=>p.paid)})();
const invStatus=(id,x)=>invIsPaid(id,x)?"Paid":x.due&&x.due<mateToday()?"Overdue":"Sent";
const invClient=id=>(D.clients||{})[id]||D.cliMe||{};
const invFrom=()=>{const b=D.brand||{},me=D.plMe||{};return {name:b.name||me.biz||me.name||"Your planner",logo:b.logo||"",color:b.color||"#0c2147",tag:b.tag||"",city:b.city||"",contact:[b.phone||me.phone,b.email||me.email,b.web].filter(Boolean)}};
function invMailto(id,x){const c=invClient(id),f=invFrom();
 const body=[`Hi ${c.name||"there"},`,"",`Here's invoice ${x.no} for ${clMoney(x.total)}${x.due?", due "+clFmtDate(x.due):""}.`,"",...(x.lines||[]).map(l=>`${l.d}: ${clMoney(l.amt)}`),"",x.pay?"How to pay: "+x.pay:"",x.note||"","",`You can see it any time in your portal: ${clLink(id)}`,"",`Thank you,`,f.name].filter((l,i,a)=>l||a[i-1]).join("\n");
 return `mailto:${encodeURIComponent(c.email||"")}?subject=${encodeURIComponent(`Invoice ${x.no} from ${f.name}`)}&body=${encodeURIComponent(body)}`}
function invHTML(id,x){const c=invClient(id),f=invFrom(),st=invStatus(id,x);
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.no)} · ${esc(f.name)}</title>
<style>body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2433;background:#f4f1ea}.pg{max-width:760px;margin:24px auto;background:#fff;padding:40px 44px;border-radius:14px;box-shadow:0 10px 40px -20px rgba(0,0,0,.3)}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:4px solid ${esc(f.color)};padding-bottom:18px}.top img{max-height:64px;max-width:200px}.biz{font-weight:800;font-size:20px}
h1{margin:0;font-size:30px;letter-spacing:-.02em;color:${esc(f.color)};text-align:right}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0}.meta div span{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7385}
table{width:100%;border-collapse:collapse;margin:8px 0 4px}th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7385;border-bottom:1px solid #ddd;padding:8px 0}td{padding:10px 0;border-bottom:1px solid #eee}td.a,th.a{text-align:right}
.tot td{border:0;font-weight:800;font-size:20px;padding-top:14px}.st{display:inline-block;padding:2px 10px;border-radius:99px;font-weight:700;font-size:13px;background:${st==="Paid"?"#e3f4df;color:#2b6e1e":st==="Overdue"?"#fde8d6;color:#a4480b":"#e8edf7;color:#1f3f78"}}
.box{background:#f7f5f0;border-radius:10px;padding:14px 16px;margin-top:18px;white-space:pre-line}.foot{margin-top:26px;font-size:12px;color:#8a90a0;text-align:center}.bar{max-width:760px;margin:16px auto 0;display:flex;gap:10px;justify-content:flex-end;padding:0 16px}
.bar button{font:inherit;font-weight:700;padding:10px 18px;border-radius:99px;border:0;background:${esc(f.color)};color:#fff;cursor:pointer}@media(max-width:600px){.pg{margin:0;border-radius:0;padding:24px 18px}}@media print{body{background:#fff}.bar{display:none}.pg{box-shadow:none;margin:0;max-width:none}}</style></head><body>
<div class="bar"><button onclick="print()">Print or save as PDF</button></div>
<div class="pg"><div class="top"><div>${f.logo?`<img src="${esc(f.logo)}" alt="">`:""}<div class="biz">${esc(f.name)}</div>${f.tag?`<div style="color:#6b7385">${esc(f.tag)}</div>`:""}${f.contact.length||f.city?`<div style="color:#6b7385;font-size:13px;margin-top:4px">${[f.city].concat(f.contact).filter(Boolean).map(esc).join(" · ")}</div>`:""}</div><div><h1>Invoice</h1><div style="text-align:right">${esc(x.no)}</div></div></div>
<div class="meta"><div><span>Billed to</span><b>${esc(c.name||"")}</b>${c.email?`<br>${esc(c.email)}`:""}</div><div><span>Issued</span>${esc(clFmtDate(x.issued))}</div><div><span>Due</span>${esc(x.due?clFmtDate(x.due):"On receipt")}</div><div><span>Status</span><span class="st">${st}</span></div></div>
${c.evName||c.evTitle?`<p style="margin:0 0 6px"><b>For:</b> ${esc(c.evName||c.evTitle)}${c.date?" · "+esc(clFmtDate(c.date)):""}</p>`:""}
<table><thead><tr><th>Description</th><th class="a">Amount</th></tr></thead><tbody>${(x.lines||[]).map(l=>`<tr><td>${esc(l.d)}</td><td class="a">${clMoney(l.amt)}</td></tr>`).join("")}<tr class="tot"><td>Total</td><td class="a">${clMoney(x.total)}</td></tr></tbody></table>
${x.pay?`<div class="box"><b>How to pay</b>\n${esc(x.pay)}</div>`:""}${x.note?`<div class="box">${esc(x.note)}</div>`:""}
<div class="foot">Thank you for your business · Sent with Host Mode</div></div></body></html>`}
function pkCard(){const l=pkList(),open=L.pkNew;
 return `<section class="card stack"><div class="row between"><h3>Packages</h3><button class="btn sm" data-act="pkToggle">${open?"Close":"New package"}</button></div>
 <p class="small muted m0">Your standard offers, like a Gold Wedding or a Birthday Basic. Add one to a client and their deposit and balance are set up for you.</p>
 ${l.length?`<div class="stack tight">${l.map(p=>`<div class="mrow2 small"><div class="row between"><span><b>${esc(p.name)}</b> · ${clMoney(p.price)}${+p.deposit?` <span class="muted">(${clMoney(p.deposit)} deposit)</span>`:""}</span><button class="btn xs" data-act="pkDel" data-k="${esc(p.k)}">${L.confirm==="pd"+p.k?"Tap again to delete":"Delete"}</button></div>${pkLines(p).length?`<div class="muted">${pkLines(p).map(esc).join(" · ")}</div>`:""}</div>`).join("")}</div>`:(open?"":'<p class="small muted m0">No packages yet.</p>')}
 ${open?`<div class="grid2 g8"><label class="stack tight" style="grid-column:1/-1"><span class="small">Package name</span><input type="text" data-draft="pk_name" maxlength="60" value="${esc(dv("pk_name",""))}" placeholder="Gold Wedding"></label>
  <label class="stack tight"><span class="small">Price ($)</span><input type="text" inputmode="decimal" data-draft="pk_price" value="${esc(dv("pk_price",""))}" placeholder="5000"></label>
  <label class="stack tight"><span class="small">Deposit ($, optional)</span><input type="text" inputmode="decimal" data-draft="pk_dep" value="${esc(dv("pk_dep",""))}" placeholder="1500"></label>
  <label class="stack tight" style="grid-column:1/-1"><span class="small">What's included (one per line)</span><textarea rows="4" data-draft="pk_items" maxlength="1500" placeholder="Full planning&#10;Day-of coordination&#10;Vendor booking">${esc(dv("pk_items",""))}</textarea></label></div>
  <button class="btn primary as" data-act="pkSave">Save package</button>`:""}</section>`}
function pkPlanBox(id){const c=(D.clients||{})[id]||{},l=pkList(),p=c.pkg;
 return `<div class="card stack tight"><b>Package</b>${p?`<div class="small"><b>${esc(p.name)}</b> · ${clMoney(p.price)}${pkLines(p).length?`<div class="muted">${pkLines(p).map(esc).join(" · ")}</div>`:""}</div>`:""}
 ${l.length?`<div class="row"><select data-draft="pk_pick_${id}" aria-label="Package">${l.map(x=>`<option value="${esc(x.k)}" ${dv("pk_pick_"+id,(p&&p.k)||"")===x.k?"selected":""}>${esc(x.name)} · ${clMoney(x.price)}</option>`).join("")}</select><button class="btn sm" data-act="pkApply" data-m="${id}">${p?"Change package":"Add package"}</button></div><span class="small muted">Adds the deposit and the balance to their payments${c.date?", with the balance due two weeks before the event":""}.</span>`:'<span class="small muted">Make your packages in the Packages tab, then add one here.</span>'}</div>`}
function invPlanBox(id){const c=(D.clients||{})[id]||{},l=invList(id),f=L.inv&&L.inv.cid===id?L.inv:null,unpaid=clPays(id).filter(x=>!x.paid&&!x.inv);
 const rows=l.map(x=>{const st=invStatus(id,x);return `<div class="mrow2 small"><div class="row between"><span><b>${esc(x.no)}</b> · ${clMoney(x.total)} <span class="pill ${st==="Paid"?"ok":st==="Overdue"?"warn":""}">${st}</span></span><span class="muted">${x.due?"due "+esc(mateDue(x.due)):""}</span></div>
  <div class="row"><button class="btn xs" data-act="invPaid" data-m="${id}" data-k="${esc(x.k)}">${st==="Paid"?"Mark unpaid":"Mark paid"}</button><button class="btn xs" data-act="invView" data-m="${id}" data-k="${esc(x.k)}">Print or PDF</button>${c.email?`<a class="btn xs" href="${esc(invMailto(id,x))}">Email it</a>`:""}<button class="btn xs" data-act="invDel" data-m="${id}" data-k="${esc(x.k)}">${L.confirm==="vd"+x.k?"Tap again to delete":"Delete"}</button></div></div>`}).join("");
 const form=f?`<div class="card stack tight"><div class="row between"><b>New invoice ${esc(invNo())}</b><button class="btn xs" data-act="invNew" data-m="${id}">Close</button></div>
  ${c.pkg||unpaid.length?`<div class="row">${c.pkg?`<button class="btn xs" data-act="invFill" data-m="${id}" data-k="pkg">Fill from their package</button>`:""}${unpaid.length?`<button class="btn xs" data-act="invFill" data-m="${id}" data-k="pays">Fill from unpaid payments</button>`:""}</div>`:""}
  ${f.lines.map((ln,i)=>`<div class="row"><input type="text" class="grow" data-act="invLine" data-i="${i}" data-f="d" maxlength="100" value="${esc(ln.d)}" placeholder="What it's for" aria-label="Line ${i+1}"><input type="text" inputmode="decimal" style="width:7.5em" data-act="invLine" data-i="${i}" data-f="amt" value="${esc(ln.amt)}" placeholder="Amount" aria-label="Line ${i+1} amount"><button class="btn xs" data-act="invLineDel" data-i="${i}" aria-label="Remove line">×</button></div>`).join("")}
  <button class="btn xs as" data-act="invLineAdd">Add a line</button>
  <div class="row between"><b>Total</b><b id="invTot">${clMoney(invTotal(f.lines.map(x=>({amt:invParse(x.amt)||0}))))}</b></div>
  <div class="grid2 g8"><label class="stack tight"><span class="small">Due</span><input type="date" data-draft="inv_due" value="${esc(dv("inv_due",clDays(14)))}"></label><label class="stack tight"><span class="small">Note (optional)</span><input type="text" data-draft="inv_note" maxlength="400" value="${esc(dv("inv_note",""))}" placeholder="Thank you!"></label>
  <label class="stack tight" style="grid-column:1/-1"><span class="small">How to pay (saved for next time)</span><textarea rows="2" data-draft="inv_pay" maxlength="400" placeholder="Zelle to pay@yourbusiness.com, or pay by card at yourbusiness.com/pay">${esc(dv("inv_pay",(D.invSet||{}).pay||""))}</textarea></label></div>
  <button class="btn primary as" data-act="invSend" data-m="${id}">Send invoice</button><span class="small muted">It shows up in ${esc(c.name||"the client")}'s portal and messages${c.email?", and you can email it too":""}. Host Mode keeps track only; it never takes or sends money.</span></div>`:"";
 return `<div class="card stack tight"><div class="row between"><b>Invoices</b>${f?"":`<button class="btn sm" data-act="invNew" data-m="${id}">New invoice</button>`}</div>${rows?`<div class="stack tight">${rows}</div>`:(f?"":'<span class="small muted">No invoices yet.</span>')}${form}</div>`}
function invClientCard(id){const me=D.cliMe||{},p=me.pkg,l=invList(id);
 return `${p?`<section class="card stack"><h3>Your package</h3><div><b>${esc(p.name)}</b> · ${clMoney(p.price)}</div>${pkLines(p).length?`<ul class="small m0">${pkLines(p).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</section>`:""}
 ${l.length?`<section class="card stack"><h3>Invoices</h3><div class="stack tight">${l.map(x=>{const st=invStatus(id,x);return `<div class="row between small clrow"><span class="mw0"><b>${esc(x.no)}</b> · ${clMoney(x.total)}<span class="db ${st==="Overdue"?"bad":"muted"}">${st==="Paid"?"Paid":(st==="Overdue"?"Overdue · was due ":"Due ")+esc(x.due?clFmtDate(x.due):"on receipt")}</span></span><button class="btn xs" data-act="invView" data-m="${id}" data-k="${esc(x.k)}">View</button></div>`}).join("")}</div></section>`:""}`}

Object.assign(ACT,{
 pkToggle:()=>{L.pkNew=!L.pkNew;render(true)},
 pkSave:async()=>{const name=dv("pk_name","").trim().slice(0,60),price=invParse(dv("pk_price","")),dep=invParse(dv("pk_dep",""));
  if(!name)return toast("Give the package a name");if(price==null||price<0)return toast("Type a price, like 5000");if(dv("pk_dep","").trim()&&(dep==null||dep<0))return toast("Type the deposit as a number, like 1500");if(dep>price)return toast("The deposit can't be more than the price");
  await RT(PSP+"packages").push().set({name,price,deposit:dep||0,items:dv("pk_items","").split("\n").map(x=>x.trim()).filter(Boolean).join("\n").slice(0,1500),t:Date.now()});
  ["pk_name","pk_price","pk_dep","pk_items"].forEach(k=>delete L.drafts[k]);L.pkNew=false;toast("Package saved");render(true)},
 pkDel:async el=>{const k=el.dataset.k;if(L.confirm!=="pd"+k){L.confirm="pd"+k;return render(true)}L.confirm=null;await RT(PSP+"packages/"+k).remove();toast("Package deleted")},
 pkApply:async el=>{const id=el.dataset.m,c=(D.clients||{})[id]||{},l=pkList(),k=dv("pk_pick_"+id,(c.pkg&&c.pkg.k)||(l[0]&&l[0].k)||""),p=(D.pkgs||{})[k];if(!p)return toast("Pick a package");
  await Promise.all(clPays(id).filter(x=>x.pkg&&!x.paid&&!x.inv).map(x=>RT(PSP+`clientPayments/${id}/${x.k}`).remove()));
  const price=+p.price||0,dep=Math.min(+p.deposit||0,price),bal=Math.round((price-dep)*100)/100,tm=Date.now(),u={};
  if(dep>0)u[RT(PSP+"clientPayments/"+id).push().key]={title:"Deposit: "+p.name,amount:dep,due:mateToday(),paid:false,pkg:true,t:tm};
  if(bal>0)u[RT(PSP+"clientPayments/"+id).push().key]={title:(dep>0?"Balance: ":"")+p.name,amount:bal,due:clDueFrom(c.date,14)||"",paid:false,pkg:true,t:tm+1};
  if(Object.keys(u).length)await RT(PSP+"clientPayments/"+id).update(u);
  await RT(PSP+`clients/${id}/pkg`).set({k,name:p.name,price,deposit:dep,items:p.items||""});delete L.drafts["pk_pick_"+id];
  toast(`${p.name} added to ${c.name}`);render(true)},
 invNew:el=>{const id=el.dataset.m;L.inv=L.inv&&L.inv.cid===id?null:{cid:id,lines:[{d:"",amt:""}],payKeys:null};render(true)},
 invFill:el=>{const id=el.dataset.m,f=L.inv,c=(D.clients||{})[id]||{};if(!f)return;
  if(el.dataset.k==="pkg"&&c.pkg){const paid=clPays(id).filter(x=>x.pkg&&x.paid).reduce((n,x)=>n+(+x.amount||0),0);f.lines=[{d:c.pkg.name+" package",amt:String(c.pkg.price)}].concat(paid?[{d:"Already paid",amt:String(-paid)}]:[]);f.payKeys=Object.fromEntries(clPays(id).filter(x=>x.pkg&&!x.paid&&!x.inv).map(x=>[x.k,1]))}
  else{const l=clPays(id).filter(x=>!x.paid&&!x.inv);f.lines=l.map(x=>({d:x.title,amt:String(x.amount)}));f.payKeys=Object.fromEntries(l.map(x=>[x.k,1]))}
  render(true)},
 invLine:el=>{const f=L.inv;if(!f)return;const ln=f.lines[+el.dataset.i];if(!ln)return;ln[el.dataset.f]=el.value;
  const t=$("#invTot");if(t)t.textContent=clMoney(invTotal(f.lines.map(x=>({amt:invParse(x.amt)||0}))))},
 invLineAdd:()=>{if(L.inv){L.inv.lines.push({d:"",amt:""});render(true)}},
 invLineDel:el=>{const f=L.inv;if(!f)return;f.lines.splice(+el.dataset.i,1);if(!f.lines.length){f.lines.push({d:"",amt:""});f.payKeys=null}render(true)},
 invSend:async el=>{const id=el.dataset.m,f=L.inv,c=(D.clients||{})[id]||{};if(!f||f.cid!==id||f.busy)return;
  const lines=f.lines.map(x=>({d:String(x.d||"").trim().slice(0,100),amt:invParse(x.amt)})).filter(x=>x.d||x.amt!=null);
  if(!lines.length)return toast("Add at least one line");if(lines.some(x=>x.amt==null))return toast("Each line needs an amount, like 500");if(lines.some(x=>!x.d))return toast("Say what each line is for");
  const total=invTotal(lines);if(total<=0)return toast("The total needs to be more than $0");
  f.busy=true;const st=D.invSet||{},n=+st.next||1001,no="INV-"+n,due=dv("inv_due",clDays(14)),pay=dv("inv_pay",st.pay||"").trim().slice(0,400),note=dv("inv_note","").trim().slice(0,400),tm=Date.now();
  const k=RT(PSP+"clientInvoices/"+id).push().key,pk=Object.keys(f.payKeys||{}).filter(p=>((D.cpay||{})[id]||{})[p]);
  try{await RT(PSP+`clientInvoices/${id}/${k}`).set(Object.assign({no,lines,total,issued:mateToday(),due,note,pay,status:"sent",t:tm},pk.length?{payKeys:Object.fromEntries(pk.map(p=>[p,1]))}:{}));
   await RT(PSP+"invSettings").update({next:n+1,pay});
   /* link the payments this invoice covers; anything beyond them becomes one new payment so nothing is counted twice */
   if(pk.length)await Promise.all(pk.map(p=>RT(PSP+`clientPayments/${id}/${p}/inv`).set(k)));
   const covered=pk.reduce((n,p)=>n+(+(((D.cpay||{})[id]||{})[p]||{}).amount||0),0),extra=Math.round((total-covered)*100)/100;
   if(extra>0)await RT(PSP+"clientPayments/"+id).push().set({title:"Invoice "+no+(pk.length?" (added items)":""),amount:extra,due,paid:false,inv:k,auto:true,t:tm});
   await RT(PSP+"clientMsgs/"+id).push().set({from:"planner",text:`New invoice ${no} for ${clMoney(total)}${due?", due "+clFmtDate(due):""}. You'll find it under Plan.`,t:tm});
   await RT(PSP+`clients/${id}/plSeen`).set(tm)}catch(e){f.busy=false;return toast("Couldn't send that invoice. Check your connection.")}
  L.inv=null;["inv_due","inv_note","inv_pay"].forEach(x=>delete L.drafts[x]);toast(`${no} sent to ${c.name||"your client"}`);render(true)},
 invPaid:async el=>{const id=el.dataset.m,k=el.dataset.k,x=((D.cinv||{})[id]||{})[k];if(!x)return;const on=!invIsPaid(id,Object.assign({k},x)),tm=Date.now();
  await RT(PSP+`clientInvoices/${id}/${k}`).update({status:on?"paid":"sent",paidAt:on?tm:null});
  await Promise.all(invLinked(id,k).map(p=>RT(PSP+`clientPayments/${id}/${p.k}`).update({paid:on,paidAt:on?tm:null})));
  toast(on?`${x.no} marked paid`:`${x.no} marked unpaid`);render(true)},
 invDel:async el=>{const id=el.dataset.m,k=el.dataset.k;if(L.confirm!=="vd"+k){L.confirm="vd"+k;return render(true)}L.confirm=null;
  await Promise.all(invLinked(id,k).map(p=>p.auto?RT(PSP+`clientPayments/${id}/${p.k}`).remove():RT(PSP+`clientPayments/${id}/${p.k}/inv`).remove()));
  await RT(PSP+`clientInvoices/${id}/${k}`).remove();toast("Invoice deleted");render(true)},
 invView:el=>{const id=el.dataset.m,k=el.dataset.k,x=((D.cinv||{})[id]||{})[k];if(!x)return;const html=invHTML(id,Object.assign({k},x));
  const w=window.open("","_blank");if(w){w.document.open();w.document.write(html);w.document.close()}else download(x.no+".html",new Blob([html],{type:"text/html"}))}
});

Object.assign(ACT,{
 /* planner */
 clAdd:async()=>{const n=dv("cl_name","").trim().slice(0,40);if(!n)return toast("Type the client's name");const ev=dv("cl_ev",""),en=ev&&(D.events||{})[ev]?(D.events[ev].name||ev):"";const r=RT(PSP+"clients").push();await r.set({name:n,ev,evName:en,date:dv("cl_date",""),t:Date.now()});const tk=dv("cl_tpl","");let nt=0;if(tk)nt=await clApplyTpl(r.key,tk,dv("cl_date",""));["cl_name","cl_date","cl_tpl"].forEach(k=>delete L.drafts[k]);L.cliOpen=r.key;L.cliTab="list";toast(nt?`Added with ${nt} checklist items. Copy their link and send it.`:"Added. Copy their link and send it.");render(true)},
 cliOpen:el=>{L.cliOpen=L.cliOpen===el.dataset.k?null:el.dataset.k;L.cliTab="list";L.clPrev=null;render(true)},
 cliSub:async el=>{L.cliTab=el.dataset.k;L.clPrev=null;if(L.cliTab==="chat"&&L.cliOpen)await RT(PSP+`clients/${L.cliOpen}/plSeen`).set(Date.now());render(true)},
 clSetEv:async el=>{const id=el.dataset.m,ev=el.value,en=ev&&(D.events||{})[ev]?(D.events[ev].name||ev):"";await RT(PSP+"clients/"+id).update({ev,evName:en});toast(ev?"Linked to "+en:"Unlinked")},
 clDelete:async el=>{const id=el.dataset.k;if(L.confirm!=="cd"+id){L.confirm="cd"+id;return render(true)}L.confirm=null;await Promise.all(["clientTasks","clientMsgs","clientFiles","clientBlobs","clientApprovals","clientPayments","clientDates","clientVendors","clientInvoices","clients"].map(p=>RT(PSP+p+"/"+id).remove()));L.cliOpen=null;toast("Removed")},
 cltShow:el=>{L.drafts.clt_show=el.checked?"1":"0"},
 clTaskAdd:async el=>{const id=el.dataset.m,title=dv("clt_title","").trim().slice(0,120);if(!title)return toast("Type the item first");const owner=dv("clt_owner","client");
  await RT(PSP+`clientTasks/${id}`).push().set({title,owner,due:dv("clt_due",""),note:dv("clt_note","").trim().slice(0,160),show:owner==="client"?true:dv("clt_show","")==="1",done:false,t:Date.now()});["clt_title","clt_note","clt_due"].forEach(k=>delete L.drafts[k]);toast("Item added");render(true)},
 clPlanTick:async el=>{const m=el.dataset.m,k=el.dataset.k,x=((D.ctasks||{})[m]||{})[k]||{};await RT(PSP+`clientTasks/${m}/${k}`).update({done:!x.done,doneAt:x.done?null:Date.now(),by:x.done?null:"planner"})},
 clShow:async el=>{const m=el.dataset.m,k=el.dataset.k,x=((D.ctasks||{})[m]||{})[k]||{};await RT(PSP+`clientTasks/${m}/${k}/show`).set(!x.show)},
 clTaskDel:async el=>{await RT(PSP+`clientTasks/${el.dataset.m}/${el.dataset.k}`).remove()},
 clFileShare:async el=>{const m=el.dataset.m,k=el.dataset.k,f=((D.cfiles||{})[m]||{})[k]||{};await RT(PSP+`clientFiles/${m}/${k}/share`).set(!f.share)},
 clFileDel:async el=>{const m=el.dataset.m,k=el.dataset.k;await RT(PSP+`clientBlobs/${m}/${k}`).remove();await RT(PSP+`clientFiles/${m}/${k}`).remove();toast("Deleted")},
 clOpen:el=>{const m=el.dataset.m,k=el.dataset.k,f=((D.cfiles||{})[m]||{})[k]||{};clOpen(m,k,f.name||"file",f.kind)},
 clPreview:async el=>{const m=el.dataset.m,k=el.dataset.k;if(L.clPrev===k){L.clPrev=null;return render(true)}L.clPrev=k;L.clPrevList=parseGuests(await clGuestText(m,k));render(true)},
 clImport:async el=>{const m=el.dataset.m,k=el.dataset.k,mode=el.dataset.mode;if(mode==="replace"&&L.confirm!=="rp"+k){L.confirm="rp"+k;return render(true)}L.confirm=null;await clDoImport(m,k,mode)},
 clDismiss:async el=>{await RT(PSP+`clientFiles/${el.dataset.m}/${el.dataset.k}/status`).set("dismissed");toast("Won't be used")},
 clPlanFile:async el=>{const id=L.cliOpen,f=el.files&&el.files[0];if(!f||!id)return;if(f.size>CL_MAX)return toast("That file is over 10 MB");toast("Uploading…");
  try{const isImg=/^image\//.test(f.type);let data,thumb;if(isImg){const r=await clShrink(f,1800,.82);data=r.data;thumb=(await clShrink(f,160,.7)).data}else data=await clReadURL(f);
   await clSave(id,Object.assign({name:f.name.slice(0,80),kind:isImg?"photo":"doc",size:f.size,by:"planner",share:false},thumb?{thumb}:{}),data);toast("Uploaded. It's private until you share it.")}catch(e){toast("Couldn't upload that file")}el.value=""},
 /* both sides */
 clSend:async el=>{const from=el.dataset.from,id=from==="client"?clKey():el.dataset.m,key=from==="client"?"cl_msg":"cl_msg_"+id,text=dv(key,"").trim().slice(0,1000);if(!text)return toast("Type a message first");
  await RT(PSP+"clientMsgs/"+id).push().set({from,text,t:Date.now()});delete L.drafts[key];if(from==="planner")await RT(PSP+`clients/${id}/plSeen`).set(Date.now());render(true)},
 /* client */
 clTab:el=>{L.clTab=el.dataset.k;render(true)},
 clTick:async el=>{const id=clKey(),k=el.dataset.k,on=el.checked;await RT(PSP+`clientTasks/${id}/${k}`).update({done:on,doneAt:on?Date.now():null,by:on?"client":null});buzz(20)},
 clErrX:()=>{L.clErr=null;render(true)},
 clHelp:()=>{const e=L.clErr||{};L.drafts.cl_msg=`Hi! I tried to upload "${e.file||"a file"}"${e.size?` (${clMB(e.size)})`:""} but it didn't work${e.size>CL_MAX?" because it was too large":""}. Can you help?`;L.clErr=null;L.clTab="chat";render(true)},
 clNames:async()=>{const id=clKey(),txt=dv("cl_names","").trim();if(!txt)return toast("Type or paste some names first");const n=parseGuests(txt).length;if(!n)return toast("No names found");
  await clSave(id,{name:"Typed guest list.txt",kind:"guests",size:txt.length,by:"client",count:n,status:"pending"},txt);delete L.drafts.cl_names;toast("Sent. Your planner will review it.");render(true)},
 clFile:async el=>{const id=clKey(),kind=el.dataset.kind,files=[...(el.files||[])];el.value="";if(!files.length)return;
  for(const f of files){
   if(f.size>CL_MAX){L.clErr={title:"This file is too big.",text:`"${f.name}" is ${clMB(f.size)}. The limit is 10 MB. Try a smaller version, or message your planner to send it another way.`,file:f.name,size:f.size};render(true);continue}
   toast("Uploading "+f.name+"…");
   try{
    if(kind==="photo"){const r=await clShrink(f,1800,.82),th=await clShrink(f,160,.7);await clSave(id,{name:f.name.slice(0,80),kind:"photo",size:Math.round(r.data.length*.75),by:"client",thumb:th.data},r.data)}
    else if(kind==="guests"){let txt;if(/\.xlsx$/i.test(f.name)){try{txt=await clXlsxToCsv(f)}catch(e){L.clErr={title:"Couldn't read that spreadsheet.",text:'Please save it as a CSV file ("Download as .csv" in Google Sheets or "Save As" in Excel), or paste the names instead.',file:f.name};render(true);continue}}else txt=await new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>res(String(fr.result||""));fr.readAsText(f)});
     const n=parseGuests(txt).length;if(!n){L.clErr={title:"No names found in that file.",text:"Use one name per line, or a spreadsheet with a Name column.",file:f.name};render(true);continue}
     await clSave(id,{name:f.name.slice(0,80),kind:"guests",size:f.size,by:"client",count:n,status:"pending"},txt)}
    else await clSave(id,{name:f.name.slice(0,80),kind:"doc",size:f.size,by:"client"},await clReadURL(f));
    toast("Uploaded "+f.name)}catch(e){L.clErr={title:"That upload didn't go through.",text:"Check your connection and try again, or message your planner.",file:f.name,size:f.size};render(true)}}}
});

