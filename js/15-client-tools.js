/* ================= TEMPLATES + APPROVALS (planner side tools on top of the client portals) =================
   partygames/clientTemplates/{id} = {name, items:[{title,owner,note,show,days}], t}   days = how many days before the event it's due
   partygames/clientApprovals/{clientId}/{aid} = {title, note, fileId, fileName, status:"pending"|"approved"|"changes", version, comment, decidedAt, by, t, hist:{...}} */
D.ctpl={};D.caps={};
const CL_STARTERS={
 wedding:{label:"Wedding",items:[["Set the budget and the guest count",300,"client"],["Book the venue",290,"client"],["Hire the photographer",240,"client"],["Book the caterer and schedule a tasting",200,"client"],["Hire the DJ or band",180,"client"],["Order invitations",120,"client"],["Send the invitations",90,"client"],["Finalize the menu",45,"planner",true],["Confirm the seating plan",14,"planner",true],["Send the final headcount to the caterer",10,"client"],["Pick up the cake and flowers",1,"planner",true]]},
 birthday:{label:"Birthday",items:[["Pick a date and a budget",60,"client"],["Book the venue",50,"client"],["Make the guest list",45,"client"],["Send the invitations",35,"client"],["Order the cake",21,"client"],["Hire the DJ or entertainment",21,"client"],["Plan the food and drinks",14,"planner",true],["Confirm RSVPs",7,"client"],["Pick up the decorations",2,"planner",true]]},
 corporate:{label:"Corporate event",items:[["Confirm goals, date and budget",120,"client"],["Book the venue",100,"client"],["Build the guest and speaker list",90,"client"],["Send save-the-dates",75,"client"],["Book the caterer",60,"client"],["Hire audio and video",45,"planner",true],["Open registration",45,"client"],["Finalize the agenda",21,"client"],["Print badges and signage",7,"planner",true],["Send the final run of show",3,"planner",true]]},
 baby:{label:"Baby shower",items:[["Choose a date and venue",60,"client"],["Make the guest list",45,"client"],["Send the invitations",30,"client"],["Plan the menu and the cake",21,"client"],["Pick the games and decorations",14,"planner",true],["Confirm RSVPs",7,"client"],["Set up the room",1,"planner",true]]}};
const clTplList=()=>Object.keys(D.ctpl||{}).map(k=>Object.assign({k},D.ctpl[k])).sort((a,b)=>(b.t||0)-(a.t||0));
const clTplItems=key=>{if(key.startsWith("s:")){const s=CL_STARTERS[key.slice(2)];return s?s.items.map(i=>({title:i[0],days:i[1],owner:i[2],show:starterShow(i)})):[]}const t=(D.ctpl||{})[key];return t?(t.items||[]):[]};
const starterShow=i=>i[2]==="client"?true:!!i[3];
function clDueFrom(date,days){if(!date||days==null||isNaN(+days))return "";const d=new Date(date+"T12:00:00");if(isNaN(d))return "";d.setDate(d.getDate()-Math.round(+days));return d.toISOString().slice(0,10)}
async function clApplyTpl(id,key,date){const items=clTplItems(key);if(!items.length)return 0;const u={},tm=Date.now();
 items.forEach((x,i)=>{u[RT(PSP+"clientTasks/"+id).push().key]={title:x.title,owner:x.owner||"client",due:clDueFrom(date,x.days),note:x.note||"",show:x.owner==="client"?true:!!x.show,done:false,t:tm+i}});
 await RT(PSP+"clientTasks/"+id).update(u);return items.length}
const clAps=id=>clList("caps",id).sort((a,b)=>(b.t||0)-(a.t||0));
const clApPending=id=>clAps(id).filter(a=>a.status==="pending").length;
const clApNew=id=>{const c=(D.clients||{})[id]||{};return clAps(id).filter(a=>a.status!=="pending"&&(a.decidedAt||0)>(c.plSeenAp||0)).length};
const clApLabel={pending:"Waiting for your reply",approved:"Approved",changes:"Changes requested"};
function clApHist(a){const h=Object.keys(a.hist||{}).map(k=>a.hist[k]).sort((x,y)=>(x.t||0)-(y.t||0));
 return h.length?`<div class="small muted aphist">${h.map(x=>`${{sent:"Sent",revised:"Revised version sent",approved:"Approved",changes:"Changes requested"}[x.s]||x.s} · ${clAgo(x.t||0)}${x.c?` · “${esc(x.c)}”`:""}`).join("<br>")}</div>`:""}
function clApCard(id,a,who){const pill=`<span class="pill ${a.status==="approved"?"ok":a.status==="changes"?"warn":"gold"}">${who==="client"?clApLabel[a.status]:{pending:"Waiting for the client",approved:"Approved",changes:"Changes requested"}[a.status]}</span>`;
 const file=a.fileId?`<button class="btn xs" data-act="clOpen" data-m="${id}" data-k="${a.fileId}">Open ${esc(a.fileName||"file")}</button>`:"";
 let act="";
 if(who==="client"&&a.status==="pending")act=`<textarea rows="2" data-draft="cl_ap_${a.k}" maxlength="500" placeholder="If you want changes, tell us what to fix">${esc(dv("cl_ap_"+a.k,""))}</textarea><div class="row"><button class="btn primary" data-act="clApprove" data-k="${a.k}">Approve</button><button class="btn" data-act="clChanges" data-k="${a.k}">Request changes</button></div>`;
 if(who==="planner"&&a.status!=="approved")act=`<div class="row"><button class="btn xs" data-act="clApRevise" data-m="${id}" data-k="${a.k}">${a.status==="changes"?"Send a revised version":"Send again"}${L.apFile?" with the new file":""}</button><button class="btn xs" data-act="clApDel" data-m="${id}" data-k="${a.k}">Delete</button></div>`;
 if(who==="planner"&&a.status==="approved")act=`<div class="row"><button class="btn xs" data-act="clApDel" data-m="${id}" data-k="${a.k}">Delete</button></div>`;
 return `<div class="card stack tight clap2"><div class="row between"><b>${esc(a.title)}${(a.version||1)>1?` <span class="muted small">v${a.version}</span>`:""}</b>${pill}</div>${a.note?`<div class="small">${esc(a.note)}</div>`:""}${file}${a.comment&&a.status==="changes"?`<div class="small"><b>${who==="client"?"You asked for":"Client asked for"}:</b> ${esc(a.comment)}</div>`:""}${clApHist(a)}${act}</div>`}
function clApprovalsView(id){const l=clAps(id);return `<section class="card stack"><h3>Approvals</h3><p class="small muted m0">Your planner sends menus, floor plans and designs here. Tap Approve, or ask for changes. Everything is recorded.</p></section>${l.map(a=>clApCard(id,a,"client")).join("")||'<section class="card"><p class="small muted m0">Nothing to approve right now.</p></section>'}`}

function clTplSelect(cur){const sel=k=>cur===k?"selected":"";return `<option value="">No template</option><optgroup label="Starters">${Object.keys(CL_STARTERS).map(k=>`<option value="s:${k}" ${sel("s:"+k)}>${CL_STARTERS[k].label} (${CL_STARTERS[k].items.length} items)</option>`).join("")}</optgroup>${clTplList().length?`<optgroup label="Your templates">${clTplList().map(t=>`<option value="${t.k}" ${sel(t.k)}>${esc(t.name)} (${(t.items||[]).length} items)</option>`).join("")}</optgroup>`:""}`}
function clTplCard(){const l=clTplList();return `<section class="card stack"><h3>Templates</h3><p class="small muted m0">Start every new client from a ready checklist: wedding, birthday, corporate or baby shower, or one you save yourself. Set the event date and the due dates fill in.</p>
 ${l.length?`<div class="stack tight">${l.map(t=>`<div class="row between small"><span><b>${esc(t.name)}</b> <span class="muted">· ${(t.items||[]).length} items</span></span><button class="btn xs" data-act="clTplDel" data-k="${t.k}">${L.confirm==="td"+t.k?"Tap again to delete":"Delete"}</button></div>`).join("")}</div>`:'<p class="small muted m0">Your own templates will show up here. Build a checklist for one client, then tap “Save as template” in their Checklist.</p>'}</section>`}

Object.assign(ACT,{
 clApAttach:async el=>{const id=L.cliOpen,f=el.files&&el.files[0];el.value="";if(!f||!id)return;if(f.size>CL_MAX)return toast("That file is over 10 MB");toast("Attaching…");
  try{const img=/^image\//.test(f.type);let data,thumb;if(img){data=(await clShrink(f,1800,.82)).data;thumb=(await clShrink(f,160,.7)).data}else data=await clReadURL(f);
   const k=await clSave(id,Object.assign({name:f.name.slice(0,80),kind:img?"photo":"doc",size:f.size,by:"planner",share:true},thumb?{thumb}:{}),data);L.apFile={k,name:f.name};render(true)}catch(e){toast("Couldn't attach that file")}},
 clApSend:async el=>{const id=el.dataset.m,title=dv("ap_title","").trim().slice(0,100);if(!title)return toast("Give it a title, like “Wedding menu”");
  const r=RT(PSP+"clientApprovals/"+id).push();await r.set({title,note:dv("ap_note","").trim().slice(0,400),fileId:L.apFile?L.apFile.k:"",fileName:L.apFile?L.apFile.name:"",status:"pending",version:1,t:Date.now(),hist:{h1:{s:"sent",t:Date.now()}}});
  ["ap_title","ap_note"].forEach(k=>delete L.drafts[k]);L.apFile=null;toast("Sent to the client for approval");render(true)},
 clApRevise:async el=>{const m=el.dataset.m,k=el.dataset.k,a=((D.caps||{})[m]||{})[k];if(!a)return;const hk=RT(PSP+`clientApprovals/${m}/${k}/hist`).push().key;
  const u={status:"pending",version:(a.version||1)+1,decidedAt:null,comment:"",by:null};if(L.apFile){u.fileId=L.apFile.k;u.fileName=L.apFile.name}
  await RT(PSP+`clientApprovals/${m}/${k}`).update(u);await RT(PSP+`clientApprovals/${m}/${k}/hist/${hk}`).set({s:"revised",t:Date.now()});L.apFile=null;toast("Sent again");render(true)},
 clApDel:async el=>{await RT(PSP+`clientApprovals/${el.dataset.m}/${el.dataset.k}`).remove();toast("Deleted")},
 clApprove:async el=>{const id=clKey(),k=el.dataset.k,hk=RT(PSP+`clientApprovals/${id}/${k}/hist`).push().key;
  await RT(PSP+`clientApprovals/${id}/${k}`).update({status:"approved",decidedAt:Date.now(),by:(D.cliMe||{}).name||"Client",comment:""});await RT(PSP+`clientApprovals/${id}/${k}/hist/${hk}`).set({s:"approved",t:Date.now()});delete L.drafts["cl_ap_"+k];toast("Approved. Thank you!");render(true)},
 clChanges:async el=>{const id=clKey(),k=el.dataset.k,c=dv("cl_ap_"+k,"").trim().slice(0,500);if(!c)return toast("Tell us what to change first");const hk=RT(PSP+`clientApprovals/${id}/${k}/hist`).push().key;
  await RT(PSP+`clientApprovals/${id}/${k}`).update({status:"changes",decidedAt:Date.now(),by:(D.cliMe||{}).name||"Client",comment:c});await RT(PSP+`clientApprovals/${id}/${k}/hist/${hk}`).set({s:"changes",c,t:Date.now()});delete L.drafts["cl_ap_"+k];toast("Sent to your planner");render(true)},
 clTplApply:async el=>{const id=el.dataset.m,key=dv("tpl_apply_"+id,"");if(!key)return toast("Pick a template first");const c=(D.clients||{})[id]||{};const n=await clApplyTpl(id,key,c.date||"");toast(n?`${n} items added`:"That template is empty");render(true)},
 clTplSave:async el=>{const id=el.dataset.m,name=dv("tpl_name_"+id,"").trim().slice(0,50);if(!name)return toast("Name the template first");const c=(D.clients||{})[id]||{},l=clTasksOf(id,true);if(!l.length)return toast("Add some checklist items first");
  const items=l.map(x=>{const o={title:x.title,owner:x.owner,note:x.note||"",show:!!x.show};if(x.due&&c.date){const d=Math.round((new Date(c.date+"T12:00:00")-new Date(x.due+"T12:00:00"))/864e5);if(!isNaN(d))o.days=d}return o});
  await RT(PSP+"clientTemplates").push().set({name,items,t:Date.now()});delete L.drafts["tpl_name_"+id];toast("Saved as a template");render(true)},
 clTplDel:async el=>{const k=el.dataset.k;if(L.confirm!=="td"+k){L.confirm="td"+k;return render(true)}L.confirm=null;await RT(PSP+"clientTemplates/"+k).remove();toast("Template deleted")},
 clSetDate:async el=>{await RT(PSP+"clients/"+el.dataset.m+"/date").set(el.value||"");toast(el.value?"Event date saved":"Date cleared")}
});

/* ================= STEP 4: payments view, shared calendar, vendor contacts, weekly summary =================
   partygames/clientPayments/{cid}/{id} = {title, amount, due, paid, paidAt, note, t}      (tracked only: the app never moves money)
   partygames/clientDates/{cid}/{id}    = {title, date, time, note, t}
   partygames/clientVendors/{cid}/{id}  = {name, role, phone, email, arrive, delivers, note, show, team, t} */
D.cpay={};D.cdates={};D.cven={};
const clMoney=n=>"$"+(+n||0).toLocaleString(undefined,{minimumFractionDigits:(+n||0)%1?2:0,maximumFractionDigits:2});
const clPays=id=>clList("cpay",id).sort((a,b)=>(a.paid?1:0)-(b.paid?1:0)||String(a.due||"9999").localeCompare(String(b.due||"9999"))||(a.t||0)-(b.t||0));
const clPayStats=id=>{const l=clPays(id),sum=a=>a.reduce((n,x)=>n+(+x.amount||0),0),paid=sum(l.filter(x=>x.paid)),left=sum(l.filter(x=>!x.paid));return {total:paid+left,paid,left,late:l.filter(x=>!x.paid&&x.due&&x.due<mateToday()).length}};
const clDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const clPayDue=id=>clPays(id).filter(x=>!x.paid&&x.due&&x.due<=clDays(7));
const clDates=id=>clList("cdates",id).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time||"").localeCompare(String(b.time||"")));
const clVendors=(id,forClient)=>clList("cven",id).filter(v=>!forClient||v.show).sort((a,b)=>String(a.arrive||"99").localeCompare(String(b.arrive||"99"))||String(a.name).localeCompare(String(b.name)));
const clFmtDate=d=>{if(!d)return "";const t=new Date(d+"T12:00:00");return isNaN(t)?d:t.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"})};
const clFmtTime=t=>{if(!t)return "";const [h,m]=t.split(":").map(Number);if(isNaN(h))return t;return (h%12||12)+":"+String(m||0).padStart(2,"0")+" "+(h<12?"AM":"PM")};
/* one timeline for the client: planner's key dates, their own visible checklist due dates, and payments due */
function clTimeline(id){const out=[];clDates(id).forEach(d=>out.push({k:"d"+d.k,date:d.date,time:d.time||"",title:d.title,note:d.note||"",type:"date"}));
 clTasksOf(id).filter(x=>x.due&&!x.done).forEach(x=>out.push({k:"t"+x.k,date:x.due,time:"",title:x.title,note:x.owner==="client"?"Your task":"Your planner",type:"task"}));
 clPays(id).filter(x=>!x.paid&&x.due).forEach(x=>out.push({k:"p"+x.k,date:x.due,time:"",title:"Payment due: "+x.title,note:clMoney(x.amount),type:"pay"}));
 return out.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time).localeCompare(String(b.time)))}
const icsEsc=s=>String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
function clIcs(items,cal){const L2=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Host Mode//EN","CALSCALE:GREGORIAN","X-WR-CALNAME:"+icsEsc(cal||"Event")];const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
 items.forEach((x,i)=>{const d=String(x.date).replace(/-/g,"");L2.push("BEGIN:VEVENT","UID:hm-"+i+"-"+d+"-"+(x.k||i)+"@hostmode","DTSTAMP:"+stamp,"SUMMARY:"+icsEsc(x.title));
  if(x.time){const hm=x.time.replace(":","");L2.push("DTSTART:"+d+"T"+hm+"00","DURATION:PT1H")}else{const n=new Date(x.date+"T12:00:00");n.setDate(n.getDate()+1);L2.push("DTSTART;VALUE=DATE:"+d,"DTEND;VALUE=DATE:"+n.toISOString().slice(0,10).replace(/-/g,""))}
  if(x.note)L2.push("DESCRIPTION:"+icsEsc(x.note));L2.push("END:VEVENT")});L2.push("END:VCALENDAR");return L2.join("\r\n")}
function clDownload(name,text,type){const a=document.createElement("a"),u=URL.createObjectURL(new Blob([text],{type:type||"text/plain"}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}

/* ---- this week's summary (shown in the portal, and the planner can post it to Messages) ---- */
function clSummary(id){const wk=Date.now()-7*864e5,l=clTasksOf(id);
 return {done:l.filter(x=>x.done&&(x.doneAt||0)>wk),soon:l.filter(x=>!x.done&&x.due&&x.due<=clDays(14)).slice(0,6),pay:clPays(id).filter(x=>!x.paid&&x.due&&x.due<=clDays(14)),paidWk:clPays(id).filter(x=>x.paid&&(x.paidAt||0)>wk),waiting:clApPending(id),mine:l.filter(x=>!x.done&&x.owner==="client").length}}
function clSummaryText(id,note){const s=clSummary(id),c=(D.clients||{})[id]||{},p=[];p.push(`This week for ${c.evName||"your event"}:`);
 p.push(s.done.length?`✓ Done (${s.done.length}): ${s.done.map(x=>x.title).join(", ")}.`:"✓ No checklist items were finished this week.");
 if(s.paidWk.length)p.push(`✓ Payments received: ${s.paidWk.map(x=>x.title+" "+clMoney(x.amount)).join(", ")}.`);
 if(s.soon.length)p.push(`Coming up: ${s.soon.map(x=>x.title+" ("+mateDue(x.due)+")").join(", ")}.`);
 if(s.pay.length)p.push(`Payments due soon: ${s.pay.map(x=>x.title+" "+clMoney(x.amount)+" ("+mateDue(x.due)+")").join(", ")}.`);
 if(s.waiting)p.push(`Waiting on you: ${s.waiting} approval${s.waiting===1?"":"s"}.`);
 if(note)p.push(note);return p.join("\n")}
function clWeekCard(id){const s=clSummary(id);if(!s.done.length&&!s.soon.length&&!s.pay.length&&!s.waiting)return "";
 return `<section class="card stack"><h3>This week</h3><div class="small stack tight">${s.done.length?`<div>✓ <b>${s.done.length}</b> thing${s.done.length===1?"":"s"} finished: ${s.done.map(x=>esc(x.title)).join(", ")}</div>`:""}${s.paidWk.length?`<div>✓ Payments received: ${s.paidWk.map(x=>esc(x.title)).join(", ")}</div>`:""}${s.soon.length?`<div>Next up: ${s.soon.map(x=>esc(x.title)).join(", ")}</div>`:""}${s.pay.length?`<div>Payments coming due: ${s.pay.map(x=>esc(x.title)+" "+clMoney(x.amount)).join(", ")}</div>`:""}${s.waiting?`<div>Waiting on you: ${s.waiting} approval${s.waiting===1?"":"s"}</div>`:""}</div></section>`}

/* ---- client: the Plan tab ---- */
function clPlanView(id){const tl=clTimeline(id),ps=clPays(id),st5=clPayStats(id),vs=clVendors(id,true);
 return `<section class="card stack"><div class="row between"><h3>Key dates</h3>${tl.length?`<button class="btn xs" data-act="clIcsAll">Add all to my calendar</button>`:""}</div>
 ${tl.length?`<div class="stack tight">${tl.map(x=>`<div class="row between small clrow"><span class="mw0"><b>${esc(clFmtDate(x.date))}</b>${x.time?` · ${esc(clFmtTime(x.time))}`:""}<span class="db">${esc(x.title)}${x.note?` <span class="muted">· ${esc(x.note)}</span>`:""}</span></span><button class="btn xs" data-act="clIcsOne" data-k="${x.k}" aria-label="Add to calendar">+ 📅</button></div>`).join("")}</div>`:'<p class="small muted m0">Dates your planner adds will show up here.</p>'}</section>
 ${invClientCard(id)}
 <section class="card stack"><h3>Payments</h3>${ps.length?`<div class="row between small"><span>Paid <b>${clMoney(st5.paid)}</b></span><span>Still to pay <b>${clMoney(st5.left)}</b></span><span class="muted">of ${clMoney(st5.total)}</span></div>${mateBar(st5.total?Math.round(st5.paid/st5.total*100):0)}
 <div class="stack tight">${ps.map(x=>`<div class="row between small clrow ${x.paid?"done":""}"><span class="mw0"><b>${esc(x.title)}</b><span class="db ${!x.paid&&x.due&&x.due<mateToday()?"bad":"muted"}">${x.paid?"Paid"+(x.paidAt?" · "+esc(clAgo(x.paidAt)):""):x.due?(x.due<mateToday()?"Overdue · ":"Due ")+esc(clFmtDate(x.due)):"No due date"}${x.note?" · "+esc(x.note):""}</span></span><b>${clMoney(x.amount)}</b></div>`).join("")}</div>
 <p class="small muted m0">This page only keeps track. Payments are made directly to each vendor.</p>`:'<p class="small muted m0">No payments are being tracked yet.</p>'}</section>
 <section class="card stack"><h3>Your vendors</h3>${vs.length?`<div class="stack tight">${vs.map(clVendorRow).join("")}</div>`:'<p class="small muted m0">Your planner will add your DJ, caterer and other vendors here.</p>'}</section>`}
function clVendorRow(v){return `<div class="clrow small"><b>${esc(v.name)}</b>${v.role?` <span class="muted">· ${esc(v.role)}</span>`:""}<div class="muted">${v.arrive?`Arrives ${esc(clFmtTime(v.arrive))}`:""}${v.arrive&&v.delivers?" · ":""}${esc(v.delivers||"")}</div><div>${v.phone?`<a href="tel:${esc(String(v.phone).replace(/[^+\d]/g,""))}">${esc(v.phone)}</a>`:""}${v.phone&&v.email?" · ":""}${v.email?`<a href="mailto:${esc(v.email)}">${esc(v.email)}</a>`:""}</div>${v.note?`<div class="muted">${esc(v.note)}</div>`:""}</div>`}

/* ---- planner: Money, Dates, Vendors tabs inside a client ---- */
function clPlanMoney(id){const l=clPays(id),s5=clPayStats(id);return `${l.length?`<div class="row between small"><span>Paid <b>${clMoney(s5.paid)}</b></span><span>Left <b>${clMoney(s5.left)}</b></span>${s5.late?`<span class="bad">${s5.late} overdue</span>`:""}</div>`:""}
 <div class="stack tight">${l.map(x=>`<div class="row between small mrow2 ${x.paid?"done":""}"><span class="mw0"><button class="btn xs" data-act="clPayTick" data-m="${id}" data-k="${x.k}" aria-label="${x.paid?"Mark unpaid":"Mark paid"}">${x.paid?"✓":"○"}</button> <b>${esc(x.title)}</b> ${clMoney(x.amount)}${x.due?` <span class="${!x.paid&&x.due<mateToday()?"bad":"muted"}">· ${esc(mateDue(x.due))}</span>`:""}</span><button class="btn xs" data-act="clPayDel" data-m="${id}" data-k="${x.k}" aria-label="Delete">×</button></div>`).join("")||'<span class="small muted">No payments yet.</span>'}</div>
 <div class="grid2 g8"><label class="stack tight" style="grid-column:1/-1"><span class="small">What it's for</span><input type="text" data-draft="pay_title" maxlength="80" value="${esc(dv("pay_title",""))}" placeholder="Caterer deposit"></label>
 <label class="stack tight"><span class="small">Amount ($)</span><input type="text" inputmode="decimal" data-draft="pay_amt" value="${esc(dv("pay_amt",""))}" placeholder="500"></label><label class="stack tight"><span class="small">Due (optional)</span><input type="date" data-draft="pay_due" value="${esc(dv("pay_due",""))}"></label></div>
 <button class="btn primary as" data-act="clPayAdd" data-m="${id}">Add payment</button><p class="small muted m0">Tracking only. The app never takes or sends money.</p>`}
function clPlanDates(id){const l=clDates(id);return `<div class="stack tight">${l.map(x=>`<div class="row between small mrow2"><span class="mw0"><b>${esc(mateDue(x.date))}</b>${x.time?" "+esc(clFmtTime(x.time)):""} ${esc(x.title)}${x.note?` <span class="muted">· ${esc(x.note)}</span>`:""}</span><button class="btn xs" data-act="clDateDel" data-m="${id}" data-k="${x.k}" aria-label="Delete">×</button></div>`).join("")||'<span class="small muted">No dates yet. Add the tasting, the headcount deadline, the day-of schedule.</span>'}</div>
 <div class="grid2 g8"><label class="stack tight" style="grid-column:1/-1"><span class="small">What's happening</span><input type="text" data-draft="dt_title" maxlength="80" value="${esc(dv("dt_title",""))}" placeholder="Menu tasting"></label>
 <label class="stack tight"><span class="small">Date</span><input type="date" data-draft="dt_date" value="${esc(dv("dt_date",""))}"></label><label class="stack tight"><span class="small">Time (optional)</span><input type="time" data-draft="dt_time" value="${esc(dv("dt_time",""))}"></label>
 <label class="stack tight" style="grid-column:1/-1"><span class="small">Note (optional)</span><input type="text" data-draft="dt_note" maxlength="140" value="${esc(dv("dt_note",""))}" placeholder="Bring your guest count"></label></div>
 <button class="btn primary as" data-act="clDateAdd" data-m="${id}">Add date</button><p class="small muted m0">The client's calendar also lists their checklist due dates and payments, with “add to my calendar” buttons.</p>`}
function clPlanVendors(id){const l=clVendors(id);return `<div class="stack tight">${l.map(v=>`<div class="row between mrow2"><div class="mw0">${clVendorRow(v)}<div class="row small"><button class="btn xs" data-act="clVenFlag" data-m="${id}" data-k="${v.k}" data-f="show">${v.show?"👁 client sees":"hidden from client"}</button><button class="btn xs" data-act="clVenFlag" data-m="${id}" data-k="${v.k}" data-f="team">${v.team?"👥 teammates see":"not shared with teammates"}</button><button class="btn xs ${v.tok?"":"primary"}" data-act="vpToggle" data-m="${id}" data-k="${v.k}">${v.tok?"📱 Vendor page":"Make a vendor page"}</button>${v.tok&&((D.vchk||{})[v.tok]||{}).here?'<span class="pill ok">Checked in</span>':""}${v.tok&&vpIssues((D.vchk||{})[v.tok]||{}).some(i=>!i.ok)?'<span class="pill warn">Flagged a problem</span>':""}</div>${L.vpOpen===id+"|"+v.k?vpEditor(id,v):""}</div><button class="btn xs" data-act="clVenDel" data-m="${id}" data-k="${v.k}" aria-label="Delete">×</button></div>`).join("")||'<span class="small muted">No vendors yet.</span>'}</div>
 <div class="grid2 g8"><label class="stack tight"><span class="small">Name</span><input type="text" data-draft="vn_name" maxlength="60" value="${esc(dv("vn_name",""))}" placeholder="DJ Marcus"></label><label class="stack tight"><span class="small">Role</span><input type="text" data-draft="vn_role" maxlength="40" value="${esc(dv("vn_role",""))}" placeholder="DJ"></label>
 <label class="stack tight"><span class="small">Phone</span><input type="tel" data-draft="vn_phone" maxlength="30" value="${esc(dv("vn_phone",""))}"></label><label class="stack tight"><span class="small">Email</span><input type="email" data-draft="vn_email" maxlength="80" value="${esc(dv("vn_email",""))}"></label>
 <label class="stack tight"><span class="small">Arrives at</span><input type="time" data-draft="vn_arrive" value="${esc(dv("vn_arrive",""))}"></label><label class="stack tight"><span class="small">Bringing</span><input type="text" data-draft="vn_delivers" maxlength="80" value="${esc(dv("vn_delivers",""))}" placeholder="Speakers and lights"></label></div>
 <button class="btn primary as" data-act="clVenAdd" data-m="${id}">Add vendor</button><p class="small muted m0">New vendors are shown to the client and your teammates. Change that with the buttons above.</p>`}
function clSummaryBox(id){const note=dv("sum_note_"+id,"");return `<div class="card stack tight"><b>This week's summary</b><div class="small" style="white-space:pre-wrap">${esc(clSummaryText(id,note))}</div><textarea rows="2" data-draft="sum_note_${id}" maxlength="300" placeholder="Add a personal note (optional)">${esc(note)}</textarea><button class="btn sm primary as" data-act="clSummarySend" data-m="${id}">Post to the client's messages</button><span class="small muted">The client also sees this week's progress on their Overview. Email delivery needs an email service, which isn't set up yet.</span></div>`}

Object.assign(ACT,{
 clPayAdd:async el=>{const id=el.dataset.m,t=dv("pay_title","").trim().slice(0,80),a=parseFloat(String(dv("pay_amt","")).replace(/[$,\s]/g,""));if(!t)return toast("What is the payment for?");if(isNaN(a)||a<0)return toast("Type an amount, like 500");
  await RT(PSP+"clientPayments/"+id).push().set({title:t,amount:a,due:dv("pay_due",""),paid:false,t:Date.now()});["pay_title","pay_amt","pay_due"].forEach(k=>delete L.drafts[k]);toast("Payment added");render(true)},
 clPayTick:async el=>{const m=el.dataset.m,k=el.dataset.k,x=((D.cpay||{})[m]||{})[k]||{};await RT(PSP+`clientPayments/${m}/${k}`).update({paid:!x.paid,paidAt:x.paid?null:Date.now()})},
 clPayDel:async el=>{await RT(PSP+`clientPayments/${el.dataset.m}/${el.dataset.k}`).remove()},
 clDateAdd:async el=>{const id=el.dataset.m,t=dv("dt_title","").trim().slice(0,80),d=dv("dt_date","");if(!t)return toast("What's happening?");if(!d)return toast("Pick a date");
  await RT(PSP+"clientDates/"+id).push().set({title:t,date:d,time:dv("dt_time",""),note:dv("dt_note","").trim().slice(0,140),t:Date.now()});["dt_title","dt_date","dt_time","dt_note"].forEach(k=>delete L.drafts[k]);toast("Date added");render(true)},
 clDateDel:async el=>{await RT(PSP+`clientDates/${el.dataset.m}/${el.dataset.k}`).remove()},
 clVenAdd:async el=>{const id=el.dataset.m,n=dv("vn_name","").trim().slice(0,60);if(!n)return toast("Type the vendor's name");
  await RT(PSP+"clientVendors/"+id).push().set({name:n,role:dv("vn_role","").trim().slice(0,40),phone:dv("vn_phone","").trim().slice(0,30),email:dv("vn_email","").trim().slice(0,80),arrive:dv("vn_arrive",""),delivers:dv("vn_delivers","").trim().slice(0,80),show:true,team:true,t:Date.now()});
  ["vn_name","vn_role","vn_phone","vn_email","vn_arrive","vn_delivers"].forEach(k=>delete L.drafts[k]);toast("Vendor added");render(true)},
 clVenFlag:async el=>{const m=el.dataset.m,k=el.dataset.k,f=el.dataset.f,v=((D.cven||{})[m]||{})[k]||{};await RT(PSP+`clientVendors/${m}/${k}/${f}`).set(!v[f])},
 clVenDel:async el=>{const v=((D.cven||{})[el.dataset.m]||{})[el.dataset.k]||{};await RT(PSP+`clientVendors/${el.dataset.m}/${el.dataset.k}`).remove();if(v.tok)RT(PSP+"vcheck/"+v.tok).remove().catch(()=>{});vpSyncSoon()},
 clSummarySend:async el=>{const id=el.dataset.m,note=dv("sum_note_"+id,"").trim();await RT(PSP+"clientMsgs/"+id).push().set({from:"planner",text:clSummaryText(id,note),t:Date.now()});await RT(PSP+`clients/${id}/plSeen`).set(Date.now());delete L.drafts["sum_note_"+id];toast("Posted to the client's messages");render(true)},
 clIcsOne:el=>{const id=clKey(),x=clTimeline(id).find(i=>i.k===el.dataset.k);if(!x)return;clDownload("event.ics",clIcs([x],(D.cliMe||{}).evName),"text/calendar")},
 clIcsAll:()=>{const id=clKey(),tl=clTimeline(id);if(!tl.length)return;clDownload("event-calendar.ics",clIcs(tl,(D.cliMe||{}).evName),"text/calendar")}
});

/* ================= STEP 5: planner branding + teammate day-of mode =================
   partygames/brand = {name, color, logo, font}      (logo = small PNG data URL; shown on client and teammate portals; font = display font, one of DISPLAY_FONTS)
   partygames/dayOf = true | false             (planner's switch: teammates see the stripped "do now" view)
   partygames/mates/{id}/help = {t, msg, ok}   (teammate tapped "Need help") */
D.brand=null;D.dayOf=false;
const brandOn=(v=VIEW)=>(v==="client"||v==="mate"||v==="fb"||v==="show")&&D.brand&&(D.brand.name||D.brand.logo||D.brand.color||D.brand.font);
const brandFont=f=>DISPLAY_FONTS.includes(f)?f:"";
/* the planner's display font, applied to the brand screens' headings through
   --f-brand (css/games.css, default Cormorant Garamond). The dynamic font
   link must also keep Montserrat, which --f-caps still points at. */
function brandFontApply(f){loadFonts({title:f,head:"Montserrat",body:"Figtree"});document.documentElement.style.setProperty("--f-brand",`"${f}",Georgia,serif`)}
const brandHex=c=>/^#[0-9a-f]{6}$/i.test(c||"")?c.toLowerCase():"";
function brandLum(h){const n=parseInt(h.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16)+.7152*f(n>>8&255)+.0722*f(n&255)}
function brandMix(h,to,p){const a=parseInt(h.slice(1),16),b=parseInt(to.slice(1),16),m=(x,y)=>Math.round(x+(y-x)*p);return "#"+[m(a>>16,b>>16),m(a>>8&255,b>>8&255),m(a&255,b&255)].map(v=>v.toString(16).padStart(2,"0")).join("")}
/* a colour too light for white button text gets darkened until it reads */
function brandSafe(h){h=brandHex(h);if(!h)return "";let i=0;while(brandLum(h)>.18&&i++<12)h=brandMix(h,"#000000",.12);return h}
const _applyThemeBr2=applyTheme;
applyTheme=function(){_applyThemeBr2();if(!brandOn()){document.documentElement.style.removeProperty("--f-brand");return}
 const c=brandSafe(D.brand.color),f=brandFont(D.brand.font);
 if(c)setThemeVars(Object.assign({},BRAND.colors,{bar:brandMix(c,"#000000",.25),hd:c,btn1:c,btn2:brandMix(c,"#ffffff",.25),violet:c}),BRAND.fonts,true);
 if(f)brandFontApply(f);else document.documentElement.style.removeProperty("--f-brand")};
const _headerView5=headerView;
headerView=function(){const h=_headerView5();if(!brandOn())return h;const b=D.brand,name=esc(b.name||"");
 return h.replace("<h1>Host Mode</h1>",`<h1 class="brandrow">${b.logo?`<img class="brandlogo" src="${esc(b.logo)}" alt="">`:""}${name||(b.logo?"":"Host Mode")}</h1>`).replace(/<p>(Your event portal|Your tasks)<\/p>/,'<p>$1 · powered by Host Mode</p>')};
function brandLogo(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej();fr.onload=()=>{const img=new Image();img.onerror=()=>rej();img.onload=()=>{const k=Math.min(1,240/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*k));c.height=Math.max(1,Math.round(img.height*k));c.getContext("2d").drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/png"))};img.src=fr.result};fr.readAsDataURL(file)})}
const BR_KEYS=["name","color","font","tag","email","phone","web","city","ig","fb","book"];
function hBrandCard(){const b=D.brand||{},v=(k,d)=>dv("br_"+k,b[k]||d||""),c=brandHex(v("color","#0f2c5c"))||"#0f2c5c",fnt=brandFont(v("font","")),lg=L.brLogo!==undefined?L.brLogo:b.logo||"";
 const fld=(k,l,ph,tp,mx)=>`<label class="stack tight"><span class="small">${l}</span><input type="${tp||"text"}" data-draft="br_${k}" maxlength="${mx||80}" value="${esc(v(k))}" placeholder="${esc(ph)}"></label>`;
 const pv={name:v("name"),tag:v("tag"),city:v("city"),phone:v("phone"),email:v("email"),web:v("web"),ig:v("ig").replace(/^@/,""),fb:v("fb")},links=brLinks(pv);
 return `<section class="card stack"><h2>Your branding</h2><p class="small muted m0">This is how your business shows up to clients: on their portal, your teammates' pages and every invoice. “Powered by Host Mode” stays in small print.</p>
 <h3 class="m0">Look</h3><div class="grid2 g8">${fld("name","Business name","Bright Day Events","text",40)}${fld("tag","Tagline","Charlotte weddings and celebrations","text",80)}</div>
 <div class="row"><label class="stack tight"><span class="small">Main color</span><input type="color" data-draft="br_color" value="${esc(c)}" style="width:64px;padding:2px"></label>
 <label class="btn upl">${lg?"Change logo":"Add logo"}<input type="file" accept="image/*" data-act="brLogo"></label>${lg?`<img class="brandlogo" src="${esc(lg)}" alt="Your logo"><button class="btn xs" data-act="brLogoX">Remove logo</button>`:""}</div>
 <label class="stack tight"><span class="small">Display font</span><select data-draft="br_font"><option value="">Default (Cormorant Garamond)</option>${DISPLAY_FONTS.map(f=>`<option value="${f}" ${fnt===f?"selected":""} style="font-family:'${f}'">${f}</option>`).join("")}</select><span class="small muted">Headings on client portals, teammate pages and invoices use this font. Body text stays Figtree.</span></label>
 <h3 class="m0">Contact details</h3><p class="small muted m0">Clients see these on their portal and on your invoices. Leave out anything you don't want to share.</p>
 <div class="grid2 g8">${fld("email","Email","hello@brightday.com","email",120)}${fld("phone","Phone","704-555-0100","tel",30)}${fld("web","Website","brightdayevents.com","text",120)}${fld("city","City","Charlotte, NC","text",60)}${fld("ig","Instagram","@brightdayevents","text",40)}${fld("fb","Facebook page","brightdayevents","text",120)}</div>
 <h3 class="m0">Booking link</h3><p class="small muted m0">Paste your Calendly or Google Calendar booking link. Clients see a "Book a meeting" button on their portal and your Showcase page.</p><div class="grid2 g8">${fld("book","Booking link","calendly.com/brightday/consult","text",200)}</div>
 <h3 class="m0">Preview</h3><div style="border-radius:14px;overflow:hidden;border:1px solid var(--line)"><div style="background:${c};height:10px"></div><div class="stack tight" style="padding:14px 16px;background:#fff;color:#1d2433">
  <div class="row">${lg?`<img class="brandlogo" src="${esc(lg)}" alt="">`:""}<div class="mw0"><b style="color:${c};font-size:18px;font-family:'${fnt||"Cormorant Garamond"}',Georgia,serif">${esc(pv.name||"Your business name")}</b>${pv.tag?`<div class="small" style="color:#5a6072">${esc(pv.tag)}</div>`:""}${pv.city?`<div class="small" style="color:#5a6072">${esc(pv.city)}</div>`:""}</div></div>
  ${links.length?`<div class="small" style="color:#33415c">${links.map(([,l])=>esc(l)).join(" · ")}</div>`:`<div class="small" style="color:#8a90a0">Your contact details will show here.</div>`}</div></div>
 <span class="small muted">The preview updates when you save.</span>
 <div class="row"><button class="btn primary" data-act="brSave">Save branding</button>${b.name||b.logo||b.color?`<button class="btn" data-act="brClear">Back to Host Mode look</button>`:""}</div></section>`}
const _hClients5=hClients;


/* ---- teammate day-of mode ---- */
const mateDayOn=()=>!!D.dayOf&&L.mateFull!==true;
function mateDayView(id,me){const l=mateTasksOf(id).filter(x=>!x.done),now=l[0],next=l.slice(1,4),help=me.help&&!me.help.ok;
 return `<section class="card stack tc"><div class="eyebrow">Today · ${esc(me.name||"")}</div>
 ${now?`<h2 class="dayNow">${esc(now.title)}</h2>${now.evName?`<div class="small muted">${esc(now.evName)}</div>`:""}${now.note?`<p class="m0">${esc(now.note)}</p>`:""}<button class="btn primary daybtn" data-act="mateDone" data-k="${now.k}">Done ✓</button>`:`<h2>All done. Thank you!</h2><p class="muted m0">Nothing left on your list.</p>`}</section>
 ${next.length?`<section class="card stack"><h3>Up next</h3><div class="stack tight">${next.map(x=>`<div class="small"><b>${esc(x.title)}</b>${x.note?` <span class="muted">· ${esc(x.note)}</span>`:""}</div>`).join("")}</div>${l.length>4?`<span class="small muted">and ${l.length-4} more</span>`:""}</section>`:""}
 <section class="card stack">${help?`<p class="m0"><b>Help is requested.</b> Your planner has been told.</p><button class="btn" data-act="mateHelpX">Cancel</button>`:`<button class="btn dayhelp" data-act="mateHelp">🆘 I need help</button>`}</section>
 ${mateVendorsCard(id)}
 <p class="small tc"><button class="btn xs" data-act="mateFull">Show my full list</button></p>`}
const _mateView5=mateView;
mateView=function(){const id=mateKey();if(id&&L.loaded&&D.mateMe&&mateDayOn())return mateDayView(id,D.mateMe);
 const h=_mateView5();return D.dayOf&&L.mateFull&&D.mateMe?h+`<p class="small tc"><button class="btn xs" data-act="mateFull">Back to day-of view</button></p>`:h};
function hHelpBanner(){const ms=D.mates||{},ids=Object.keys(ms).filter(id=>ms[id].help&&!ms[id].help.ok);if(!ids.length)return "";
 return ids.map(id=>`<section class="banner"><span><b>${esc(ms[id].name)} needs help.</b> ${esc(ms[id].help.msg||"")} <span class="muted">${esc(clAgo(ms[id].help.t))}</span></span><button class="btn xs primary" data-act="mateHelpOk" data-k="${id}">On it</button></section>`).join("")}
function hDayOfCard(){return `<section class="card stack"><div class="row between"><div class="mw0"><h3>Day-of mode</h3><div class="small muted">${D.dayOf?"On. Teammates see one big task at a time with a Done button and a help button.":"Off. Turn it on at the event so teammates see a simple “do this now” screen."}</div></div><button class="btn sm ${D.dayOf?"":"primary"}" data-act="dayOfToggle">${D.dayOf?"Turn off":"Turn on"}</button></div></section>`}
const _hTeam5=hTeam;
hTeam=function(){return hHelpBanner()+hDayOfCard()+_hTeam5()};
const _tabTeam=null;

Object.assign(ACT,{
 brLogo:async el=>{const f=el.files&&el.files[0];if(!f)return;try{L.brLogo=await brandLogo(f);render(true)}catch(e){toast("That file isn't a picture we can read")}},
 brLogoX:()=>{L.brLogo="";render(true)},
 brSave:async()=>{const b=D.brand||{},g=(k,n)=>String(dv("br_"+k,b[k]||"")).trim().slice(0,n),name=g("name",40),color=brandHex(dv("br_color",b.color||"")),logo=L.brLogo!==undefined?L.brLogo:b.logo||"";
  if(logo.length>120000)return toast("That logo is too big. Try a simpler picture.");
  const email=g("email",120);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast("That email doesn't look right");
  const ig=g("ig",40).replace(/^https?:\/\/(www\.)?instagram\.com\//i,"").replace(/^@/,"").replace(/\/.*$/,"");
  await RT(PSP+"brand").set({name,color,font:brandFont(dv("br_font",b.font||"")),logo,tag:g("tag",80),email,phone:g("phone",30),web:g("web",120),city:g("city",60),ig,fb:g("fb",120),book:g("book",200)});L.brLogo=undefined;BR_KEYS.forEach(k=>delete L.drafts["br_"+k]);toast("Branding saved");render(true)},
 brClear:async()=>{await RT(PSP+"brand").remove();L.brLogo=undefined;BR_KEYS.forEach(k=>delete L.drafts["br_"+k]);toast("Back to the Host Mode look");render(true)},
 dayOfToggle:async()=>{const on=!D.dayOf;await RT(PSP+"dayOf").set(on);toast(on?"Day-of mode is on":"Day-of mode is off")},
 mateDone:async el=>{const id=mateKey(),k=el.dataset.k;await RT(PSP+`mateTasks/${id}/${k}`).update({done:true,doneAt:Date.now(),by:"mate"});buzz(30)},
 mateHelp:async()=>{const id=mateKey();await RT(PSP+"mates/"+id+"/help").set({t:Date.now(),msg:"Needs help now",ok:false});buzz(40);toast("Your planner has been told")},
 mateHelpX:async()=>{await RT(PSP+"mates/"+mateKey()+"/help").remove()},
 mateHelpOk:async el=>{await RT(PSP+"mates/"+el.dataset.k+"/help/ok").set(true);toast("Marked as handled")},
 mateFull:()=>{L.mateFull=!L.mateFull;render(true)}
});

/* ================= STEP 6: after-event feedback =================
   partygames/feedback/{key}/{id} = {who:"guest"|"client", name, rating:1-5, best, better, ok, quote, t}
   key = the event code (or the client's id when the client has no event). Guests use games.html?fb=CODE;
   clients get the same form on their portal Overview. "ok" = the person said we may quote them by name; "quote" = the planner chose to feature it. */
D.fbk={};D.fbEv=null;
const fbKeyQ=()=>(new URLSearchParams(location.search).get("fb")||"").toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,40);
function fbLink(key){return location.origin+location.pathname.replace(/[^/]*$/,"")+"games.html?fb="+encodeURIComponent(key)+(PLID()?"&p="+encodeURIComponent(PLID()):"")}
const fbList=key=>{const o=(D.fbk||{})[key]||{};return Object.keys(o).map(k=>Object.assign({k},o[k])).sort((a,b)=>(b.t||0)-(a.t||0))};
const fbAvg=l=>l.length?Math.round(l.reduce((n,x)=>n+(+x.rating||0),0)/l.length*10)/10:0;
const fbStars=n=>"★".repeat(n)+"☆".repeat(5-n);
function fbConnect(){const k=fbKeyQ();if(!k){L.loaded=true;renderSoon();return}
 RT(PSP+"brand").on("value",s=>{D.brand=s.val();applyTheme();renderSoon()});
 RT("index/"+k).once("value").then(s=>{D.fbEv=s.val();L.loaded=true;renderSoon()}).catch(()=>{L.loaded=true;renderSoon()})}
function fbForm(key,who,name){const r=+dv("fb_rating_"+key,0);
 return `<div class="stack"><div class="stack tight"><span class="small">How was it?</span><div class="row fbstars" role="group" aria-label="Rating">${[1,2,3,4,5].map(n=>`<button class="btn ${r>=n?"primary":""}" data-act="fbRate" data-key="${esc(key)}" data-v="${n}" aria-label="${n} star${n>1?"s":""}" aria-pressed="${r===n}">★</button>`).join("")}</div></div>
 <label class="stack tight"><span class="small">What was the best part?</span><textarea rows="2" maxlength="400" data-draft="fb_best_${esc(key)}">${esc(dv("fb_best_"+key,""))}</textarea></label>
 <label class="stack tight"><span class="small">What could be better? (optional)</span><textarea rows="2" maxlength="400" data-draft="fb_better_${esc(key)}">${esc(dv("fb_better_"+key,""))}</textarea></label>
 ${who==="guest"?`<label class="stack tight"><span class="small">Your name (optional)</span><input type="text" maxlength="40" data-draft="fb_name_${esc(key)}" value="${esc(dv("fb_name_"+key,""))}"></label>`:""}
 <label class="row small"><input type="checkbox" data-draft="fb_ok_${esc(key)}" ${dv("fb_ok_"+key,false)?"checked":""}> <span>You may quote my comments${who==="guest"?" with my name":" with my name"}.</span></label>
 <button class="btn primary" data-act="fbSend" data-key="${esc(key)}" data-who="${who}" data-name="${esc(name||"")}">Send feedback</button></div>`}
const fbDone=(who,key)=>!!store.get("fbDone_"+who+"_"+key,false);
const fbKeyOf=(id,me)=>(me&&me.ev)||"c_"+id;
function fbView(){const k=fbKeyQ();if(!k)return `<section class="card stack narrow"><h2>This link isn't working</h2><p class="muted m0">Ask the host for the feedback link again.</p></section>`;
 if(!L.loaded)return loadingView();const nm=D.fbEv&&D.fbEv.name||"the event";
 return `<section class="card stack narrow"><div class="eyebrow">${esc(nm)}</div>${fbDone("guest",k)?`<h2>Thank you!</h2><p class="m0">Your feedback was sent.</p>`:`<h2>How did we do?</h2><p class="small muted m0">It takes about a minute.</p>${fbForm(k,"guest","")}`}</section>`}
function fbClientCard(id,me){const key=fbKeyOf(id,me);if(fbDone("client",key))return `<section class="card"><p class="m0">Thank you for your feedback! 💛</p></section>`;
 return `<section class="card stack"><h3>How did we do?</h3><p class="small muted m0">Now that your event is over, tell us how it went.</p>${fbForm(key,"client",me.name)}</section>`}
const _clHome6=clHome;
clHome=function(id,me){return _clHome6(id,me)+(me&&(me.askFb||(me.date&&me.date<=mateToday()))?fbClientCard(id,me):"")};
/* ---- planner: results ---- */
function fbQuoteText(x){return `\u201c${(x.best||"").trim()}\u201d \u2014 ${x.name||"A happy guest"}`}
function hFeedbackCard(){const cs=D.clients||{},keys=new Set(Object.keys(D.fbk||{}));Object.keys(cs).forEach(id=>keys.add(fbKeyOf(id,cs[id])));
 const rows=[...keys].map(k=>{const c0=Object.keys(cs).find(id=>fbKeyOf(id,cs[id])===k),l=fbList(k),evn=((D.events||{})[k]||{}).name||(c0&&(cs[c0].evName||cs[c0].name))||k,q=l.filter(x=>x.quote);
  return `<div class="stack tight"><div class="row between"><div class="mw0"><b>${esc(evn)}</b><div class="small muted">${l.length?`${fbStars(Math.round(fbAvg(l)))} ${fbAvg(l)} average · ${l.length} response${l.length===1?"":"s"}`:"No responses yet"}</div></div>
  <span class="row">${k.startsWith("c_")?"":`<button class="btn xs" data-act="copyLink" data-url="${esc(fbLink(k))}">Copy guest link</button>`}${c0?`<button class="btn xs" data-act="fbAsk" data-m="${c0}">Ask the client</button>`:""}${q.length?`<button class="btn xs" data-act="fbCopyQuotes" data-k="${esc(k)}">Copy ${q.length} quote${q.length===1?"":"s"}</button>`:""}</span></div>
  ${l.map(x=>`<div class="clrow small"><b>${fbStars(+x.rating||0)}</b> <span class="muted">${esc(x.name||(x.who==="client"?"Client":"Guest"))}${x.who==="client"&&x.name?" · client":""} · ${esc(clAgo(x.t))}</span>${x.best?`<div>👍 ${esc(x.best)}</div>`:""}${x.better?`<div class="muted">💡 ${esc(x.better)}</div>`:""}
  <div class="row">${x.ok&&x.best?`<button class="btn xs ${x.quote?"primary":""}" data-act="fbQuote" data-p="${esc(k)}" data-k="${x.k}" aria-pressed="${!!x.quote}">${x.quote?"★ Featured":"Feature as a quote"}</button>`:`<span class="muted">${x.ok?"":"No permission to quote"}</span>`}<button class="btn xs" data-act="fbDel" data-p="${esc(k)}" data-k="${x.k}" aria-label="Delete">×</button></div></div>`).join("")}</div>`}).join("");
 return `<section class="card stack"><h2>Feedback</h2><p class="small muted m0">After the event, send guests the link and ask your client. Ratings and comments collect here. You can feature a comment as a testimonial only where the person said you may quote them.</p>${rows||'<span class="small muted">Add a client or an event and its feedback link appears here.</span>'}</section>`}
const _hClients6=hClients;

function hFbPos(h){const i=h.indexOf("</section>");return i<0?h+hFeedbackCard():h.slice(0,i+10)+hFeedbackCard()+h.slice(i+10)}

Object.assign(ACT,{
 fbRate:el=>{L.drafts["fb_rating_"+el.dataset.key]=+el.dataset.v;render(true)},
 fbSend:async el=>{const key=el.dataset.key,who=el.dataset.who,r=+dv("fb_rating_"+key,0);if(!r)return toast("Tap a star first");
  await RT(PSP+"feedback/"+key).push().set({who,name:String(who==="client"?el.dataset.name||"":dv("fb_name_"+key,"")).trim().slice(0,40),rating:r,best:dv("fb_best_"+key,"").trim().slice(0,400),better:dv("fb_better_"+key,"").trim().slice(0,400),ok:!!dv("fb_ok_"+key,false),t:Date.now()});
  store.set("fbDone_"+who+"_"+key,true);["rating","best","better","name","ok"].forEach(f=>delete L.drafts["fb_"+f+"_"+key]);toast("Thank you!");render(true)},
 fbQuote:async el=>{const p=el.dataset.p,k=el.dataset.k,x=((D.fbk||{})[p]||{})[k]||{};await RT(PSP+`feedback/${p}/${k}/quote`).set(!x.quote)},
 fbDel:async el=>{await RT(PSP+`feedback/${el.dataset.p}/${el.dataset.k}`).remove()},
 fbAsk:async el=>{const id=el.dataset.m,c=(D.clients||{})[id]||{};await RT(PSP+"clientMsgs/"+id).push().set({from:"planner",text:`Thank you for letting us be part of ${c.evName||"your event"}! When you have a minute, please tell us how it went. The "How did we do?" card is on your Overview page.`,t:Date.now()});await RT(PSP+`clients/${id}/plSeen`).set(Date.now());await RT(PSP+`clients/${id}/askFb`).set(Date.now());toast("Asked in the client's messages")},
 fbCopyQuotes:el=>{const k=el.dataset.k;copyText(fbList(k).filter(x=>x.quote&&x.best).map(fbQuoteText).join("\n\n"))}
});

/* ================= PLANNER DEMO (?pdemo=1) =================
   A pretend planning business, Northlight Events, with Dublin Investments as its main client.
   Runs on demo.js's in-browser database (its own storage, separate from the Rosa's 30th demo).
   The console opens without a PIN; client and teammate portals are one tap away in the demo bar. */
const PDEMO_V=19;
const pdemoOn=()=>!!window.__HMPDEMO;
function pdemoSeed(){const cur=JSON.parse(localStorage.getItem("hm_pdemo_db")||"{}");if(cur.pdemoV===PDEMO_V&&cur.partygames)return;
 const day=n=>{const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)},ago=h=>Date.now()-h*36e5;
 const EVD=12,dub=Object.assign({},window.HM_PDEMO_DUBLIN||{title:"Annual Company Conference",honorees:"Dublin Investments",tagline:"Stronger Together",eventType:"corporate"},{date:day(EVD)});
 const tasks=(list)=>{const o={};list.forEach((x,i)=>o["t"+i]=Object.assign({show:true,done:false,t:i+1},x));return o};
 const csv="Name,Email,Company\nSiobhan Kelly,siobhan@example.com,Dublin Investments\nConor Walsh,conor@example.com,Dublin Investments\nGrace Doyle,grace@example.com,Liffey Partners\nRonan Byrne,ronan@example.com,Dublin Investments\nMegan Ryan,megan@example.com,Harbour Capital\nDeclan Murphy,declan@example.com,Dublin Investments";
 const svgLogo="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0f5e63"/><path d="M18 44V20l28 24V20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="14" r="5" fill="#f2b134"/></svg>');
 const pl={
  profile:{name:"Claire Moran",biz:"Northlight Events",email:"claire@northlight.example",phone:"704-555-0142",code:"DEMO",t:ago(2000)},
  events:{DUBLIN:{name:"Annual Company Conference",created:ago(400)},WHELAN:{name:"Sarah & James's Wedding",created:ago(300)},OCONNOR:{name:"Margaret's 50th",created:ago(900)}},
  brand:{name:"Northlight Events",color:"#0f5e63",logo:svgLogo,tag:"Weddings, celebrations and corporate events",email:"hello@northlight.example",phone:"704-555-0142",web:"northlight.example",city:"Charlotte, NC",ig:"northlightevents",book:"calendly.com/northlight-events/consult"},dayOf:false,
  packages:{"pk_baby_1":{"name":"Baby Shower Essentials","price":650,"deposit":200,"items":"Planning consultation\nTheme, color and decor plan\nVendor recommendations\n3 hours of day-of coordination","t":1},"pk_baby_2":{"name":"Baby Shower Signature","price":1450,"deposit":450,"items":"Everything in Essentials\nVendor booking and contracts\nInvitation design and RSVP tracking\nSetup and teardown\n5 hours of day-of coordination","t":2},"pk_baby_3":{"name":"Baby Shower Luxe","price":2800,"deposit":850,"items":"Full-service planning\nPremium decor and balloon installation\nDessert table styling\nPhotographer and catering coordination\nFull-day coordination with an assistant","t":3},"pk_birthday_1":{"name":"Birthday Essentials","price":550,"deposit":150,"items":"Planning consultation\nTheme and decor plan\nVendor recommendations\n3 hours of day-of coordination","t":1},"pk_birthday_2":{"name":"Birthday Signature","price":1250,"deposit":400,"items":"Everything in Essentials\nVendor booking\nInvitations and RSVP tracking\nSetup and teardown\n5 hours of day-of coordination","t":2},"pk_birthday_3":{"name":"Birthday Luxe","price":2600,"deposit":800,"items":"Full-service planning\nCustom decor and lighting\nDJ and entertainment booking\nCake and dessert table styling\nFull-day coordination with an assistant","t":3},"pk_wedding_1":{"name":"Wedding Essentials","price":1800,"deposit":500,"items":"Month-of planning (starts 6 weeks out)\nFinal vendor confirmations\nTimeline and floor plan\nRehearsal coordination\n10 hours of wedding-day coordination","t":1},"pk_wedding_2":{"name":"Wedding Signature","price":3800,"deposit":1200,"items":"Partial planning (starts 6 months out)\nVendor recommendations and booking\nDesign and decor plan\nBudget tracking\nRehearsal and 12 hours of wedding-day coordination with an assistant","t":2},"pk_wedding_3":{"name":"Wedding Luxe","price":7500,"deposit":2500,"items":"Full planning from engagement to send-off\nUnlimited planning meetings\nFull design, styling and decor management\nGuest and travel management\nRehearsal and full wedding-day coordination with two assistants","t":3},"pk_anniversary_1":{"name":"Anniversary Essentials","price":700,"deposit":200,"items":"Planning consultation\nVenue and menu recommendations\nDecor plan\n3 hours of day-of coordination","t":1},"pk_anniversary_2":{"name":"Anniversary Signature","price":1600,"deposit":500,"items":"Everything in Essentials\nVendor booking\nInvitations and RSVP tracking\nPhoto slideshow production\n5 hours of day-of coordination","t":2},"pk_anniversary_3":{"name":"Anniversary Luxe","price":3200,"deposit":1000,"items":"Full-service planning\nVow renewal ceremony coordination\nPremium florals and table styling\nLive music booking\nFull-day coordination with an assistant","t":3},"pk_corporate_1":{"name":"Corporate Essentials","price":1500,"deposit":500,"items":"Planning consultation\nVenue sourcing\nRun of show and agenda\n4 hours of day-of coordination","t":1},"pk_corporate_2":{"name":"Corporate Signature","price":3500,"deposit":1000,"items":"Everything in Essentials\nVendor booking: catering, AV and rentals\nRegistration and name badges\nBranded signage\n8 hours of day-of coordination with an assistant","t":2},"pk_corporate_4":{"name":"Corporate Dinner (per guest)","price":85,"per":true,"minG":40,"deposit":1000,"items":"Three-course plated dinner\nStaff and service\nLinens and place settings\nEvening coordination","t":4},"pk_corporate_3":{"name":"Corporate Luxe","price":7500,"deposit":2500,"items":"Full-service event management\nSpeaker and awards coordination\nCustom staging and branding\nGuest travel and hotel blocks\nFull-day coordination with an on-site team","t":3}},
  invSettings:{next:1009,pay:"Zelle to pay@northlight.example, or pay by card at northlight.example/pay"},
  clientInvoices:{whelan:{inv1:{no:"INV-1008",lines:[{d:"Deposit: Wedding Signature",amt:1200}],total:1200,issued:day(-52),due:day(-45),note:"Thank you for choosing Northlight Events!",pay:"Zelle to pay@northlight.example, or pay by card at northlight.example/pay",status:"paid",paidAt:ago(1250),payKeys:{p1:1},t:ago(1260)}}},
  /* events: */ _idx:{DUBLIN:{name:"Annual Company Conference",created:ago(400),planner:"northlight"},WHELAN:{name:"Sarah & James's Wedding",created:ago(300)},OCONNOR:{name:"Margaret's 50th",created:ago(900)}},
  events_:{DUBLIN:{meta:{name:"Annual Company Conference",created:ago(400),planner:"northlight"},mods:{m1:{name:"Claire",pinHash:"demo",owner:true}},content:dub},
   WHELAN:{meta:{name:"Sarah & James's Wedding",created:ago(300)},mods:{m1:{name:"Claire",pinHash:"demo",owner:true}},content:{title:"Sarah & James",honorees:"Sarah & James",tagline:"Forever starts here",eventType:"wedding",date:day(220)}},
   OCONNOR:{meta:{name:"Margaret's 50th",created:ago(900)},mods:{m1:{name:"Claire",pinHash:"demo",owner:true}},content:{title:"Margaret's 50th",honorees:"Margaret",eventType:"birthday",date:day(-24)}}},
  clients:{dublin:{name:"Dublin Investments",ev:"DUBLIN",evName:"Annual Company Conference",date:day(EVD),t:ago(1),plSeen:ago(30)},
   whelan:{name:"Sarah & James Whelan",ev:"WHELAN",evName:"Sarah & James's Wedding",date:day(220),t:ago(300),plSeen:ago(5),email:"sarah.whelan@example.com",pkg:{k:"pk_wedding_2",name:"Wedding Signature",price:3800,deposit:1200,items:"Partial planning (starts 6 months out)\nVendor recommendations and booking\nDesign and decor plan\nBudget tracking\nRehearsal and 12 hours of wedding-day coordination with an assistant"}},
   oconnor:{name:"Margaret O'Connor",ev:"OCONNOR",evName:"Margaret's 50th",date:day(-24),t:ago(900),plSeen:ago(100),askFb:ago(200)}},
  clientTasks:{
   dublin:tasks([
    {title:"Book the venue: The Convention Centre Dublin",owner:"planner",due:day(-40),done:true,doneAt:ago(960),by:"planner"},
    {title:"Finalize the agenda and speakers",owner:"client",due:day(2),note:"Confirm panel names with your comms team"},
    {title:"Send the final attendee list",owner:"client",due:day(3),note:"Upload it under Uploads, a spreadsheet works best"},
    {title:"Book AV and microphones",owner:"planner",due:day(2),done:true,doneAt:ago(30),by:"planner"},
    {title:"Order name badges",owner:"planner",due:day(3)},
    {title:"Approve the lunch menu",owner:"client",due:day(4)},
    {title:"Confirm the keynote's arrival time and AV needs",owner:"planner",due:day(5),note:"Jaime Williams, keynote at 9:30 AM"},
    {title:"Send sponsor logos for the big screen",owner:"client",due:day(-1)},
    {title:"Print QR code signs for the tables",owner:"planner",due:day(9)},
    {title:"Test the big screen and links at the venue",owner:"planner",due:day(11)},
    {title:"Pack the registration kit",owner:"planner",due:day(11),show:false,note:"Badges, pens, tape, chargers"},
    {title:"Send thank-you notes to speakers and partners",owner:"planner",due:day(19)}]),
   whelan:tasks([{title:"Choose a venue",owner:"planner",due:day(-60),done:true,doneAt:ago(1500)},{title:"Send save-the-dates",owner:"client",due:day(14)},{title:"Book the photographer",owner:"planner",due:day(40)},{title:"Pick the menu tasting date",owner:"client",due:day(60)}]),
   oconnor:tasks([{title:"Book the private room",owner:"planner",due:day(-70),done:true,doneAt:ago(2000)},{title:"Send invitations",owner:"client",due:day(-50),done:true,doneAt:ago(1700)},{title:"Order the cake",owner:"planner",due:day(-27),done:true,doneAt:ago(700)}])},
  clientMsgs:{dublin:{m1:{from:"planner",text:"Hi Aoife, welcome to your conference portal! Your checklist, dates and payments are all here. The two things we need most this week are the final attendee list and the sponsor logos.",t:ago(220)},
    m2:{from:"client",text:"Thanks Claire, this is great. The attendee list is nearly done, I'll upload it tomorrow.",t:ago(190)},
    m3:{from:"planner",text:"Perfect. I've also sent the lunch menu for your approval. Let me know if anything needs to change for dietary needs.",t:ago(26)},
    m4:{from:"client",text:"Uploaded the attendee list just now. Logos coming from our design team.",t:ago(3)}},
   oconnor:{m1:{from:"planner",text:"Thank you for letting us be part of Margaret's 50th! When you have a minute, please tell us how it went.",t:ago(200)}}},
  clientFiles:{dublin:{f1:{name:"Attendee list.csv",kind:"guests",size:csv.length,by:"client",t:ago(3),count:6,status:"pending"},f2:{name:"Lunch menu.pdf",kind:"doc",size:(window.HM_PDEMO_MENU||"").length*.75|0,by:"planner",t:ago(26),share:true}}},
  clientBlobs:{dublin:Object.assign({f1:"data:text/csv;base64,"+btoa(csv)},window.HM_PDEMO_MENU?{f2:window.HM_PDEMO_MENU}:{})},
  clientApprovals:{dublin:{a1:{title:"Lunch menu",note:"Three courses with a vegetarian and a gluten-free option. Coffee station all day.",fileId:"f2",fileName:"Lunch menu.pdf",status:"pending",version:1,t:ago(26),hist:{h1:{s:"sent",t:ago(26)}}},
    a2:{title:"Stage backdrop design",note:"Navy and orange with the Stronger Together line.",status:"approved",version:2,t:ago(160),decidedAt:ago(120),hist:{h1:{s:"sent",t:ago(160)},h2:{s:"changes",c:"Can the logo be a bit larger?",t:ago(150)},h3:{s:"revised",t:ago(130)},h4:{s:"approved",t:ago(120)}}}}},
  clientPayments:{dublin:{p1:{title:"Venue deposit",amount:4000,due:day(-30),paid:true,paidAt:ago(700),t:1},p2:{title:"AV and staging",amount:2200,due:day(-5),paid:true,paidAt:ago(130),t:2},p3:{title:"Catering, 50% deposit",amount:3150,due:day(3),paid:false,t:3},p4:{title:"Final balance",amount:5600,due:day(EVD+7),paid:false,t:4}},
   whelan:{p1:{title:"Deposit: Wedding Signature",amount:1200,due:day(-45),paid:true,paidAt:ago(1250),pkg:true,inv:"inv1",t:1},p2:{title:"Balance: Wedding Signature",amount:2600,due:day(206),paid:false,pkg:true,t:2}}},
  clientDates:{dublin:{d1:{title:"Final headcount due to the caterer",date:day(5),time:"",note:"",t:1},d2:{title:"AV walkthrough at the venue",date:day(10),time:"14:00",note:"Bring the slide deck on a USB stick",t:2},d3:{title:"Conference day: registration opens",date:day(EVD),time:"08:15",note:"The Convention Centre Dublin",t:3}}},
  clientVendors:{dublin:{v1:{name:"The Convention Centre Dublin",role:"Venue",phone:"555-0101",arrive:"07:00",delivers:"Main hall and two breakout rooms",show:true,team:true,t:1},
    v2:{name:"BrightStage AV",role:"AV and staging",phone:"555-0164",email:"crew@brightstage.example",arrive:"07:30",delivers:"Screens, microphones, stage lights",show:true,team:true,t:2},
    v3:{name:"Harbourside Catering",role:"Catering",phone:"555-0128",arrive:"07:30",delivers:"Coffee station and lunch for 180",show:true,team:true,t:3},
    v4:{name:"Swift Print",role:"Badges and signs",phone:"555-0177",delivers:"Name badges and QR signs",show:false,team:true,t:4,note:"Pick up the day before"}}},
  clientTemplates:{tp1:{name:"Corporate conference",t:ago(500),items:[{title:"Book the venue",owner:"planner",days:60,show:true},{title:"Finalize the agenda and speakers",owner:"client",days:10,show:true},{title:"Send the final attendee list",owner:"client",days:9,show:true},{title:"Book AV and microphones",owner:"planner",days:10,show:true},{title:"Order name badges",owner:"planner",days:9,show:true},{title:"Approve the lunch menu",owner:"client",days:8,show:true},{title:"Print QR code signs",owner:"planner",days:3,show:true},{title:"Test the big screen at the venue",owner:"planner",days:1,show:true},{title:"Send thank-you notes",owner:"planner",days:-7,show:true}]}},
  feedback:{OCONNOR:{r1:{who:"client",name:"Margaret O'Connor",rating:5,best:"Every detail was handled. I actually got to enjoy my own party!",better:"",ok:true,quote:true,t:ago(190)},
    r2:{who:"guest",name:"Tom B",rating:5,best:"The trivia on the big screen had the whole room laughing.",ok:true,t:ago(400)},
    r3:{who:"guest",name:"",rating:4,best:"Lovely venue and great music.",better:"More vegetarian options at dinner.",ok:false,t:ago(420)}}},
  mates:{liam:{name:"Liam",t:ago(800)},niamh:{name:"Niamh",t:ago(700),nudge:{t:ago(20),msg:"You have 1 overdue task."}}},
  mateShifts:{liam:{s1:{date:day(EVD),start:"07:00",end:"13:00",role:"Setup",pay:22,ev:"DUBLIN",evName:"Annual Company Conference",note:"Registration table and microphones",t:1},s2:{date:day(EVD),start:"13:00",end:"18:30",role:"Coordinator",pay:28,ev:"DUBLIN",evName:"Annual Company Conference",t:2}},
    niamh:{s3:{date:day(EVD),start:"08:00",end:"17:00",role:"Greeter",pay:20,ev:"DUBLIN",evName:"Annual Company Conference",note:"Wear navy",t:3}}},
  mateTasks:{liam:{a:{title:"Collect the name badges from Swift Print",ev:"DUBLIN",evName:"Annual Company Conference",due:day(10),done:false,t:1},
    b:{title:"Set up the registration table",ev:"DUBLIN",evName:"Annual Company Conference",due:day(EVD),note:"From 7:15 AM, badges in alphabetical order",done:false,t:2},
    c:{title:"Test the microphones with BrightStage AV",ev:"DUBLIN",evName:"Annual Company Conference",due:day(EVD),note:"Before 8:00 AM",done:false,t:3},
    d:{title:"Put QR code signs on every table",ev:"DUBLIN",evName:"Annual Company Conference",due:day(EVD),done:false,t:4},
    e:{title:"Measure the room for the dance floor",ev:"WHELAN",evName:"Sarah & James's Wedding",due:day(30),done:false,t:5},
    f:{title:"Pick up the balloon arch",ev:"OCONNOR",evName:"Margaret's 50th",due:day(-25),done:true,doneAt:ago(610),by:"mate",t:6}},
   niamh:{a:{title:"Call the caterer about dietary needs",ev:"DUBLIN",evName:"Annual Company Conference",due:day(-1),done:false,t:1},
    b:{title:"Run registration and hand out badges",ev:"DUBLIN",evName:"Annual Company Conference",due:day(EVD),done:false,t:2},
    c:{title:"Update the seating chart",ev:"WHELAN",evName:"Sarah & James's Wedding",due:day(60),done:false,t:3}}}};
 /* a year of past clients, leads and a published Showcase page, so Reports and Showcase have something to show */
 /* demo photos: real event photos from Pexels (pexels.com/license), loaded from Pexels at a phone-friendly size */
 const px=id=>`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1000`;
 const past=[["Keisha & Andre Brooks","pk_wedding_2",11,-320],["The Patel family","pk_baby_2",10,-290],["Marcus Hill's 40th","pk_birthday_3",9,-262],["Queen City Credit Union","pk_corporate_2",7,-200],["Tonya & Ray Simmons","pk_anniversary_1",6,-170],["Lauren & Mike Chen","pk_wedding_2",4,-110],["Ashley Grant","pk_baby_2",2,-50]];
 past.forEach(([nm,pk,mAgo,dOff],i)=>{const pp=pl.packages[pk],id="past"+i,t=Date.now()-mAgo*30*864e5;
  pl.clients[id]={name:nm,ev:"",evName:"",date:day(dOff),t,plSeen:t,pkg:{k:pk,name:pp.name,price:pp.price,deposit:pp.deposit,items:pp.items}};
  const iss=new Date(t).toISOString().slice(0,10),paidT=t+12*864e5;
  pl.clientInvoices[id]={i1:{no:"INV-"+(1001+i),lines:[{d:pp.name+" package",amt:pp.price}],total:pp.price,issued:iss,due:iss,status:"paid",paidAt:paidT,t}};
  pl.clientPayments[id]={p1:{title:"Invoice INV-"+(1001+i),amount:pp.price,due:iss,paid:true,paidAt:paidT,inv:"i1",auto:true,t}}});
 pl.inquiries={q1:{name:"Brianna Lewis",email:"brianna.lewis@example.com",phone:"704-555-0181",type:"Wedding",date:day(410),guests:160,budget:"$30,000",msg:"We love your garden weddings on Instagram! Looking at Myers Park or somewhere outdoors next spring. Do you do full planning?",src:"Showcase page",status:"new",t:ago(3)},
  q2:{name:"Derrick Owens",email:"derrick@owensco.example",phone:"980-555-0144",type:"Corporate event",date:day(75),guests:120,budget:"$12,000",msg:"Holiday party for our team. Need venue help, catering and some kind of entertainment.",src:"website form",status:"new",t:ago(20)},
  q3:{name:"Jasmine Carter",email:"jasmine.c@example.com",type:"Baby shower",date:day(48),guests:40,budget:"$2,500",msg:"Enchanted garden theme, brunch style.",src:"form link",status:"contacted",t:ago(70)},
  q4:{name:"Sarah Whelan",email:"sarah.whelan@example.com",type:"Wedding",date:day(220),guests:140,msg:"Engaged! Looking for help with everything.",src:"Showcase page",status:"booked",cid:"whelan",t:ago(320)},
  q5:{name:"Kevin Tran",email:"kevin.tran@example.com",type:"Birthday",date:day(-20),guests:30,msg:"Surprise 50th for my wife.",src:"form link",status:"lost",t:ago(900)}};
 pl.showcase={on:true,headline:"Celebrations Charlotte talks about for years",about:"Northlight Events plans weddings, showers, milestone birthdays and corporate events across Charlotte. We handle the planning, the vendors and the day itself, so you get to enjoy your own party.\n\nEvery event also gets Host Mode games and a big screen, so guests are mixing and laughing from the moment they walk in.",
  pkgs:["pk_wedding_2","pk_baby_2","pk_corporate_2"].map(k=>({k,name:pl.packages[k].name,price:pl.packages[k].price,items:pl.packages[k].items})),
  reviews:[{text:"Claire thought of everything. Our guests are still talking about the trivia and the photo slideshow.",name:"Lauren C.",rating:5},{text:"The portal kept us organized for eight months. We always knew what was next and what we owed.",name:"Keisha B.",rating:5}],t:ago(48),
  gallery:{g1:{title:"A garden wedding in Myers Park",kind:"Wedding",date:day(-110),story:"160 guests under the oaks, a string quartet and a candlelit dinner. Trivia about the couple during dinner had the whole room competing, and the first dance closed out the night.",t:1},
   g2:{title:"The Patel family baby shower",kind:"Baby shower",date:day(-290),story:"A soft, elegant shower with a dessert table, a wishes wall and games on the big screen that had both families laughing.",t:2},
   g3:{title:"Queen City Credit Union awards night",kind:"Corporate event",date:day(-200),story:"Networking, a keynote and an awards show for 220 staff, with live voting on everyone's phones.",t:3},
   g4:{title:"Tonya and Ray's 50th anniversary",kind:"Anniversary",date:day(-170),story:"Fifty years celebrated with family from three states, a photo slideshow through the decades and a cake cutting that brought the room to its feet.",t:4},
   g5:{title:"Jaden's 15th birthday party",kind:"Birthday",date:day(-75),story:"Balloons, music and a scavenger hunt that kept forty teenagers and their parents busy all night.",t:5}}};
 pl.showImg={cover:{p:px(30298624)},g1:{a:px(2074911),b:px(16935912)},g2:{a:px(7802442),b:px(29964260)},g3:{a:px(31129059),b:px(29708266)},g4:{a:px(7867778)},g5:{a:px(7159852),b:px(7180612)}};
 pl.gear={g1:{name:"Ivory 120\" round tablecloth",cat:"Linens",qty:40,rep:2,color:"Ivory, fits 60\" rounds",spot:"Storage unit, shelf A",cost:22,low:30,t:1},
  g2:{name:"Navy satin table runner",cat:"Linens",qty:30,rep:0,color:"Navy",spot:"Storage unit, shelf A",cost:9,t:2},
  g3:{name:"Gold mercury glass centerpiece",cat:"Centerpieces",qty:18,rep:0,color:"Gold, 10\" tall",spot:"Bin 4",cost:35,t:3},
  g4:{name:"Greenery and candle centerpiece",cat:"Centerpieces",qty:12,rep:1,color:"Eucalyptus, white pillars",spot:"Bin 5",cost:28,t:4},
  g5:{name:"Gold Chiavari chair",cat:"Chairs",qty:120,rep:4,color:"Gold, ivory cushion",spot:"Warehouse, rack 2",cost:65,low:100,t:5},
  g6:{name:"60\" round table",cat:"Tables",qty:20,rep:0,color:"Seats 8 to 10",spot:"Warehouse, rack 1",cost:140,t:6},
  g7:{name:"Market string lights (48 ft)",cat:"Lighting",qty:10,rep:0,color:"Warm white",spot:"Bin 9",cost:45,t:7},
  g8:{name:"Uplight (battery)",cat:"Lighting",qty:24,rep:0,color:"Color-changing",spot:"Charging shelf",cost:80,note:"Charge the night before",t:8}};
 pl.gearRes={r1:{label:"Annual Company Conference",ref:"c:dublin",from:day(EVD-1),to:day(EVD+1),items:{g1:22,g2:22,g3:18,g6:22,g8:12},note:"Load the van by 9am, conference room B",status:"held",t:ago(30)},
  r2:{label:"Garden reception",ref:"b:bk2",from:day(EVD),to:day(EVD+1),items:{g5:80,g1:12,g7:6},status:"held",t:ago(20)},
  r3:{label:"Margaret's 50th",ref:"c:oconnor",from:day(-25),to:day(-23),items:{g1:8,g4:8,g6:8},status:"back",back:{g4:{lost:0,dmg:1}},t:ago(700)}};
 pl.venue={on:true};
 pl.spaces={s1:{name:"Grand Ballroom",cap:250,rate:4500,minSpend:15000,note:"Dance floor, stage, bridal suite",t:1},s2:{name:"Garden Terrace",cap:120,rate:2500,minSpend:6000,note:"Covered pergola, rain plan in the ballroom",t:2},s3:{name:"Library Room",cap:40,rate:900,note:"Showers, rehearsal dinners, meetings",t:3}};
 pl.bookings={bk1:{name:"Patel and Shah wedding",space:"s1",date:day(19),start:"14:00",end:"23:30",kind:"Wedding",guests:220,status:"confirmed",price:9500,spend:6500,deposit:3000,depPaid:true,phone:"704-555-0177",email:"anika.patel@example.com",t:1},
  bk2:{name:"Garden reception",space:"s2",date:day(EVD),start:"16:00",end:"22:00",kind:"Reception",guests:110,status:"confirmed",price:2500,spend:2800,deposit:800,depPaid:false,t:2},
  bk3:{name:"Jasmine Carter baby shower",space:"s3",date:day(EVD),start:"11:00",end:"15:00",kind:"Baby shower",guests:40,status:"hold",holdUntil:day(1),price:900,deposit:300,depPaid:false,email:"jasmine.c@example.com",note:"Enchanted garden theme, brunch",t:3},
  bk4:{name:"Owens & Co. holiday party",space:"",date:day(40),start:"18:00",end:"23:00",kind:"Corporate event",guests:120,status:"hold",holdUntil:day(9),price:6000,deposit:2000,depPaid:false,phone:"980-555-0144",t:4},
  bk5:{name:"Brianna Lewis venue tour",space:"s2",date:day(3),start:"10:00",end:"11:00",kind:"Tour or tasting",guests:2,status:"confirmed",t:5}};
 pl.blocks={b1:{from:day(26),to:day(28),space:"s1",reason:"Floor refinishing",t:1},b2:{from:day(52),to:day(52),space:"",reason:"Closed for the holiday",t:2}};
 const evs=pl.events_;delete pl.events_;const idx=pl._idx;delete pl._idx;
 Object.assign(pl.clients.dublin,{venue:pl.clients.dublin.venue||"Spencer Dock, North Wall Quay, Dublin",guests:pl.clients.dublin.guests||180});pl.vpages={};pl.vcheck={};["v1","v2","v3"].forEach((vk,i)=>{const v=pl.clientVendors.dublin[vk],tok="demoVendor"+(i+1)+"x";v.tok=tok;if(vk==="v3"){v.extra="One gluten-free and two vegetarian lunches. Coffee station ready for registration at 8:15 AM, then refills at the 10:30 break.";v.vnote="Your arrival time is load-in. Use the service entrance on the east side. Ask for Niamh at the desk."}
  pl.vpages[tok]=vpBuild(Object.assign({k:vk},v),"dublin",pl.clients.dublin,pl.brand,pl.profile)});
 pl.vcheck={demoVendor2x:{here:ago(0.5),issues:{i1:{text:"Our van is 10 minutes out, traffic on the quays.",t:ago(0.6)}}}};
 pl.tv={DUBLIN:{}};Object.keys(pl.clientVendors.dublin).forEach(k=>{const v=pl.clientVendors.dublin[k];if(v.team)pl.tv.DUBLIN["dublin_"+k]={name:v.name,role:v.role||"",phone:v.phone||"",email:v.email||"",arrive:v.arrive||"",delivers:v.delivers||"",note:v.note||""}});
 /* Stay & Go sample trip (made-up people and money; the tab shows a "Sample data" banner in the demo) */
 {const F=day(18),T=day(21),who=o=>Object.fromEntries(o.map(k=>[k,1])),rc="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260"><rect width="200" height="260" fill="#fff"/><text x="20" y="40" font-size="16">Harris Teeter</text><text x="20" y="80" font-size="13">Groceries   $186.40</text><text x="20" y="110" font-size="11">SAMPLE RECEIPT</text></svg>');
  pl.stay={trips:{tw:{name:"Whelan wedding weekend",client:"whelan",place:"Asheville, NC",cur:"USD",from:F,to:T,note:"Guests arrive Friday, wedding Saturday.",t:ago(200)}},
   mem:{m1:{trip:"tw",name:"Aoife Whelan",email:"aoife.whelan@example.com",phone:"704-555-0181",room:"312",group:"Bride's family",from:F,to:T,t:ago(190)},
    m2:{trip:"tw",name:"Liam Whelan",email:"liam.whelan@example.com",phone:"704-555-0182",room:"312",group:"Bride's family",from:F,to:T,t:ago(190)},
    m3:{trip:"tw",name:"Priya Shah",email:"priya.shah@example.com",phone:"",room:"",group:"Wedding party",from:F,to:T,t:ago(180)},
    m4:{trip:"tw",name:"Marcus Reed",email:"",phone:"980-555-0144",room:"",group:"Wedding party",from:F,to:T,noEmail:true,t:ago(180)},
    m5:{trip:"tw",name:"Grace Doyle",email:"grace.doyle@example.com",phone:"704-555-0190",room:"",group:"Wedding party",from:day(19),to:T,t:ago(170)}},
   res:{r1:{trip:"tw",cat:"stay",prov:"booking",name:"The Grove Park Inn",conf:"BK-48213",booked:day(-40),start:F,end:T,inT:"16:00",outT:"11:00",addr:"290 Macon Ave, Asheville, NC",phone:"828-555-0100",email:"",total:126000,due:day(10),status:"confirmed",who:who(["m1","m2"]),split:"even",owe:{m1:63000,m2:63000},oweDue:day(-3),gnote:"Ask for the Whelan wedding group at the front desk. Parking is free.",note:"Group rate expires if we drop below 10 rooms.",ppay:{pp1:{amt:30000,date:day(-40),note:"Deposit"}},t:ago(160)},
    r2:{trip:"tw",cat:"rental",prov:"airbnb",name:"Montford cottage",conf:"HM9X2KQ",booked:day(-20),start:F,end:T,inT:"15:00",outT:"10:00",addr:"Montford Ave, Asheville, NC",phone:"",email:"",total:98400,due:day(4),status:"pending",who:who(["m3","m4","m5"]),split:"even",owe:{m3:32800,m4:32800,m5:32800},oweDue:day(12),gnote:"Door code comes the day before.",note:"",t:ago(120)},
    r3:{trip:"tw",cat:"car",prov:"enterprise",name:"Enterprise, minivan",conf:"ENT-77120",booked:day(-15),start:F,end:T,inT:"12:00",outT:"12:00",addr:"Asheville Regional Airport",phone:"828-555-0170",email:"",total:41250,due:"",status:"confirmed",who:who(["m3","m4"]),split:"custom",owe:{m3:20625,m4:20625},oweDue:day(12),gnote:"Pick up at the airport counter. Marcus is the driver.",note:"",ppay:{pp1:{amt:41250,date:day(-15),note:"Paid in full by card"}},t:ago(100)}},
   exp:{e1:{trip:"tw",title:"Groceries for the cottage",amt:18640,date:day(-2),who:who(["m3","m4","m5"]),split:"even",owe:{m3:6214,m4:6213,m5:6213},oweDue:day(12),note:"",t:ago(40)}},
   pay:{p1:{trip:"tw",mid:"m1",amt:63000,date:day(-10),method:"Zelle",ref:"ZL-1042",note:"",alloc:{"r:r1":63000},rc:"",t:ago(230)},
    p2:{trip:"tw",mid:"m2",amt:25000,date:day(-8),method:"Venmo",ref:"",note:"Will send the rest after payday.",alloc:{"r:r1":25000},rc:"",t:ago(190)},
    p3:{trip:"tw",mid:"m3",amt:59639,date:day(-1),method:"Cash App",ref:"",note:"",alloc:{"r:r2":32800,"r:r3":20625,"e:e1":6214},rc:"rc1",t:ago(20)},
    p4:{trip:"tw",mid:"m4",amt:10000,date:day(-1),method:"Cash",ref:"",note:"",alloc:{"r:r2":10000},rc:"",t:ago(18)}},
   rc:{rc1:{trip:"tw",name:"cottage-groceries.svg",type:"image/svg+xml",size:300,hash:"demo1",merchant:"",date:"",amt:0,ref:"",cost:"",pay:"p3",ok:false,t:ago(30)}},
   rcBlob:{rc1:rc},
   msg:{g1:{trip:"tw",mid:"m1",ch:"email",kind:"stay",subj:"Whelan wedding weekend: Lodging details",body:"(sample)",t:ago(48),by:"Claire Moran",status:"sent"}},
   act:{a1:{trip:"tw",ref:"trip",text:"Created the trip Whelan wedding weekend",t:ago(200),by:"Claire Moran"},a2:{trip:"tw",ref:"r:r1",text:"Added hotel or lodging The Grove Park Inn (Confirmed, $1,260.00)",t:ago(160),by:"Claire Moran"},
    a3:{trip:"tw",ref:"r:r2",text:"Added vacation rental Montford cottage (Pending, $984.00)",t:ago(120),by:"Claire Moran"},a4:{trip:"tw",ref:"p:p3",text:"Recorded payment: Priya Shah paid $596.39 by Cash App",t:ago(20),by:"Claire Moran"},
    a5:{trip:"tw",ref:"m:m1",text:"Opened an email (Lodging details) to Aoife Whelan",t:ago(48),by:"Claire Moran"}}}}
 /* a sample host: Jordan runs one event of their own (made with an invite code), with Plan and Stay & Go in the event dashboard */
 const jd=day(30),jt=day(33),jc=Object.assign(templateFor("birthday","Jordan's 40th"),{title:"Jordan's 40th",honorees:"Jordan",date:jd,tagline:"Forty at the beach"});
 evs.JORDAN={meta:{name:"Jordan's 40th",created:ago(120),planner:"jordan",host:true},mods:{m1:{name:"Jordan",pinHash:"demo",owner:true}},content:jc};
 idx.JORDAN={name:"Jordan's 40th",created:ago(120),planner:"jordan",by:"Jordan"};
 const jw=o=>Object.fromEntries(o.map(k=>[k,1]));
 const jordan={profile:{kind:"host",name:"Jordan Ellis",email:"jordan@example.com",phone:"704-555-0133",code:"DEMOHOST",t:ago(120)},events:{JORDAN:{name:"Jordan's 40th",created:ago(120)}},
  stay:{trips:{jt:{name:"Jordan's 40th beach weekend",client:"",place:"Myrtle Beach, SC",cur:"USD",from:jd,to:jt,note:"",t:ago(110)}},
   mem:{j1:{trip:"jt",name:"Jordan Ellis",email:"jordan@example.com",phone:"704-555-0133",room:"",group:"Birthday crew",from:jd,to:jt,t:ago(110)},
    j2:{trip:"jt",name:"Keisha Ellis",email:"keisha@example.com",phone:"704-555-0134",room:"",group:"Birthday crew",from:jd,to:jt,t:ago(110)},
    j3:{trip:"jt",name:"Andre Ward",email:"",phone:"980-555-0177",room:"",group:"Birthday crew",from:jd,to:jt,t:ago(100)}},
   res:{h1:{trip:"jt",cat:"rental",prov:"airbnb",name:"Ocean Blvd beach house",conf:"HMJ4R8T2",booked:day(-5),start:jd,end:jt,inT:"16:00",outT:"10:00",addr:"Ocean Blvd, Myrtle Beach, SC",phone:"",email:"",total:150000,due:day(20),status:"confirmed",who:jw(["j1","j2","j3"]),split:"even",owe:{j1:50000,j2:50000,j3:50000},oweDue:day(14),gnote:"Door code comes the day before.",note:"",ppay:{pp1:{amt:50000,date:day(-5),note:"Deposit"}},t:ago(90)}},
   exp:{},pay:{q1:{trip:"jt",mid:"j2",amt:50000,date:day(-2),method:"Zelle",ref:"",note:"",alloc:{"r:h1":50000},rc:"",t:ago(40)}},rc:{},rcBlob:{},msg:{},
   act:{a1:{trip:"jt",ref:"trip",text:"Created the trip Jordan's 40th beach weekend",t:ago(110),by:"Jordan Ellis"},a2:{trip:"jt",ref:"r:h1",text:"Added vacation rental Ocean Blvd beach house (Confirmed, $1,500.00)",t:ago(90),by:"Jordan Ellis"}}}};
 const pg={admin:{},index:idx,events:evs,planners:{northlight:pl,jordan},plist:{northlight:{name:"Claire Moran",biz:"Northlight Events",email:"claire@northlight.example",t:ago(2000)},jordan:{name:"Jordan Ellis",biz:"",email:"jordan@example.com",kind:"host",t:ago(120)}}};
 pg.invites={DEMOHOST:{label:"Jordan",max:1,used:1,active:true,host:"jordan",event:"JORDAN",eventName:"Jordan's 40th",usedAt:ago(120),t:ago(130)}};
 const dev="iPhone/iPad · Safari · screen 390×844 · online · en-US";
 pg.staff={roy:{name:"Roy",role:"owner",t:ago(3000),active:ago(0.01)},icee:{name:"Icee",role:"support",code:"SUP-DEMO1",t:ago(200),active:ago(2.5)}};
 pg.admins={icee:true};
 pg.sinvites={"SUP-DEMO1":{label:"Icee",active:true,by:"icee",name:"Icee",usedAt:ago(200),t:ago(210)}};
 pg.tickets={tk1:{msg:"The trivia question on my phone is stuck on question 4. Everyone else moved on to question 5.",who:"guest",name:"Tasha",contact:"",ev:"DUBLIN",page:"games.html?e=DUBLIN",device:dev,errs:"",status:"new",t:ago(0.3),last:ago(0.3),lastFrom:"reporter"},
  tk2:{msg:"I uploaded my vendor spreadsheet but two of the vendors didn't show up under Vendors.",who:"planner",name:"Claire Moran",contact:"claire@northlight.example",p:"northlight",page:"games.html#planner",device:"Mac · Chrome · screen 1512×982 · online · en-US",status:"working",seen:{roy:ago(5),icee:ago(4)},by:{uid:"icee",name:"Icee",t:ago(4)},t:ago(6),last:ago(1),lastFrom:"reporter"},
  tk3:{msg:"The big screen went black for a few seconds during the slideshow.",who:"moderator",name:"Margaret",contact:"704-555-0119",ev:"OCONNOR",page:"games.html?e=OCONNOR#moderator",device:"Windows · Edge · screen 1920×1080 · online · en-US",errs:"Unfinished task: NetworkError when attempting to fetch resource.",status:"new",seen:{roy:ago(2)},t:ago(3),last:ago(3),lastFrom:"reporter"},
  tk4:{msg:"¿Cómo cambio mi nombre en el juego?",who:"guest",name:"Luis",ev:"WHELAN",page:"games.html?e=WHELAN",device:dev,lang:"es",status:"solved",seen:{roy:ago(30)},by:{uid:"roy",name:"Roy",t:ago(30)},solved:{uid:"roy",name:"Roy",t:ago(29)},t:ago(31),last:ago(29),lastFrom:"staff"}};
 pg.ticketReplies={tk2:{r1:{from:"staff",name:"Icee",text:"Hi Claire, thanks for letting us know! Could you tell me the names of the two vendors that are missing?",t:ago(3)},r2:{from:"reporter",name:"Claire Moran",text:"Bloom & Vine Florals and DJ Marcus.",t:ago(1)}},
  tk4:{r1:{from:"staff",name:"Roy",text:"¡Hola Luis! Toca tu nombre arriba de la pantalla y escribe el nuevo.",t:ago(29.5)}}};
 pg.sales={s1:{biz:"Queen City Events",name:"Dana Brooks",kind:"planner",city:"Charlotte",email:"dana@queencity.example",phone:"704-555-0190",src:"Wedding expo",stage:"talking",next:day(0),nextWhat:"Send the demo link",owner:{uid:"icee",name:"Icee"},notes:"Does about 30 weddings a year. Uses three apps and a rentals spreadsheet.",t:ago(80),last:ago(20)},
  s2:{biz:"The Mill at Rock Hill",name:"Marcus Hale",kind:"venue",city:"Rock Hill",web:"themill.example",src:"Instagram",stage:"idea",next:day(2),nextWhat:"First call",owner:{uid:"icee",name:"Icee"},notes:"Two event rooms and a garden. Books by phone and a paper calendar.",t:ago(30),last:ago(30)},
  s3:{biz:"Bloom & Vine Florals",name:"Tara Nguyen",kind:"decor",city:"Charlotte",email:"tara@bloomvine.example",src:"Referral from Claire",stage:"trial",next:day(5),nextWhat:"Check in on the inventory import",owner:{uid:"roy",name:"Roy"},t:ago(200),last:ago(48)}};
 pg.team={general:{m1:{text:"Welcome to the team, Icee! Your onboarding checklist is in the Onboarding tab.",uid:"roy",name:"Roy",t:ago(26)},m2:{text:"Thanks! Starting on Blender today.",uid:"icee",name:"Icee",t:ago(25)}},approvals:{m1:{text:"Pricing proposal draft is in Resources. Ready for your review when you have a minute.",uid:"icee",name:"Icee",t:ago(3)}}};
 pg.teamSeen={roy:{general:ago(25)},icee:{general:ago(25),approvals:ago(3)}};
 pg.onboard={icee:{login:ago(200),claude:ago(190),team:ago(25)}};
 pg.salesLog={s1:{l1:{text:"Met at the Charlotte wedding expo. Loved the big screen games.",name:"Icee",t:ago(80)},l2:{text:"Called. She wants to see the planner portal.",name:"Icee",t:ago(20)}},s3:{l1:{text:"Moved to Trying it",name:"Roy",t:ago(48)}}};
 pg.agents={paused:false};pg.backupStatus={t:ago(4),mb:3.1,ok:true};
 pg.agentRuns={r1:{t:ago(6),done:ago(5.6),usage:{in:182000,out:9100,usd:0.45},
  tester:{passed:13,failed:1,aiProblems:1,filed:2,problems:["Inventory import is broken","Venue calendar: \"Back to today\" is hard to find on a phone"],ai:{role:"venue",size:"phone",lang:"English",steps:27,summary:"Booking a room and blocking days was easy. Finding today again after moving months took a while."}},
  tech:{seen:3,replied:1,drafted:1,person:0,notFixed:0,prs:[{url:"https://github.com/HostMode/HostMode.Github.io/pulls",confidence:"likely",summary:"The importer now reads dates written like 03.06.2027."}]},
  log:["06:13 Scripted checks: 13 passed, 1 failed.","06:21 AI test customer (venue, phone, English) took 27 steps and reported 1 problem(s).","06:21 Filed 2 new ticket(s); 0 were already open.","06:24 3 new ticket(s) to look at.","06:24 Ticket tk5: reply","06:25 Ticket tk6: draft","06:31 Ticket tk7: fix","06:31 Done. About $0.45 of credits used tonight."]}};
 pg.ticketNotes={tk2:{n1:{kind:"take",name:"Icee",text:"took it",t:ago(4)},n2:{kind:"reply",name:"Icee",text:"replied to them",t:ago(3)},n3:{kind:"note",name:"Icee",text:"Their sheet has the vendors on a second tab. Checking whether the importer reads every tab.",t:ago(2.8)}},
  tk3:{n1:{kind:"agent",name:"Support Assistant",text:"wrote a draft reply for a person to check (bug, likely). The big screen may have lost its connection for a moment.",t:ago(2.5)},n0:{kind:"draft",name:"Support Assistant",text:"Hi Margaret, thanks for letting us know, and sorry the screen went dark. That usually means the big screen lost its internet for a moment; it reconnects on its own. If it happens again, tap the screen once to bring the slideshow back. We're looking into it.",t:ago(2.6)}},
  tk4:{n1:{kind:"take",name:"Roy",text:"took it",t:ago(30)},n2:{kind:"solve",name:"Roy",text:"marked it solved",t:ago(29)}}};
 localStorage.setItem("hm_pdemo_db",JSON.stringify({pdemoV:PDEMO_V,partygames:pg}));try{firebase.database().ref("pdemoV").set(PDEMO_V)}catch(e){}}
function pdemoReset(){try{localStorage.removeItem("hm_pdemo_db");["mateSeen_liam","mateSeen_niamh","clSeen_dublin"].forEach(k=>store.set(k,0));Object.keys(localStorage).filter(k=>/fbDone_|hm_theme_(DUBLIN|WHELAN|OCONNOR)/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}if(VIEW==="planner")location.reload();else location.href="games.html?pdemo=1#planner"}
if(pdemoOn()){
 try{pdemoSeed()}catch(e){console.warn("planner demo seed",e)}
 if(VIEW==="planner"){if(L.cliOpen===undefined)L.cliOpen="dublin";if(!L.cliTab)L.cliTab="list"}
 if(VIEW==="host")location.replace("games.html?pdemo=1#planner");
 ["DUBLIN","WHELAN","OCONNOR","JORDAN"].forEach(k=>{if(!store.get("mod_"+k,null))store.set("mod_"+k,{h:"demo",id:"m1",r:"mod"})});
 /* every link the app hands out stays inside the demo */
 const pdq=u=>u.replace(/games\.html\?/,"games.html?pdemo=1&");
 const _clL=clLink,_mtL=mateLink,_fbL=fbLink;clLink=id=>pdq(_clL(id));mateLink=id=>pdq(_mtL(id));fbLink=k=>pdq(_fbL(k));
 document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[href]");if(!a)return;const h=a.getAttribute("href");if(/(^|\/)games\.html/.test(h)&&!/pdemo=1/.test(h)){a.setAttribute("href",h.includes("?")?h.replace("?","?pdemo=1&"):h.replace("games.html","games.html?pdemo=1"))}},true);
 ACT.pdemoReset=()=>pdemoReset();
 if(window.top===window){addEventListener("scroll",demoFloat,{passive:true});addEventListener("resize",demoFloat);setInterval(demoFloat,400)}
}
function pdemoBar(){if(!pdemoOn()||window.top!==window||VIEW==="vendor")return "";const on=VIEW==="planner"&&QS.get("host")==="1"?"hostdemo":VIEW;const a=(href,l,v)=>`<a class="${on===v?"on":""}" href="${href}">${l}</a>`;
 return `<div class="demoslot"><div class="demobar pdemo"><div class="dbrow"><span class="dbchip">Demo</span><span class="dbt">Planner demo</span><span class="dbkeys"><a href="index.html">Home</a><button data-act="pdemoReset">Start over</button></span></div><div class="dbscreens dbmain">${a("games.html?pdemo=1#planner","Planner","planner")}${a("games.html?pdemo=1&p=northlight&client=dublin","Client","client")}${a("games.html?pdemo=1&p=northlight&mate=liam","Teammate","mate")}${a("games.html?pdemo=1&host=1#planner","Host","hostdemo")}</div>${pdemoEvRow()}</div></div>`}
/* inside an event, a second row flips between that event's three screens */
function pdemoEvRow(){if(!EV||!["moderator","guest","screen"].includes(VIEW))return "";const nm=(D.meta&&D.meta.name)||(C()&&C().title)||EV;
 const e=(h,l,v)=>`<a class="${VIEW===v?"on":""}" href="${esc(eventURL(EV,h))}">${l}</a>`;
 return `<div class="dbrow"><span class="dbt">This event</span><span class="small" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700">${esc(nm)}</span></div><div class="dbscreens">${e("moderator","Console","moderator")}${e("","Guest phone","guest")}${e("screen","Big screen","screen")}</div>`}
const _hvPD=headerView;headerView=function(){return pdemoBar()+_hvPD()};


/* ================= QUESTIONNAIRE AND EVENT SHEET =================
   Questionnaire: the planner asks, the client answers in their portal, and the answers fill in the client's details.
   partygames(planner)/clients/{id}/askQ = {t, extra:["Any questions the planner added"]}
   partygames(planner)/clients/{id}/qa   = {a:{key:answer}, x:[extra answers], t, seen}
   Answers fill the client's empty details (date, guests, venue, budget, event type); different answers wait for the planner.
   Event sheet (a banquet event order): one printable page per event for the kitchen, venue and crew. */
const QA=[["date","Event date","date"],["guests","About how many guests?","number"],["venue","Where is it? (venue or address)","text"],["evType","What kind of event?","kind"],
 ["budget","What budget do you have in mind?","text"],["colors","Colors, theme or feel","text"],["mustHaves","Must-haves for the day","area"],["food","Food and drinks, including allergies or dietary needs","area"],
 ["music","Music: songs you love, songs to skip","area"],["vips","Who should we make sure to celebrate or look after?","area"],["other","Anything else we should know?","area"]];
const QA_FILL={date:"date",guests:"guests",venue:"venue",evType:"evType",budget:"budget"};
const qaOf=c=>(c&&c.qa)||null;
function qaPlannerBox(id){const c=(D.clients||{})[id]||{},q=qaOf(c),ask=c.askQ,open=L.qaOpen===id;
 if(q&&q.t&&!(q.seen>=q.t)&&!L.viewOnly&&!L.qaMark){L.qaMark=1;setTimeout(()=>{RT(PSP+"clients/"+id+"/qa/seen").set(Date.now()).catch(()=>{});L.qaMark=0},800)}
 if(!ask&&!q)return `<div class="row small"><span>Questionnaire:</span>${open?"":`<button class="btn xs" data-act="qaToggle" data-m="${esc(id)}">Ask about their event</button>`}</div>${open?qaAskForm(id):""}`;
 if(!q)return `<div class="row small"><span>Questionnaire sent ${esc(supAgo(ask.t))}, waiting for their answers.</span><button class="btn xs" data-act="qaCancel" data-m="${esc(id)}">${L.confirm==="qac"+id?"Tap again to take it back":"Take it back"}</button></div>`;
 const diff=Object.keys(QA_FILL).filter(k=>q.a&&q.a[k]!=null&&q.a[k]!==""&&String(c[QA_FILL[k]]||"")!==String(q.a[k]));
 return `<div class="card stack tight"><div class="row between"><b>Their answers</b><span class="small muted">${esc(supAgo(q.t))}</span></div>
 <div class="small stack tight">${QA.filter(([k])=>q.a&&q.a[k]!=null&&q.a[k]!=="").map(([k,l,t])=>`<div><span class="muted">${esc(l)}</span><div style="white-space:pre-wrap">${esc(k==="date"?clFmtDate(q.a[k]):q.a[k])}</div></div>`).join("")}
 ${(ask&&ask.extra||[]).map((x,i)=>q.x&&q.x[i]?`<div><span class="muted">${esc(x)}</span><div style="white-space:pre-wrap">${esc(q.x[i])}</div></div>`:"").join("")}</div>
 ${diff.length?`<div class="row small"><span>Some answers differ from what you have:</span>${diff.map(k=>`<button class="btn xs" data-act="qaUse" data-m="${esc(id)}" data-k="${k}">Use their ${({date:"date",guests:"guest count",venue:"venue",evType:"event type",budget:"budget"})[k]}</button>`).join("")}</div>`:""}
 <div class="row"><button class="btn xs" data-act="qaToggle" data-m="${esc(id)}">${open?"Close":"Ask again"}</button></div>${open?qaAskForm(id):""}</div>`}
function qaAskForm(id){return `<div class="card stack tight"><span class="small">They'll see a short form in their portal: date, guests, venue, budget, theme, must-haves, food and allergies, music and more. Their answers fill in their details here.</span>
 <label class="stack tight"><span class="small">Your own questions, one per line (optional)</span><textarea rows="3" data-draft="qa_extra_${esc(id)}" maxlength="800" placeholder="Do you have a ceremony and a reception?">${esc(dv("qa_extra_"+id,""))}</textarea></label>
 <button class="btn sm primary as" data-act="qaSend" data-m="${esc(id)}">Send the questionnaire</button></div>`}
/* the client's side */
function qaClientCard(id,me){const ask=me.askQ;if(!ask||(me.qa&&me.qa.t>=ask.t&&!L.qaEdit))return me.qa&&ask?`<section class="card stack"><div class="row between"><h3>Your event details</h3><button class="btn xs" data-act="qaEdit">Change my answers</button></div><p class="small muted m0">Thanks! Your planner has your answers.</p></section>`:"";
 const a=(me.qa&&me.qa.a)||{},x=(me.qa&&me.qa.x)||[],f=(k,l,t)=>{const v=dv("qa_"+k,a[k]==null?(k==="date"?me.date||"":k==="guests"?me.guests||"":k==="venue"?me.venue||"":""):a[k]);
  return `<label class="stack tight"><span class="small">${esc(l)}</span>${t==="area"?`<textarea rows="3" data-draft="qa_${k}" maxlength="1500">${esc(v)}</textarea>`:t==="kind"?`<select data-draft="qa_${k}"><option value="">Pick one</option>${EV_KINDS.map(z=>`<option ${v===z?"selected":""}>${esc(z)}</option>`).join("")}</select>`:`<input type="${t==="number"?"number":t}" ${t==="number"?'min="0" inputmode="numeric"':""} data-draft="qa_${k}" maxlength="200" value="${esc(v)}">`}</label>`};
 return `<section class="card stack gilt"><h3>Tell us about your event</h3><p class="small muted m0">A few questions from your planner. Answer what you can; you can change your answers later.</p>
 ${QA.map(([k,l,t])=>f(k,l,t)).join("")}${(ask.extra||[]).map((q,i)=>`<label class="stack tight"><span class="small">${esc(q)}</span><textarea rows="2" data-draft="qa_x${i}" maxlength="1500">${esc(dv("qa_x"+i,x[i]||""))}</textarea></label>`).join("")}
 <button class="btn primary as" data-act="qaSubmit">Send my answers</button></section>`}
Object.assign(ACT,{
 qaToggle:el=>{const id=el.dataset.m;L.qaOpen=L.qaOpen===id?null:id;render(true)},
 qaSend:async el=>{const id=el.dataset.m,extra=String(dv("qa_extra_"+id,"")).split("\n").map(x=>x.trim()).filter(Boolean).slice(0,8).map(x=>x.slice(0,200));
  await RT(PSP+"clients/"+id+"/askQ").set({t:Date.now(),extra});await RT(PSP+"clientMsgs/"+id).push().set({from:"planner",text:"I've sent you a few questions about your event. You'll find them on your Overview. Thank you!",t:Date.now()});
  delete L.drafts["qa_extra_"+id];L.qaOpen=null;toast("Sent. It's on their Overview, with a message so they notice.");render(true)},
 qaCancel:async el=>{const id=el.dataset.m;if(L.confirm!=="qac"+id){L.confirm="qac"+id;return render(true)}L.confirm=null;await RT(PSP+"clients/"+id+"/askQ").remove();toast("Questionnaire taken back")},
 qaUse:async el=>{const id=el.dataset.m,k=el.dataset.k,c=(D.clients||{})[id]||{},v=qaOf(c)&&qaOf(c).a[k];if(v==null)return;await RT(PSP+`clients/${id}/${QA_FILL[k]}`).set(k==="guests"?(+v||0):v);toast("Updated")},
 qaEdit:()=>{L.qaEdit=true;render(true)},
 qaSubmit:async()=>{const id=clKey(),me=D.cliMe||{},ask=me.askQ||{},a={},x=[];
  QA.forEach(([k,,t])=>{const v=String(dv("qa_"+k,((me.qa||{}).a||{})[k]||"")).trim();if(v)a[k]=t==="number"?Math.max(0,Math.round(+v||0)):v.slice(0,1500)});
  (ask.extra||[]).forEach((q,i)=>x.push(String(dv("qa_x"+i,((me.qa||{}).x||[])[i]||"")).trim().slice(0,1500)));
  if(!Object.keys(a).length&&!x.some(Boolean))return toast("Answer at least one question");
  const u={qa:{a,x,t:Date.now()}};Object.keys(QA_FILL).forEach(k=>{const f=QA_FILL[k];if(a[k]!=null&&(me[f]==null||me[f]===""))u[f]=a[k]});
  await RT(PSP+"clients/"+id).update(u);Object.keys(L.drafts).filter(k=>k.startsWith("qa_")).forEach(k=>delete L.drafts[k]);L.qaEdit=false;toast("Thank you! Your planner has your answers.");render(true)}
});
/* ---- the event sheet (banquet event order) ---- */
async function beoHTML(id){const c=(D.clients||{})[id]||{},f=invFrom(),ev=c.ev||"";let content={},orders={},meta={};
 if(ev){try{const [a,b,m]=await Promise.all(["content","orders","meta"].map(p=>ER(p,ev).once("value").then(s=>s.val()).catch(()=>null)));content=a||{};orders=b||{};meta=m||{}}catch(e){}}
 const ros=Object.keys(content.ros||{}).map(k=>content.ros[k]).sort((x,y)=>String(x.time||"").localeCompare(String(y.time||""))),vs=clVendors(id),q=(qaOf(c)||{}).a||{};
 const bk=typeof bkList==="function"?bkList().filter(b=>b.ref==="c:"+id&&b.status!=="cancelled"):[],gr=typeof gresList==="function"?gresList().filter(r=>r.ref==="c:"+id&&r.status!=="back"):[];
 const m=content.menu?Object.assign({groups:[]},content.menu):null,groups=m?arr(m.groups).map(g=>Object.assign({},g,{items:arr(g.items)})):[],counts=groups.map(g=>g.items.map(()=>0));
 Object.values(orders||{}).forEach(o=>{const p=(o&&o.picks)||{};Object.keys(p).forEach(gi=>arr(p[gi]).forEach(ii=>{if(counts[gi]&&counts[gi][ii]!=null)counts[gi][ii]++}))});
 const allergy=[q.food].concat(vs.filter(v=>vKind(v.role)==="cater"&&v.extra).map(v=>v.extra)).filter(Boolean);
 const sec=(h,body)=>body?`<h2>${h}</h2>${body}`:"",li=a=>a.length?`<ul>${a.map(x=>`<li>${x}</li>`).join("")}</ul>`:"";
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Event sheet · ${esc(c.evName||c.name||"Event")}</title>
<style>body{margin:0;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2433;background:#f4f1ea}.pg{max-width:800px;margin:20px auto;background:#fff;padding:32px 38px;border-radius:12px}
h1{margin:0;font-size:24px;color:${esc(f.color)}}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6b7385;border-bottom:2px solid ${esc(f.color)};padding-bottom:4px;margin:22px 0 8px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}.meta div span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7385}
table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:#6b7385}.n{text-align:right;font-weight:700}.al{background:#fff4e5;border-left:4px solid #e8650f;padding:8px 10px;border-radius:6px}
ul{margin:4px 0;padding-left:20px}.m{color:#6b7385}@media print{body{background:#fff}.pg{margin:0;padding:0}}</style></head><body><div class="pg">
<div class="m">${esc(f.name)} · Event sheet</div><h1>${esc(c.evName||c.evTitle||c.name||"Event")}</h1>
<div class="meta"><div><span>Client</span>${esc(c.name||"")}</div><div><span>Date</span>${esc(c.date?clFmtDate(c.date):"Not set")}</div><div><span>Guests</span>${esc(String(c.guests||q.guests||"—"))}</div><div><span>Where</span>${esc(c.venue||q.venue||"—")}</div>${bk.length?`<div><span>Room</span>${bk.map(b=>esc(spaceName(b.space)+" · "+bkTimes(b))).join("<br>")}</div>`:""}<div><span>Planner</span>${esc(f.name)}${f.phone?"<br>"+esc(f.phone):""}</div></div>
${allergy.length?`<h2>Allergies and dietary needs</h2><div class="al">${allergy.map(a=>esc(a)).join("<br>")}</div>`:""}
${sec("Timeline",ros.length?`<table><tr><th>Time</th><th>What</th><th>Notes</th></tr>${ros.map(x=>`<tr><td>${esc(fmtTime(x.time)||"")}</td><td><b>${esc(x.title||"")}</b></td><td>${esc(x.note||"")}</td></tr>`).join("")}</table>`:(clDates(id).length?li(clDates(id).map(x=>`${esc(clFmtDate(x.date))} ${esc(x.time?clFmtTime(x.time):"")} · ${esc(x.title)}`)):`<p class="m">Add the run of show in the event's Tonight tab.</p>`))}
${groups.some(g=>g.items.length)?`<h2>${esc(m.title||"Menu")}</h2>${groups.filter(g=>g.items.length).map((g,gi)=>`<b>${esc(g.name)}</b><table>${g.items.map((it,ii)=>`<tr><td>${esc(it.n)}${it.d?` <span class="m">· ${esc(it.d)}</span>`:""}</td><td class="n">${counts[groups.indexOf(g)]&&counts[groups.indexOf(g)][ii]?counts[groups.indexOf(g)][ii]+" ordered":""}</td></tr>`).join("")}</table>`).join("")}`:(m&&m.text?`<h2>Menu</h2><p style="white-space:pre-wrap">${esc(m.text)}</p>`:"")}
${sec("Vendors",vs.length?`<table><tr><th>Vendor</th><th>Arrives</th><th>Bringing and notes</th><th>Phone</th></tr>${vs.map(v=>`<tr><td><b>${esc(v.name)}</b><div class="m">${esc(v.role||"")}</div></td><td>${esc(v.arrive?clFmtTime(v.arrive):"")}${v.pickup?"<div class='m'>pickup "+esc(clFmtTime(v.pickup))+"</div>":""}</td><td>${esc([v.delivers,v.vnote,v.extra].filter(Boolean).join(" · "))}</td><td>${esc(v.phone||"")}</td></tr>`).join("")}</table>`:"")}
${sec("Room setup and rentals",[...bk.filter(b=>b.note).map(b=>esc(b.note)),...gr.map(r=>`<b>${esc(r.label)}</b>: ${gresWhat(r).map(esc).join(", ")}`)].length?li([...bk.filter(b=>b.note).map(b=>esc(b.note)),...gr.map(r=>`<b>${esc(r.label)}</b>: ${gresWhat(r).map(esc).join(", ")}`)]):"")}
${sec("From the client",[q.colors&&"Theme and colors: "+esc(q.colors),q.mustHaves&&"Must-haves: "+esc(q.mustHaves),q.music&&"Music: "+esc(q.music),q.vips&&"Look after: "+esc(q.vips),q.other&&esc(q.other)].filter(Boolean).length?li([q.colors&&"Theme and colors: "+esc(q.colors),q.mustHaves&&"Must-haves: "+esc(q.mustHaves),q.music&&"Music: "+esc(q.music),q.vips&&"Look after: "+esc(q.vips),q.other&&esc(q.other)].filter(Boolean)):"")}
${c.notes?`<h2>Notes</h2><p style="white-space:pre-wrap">${esc(c.notes)}</p>`:""}
<p class="m">Printed ${esc(new Date().toLocaleString())} · Made with Host Mode</p></div></body></html>`}
ACT.beoView=async el=>{toast("Making the event sheet…");const html=await beoHTML(el.dataset.m),w=window.open("","_blank");if(w){w.document.open();w.document.write(html);w.document.close()}else download("event-sheet.html",new Blob([html],{type:"text/html"}))};
