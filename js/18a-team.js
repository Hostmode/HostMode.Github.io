/* ================= STAFF AREA: TEAM MESSAGES AND ONBOARDING =================
   Roy and support staff (Icee) see these in the staff area (games.html#support) and the admin console.
   partygames/team/{ch}/{id}       = a team message: {text, uid, name, t}. ch is one of TM_CH.
                                     Everyone on the team can post their own; only Roy deletes.
   partygames/teamSeen/{uid}/{ch}  = when that person last opened the channel (for the unread badge)
   partygames/onboard/{uid}/{item} = when that person ticked an onboarding item (ONB_ITEMS). Each person ticks
                                     their own; Roy can see and tick anyone's.
   No customer data lives here. The code is public, so never put keys, PINs or budgets in ONB_ITEMS. */
D.team={};D.teamSeen={};D.onboard={};
const TM_CH=[["general","General","Everyday team chat"],["support","Support","Talk through tricky tickets"],["sales","Sales","Leads, pitches and the sales plan"],["marketing","Marketing","Ready for when marketing starts"],["approvals","Approvals","Anything that needs Roy's OK, like the pricing proposal"]];
let tmSubbed=false;
function tmSubs(){if(tmSubbed||!db)return;tmSubbed=true;
 RT("team").on("value",s=>{D.team=s.val()||{};renderSoon()},()=>{});
 RT("teamSeen").on("value",s=>{D.teamSeen=s.val()||{};renderSoon()},()=>{});
 RT("onboard").on("value",s=>{D.onboard=s.val()||{};renderSoon()},()=>{})}
const tmMsgs=ch=>Object.keys((D.team||{})[ch]||{}).map(k=>Object.assign({k},D.team[ch][k])).sort((a,b)=>(a.t||0)-(b.t||0));
const tmUnread=ch=>{const me=supMe();if(!me)return 0;const seen=((D.teamSeen||{})[me.uid]||{})[ch]||0;return tmMsgs(ch).filter(m=>m.uid!==me.uid&&(m.t||0)>seen).length};
const tmUnreadAll=()=>TM_CH.reduce((n,c)=>n+tmUnread(c[0]),0);
function tmMarkSeen(ch){const me=supMe();if(!me||!tmUnread(ch))return;RT("teamSeen/"+me.uid+"/"+ch).set(Date.now()).catch(()=>{})}

function teamBody(){tmSubs();const me=supMe();if(!me)return `<section class="card stack"><p class="m0">This account doesn't have team access.</p></section>`;
 const ch=L.tmCh||"general",c=TM_CH.find(x=>x[0]===ch)||TM_CH[0],msgs=tmMsgs(ch),own=supIsOwner();setTimeout(()=>tmMarkSeen(ch),400);
 return `<section class="card stack"><h2 class="m0">Team</h2><p class="small muted m0">Messages for the Host Mode team only. Customers never see these.</p>
 <div class="row small" role="tablist">${TM_CH.map(([k,l])=>{const n=k===ch?0:tmUnread(k);return `<button class="btn xs ${k===ch?"primary":""}" role="tab" aria-selected="${k===ch}" data-act="tmCh" data-k="${k}">${l}${n?` <span class="pill warn">${n}</span>`:""}</button>`}).join("")}</div>
 <p class="small muted m0">${esc(c[2])}</p></section>
 <section class="card stack"><div class="stack tight tmlist">${msgs.length?msgs.slice(-100).map(m=>{const mine=m.uid===me.uid;
  return `<div class="tmmsg ${mine?"mine":""}"><div class="row between small"><b>${esc(m.name||"Someone")}${mine?" (you)":""}</b><span class="muted">${esc(supTime(m.t))}</span></div><p class="m0 tmtext">${esc(m.text||"")}</p>${own?(L.confirm==="tmx"+m.k?`<div class="row small"><span>Delete this message?</span><button class="btn xs gold" data-act="tmDel" data-k="${esc(m.k)}">Delete</button><button class="btn xs" data-act="cancelConfirm">Keep</button></div>`:`<button class="btn xs as" data-act="tmDel" data-k="${esc(m.k)}">Delete</button>`):""}</div>`}).join(""):`<p class="small muted m0">No messages in ${esc(c[1])} yet. Say hi!</p>`}</div>
 <label class="stack tight"><span class="small">Message to ${esc(c[1])}</span><textarea rows="3" data-draft="tm_${ch}" maxlength="1000" placeholder="Write a message">${esc(dv("tm_"+ch,""))}</textarea></label>
 <button class="btn primary as" data-act="tmSend" data-k="${ch}">Send</button></section>`}

/* ---- onboarding checklist ---- */
const ONB_ITEMS=[
 ["Getting set up",[
  ["login","Sign in with your support login","You're here, so this one's done. Tick it!"],
  ["claude","Set up your own Claude account","Use the Claude app on your computer. You'll need the desktop app for Blender."],
  ["github","Accept Roy's GitHub invite","Roy adds you to the Host Mode code on GitHub. Accept the email invite, then your Claude can work in the code."],
  ["brief","Have your Claude read CLAUDE.md first","CLAUDE.md in the code is the project brief: what Host Mode is, the decisions so far and the rules. Start every work session by asking your Claude to read it, and to update it and CHANGELOG.md when you finish. Start a fresh chat for each task to save tokens."],
  ["team","Say hi in the Team tab's General channel","That's where you and Roy talk. Post the pricing proposal in Approvals."]]],
 ["Blender and the 3D dashboard",[
  ["blender","Download Blender and install it on your desktop","It's free at blender.org. Get version 5.1 or newer, since the Claude connection needs it."],
  ["blendmcp","Connect Blender to Claude","Follow blender.org/lab/mcp-server: install the MCP add-on in Blender, turn on Preferences → System → Allow Online Access, then tap Start MCP Bridge Server. In the Claude desktop app, open Settings → Extensions and drag in Blender's extension file. Restart Claude."],
  ["dash3d","Upgrade the agent dashboard to 3D","The admin console's Agents tab is the agent office. Rebuild it as a 3D scene. The setting is your call: make it yours."]]],
 ["Your sales department",[
  ["read","Read the playbook and Sales Advantages in Resources","They hold the message, taglines, brand kit and the ideas that set Host Mode apart."],
  ["who","Decide who to sell to first","Single-event hosts, professional planners and venues, or both. It shapes everything else."],
  ["pricing","Write a pricing proposal for Roy","Post it in the Team tab's Approvals channel. Roy approves it before any price goes live."],
  ["salesdash","Build the sales dashboard","Vibe code it with your Claude in the sales part of the code (js/18-support-staff.js, the Sales section)."],
  ["tracker","Add your first leads to the lead tracker","The Sales tab is the lead tracker. Log every call and set a next step."],
  ["demo","Set up a demo event to show prospects","A copy of the baby shower setup with no real guest info. The planner demo is at games.html?pdemo=1#planner."],
  ["onepager","Make a one-page Host Mode overview","Lead with \"upload once and it goes where it belongs.\" Save it in Resources."],
  ["checkin","Set up a weekly check-in with Roy","Go over progress, leads and anything waiting for approval."]]],
 ["The sales agent",[
  ["budget","Plan your sales budget","Roy gives you a budget. Decide what's worth spending on, like the agent's API costs."],
  ["keys","Keep your API key out of the code","The code is public. Keys go in GitHub's secret settings, never in a file."],
  ["agent","Build the sales agent","It answers potential clients' questions in a chat on the site, using your own Anthropic account. It needs Roy's approval before it does anything big."]]]];
const ONB_LATER=["The sales agent walks people through a live demo","Phone calls to leads, using a calling service paid from the sales budget","Hand-offs between the sales and marketing agents, with Roy's approval"];
const onbAll=()=>ONB_ITEMS.reduce((a,g)=>a.concat(g[1]),[]);
const onbDone=uid=>{const d=(D.onboard||{})[uid]||{};return onbAll().filter(i=>d[i[0]]).length};

function onboardBody(){tmSubs();const me=supMe();if(!me)return `<section class="card stack"><p class="m0">This account doesn't have team access.</p></section>`;
 const own=supIsOwner(),team=Object.keys(D.staff||{}).filter(u=>D.staff[u].role!=="owner");
 const who=own?(L.onbWho&&team.includes(L.onbWho)?L.onbWho:team[0]):me.uid,total=onbAll().length;
 if(!who)return `<section class="card stack"><h2 class="m0">Onboarding</h2><p class="small muted m0">Each new teammate gets this checklist. Make a support code in the Support tab and it shows up here once they sign in.</p></section>`;
 const name=((D.staff||{})[who]||{}).name||"Teammate",d=(D.onboard||{})[who]||{},done=onbDone(who),open=L.onbOpen;
 return `<section class="card stack"><div class="row between"><h2 class="m0">${own?esc(name)+"'s onboarding":"Welcome, "+esc(name)+"!"}</h2><span class="pill ${done===total?"ok":"gold"}">${done} of ${total}</span></div>
 <p class="small muted m0">${own?"Tick items for them or watch their progress.":"Here's everything you need to get started. Tick each item as you finish it. Tap an item to see how."}</p>
 ${own&&team.length>1?`<div class="row small">${team.map(u=>`<button class="btn xs ${u===who?"primary":""}" data-act="onbWho" data-k="${esc(u)}">${esc((D.staff[u]||{}).name||"Teammate")}</button>`).join("")}</div>`:""}
 <div class="agbar"><i style="width:${Math.max(4,Math.round(done/total*100))}%;background:var(--ok,#3dae2b)"></i></div></section>
 ${ONB_ITEMS.map(([h,items])=>`<section class="card stack"><h3 class="m0">${esc(h)}</h3><div class="stack tight">${items.map(([k,l,how])=>{const on=!!d[k],ex=open===k;
  return `<div class="onb ${on?"done":""}"><div class="row between"><button class="btn xs onbtick" data-act="onbTick" data-k="${k}" aria-pressed="${on}" aria-label="${on?"Untick":"Tick"}: ${esc(l)}">${on?"✓":""}</button><button class="onbhead grow" data-act="onbOpen" data-k="${k}" aria-expanded="${ex}"><b>${esc(l)}</b></button></div>${ex?`<p class="small m0 onbhow">${esc(how)}</p>`:""}${on&&ex?`<p class="small muted m0">Done ${esc(supTime(d[k]))}</p>`:""}</div>`}).join("")}</div></section>`).join("")}
 <section class="card stack"><h3 class="m0">Where this is headed</h3><p class="small muted m0">Not for now. These come once the basics work.</p><ul class="small m0">${ONB_LATER.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`}

Object.assign(ACT,{
 tmCh:el=>{L.tmCh=el.dataset.k;L.confirm=null;render(true)},
 tmSend:async el=>{const ch=el.dataset.k,me=supMe(),text=String(dv("tm_"+ch,"")).trim().slice(0,1000);if(!me)return;if(!text)return toast("Write a message first");
  try{const now=Date.now();await RT("team/"+ch).push().set({text,uid:me.uid,name:me.name,t:now});await RT("teamSeen/"+me.uid+"/"+ch).set(now);delete L.drafts["tm_"+ch];render(true)}catch(e){toast("Couldn't send it. Check your connection.")}},
 tmDel:async el=>{const k=el.dataset.k,ch=L.tmCh||"general";if(!supIsOwner())return;if(L.confirm!=="tmx"+k){L.confirm="tmx"+k;return render(true)}L.confirm=null;await RT("team/"+ch+"/"+k).remove();toast("Deleted")},
 onbOpen:el=>{L.onbOpen=L.onbOpen===el.dataset.k?null:el.dataset.k;render(true)},
 onbWho:el=>{L.onbWho=el.dataset.k;L.onbOpen=null;render(true)},
 onbTick:async el=>{const me=supMe();if(!me)return;const own=supIsOwner(),team=Object.keys(D.staff||{}).filter(u=>D.staff[u].role!=="owner"),
  who=own?(L.onbWho&&team.includes(L.onbWho)?L.onbWho:team[0]):me.uid,k=el.dataset.k;if(!who||!onbAll().some(i=>i[0]===k))return;
  const on=!!(((D.onboard||{})[who]||{})[k]);try{await RT("onboard/"+who+"/"+k).set(on?null:Date.now());if(!on&&onbDone(who)+1===onbAll().length)toast("All done. Welcome to the team!")}catch(e){toast("Couldn't save it. Check your connection.")}}
});
