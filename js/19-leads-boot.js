/* ================= LEADS, SHOWCASE, REPORTS =================
   planners/{uid}/inquiries/{id} = {name, email, phone, type, date, guests, budget, msg, src, t, status: new|contacted|booked|lost, cid}
     anyone can add one (that is the inquiry form); only the planner reads or changes them
   planners/{uid}/showcase = {on, headline, about, pkgs:[{k,name,price,items}], reviews:[{text,name,rating}], t}   public
   planners/{uid}/showcase/gallery/{id} = {title, kind, date, story, t}   public
   planners/{uid}/showImg/{id}/{n} = shrunk JPEG as a data URL   public
   brand.book = the planner's Calendly or Google booking link */
D.inq={};D.show=null;D.showImg={};
const SH_MAX_EV=8,SH_MAX_PH=3;
const LEAD_ST={new:["New","warn"],contacted:["Contacted",""],booked:["Booked","ok"],lost:["Not booked",""]};
const inqList=()=>Object.keys(D.inq||{}).map(k=>Object.assign({k},D.inq[k])).sort((a,b)=>(b.t||0)-(a.t||0));
const inqNew=()=>inqList().filter(x=>(x.status||"new")==="new").length;
const showURL=mode=>location.origin+location.pathname.replace(/[^/]*$/,"")+"games.html?"+(window.__HMPDEMO?"pdemo=1&":"")+"p="+encodeURIComponent(PLID())+"&"+(mode==="form"?"inquire=1":"show=1");
const bookHref=b=>b&&b.book?(/^https?:\/\//i.test(b.book)?b.book:"https://"+b.book):"";
const shGallery=sh=>Object.keys((sh||{}).gallery||{}).map(k=>Object.assign({k},sh.gallery[k])).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||(b.t||0)-(a.t||0));
const shQuotes=()=>{const out=[];Object.values(D.fbk||{}).forEach(o=>Object.values(o||{}).forEach(x=>{if(x&&x.quote&&x.best)out.push({text:String(x.best).slice(0,400),name:String(x.name||"").slice(0,40),rating:+x.rating||0})}));return out};
const EV_KINDS=["Wedding","Baby shower","Birthday","Anniversary","Engagement party","Corporate event","Family reunion","Other"];

/* ---- planner: Leads tab ---- */
function plLeadsTab(){const l=inqList(),f=L.leadF||"open",cnt=k=>l.filter(x=>(x.status||"new")===k).length,booked=cnt("booked"),decided=booked+cnt("lost");
 const show=l.filter(x=>{const s=x.status||"new";return f==="all"||(f==="open"?s==="new"||s==="contacted":s===f)});
 const link=showURL("form"),embed=`<iframe src="${link}&embed=1" style="width:100%;height:860px;border:0" title="Event inquiry form"></iframe>`;
 return `<section class="card stack"><div class="row between"><h2>Leads</h2><span class="small muted">${l.length} total${decided?` · ${Math.round(booked/decided*100)}% booked`:""}</span></div>
 <p class="small muted m0">People who fill in your inquiry form show up here. Share the form link on your website, Instagram or business card, or send people to your Showcase page, which has the form built in.</p>
 <div class="stack tight"><b class="small">Your inquiry form</b><div class="row"><input type="text" class="grow" readonly value="${esc(link)}" aria-label="Inquiry form link"><button class="btn sm" data-act="copyLink" data-url="${esc(link)}">Copy</button><a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">Open</a></div>
 <details><summary class="small">Put the form on your own website</summary><p class="small muted">Paste this code into your website where you want the form to show.</p><textarea readonly rows="3" style="font-family:monospace;font-size:12px">${esc(embed)}</textarea><button class="btn xs as" data-act="copyLink" data-url="${esc(embed)}">Copy the code</button></details></div></section>
 <section class="card stack"><div class="row">${[["open","Open"],["new","New"],["booked","Booked"],["lost","Not booked"],["all","All"]].map(([k,lb])=>`<button class="btn xs ${f===k?"primary":""}" data-act="leadF" data-k="${k}">${lb}${k==="new"&&cnt("new")?` (${cnt("new")})`:""}</button>`).join("")}</div>
 ${show.length?`<div class="stack tight">${show.map(leadRow).join("")}</div>`:`<p class="small muted m0">${l.length?"Nothing in this list.":"No inquiries yet. Share your form link to start getting them."}</p>`}</section>`}
function leadRow(x){const st=x.status||"new",s=LEAD_ST[st]||LEAD_ST.new,open=L.leadOpen===x.k,msg=String(x.msg||"");
 const det=[x.type,x.date?clFmtDate(x.date):"",x.guests?x.guests+" guests":"",x.budget?"budget "+x.budget:""].filter(Boolean);
 return `<div class="mrow2 small stack tight"><div class="row between"><span class="mw0"><b>${esc(x.name)}</b> <span class="pill ${s[1]}">${s[0]}</span><span class="db muted">${esc(det.join(" · ")||"No event details yet")}</span></span><span class="muted">${esc(clAgo(x.t||0))}</span></div>
 ${msg?`<div style="white-space:pre-line">${esc(open||msg.length<=140?msg:msg.slice(0,140)+"…")}</div>`:""}
 ${open?`<div class="muted">${[x.email,x.phone,x.src?"came from your "+x.src:""].filter(Boolean).map(esc).join(" · ")}</div>`:""}
 <div class="row">${st!=="booked"?`<button class="btn xs primary" data-act="leadBook" data-k="${esc(x.k)}">Make a client</button>`:x.cid&&(D.clients||{})[x.cid]?`<button class="btn xs" data-act="plJump" data-k="clients" data-m="${esc(x.cid)}">Open client</button>`:""}${x.email?`<a class="btn xs" href="mailto:${esc(x.email)}?subject=${encodeURIComponent("Your event inquiry")}">Email</a>`:""}${x.phone?`<a class="btn xs" href="tel:${esc(String(x.phone).replace(/[^+\d]/g,""))}">Call</a>`:""}
 <select data-act="leadSt" data-k="${esc(x.k)}" aria-label="Status for ${esc(x.name)}">${Object.keys(LEAD_ST).map(k=>`<option value="${k}" ${st===k?"selected":""}>${LEAD_ST[k][0]}</option>`).join("")}</select>
 <button class="btn xs" data-act="leadOpen" data-k="${esc(x.k)}">${open?"Less":"More"}</button><button class="btn xs" data-act="leadDel" data-k="${esc(x.k)}">${L.confirm==="ld"+x.k?"Tap again to delete":"Delete"}</button></div></div>`}

/* ---- planner: Showcase tab ---- */
function plShowTab(){const sh=D.show||{},b=D.brand||{},v=k=>dv("sh_"+k,sh[k]||""),gal=shGallery(sh),pk=pkList(),q=shQuotes(),url=showURL("show");
 const chosen=L.shPk||new Set((sh.pkgs||[]).map(p=>p.k)),revOn=L.shRev!=null?L.shRev:sh.reviews?sh.reviews.length>0:true;
 return `<section class="card stack"><div class="row between"><h2>Showcase</h2><span class="pill ${sh.on?"ok":""}">${sh.on?"Published":"Not published yet"}</span></div>
 <p class="small muted m0">A public page that sells your business: your story, photos of past events, your packages, client reviews and an inquiry form. Every inquiry from it lands in Leads.</p>
 ${sh.on?`<div class="row"><input type="text" class="grow" readonly value="${esc(url)}" aria-label="Showcase link"><button class="btn sm" data-act="copyLink" data-url="${esc(url)}">Copy</button><a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">View</a></div>`:""}
 <label class="stack tight"><span class="small">Headline</span><input type="text" data-draft="sh_headline" maxlength="80" value="${esc(v("headline"))}" placeholder="${esc(b.name?b.name+": events people talk about for years":"Events people talk about for years")}"></label>
 <label class="stack tight"><span class="small">About you</span><textarea rows="5" data-draft="sh_about" maxlength="1500" placeholder="Who you are, what you love planning, and what makes working with you different.">${esc(v("about"))}</textarea></label>
 <p class="small muted m0">Your logo, tagline, contact details and booking link come from Branding. ${b.book?"":`<button class="btn xs" data-act="plJump" data-k="brand">Add a booking link</button>`}</p></section>
 <section class="card stack"><h3>Cover photo</h3>${(()=>{const cv=Object.values((D.showImg||{}).cover||{}).filter(Boolean)[0];return cv?`<img src="${esc(cv)}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px"><div class="row"><label class="btn xs upl">Change<input type="file" accept="image/*" data-act="shCover"></label><button class="btn xs" data-act="shCoverDel">Remove</button></div>`:`<p class="small muted m0">One wide photo across the top of your page. Your best event photo works well.</p><label class="btn sm upl as">Add a cover photo<input type="file" accept="image/*" data-act="shCover"></label>`})()}</section>
 <section class="card stack"><div class="row between"><h3>Past events</h3><span class="small muted">${gal.length} of ${SH_MAX_EV}</span></div>
 ${gal.length?`<div class="stack tight">${gal.map(shGalRow).join("")}</div>`:'<p class="small muted m0">Add the events you are proudest of. A title, a few photos and a short story is plenty.</p>'}
 ${gal.length<SH_MAX_EV?`<details ${L.shAdd?"open":""}><summary class="small"><b>Add a past event</b></summary><div class="stack tight" style="margin-top:8px"><div class="grid2 g8"><label class="stack tight" style="grid-column:1/-1"><span class="small">Title</span><input type="text" data-draft="sg_title" maxlength="80" value="${esc(dv("sg_title",""))}" placeholder="The Whelan wedding at the Mint Museum"></label>
  <label class="stack tight"><span class="small">Type</span><select data-draft="sg_kind"><option value="">Pick one</option>${EV_KINDS.map(x=>`<option ${dv("sg_kind","")===x?"selected":""}>${x}</option>`).join("")}</select></label><label class="stack tight"><span class="small">Date</span><input type="date" data-draft="sg_date" value="${esc(dv("sg_date",""))}"></label>
  <label class="stack tight" style="grid-column:1/-1"><span class="small">The story</span><textarea rows="3" data-draft="sg_story" maxlength="600" placeholder="What the client wanted and how you pulled it off.">${esc(dv("sg_story",""))}</textarea></label></div>
  <button class="btn primary as" data-act="shGalAdd">Add event</button><span class="small muted">You can add photos once it's saved.</span></div></details>`:""}
 <p class="small muted m0">Up to ${SH_MAX_PH} photos per event. Photos are made smaller when you add them, and they show on your page right away.</p></section>
 <section class="card stack"><h3>Packages to show</h3>${pk.length?`<div class="stack tight">${pk.map(p=>`<label class="row small"><input type="checkbox" data-act="shPk" data-k="${esc(p.k)}" ${chosen.has(p.k)?"checked":""}> ${esc(p.name)} · ${clMoney(p.price)}</label>`).join("")}</div>`:'<p class="small muted m0">Make packages in the Packages tab first.</p>'}</section>
 <section class="card stack"><h3>Reviews</h3>${q.length?`<label class="row small"><input type="checkbox" data-act="shRev" ${revOn?"checked":""}> Show the ${q.length} review${q.length===1?"":"s"} you featured in Feedback</label>${q.slice(0,2).map(r=>`<blockquote class="shq small"><p class="m0">“${esc(r.text)}”</p>${r.name?`<span class="muted">${esc(r.name)}</span>`:""}</blockquote>`).join("")}`:'<p class="small muted m0">Reviews you mark ★ Featured in the Feedback tab show up here.</p>'}</section>
 <section class="card stack"><div class="row"><button class="btn primary" data-act="shPublish">${sh.on?"Publish changes":"Publish my page"}</button>${sh.on?`<button class="btn" data-act="shOff">${L.confirm==="shoff"?"Tap again to unpublish":"Unpublish"}</button>`:""}</div><span class="small muted">The headline, about, packages and reviews go live when you publish.</span></section>`}
function shGalRow(g){const ph=D.showImg[g.k]||{},ks=Object.keys(ph).filter(n=>ph[n]);
 return `<div class="mrow2 stack tight"><div class="row between"><b>${esc(g.title)}</b><button class="btn xs" data-act="shGalDel" data-k="${esc(g.k)}">${L.confirm==="sg"+g.k?"Tap again to delete":"Delete"}</button></div>
 ${g.kind||g.date?`<span class="small muted">${esc([g.kind,g.date?clFmtDate(g.date):""].filter(Boolean).join(" · "))}</span>`:""}${g.story?`<p class="small m0">${esc(g.story)}</p>`:""}
 <div class="row">${ks.map(n=>`<span class="shthumb"><img src="${esc(ph[n])}" alt=""><button class="btn xs" data-act="shImgDel" data-k="${esc(g.k)}" data-n="${esc(n)}" aria-label="Remove photo">×</button></span>`).join("")}${ks.length<SH_MAX_PH?`<label class="btn xs upl">Add photo<input type="file" accept="image/*" data-act="shImg" data-k="${esc(g.k)}"></label>`:""}</div></div>`}

/* ---- planner: Reports tab ---- */
function rpMonths(){const n=new Date(),out=[];for(let i=11;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1);out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)}return out}
const rpMo=t=>{const d=new Date(t);return isNaN(d)?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
function rpBars(ms,vals,fmt,label){const W=360,H=150,top=22,base=H-24,max=Math.max(1,...vals),bw=W/ms.length;
 const bars=ms.map((m,i)=>{const v=vals[i]||0,h=v?Math.max(3,(base-top)*v/max):0,x=i*bw+4,mon=new Date(m+"-15T12:00").toLocaleDateString(undefined,{month:"short"});
  return `<g><title>${esc(mon+" "+m.slice(0,4)+": "+fmt(v))}</title>${h?`<rect x="${x.toFixed(1)}" y="${(base-h).toFixed(1)}" width="${(bw-8).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="var(--btn1)"/>`:""}${v?`<text x="${(x+(bw-8)/2).toFixed(1)}" y="${(base-h-5).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink)">${esc(fmt(v,true))}</text>`:""}<text x="${(x+(bw-8)/2).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--muted)">${esc(mon)}</text></g>`}).join("");
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" style="width:100%;height:auto;display:block"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--line)"/>${bars}</svg>`}
const rpShort=(v,short)=>short&&v>=1000?"$"+(Math.round(v/100)/10)+"k":clMoney(v);
function plReports(){const cs=D.clients||{},ids=Object.keys(cs),ms=rpMonths(),inYear=m=>ms.includes(m);
 const paid={},newC={},open={sum:0,n:0};let paidSum=0,bookedVal=0;
 ids.forEach(id=>invList(id).forEach(x=>{if(invIsPaid(id,x)){const m=rpMo(x.paidAt||Date.parse((x.issued||"")+"T12:00")||x.t);if(inYear(m)){paid[m]=(paid[m]||0)+(+x.total||0);paidSum+=+x.total||0}}else{open.sum+=+x.total||0;open.n++}}));
 const pk={};ids.forEach(id=>{const c=cs[id],m=rpMo(c.t||0);if(inYear(m))newC[m]=(newC[m]||0)+1;if(c.pkg&&c.pkg.name){const o=pk[c.pkg.name]=pk[c.pkg.name]||{n:0,v:0};o.n++;o.v+=+c.pkg.price||0;if(inYear(m))bookedVal+=+c.pkg.price||0}});
 const pks=Object.keys(pk).map(n=>Object.assign({name:n},pk[n])).sort((a,b)=>b.n-a.n||b.v-a.v),pmax=Math.max(1,...pks.map(p=>p.n));
 const lds=inqList(),src={};lds.forEach(x=>{const s=x.src||"other";src[s]=(src[s]||0)+1});const won=lds.filter(x=>x.status==="booked").length,lost=lds.filter(x=>x.status==="lost").length;
 const newSum=ms.reduce((n,m)=>n+(newC[m]||0),0);
 return `<section class="card stack"><h2>Reports</h2><p class="small muted m0">The last 12 months, from your invoices, clients, packages and leads.</p>
 <div class="stats"><div class="stat"><b>${clMoney(paidSum)}</b><span>Collected from paid invoices</span></div><div class="stat"><b>${clMoney(open.sum)}</b><span>${open.n} open invoice${open.n===1?"":"s"}</span></div><div class="stat"><b>${clMoney(bookedVal)}</b><span>Package value booked</span></div><div class="stat"><b>${won+lost?Math.round(won/(won+lost)*100)+"%":"–"}</b><span>Leads booked</span></div></div></section>
 <section class="card stack"><h3>Collected by month</h3>${paidSum?rpBars(ms,ms.map(m=>paid[m]||0),rpShort,"Money collected from paid invoices, by month"):'<p class="small muted m0">Paid invoices will show here.</p>'}</section>
 <section class="card stack"><h3>New clients by month</h3>${newSum?rpBars(ms,ms.map(m=>newC[m]||0),v=>String(v),"New clients, by month"):'<p class="small muted m0">New clients will show here.</p>'}</section>
 <section class="card stack"><h3>Best-selling packages</h3>${pks.length?`<div class="stack tight">${pks.map(p=>`<div class="small"><div class="row between"><b>${esc(p.name)}</b><span class="muted">${p.n} client${p.n===1?"":"s"} · ${clMoney(p.v)}</span></div><div class="rpbar"><i style="width:${Math.round(p.n/pmax*100)}%"></i></div></div>`).join("")}</div>`:'<p class="small muted m0">Add a package to a client and it shows here.</p>'}</section>
 <section class="card stack"><h3>Where leads come from</h3>${lds.length?`<div class="stack tight">${Object.keys(src).sort((a,b)=>src[b]-src[a]).map(s=>`<div class="row between small"><span>Your ${esc(s)}</span><b>${src[s]}</b></div>`).join("")}</div><span class="small muted">${won} booked · ${lost} not booked · ${lds.length-won-lost} still open</span>`:'<p class="small muted m0">Inquiries from your form and Showcase page show here.</p>'}</section>`}

/* ---- public: the Showcase page and the inquiry form (games.html?p=<planner>&show=1 or &inquire=1) ---- */
function shConnect(){if(!PSP){L.loaded=true;renderSoon();return}
 RT(PSP+"brand").on("value",s=>{D.brand=s.val();applyTheme();renderSoon()});
 if(!QS.has("inquire"))RT(PSP+"showImg/cover").once("value").then(x=>{D.showImg.cover=x.val()||{};renderSoon()}).catch(()=>{});
 RT(PSP+"showcase").on("value",s=>{D.show=s.val();L.loaded=true;if(!QS.has("inquire"))shGallery(D.show).forEach(g=>{if(!D.showImg[g.k]){D.showImg[g.k]={};RT(PSP+"showImg/"+g.k).once("value").then(x=>{D.showImg[g.k]=x.val()||{};renderSoon()}).catch(()=>{})}});renderSoon()},()=>{L.loaded=true;renderSoon()})}
function inqForm(solo){const b=D.brand||{},d=k=>esc(dv("iq_"+k,"")),bk=bookHref(b),nm=b.name||"the planner";
 if(L.inqDone)return `<section class="card stack" id="inquire"><h3 class="m0">Thank you!</h3><p class="m0">${esc(nm)} will get back to you soon.</p>${bk?`<a class="btn primary as" href="${esc(bk)}" target="_blank" rel="noopener">Book a meeting now</a>`:""}</section>`;
 const f=(k,l,tp,ph,mx,req)=>`<label class="stack tight"><span class="small">${l}${req?" *":""}</span><input type="${tp}" data-draft="iq_${k}" value="${d(k)}" placeholder="${esc(ph)}" maxlength="${mx}"${req?" required":""}></label>`;
 return `<section class="card stack" id="inquire">${solo&&(b.logo||b.name)?`<div class="row">${b.logo?`<img class="brandlogo" src="${esc(b.logo)}" alt="">`:""}<b>${esc(b.name||"")}</b></div>`:""}<h3 class="m0">Tell us about your event</h3><p class="small muted m0">Fill this in and ${esc(nm)} will get back to you.</p>
 <div class="grid2 g8">${f("name","Your name","text","Maya Jordan",80,1)}${f("email","Email","email","you@example.com",120,1)}${f("phone","Phone","tel","704-555-0100",30)}
 <label class="stack tight"><span class="small">Type of event</span><select data-draft="iq_type"><option value="">Pick one</option>${EV_KINDS.map(x=>`<option ${dv("iq_type","")===x?"selected":""}>${x}</option>`).join("")}</select></label>
 ${f("date","Event date","date","",10)}${f("guests","About how many guests","number","100",6)}${f("budget","Budget (optional)","text","$5,000",30)}</div>
 <label class="stack tight"><span class="small">Anything else we should know?</span><textarea rows="4" data-draft="iq_msg" maxlength="2000" placeholder="Theme, venue ideas, questions…">${d("msg")}</textarea></label>
 <input type="text" data-draft="iq_hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">
 <button class="btn primary" data-act="inqSend">Send</button>${bk?`<a class="btn as" href="${esc(bk)}" target="_blank" rel="noopener">Or book a meeting</a>`:""}<p class="small muted m0">Your details only go to ${esc(nm)}.</p></section>`}
function showView(){if(!PSP)return `<section class="card stack narrow"><h2>This link isn't working</h2><p class="muted m0">Ask for the link again.</p></section>`;
 if(!L.loaded)return loadingView();
 const b=D.brand||{},sh=D.show||{},bk=bookHref(b),foot=`<p class="small muted tc">Powered by Host Mode${window.__HMPDEMO?' · Demo photos from <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>':""}</p>`;
 if(QS.has("inquire"))return inqForm(true)+foot;
 if(!sh.on)return `<section class="card stack narrow"><h2>${esc(b.name||"Coming soon")}</h2><p class="muted m0">This page isn't published yet. You can still send an inquiry.</p></section>`+inqForm(false)+foot;
 const gal=shGallery(sh),links=brLinks(b),cov=Object.values(D.showImg.cover||{}).filter(Boolean)[0];
 return `${cov?`<section class="card shcovercard"><img class="shcover" src="${esc(cov)}" alt="${esc(b.name||"")}"></section>`:""}<section class="card stack shhero">${b.logo?`<img class="shlogo" src="${esc(b.logo)}" alt="${esc(b.name||"")}">`:""}<h2 class="m0">${esc(sh.headline||b.name||"")}</h2>${b.tag?`<p class="muted m0">${esc(b.tag)}</p>`:""}${b.city?`<p class="small muted m0">${esc(b.city)}</p>`:""}
 <div class="row" style="justify-content:center"><a class="btn primary" href="#inquire" data-act="shGoForm">Ask about your event</a>${bk?`<a class="btn" href="${esc(bk)}" target="_blank" rel="noopener">Book a meeting</a>`:""}</div>${sh.about?`<p class="m0" style="white-space:pre-line;text-align:left">${esc(sh.about)}</p>`:""}</section>
 ${gal.length?`<section class="card stack"><h3>Past events</h3><div class="stack">${gal.map(g=>{const ph=Object.values(D.showImg[g.k]||{}).filter(Boolean);return `<div class="stack tight shev">${ph.length?`<div class="shgal">${ph.map(src=>`<img src="${esc(src)}" alt="${esc(g.title)}" loading="lazy">`).join("")}</div>`:""}<b>${esc(g.title)}</b>${g.kind||g.date?`<span class="small muted">${esc([g.kind,g.date?clFmtDate(g.date):""].filter(Boolean).join(" · "))}</span>`:""}${g.story?`<p class="m0 small" style="white-space:pre-line">${esc(g.story)}</p>`:""}</div>`}).join("")}</div></section>`:""}
 ${(sh.pkgs||[]).length?`<section class="card stack"><h3>Packages</h3><div class="stack tight">${sh.pkgs.map(p=>`<div class="mrow2"><div class="row between"><b>${esc(p.name)}</b><b>${clMoney(p.price)}</b></div>${pkLines(p).length?`<ul class="small m0">${pkLines(p).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</div>`).join("")}</div></section>`:""}
 ${(sh.reviews||[]).length?`<section class="card stack"><h3>What clients say</h3><div class="stack tight">${sh.reviews.map(r=>`<blockquote class="shq"><p class="m0">“${esc(r.text)}”</p><span class="small muted">${"★".repeat(Math.max(0,Math.min(5,Math.round(+r.rating||0))))}${r.name?" · "+esc(r.name):""}</span></blockquote>`).join("")}</div></section>`:""}
 ${inqForm(false)}
 ${links.length?`<section class="card stack"><h3>Contact</h3><div class="row small">${links.map(([h,l])=>`<a class="btn xs" href="${esc(h)}" target="_blank" rel="noopener">${esc(l)}</a>`).join("")}</div></section>`:""}${foot}`}

Object.assign(ACT,{
 leadF:el=>{L.leadF=el.dataset.k;render(true)},
 leadOpen:el=>{L.leadOpen=L.leadOpen===el.dataset.k?null:el.dataset.k;render(true)},
 leadSt:async el=>{await RT(PSP+"inquiries/"+el.dataset.k+"/status").set(el.value);toast("Marked "+LEAD_ST[el.value][0].toLowerCase())},
 leadDel:async el=>{const k=el.dataset.k;if(L.confirm!=="ld"+k){L.confirm="ld"+k;return render(true)}L.confirm=null;await RT(PSP+"inquiries/"+k).remove();toast("Lead deleted")},
 leadBook:async el=>{const k=el.dataset.k,x=(D.inq||{})[k];if(!x)return;const tm=Date.now(),r=RT(PSP+"clients").push();
  const o={name:String(x.name||"New client").slice(0,40),ev:"",evName:"",date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:"",t:tm,lead:k};
  if(x.email)o.email=String(x.email).slice(0,120);if(x.phone)o.phone=String(x.phone).slice(0,40);if(x.type)o.evType=String(x.type).slice(0,40);if(+x.guests>0)o.guests=Math.round(+x.guests);
  const bd=imNum(x.budget);if(bd)o.budget=bd;o.notes=[x.msg,"Came in through your "+(x.src||"inquiry form")+"."].filter(Boolean).join("\n").slice(0,1000);
  await r.set(o);await RT(PSP+"inquiries/"+k).update({status:"booked",cid:r.key});toast(o.name+" is now a client. Send them their link.");
  /* wait until the new client is in the list, then land on it */
  let n=0;const go=()=>{if((D.clients||{})[r.key]||n++>20)ACT.plJump({dataset:{k:"clients",m:r.key,s:"list"}});else setTimeout(go,100)};go()},
 shPk:el=>{const sh=D.show||{};if(!L.shPk)L.shPk=new Set((sh.pkgs||[]).map(p=>p.k));if(el.checked)L.shPk.add(el.dataset.k);else L.shPk.delete(el.dataset.k)},
 shRev:el=>{L.shRev=el.checked},
 shGalAdd:async()=>{const title=dv("sg_title","").trim().slice(0,80);if(!title)return toast("Give the event a title");if(shGallery(D.show).length>=SH_MAX_EV)return toast(`You can show up to ${SH_MAX_EV} events`);
  await RT(PSP+"showcase/gallery").push().set({title,kind:dv("sg_kind",""),date:dv("sg_date",""),story:dv("sg_story","").trim().slice(0,600),t:Date.now()});
  ["sg_title","sg_kind","sg_date","sg_story"].forEach(k=>delete L.drafts[k]);L.shAdd=false;toast("Added. Now add a few photos.");render(true)},
 shGalDel:async el=>{const k=el.dataset.k;if(L.confirm!=="sg"+k){L.confirm="sg"+k;return render(true)}L.confirm=null;await RT(PSP+"showcase/gallery/"+k).remove();await RT(PSP+"showImg/"+k).remove();toast("Removed")},
 shImg:async el=>{const k=el.dataset.k,f=el.files&&el.files[0];el.value="";if(!f)return;if(!/^image\//.test(f.type))return toast("That isn't a photo");if(Object.keys((D.showImg||{})[k]||{}).length>=SH_MAX_PH)return toast(`Up to ${SH_MAX_PH} photos per event`);
  toast("Adding the photo…");try{let r=await clShrink(f,1200,.78);if(r.data.length>380000)r=await clShrink(f,900,.7);await RT(PSP+`showImg/${k}/p${Date.now().toString(36)}`).set(r.data);toast("Photo added")}catch(e){toast("Couldn't add that photo")}},
 shCover:async el=>{const f=el.files&&el.files[0];el.value="";if(!f)return;if(!/^image\//.test(f.type))return toast("That isn't a photo");toast("Adding the cover photo…");
  try{let r=await clShrink(f,1600,.8);if(r.data.length>520000)r=await clShrink(f,1200,.74);await RT(PSP+"showImg/cover").set({p:r.data});toast("Cover photo added")}catch(e){toast("Couldn't add that photo")}},
 shCoverDel:async()=>{await RT(PSP+"showImg/cover").remove();toast("Cover photo removed")},
 shImgDel:async el=>{await RT(PSP+`showImg/${el.dataset.k}/${el.dataset.n}`).remove()},
 shPublish:async()=>{const sh=D.show||{},chosen=L.shPk||new Set((sh.pkgs||[]).map(p=>p.k)),revOn=L.shRev!=null?L.shRev:sh.reviews?sh.reviews.length>0:true;
  const pkgs=pkList().filter(p=>chosen.has(p.k)).map(p=>({k:p.k,name:p.name,price:+p.price||0,items:p.items||""}));
  await RT(PSP+"showcase").update({on:true,headline:dv("sh_headline",sh.headline||"").trim().slice(0,80),about:dv("sh_about",sh.about||"").trim().slice(0,1500),pkgs,reviews:revOn?shQuotes().slice(0,6):[],t:Date.now()});
  ["sh_headline","sh_about"].forEach(k=>delete L.drafts[k]);L.shPk=null;L.shRev=null;toast(sh.on?"Changes published":"Your page is live");render(true)},
 shOff:async()=>{if(L.confirm!=="shoff"){L.confirm="shoff";return render(true)}L.confirm=null;await RT(PSP+"showcase/on").set(false);toast("Your page is unpublished")},
 shGoForm:(el,e)=>{const s=document.getElementById("inquire");if(s)s.scrollIntoView({behavior:reduceMotion()?"auto":"smooth",block:"start"})},
 inqSend:async()=>{const g=(k,n)=>String(dv("iq_"+k,"")).trim().slice(0,n),name=g("name",80),email=g("email",120).toLowerCase();
  if(g("hp",60))return;if(!name)return toast("Type your name");if(!email||!imOkEmail(email))return toast("Type your email so they can reply");
  if(Date.now()-(+(store.get("inqLast_"+PLID(),0))||0)<60000)return toast("Thanks, your inquiry was already sent");
  const dt=g("date",10),o={name,email,phone:g("phone",30),type:g("type",40),date:/^\d{4}-\d{2}-\d{2}$/.test(dt)?dt:"",guests:Math.max(0,parseInt(g("guests",6),10)||0),budget:g("budget",30),msg:g("msg",2000),src:QS.has("inquire")?(QS.has("embed")?"website form":"form link"):"Showcase page",status:"new",t:Date.now()};
  try{await RT(PSP+"inquiries").push().set(o)}catch(e){return toast("Couldn't send. Check your connection and try again.")}
  store.set("inqLast_"+PLID(),Date.now());Object.keys(L.drafts).filter(k=>k.startsWith("iq_")).forEach(k=>delete L.drafts[k]);L.inqDone=true;render(true);
  const s=document.getElementById("inquire");if(s)s.scrollIntoView({block:"center"})},
 calIcs:()=>{const today=mateToday(),items=plCalItems().filter(x=>x.date>=clDays(-30)).map((x,i)=>({k:"c"+i,date:x.date,time:x.time||"",title:CAL_K[x.kind][1]+": "+x.title,note:x.who}));
  if(!items.length)return toast("Nothing on your calendar yet");clDownload("host-mode-calendar.ics",clIcs(items,((D.plMe||{}).biz||"Host Mode")+" calendar"),"text/calendar");toast("Open the file to add it to your calendar app")}
});

/* the public page's header carries the planner's brand, not an event's title */
const _hvShow=headerView;headerView=function(){const h=_hvShow();if(VIEW!=="show")return h;const b=D.brand||{};document.title=(b.name||"Host Mode")+(QS.has("inquire")?" · Inquiry":"");
 return h.replace(/<div class="brand">[\s\S]*?<\/div>/,`<div class="brand"><h1 class="brandrow">${b.logo?`<img class="brandlogo" src="${esc(b.logo)}" alt="">`:""}${esc(b.name||"Host Mode")}</h1>${b.tag?`<p>${esc(b.tag)}</p>`:""}</div>`)};

/* scroll so a section sits just under anything fixed at the top (the demo bar), then flash it so the eye finds it */
function plLand(sec,smooth){if(!sec){scrollTo({top:0,behavior:"auto"});return}
 const bar=document.querySelector(".demobar"),off=(bar&&getComputedStyle(bar).position==="fixed"?bar.getBoundingClientRect().bottom:0)+12;
 scrollTo({top:Math.max(0,sec.getBoundingClientRect().top+scrollY-off),behavior:smooth&&!reduceMotion()?"smooth":"auto"});
 sec.classList.remove("landed");void sec.offsetWidth;sec.classList.add("landed")}
/* the planner's contact details, from Branding, on the client portal */
function brContactCard(){const b=D.brand||{},links=brLinks(b),bk=bookHref(b);if(!links.length&&!b.tag&&!bk)return "";
 return `<section class="card stack"><h3>Your planner</h3><div class="row">${b.logo?`<img class="brandlogo" src="${esc(b.logo)}" alt="">`:""}<div class="mw0"><b>${esc(b.name||"")}</b>${b.tag?`<div class="small muted">${esc(b.tag)}</div>`:""}${b.city?`<div class="small muted">${esc(b.city)}</div>`:""}</div></div>${bk?`<a class="btn primary as" href="${esc(bk)}" target="_blank" rel="noopener">Book a meeting</a>`:""}${links.length?`<div class="row small">${links.map(([h,l])=>`<a class="btn xs" href="${esc(h)}" target="_blank" rel="noopener">${esc(l)}</a>`).join("")}</div>`:""}</section>`}
function brLinks(b){const o=[];if(b.phone)o.push(["tel:"+String(b.phone).replace(/[^+\d]/g,""),b.phone]);if(b.email)o.push(["mailto:"+b.email,b.email]);
 if(b.web)o.push([/^https?:\/\//i.test(b.web)?b.web:"https://"+b.web,String(b.web).replace(/^https?:\/\//i,"").replace(/\/$/,"")]);
 if(b.ig)o.push(["https://instagram.com/"+b.ig,"Instagram @"+b.ig]);if(b.fb)o.push([/^https?:\/\//i.test(b.fb)?b.fb:"https://facebook.com/"+b.fb,"Facebook"]);return o}
Object.assign(ACT,{
 plJump:el=>{const k=el.dataset.k,id=el.dataset.m;L.plTab=k;if(el.dataset.d){L.vSel=el.dataset.d;L.vYM=el.dataset.d.slice(0,7)}L.confirm=null;if(id){L.cliOpen=id;L.cliTab=el.dataset.s||"list";L.landId=id;L.landT=Date.now()}render(true);
  const t=id&&document.querySelector(`[data-act="cliOpen"][data-k="${CSS.escape(id)}"]`);plLand(t&&t.closest("section"),false)},
 plScroll:el=>plLand(document.getElementById(el.dataset.k),true),
 calMove:el=>{const d=+el.dataset.k,t=mateToday().slice(0,7);if(!d){L.calYM=t;L.calSel=null;return render(true)}const [y,m]=(L.calYM||t).split("-").map(Number),n=new Date(y,m-1+d,1);L.calYM=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;L.calSel=null;render(true)},
 calSel:el=>{L.calSel=el.dataset.k;render(true)},
 seSave:async()=>{const me=D.plMe||{},g=(k,v,n)=>dv(k,v||"").trim().slice(0,n),name=g("se_name",me.name,40);if(!name)return toast("Type your name");const em=g("se_email",me.email,120);if(em&&!imOkEmail(em))return toast("That email doesn't look right");
  await RT(PSP+"profile").update({name,biz:g("se_biz",me.biz,60),email:em,phone:g("se_phone",me.phone,30)});["se_name","se_biz","se_email","se_phone"].forEach(k=>delete L.drafts[k]);toast("Profile saved");render(true)},
 seInv:async()=>{const st=D.invSet||{},n=parseInt(String(dv("se_next",st.next||1001)).replace(/\D/g,""),10);if(!(n>=1&&n<=9999999))return toast("Use a whole number, like 1001");
  await RT(PSP+"invSettings").update({next:n,pay:dv("se_pay",st.pay||"").trim().slice(0,400)});["se_next","se_pay"].forEach(k=>delete L.drafts[k]);toast("Invoice settings saved");render(true)}
});


/* ---- creating an event from the planner portal: no invite code, and it lands in the portal ---- */
if(VIEW==="new"&&QS.get("planner")==="1"){
 {const tq=QS.get("tpl");if(tq)setTimeout(()=>{if(EVENT_TEMPLATES[tq]&&!L.drafts.nw_tpl)ACT.nwTpl({dataset:{k:tq}})},400)}
 const setPl=uid=>{L.newPl=uid;L.newInv="PLANNER";renderSoon()};
 if(window.__HMPDEMO)setPl("northlight");
 else setTimeout(()=>{const a=AUTH(),asU=QS.get("as")||"";if(a)a.onAuthStateChanged(async u=>{if(u&&/^[A-Za-z0-9_-]{1,64}$/.test(asU)){const ow=await RT("owner").once("value").catch(()=>null);if(ow&&ow.val()===u.uid){setPl(asU);return}}if(u)RT("planners/"+u.uid+"/profile").once("value").then(s=>{if(s.val())setPl(u.uid)}).catch(()=>{})})},0)}

/* ================= CLIENT EXPORTS =================
   Export client: one spreadsheet (a tab per section) and, when the client sent files, a zip with the spreadsheet and the files.
   Export all clients: one spreadsheet, a row per client. Only the signed-in planner's own clients are ever included. */
const xEsc=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"");
function xCol(i){let s="";i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
function xSheet(rows){const w=[];rows.forEach(r=>r.forEach((v,i)=>{const l=Math.min(60,String(v==null?"":v).length+2);w[i]=Math.max(w[i]||8,l)}));
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${w.map((x,i)=>`<col min="${i+1}" max="${i+1}" width="${x}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>{const ref=xCol(ci)+(ri+1),st=ri===0?' s="1"':"";if(v==null||v==="")return `<c r="${ref}"${st}/>`;if(typeof v==="number"&&isFinite(v))return `<c r="${ref}"${st}><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xEsc(v)}</t></is></c>`}).join("")}</row>`).join("")}</sheetData></worksheet>`}
async function xlsxBlob(sheets){const z=new JSZip();const names=sheets.map((s,i)=>String(s.name).replace(/[\\\/\?\*\[\]:]/g," ").slice(0,31)||"Sheet"+(i+1));
 z.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
 z.file("_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
 z.file("xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${xEsc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`);
 z.file("xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
 z.file("xl/styles.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0C2147"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
 sheets.forEach((s,i)=>z.file(`xl/worksheets/sheet${i+1}.xml`,xSheet(s.rows.length?s.rows:[["(empty)"]])));
 return z.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})}
const xDay=t=>t?new Date(t).toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
const xFile=s=>String(s||"client").replace(/&/g," and ").replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g," ").slice(0,60)||"client";
function clExportSheets(id){const c=(D.clients||{})[id]||{},st=clStats(id,true),ps=clPayStats(id),ev=c.ev&&(D.events||{})[c.ev];
 const nextPay=clPays(id).find(x=>!x.paid&&x.due);
 const summary=[["Field","Value"],["Client",c.name||""],["Event",c.evName||(ev&&ev.name)||""],["Event code",c.ev||""],["Event date",c.date||""],["Client link",clLink(id)],["Checklist done",st.done],["Checklist items",st.total],["Overdue items",clTasksOf(id,true).filter(clLate).length],["Paid",ps.paid],["Still owed",ps.left],["Next payment due",nextPay?`${nextPay.title} ${clMoney(nextPay.amount)} on ${nextPay.due}`:""],["Approvals waiting",clApPending(id)],["Messages",clMsgsOf(id).length],["Files",clFilesOf(id).length],["Client since",xDay(c.t)],["Exported",xDay(Date.now())]];
 const tasks=[["Task","Who","Due","Status","Done on","Note","Client can see it"]].concat(clTasksOf(id,true).map(x=>[x.title,x.owner==="client"?"Client":"Planner",x.due||"",x.done?"Done":clLate(x)?"Overdue":"Open",x.done?xDay(x.doneAt):"",x.note||"",x.show||x.owner==="client"?"Yes":"No"]));
 const pays=[["Payment","Amount","Due","Status","Paid on","Note"]].concat(clPays(id).map(x=>[x.title,+x.amount||0,x.due||"",x.paid?"Paid":(x.due&&x.due<mateToday()?"Overdue":"Due"),x.paid?xDay(x.paidAt):"",x.note||""]));
 const dates=[["What","Date","Time","Note"]].concat(clDates(id).map(x=>[x.title,x.date||"",x.time?clFmtTime(x.time):"",x.note||""]));
 const vend=[["Vendor","Role","Phone","Email","Arrives","Bringing","Note","Client sees","Teammates see"]].concat(clVendors(id).map(v=>[v.name,v.role||"",v.phone||"",v.email||"",v.arrive?clFmtTime(v.arrive):"",v.delivers||"",v.note||"",v.show?"Yes":"No",v.team?"Yes":"No"]));
 const hl={sent:"Sent",revised:"Revised version sent",approved:"Approved",changes:"Changes requested"};
 const aps=[["Item","Status","Version","Sent","Decided","File","Note","History"]].concat(clAps(id).map(a=>[a.title,{pending:"Waiting for the client",approved:"Approved",changes:"Changes requested"}[a.status]||a.status,a.version||1,xDay(a.t),a.decidedAt?xDay(a.decidedAt):"",a.fileName||"",a.note||"",Object.values(a.hist||{}).sort((x,y)=>(x.t||0)-(y.t||0)).map(h=>`${hl[h.s]||h.s} ${xDay(h.t)}${h.c?` ("${h.c}")`:""}`).join("; ")]));
 const msgs=[["When","From","Message"]].concat(clMsgsOf(id).map(m=>[xDay(m.t),m.from==="client"?(c.name||"Client"):"You",m.text||""]));
 const files=[["File","Type","Size","From","Uploaded","Status"]].concat(clFilesOf(id).map(f=>[f.name,{photo:"Photo",guests:"Guest list",doc:"Document"}[f.kind]||f.kind,f.size?clMB(f.size):"",f.by==="client"?"Client":"You",xDay(f.t),f.kind==="guests"?({pending:"Waiting for review",imported:"Added to the event",declined:"Not used"}[f.status]||""):(f.by==="planner"?(f.share?"Shared with the client":"Private"):"")]));
 const fb=fbList(fbKeyOf(id,c)).filter(x=>x.who==="client"||c.ev);
 const feed=[["When","From","Rating","Best part","Could be better","OK to quote","Featured"]].concat(fb.map(x=>[xDay(x.t),x.name||(x.who==="client"?"Client":"Guest"),+x.rating||0,x.best||"",x.better||"",x.ok?"Yes":"No",x.quote?"Yes":"No"]));
 return [{name:"Summary",rows:summary},{name:"Checklist",rows:tasks},{name:"Payments",rows:pays},{name:"Dates",rows:dates},{name:"Vendors",rows:vend},{name:"Approvals",rows:aps},{name:"Messages",rows:msgs},{name:"Files",rows:files},{name:"Feedback",rows:feed}]}
function clExportAllRows(){const cs=D.clients||{};return [["Client","Event","Event code","Event date","Checklist done","Checklist items","Overdue items","Paid","Still owed","Next payment due","Approvals waiting","Unread messages","Files","Client link","Client since","Email","Phone","Event type","Venue","Guests","Budget","Status","Notes"]]
 .concat(Object.keys(cs).sort((a,b)=>String(cs[a].date||"9999").localeCompare(String(cs[b].date||"9999"))).map(id=>{const c=cs[id],st=clStats(id,true),ps=clPayStats(id),np=clPays(id).find(x=>!x.paid&&x.due);
  return [c.name||"",c.evName||c.evTitle||"",c.ev||"",c.date||"",st.done,st.total,clTasksOf(id,true).filter(clLate).length,ps.paid,ps.left,np?`${np.title} ${clMoney(np.amount)} on ${np.due}`:"",clApPending(id),clUnread(id),clFilesOf(id).length,clLink(id),xDay(c.t),c.email||"",c.phone||"",c.evType||"",c.venue||"",c.guests||"",c.budget||"",c.status||"",c.notes||""]}))}
function dataUrlParts(u){const m=/^data:([^;,]*)(;base64)?,(.*)$/s.exec(u||"");if(!m)return null;return {type:m[1],b64:!!m[2],data:m[3]}}
Object.assign(ACT,{
 clExport:async el=>{const id=el.dataset.m,c=(D.clients||{})[id]||{};if(!window.JSZip)return toast("Exports need a connection. Try again in a moment.");
  toast("Preparing the export…");
  try{const xl=await xlsxBlob(clExportSheets(id)),base=xFile(c.name)+" - Host Mode export";
   const fs=clFilesOf(id);if(!fs.length){download(base+".xlsx",xl);return toast("Downloaded")}
   const blobs=(await RT(PSP+"clientBlobs/"+id).once("value")).val()||{},z=new JSZip();z.file(base+".xlsx",xl);const used={};let n=0;
   fs.forEach(f=>{const p=dataUrlParts(blobs[f.k]);if(!p)return;let nm=xFile(String(f.name||"file").replace(/\.[^.]+$/,""))+(/\.[A-Za-z0-9]{1,5}$/.exec(f.name||"")||[".bin"])[0];while(used[nm.toLowerCase()])nm=nm.replace(/(\.[^.]+)$/,"-"+(++used[nm.toLowerCase()])+"$1");used[nm.toLowerCase()]=1;
    z.file("Files/"+nm,p.b64?p.data:decodeURIComponent(p.data),p.b64?{base64:true}:{});n++});
   download(base+".zip",await z.generateAsync({type:"blob"}));toast(`Downloaded the spreadsheet and ${n} file${n===1?"":"s"}`)}catch(e){toast("Couldn't make the export: "+e.message)}},
 clExportAll:async()=>{if(!window.JSZip)return toast("Exports need a connection. Try again in a moment.");if(!Object.keys(D.clients||{}).length)return toast("No clients to export yet");
  try{download(xFile((D.plMe||{}).biz||"Clients")+" - all clients.xlsx",await xlsxBlob([{name:"Clients",rows:clExportAllRows()}]));toast("Downloaded")}catch(e){toast("Couldn't make the export: "+e.message)}}
});

/* ================= WEAK SIGNAL MODE ================= */
/* Firebase keeps working without signal: writes wait on the phone and send when it reconnects.
   This shows a small pill so nobody thinks it's broken, warns before closing with unsent changes,
   and keeps an offline copy of the page so it still opens in a dead zone. */
L.pending=0;L.everConnected=false;
Object.assign(ES,{"Weak signal. Keep going. Everything is saved on your phone and sends when the signal is back.":"Señal débil. Sigue jugando. Todo se guarda en tu teléfono y se envía cuando vuelva la señal.","Saving…":"Guardando…","{n} waiting to send":"{n} por enviar"});
let netT=null;
function netPill(){let el=document.getElementById("net");if(!el){el=document.createElement("div");el.id="net";el.setAttribute("role","status");el.setAttribute("aria-live","polite");el.hidden=true;document.body.appendChild(el)}
 if(!db||VIEW==="screen"||VIEW==="print"){el.hidden=true;return}
 const off=L.everConnected&&!L.connected;
 if(off){el.className="off";el.innerHTML=`<i></i><span>${t("Weak signal. Keep going. Everything is saved on your phone and sends when the signal is back.")}${L.pending?" · "+t("{n} waiting to send",{n:L.pending}):""}</span>`;el.hidden=false;clearTimeout(netT);return}
 if(L.pending>0){clearTimeout(netT);netT=setTimeout(()=>{if(L.pending>0&&L.connected){el.className="";el.innerHTML=`<i></i><span>${t("Saving…")}</span>`;el.hidden=false}},700);return}
 clearTimeout(netT);el.hidden=true}
(function(){const F=window.firebase&&firebase.database&&firebase.database.Reference;if(!F)return;const R=F.prototype;
 const track=p=>{if(!p||typeof p.then!=="function")return p;L.pending++;netPill();const done=()=>{L.pending=Math.max(0,L.pending-1);netPill()};p.then(done,done);return p};
 ["set","update","remove","setWithPriority"].forEach(m=>{const o=R[m];if(o)R[m]=function(){return track(o.apply(this,arguments))}});
 const ot=R.transaction;if(ot)R.transaction=function(){return track(ot.apply(this,arguments))};
 const op=R.push;if(op)R.push=function(v){const r=op.apply(this,arguments);if(v!==undefined)track(r);return r}})();
const _connectNet=connect;
connect=function(){_connectNet();if(db)db.ref(".info/connected").on("value",s=>{if(s.val())L.everConnected=true;netPill()})};
addEventListener("beforeunload",e=>{if(L.pending>0){e.preventDefault();e.returnValue=""}});
addEventListener("online",()=>{try{db&&db.goOnline()}catch(e){}});
/* the code now runs after the page has loaded, so register the offline copy right away when "load" has already happened */
if("serviceWorker" in navigator&&location.protocol==="https:"){const regSW=()=>navigator.serviceWorker.register("sw.js").catch(()=>{});if(document.readyState==="complete")regSW();else addEventListener("load",regSW)}

render();connect();if(VIEW==="guest")loadDict();
if(VIEW==="screen")setInterval(()=>{if(!db)return;ER("reactions").orderByChild("t").endAt(now()-60000).once("value").then(s=>{const v=s.val()||{};Object.keys(v).forEach(k=>ER("reactions/"+k).remove())})},30000);

