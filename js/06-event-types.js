/* ================= EVENT TYPES: starter content, moments, reveals, evening order ================= */
const T_=(q,o,a,hard)=>({q,o,a,hard:hard||undefined});
const HN=(n,h)=>({n,h});const CWI=(w,c)=>({w,c});const SU=q=>({q});
const MOM=(id,name,title,sub,show)=>({id,name,title,sub:sub||"",album:!show||show.indexOf("a")>=0,honor:!show||show.indexOf("h")>=0,wishes:!!show&&show.indexOf("w")>=0});
const EVENT_TYPES={
 baby:{label:"Baby shower",
  moments:[MOM("welcome","Welcome","Welcome to the baby shower","Celebrating {honorees}","ah"),MOM("dinner","Dinner","Dinner is served","Enjoy, and keep snapping photos for the album","ahw"),MOM("gifts","Gift opening","Gift opening","Gather round as {honorees} open their gifts","ah"),MOM("cake","Cake","Time for cake!","","ah"),MOM("farewell","Farewell","Thank you for coming!","With love from {honorees}","ahw")],
  reveal:{enabled:false,kind:"gender",label:"Boy or girl?",answer:"girl",sub:""},
  order:["m:welcome","g:split","g:longword","g:hunt","m:dinner","g:trivia","m:gifts","g:crossword","g:sup","reveal","g:bingo","m:cake","winner","m:farewell"]},
 wedding:{label:"Wedding",
  moments:[MOM("welcome","Welcome","Welcome to the wedding celebration","{honorees}","ah"),MOM("entrance","Grand entrance","Please welcome the newlyweds!","{honorees}","h"),MOM("firstdance","First dance","Their first dance","{honorees}","h"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("toasts","Toasts","Raise your glasses","Toasts to the happy couple","hw"),MOM("cake","Cake cutting","Cake cutting","","ah"),MOM("farewell","Send-off","Thank you for celebrating with us","With love, {honorees}","ahw")],
  reveal:{enabled:false,kind:"text",label:"Where's the honeymoon?",answer:"",sub:"Bon voyage!"},
  order:["m:welcome","g:split","g:longword","g:hunt","m:entrance","m:firstdance","m:dinner","g:trivia","m:toasts","g:sup","m:cake","g:bingo","reveal","winner","m:farewell"]},
 engagement:{label:"Engagement party",
  moments:[MOM("welcome","Welcome","Welcome to the engagement party","Celebrating {honorees}","ah"),MOM("story","How they met","How it all began","The story of {honorees}","h"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("toasts","Toasts","Raise your glasses","To {honorees}","hw"),MOM("farewell","Farewell","Thank you for coming!","","ahw")],
  reveal:{enabled:false,kind:"text",label:"When's the wedding?",answer:"",sub:"Save the date!"},
  order:["m:welcome","g:split","g:longword","g:hunt","m:story","m:dinner","g:trivia","m:toasts","g:sup","reveal","g:bingo","winner","m:farewell"]},
 anniversary:{label:"Anniversary",
  moments:[MOM("welcome","Welcome","Welcome to the anniversary party","Celebrating {honorees}","ah"),MOM("years","Through the years","Through the years","{honorees}","h"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("toasts","Toasts","Raise your glasses","To many more years","hw"),MOM("cake","Cake","Time for cake!","","ah"),MOM("farewell","Farewell","Thank you for celebrating with us","","ahw")],
  reveal:{enabled:false,kind:"number",label:"How many years together?",answer:"25",sub:"years together"},
  order:["m:welcome","g:split","g:longword","g:hunt","m:years","m:dinner","g:trivia","m:toasts","reveal","g:sup","m:cake","g:bingo","winner","m:farewell"]},
 birthday:{label:"Birthday party",
  moments:[MOM("welcome","Welcome","Welcome to the party!","Celebrating {honorees}","ah"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("cake","Make a wish","Make a wish!","Happy birthday, {honorees}","ah"),MOM("gifts","Gifts","Gift time","","ah"),MOM("farewell","Farewell","Thanks for coming!","","ahw")],
  reveal:{enabled:false,kind:"number",label:"How old?",answer:"40",sub:""},
  order:["m:welcome","g:split","g:longword","g:hunt","m:dinner","g:trivia","g:crossword","g:sup","reveal","m:cake","m:gifts","g:bingo","winner","m:farewell"]},
 reunion:{label:"Family reunion",
  moments:[MOM("welcome","Welcome home","Welcome home, family!","","ah"),MOM("photo","Family photo","Family photo time","Everyone gather in for the big picture","h"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("memories","Memory lane","A walk down memory lane","","h"),MOM("farewell","Farewell","Until next time!","","ahw")],
  reveal:{enabled:false,kind:"text",label:"Where's the next reunion?",answer:"",sub:"See you there!"},
  order:["m:welcome","g:split","g:longword","g:hunt","m:photo","m:dinner","g:trivia","m:memories","g:sup","g:bingo","reveal","winner","m:farewell"]},
 corporate:{label:"Corporate event",
  moments:[MOM("welcome","Welcome","Welcome","{honorees}","ah"),MOM("remarks","Opening remarks","Opening remarks","","h"),MOM("dinner","Dinner & networking","Dinner and networking","","a"),MOM("awards","Awards","Awards","Celebrating our team","h"),MOM("closing","Closing","Thank you for joining us","","a")],
  reveal:{enabled:false,kind:"award",label:"And the award goes to…",answer:"",sub:"Employee of the Year"},
  order:["m:welcome","m:remarks","g:split","g:longword","g:hunt","m:dinner","g:trivia","g:crossword","m:awards","reveal","g:sup","g:bingo","winner","m:closing"]},
 other:{label:"Other celebration",
  moments:[MOM("welcome","Welcome","Welcome!","","ah"),MOM("dinner","Dinner","Dinner is served","","ahw"),MOM("farewell","Farewell","Thank you for coming!","","ahw")],
  reveal:{enabled:false,kind:"text",label:"The big reveal",answer:"",sub:""},
  order:["m:welcome","g:split","g:longword","g:hunt","m:dinner","g:trivia","g:crossword","g:sup","g:bingo","reveal","winner","m:farewell"]}
};
const TYPE_CONTENT={
 wedding:{title:"Wedding Games",tagline:"Celebrating the newlyweds",themeDesc:"a wedding reception",colors:{rose:"#c08497",flame:"#d4a373",gold:"#c9a227",violet:"#6d597a",leaf:"#6a994e"},supOpts:["Partner 1","Partner 2"],
  trivia:[T_("Something old, something new, something borrowed, something ___?",["Blue","Gold","White","True"],0),T_("On which hand is a wedding ring traditionally worn in the US?",["Right hand","Left hand","Either hand","On a necklace"],1),T_("Who traditionally holds the rings during the ceremony?",["Maid of honor","Best man","Officiant","Flower girl"],1),T_("What does the bride traditionally toss to the guests?",["Her shoe","The bouquet","Rice","Her veil"],1),T_("What is the traditional gift for a first wedding anniversary?",["Paper","Cotton","Wood","Silver"],0,true),T_("Whose 1840 wedding made white wedding dresses popular?",["Queen Victoria","Marie Antoinette","Queen Elizabeth I","Josephine Bonaparte"],0,true)],
  hunt:[HN("Champagne cork","I pop at every toast."),HN("Place card","I tell you where to sit."),HN("Rose petal","I'm scattered down the aisle."),HN("Cake topper","I stand on the very top of the sweetest table."),HN("Bow tie","Groomsmen wear me around their necks."),HN("Bubble wand","Blow through me for a happy send-off.")],
  cw:[CWI("BRIDE","The one in the gown"),CWI("GROOM","The one waiting at the altar"),CWI("VOWS","Promises made at the altar"),CWI("RING","Worn on the fourth finger"),CWI("CAKE","Tiered dessert"),CWI("TOAST","Raise a glass for this"),CWI("DANCE","The first one is for the couple"),CWI("VEIL","Lifted before the kiss"),CWI("BOUQUET","Flowers in the bride's hands"),CWI("HONEYMOON","The trip after the wedding")],
  sups:[SU("Cry during the vows?"),SU("Hit the dance floor first?"),SU("Forget where they parked?"),SU("Plan the perfect date night?"),SU("Burn dinner?"),SU("Remember the anniversary?")],tie:{q:"How many keys are on a standard piano?",a:88}},
 engagement:{title:"Engagement Games",tagline:"Celebrating the happy couple",themeDesc:"an engagement party",colors:{rose:"#e0607e",flame:"#f4a259",gold:"#e9c46a",violet:"#5e548e",leaf:"#2a9d8f"},supOpts:["Partner 1","Partner 2"],
  trivia:[T_("Which gemstone is most popular for engagement rings?",["Diamond","Ruby","Emerald","Sapphire"],0),T_("What do you call the time between the proposal and the wedding?",["Courtship","The engagement","The honeymoon","The rehearsal"],1),T_("What is a fiancé called once they're married?",["Spouse","Suitor","Sweetheart","Betrothed"],0),T_("What do couples send months ahead so guests can plan?",["Thank-you cards","Save-the-dates","RSVP cards","Postcards"],1),T_("In 1477, Archduke Maximilian of Austria gave one of the first known diamond engagement rings to whom?",["Mary of Burgundy","Anne Boleyn","Catherine of Aragon","Queen Isabella"],0,true),T_("Diamonds are graded by the 4 Cs: cut, color, clarity and ___?",["Carat","Cost","Crown","Curve"],0,true)],
  hunt:[HN("Ring box","I hold a very important question."),HN("Champagne flute","I'm tall, thin and ready for bubbles."),HN("Save-the-date card","I tell you when to mark your calendar."),HN("Heart balloon","I float and I'm full of love."),HN("Love letter","Sealed with a kiss."),HN("Candle","I set the mood with a little flame.")],
  cw:[CWI("RING","The question comes with this"),CWI("DIAMOND","A girl's best friend"),CWI("PROPOSE","Pop the question"),CWI("FIANCE","Engaged partner"),CWI("KNEE","Bend this to ask"),CWI("YES","The answer everyone hopes for"),CWI("LOVE","What it's all about"),CWI("KISS","Sealed with one"),CWI("TOAST","Raise a glass for this"),CWI("FOREVER","How long they plan to be together")],
  sups:[SU("Plan the wedding down to the minute?"),SU("Cry first at the wedding?"),SU("Pick the honeymoon spot?"),SU("Lose the ring?"),SU("Write the sweetest vows?"),SU("Be late to their own wedding?")],tie:{q:"How many seconds are in one day?",a:86400}},
 anniversary:{title:"Anniversary Games",tagline:"Celebrating years of love",themeDesc:"a wedding anniversary party",colors:{rose:"#b5446e",flame:"#e07a5f",gold:"#d4a017",violet:"#5b3e7e",leaf:"#3d7a5a"},supOpts:["Partner 1","Partner 2"],
  trivia:[T_("What is the traditional gift for a 25th anniversary?",["Silver","Gold","Pearl","Ruby"],0),T_("What is the traditional gift for a 50th anniversary?",["Diamond","Gold","Silver","Crystal"],1),T_("What is the traditional gift for a 1st anniversary?",["Paper","Cotton","Leather","Wood"],0),T_("Which anniversary is the ruby anniversary?",["20th","30th","40th","60th"],2),T_("What is the traditional gift for a 30th anniversary?",["Pearl","Coral","Jade","Lace"],0,true),T_("What is the traditional gift for a 5th anniversary?",["Wood","Tin","Iron","Paper"],0,true)],
  hunt:[HN("Photo frame","I hold a memory still."),HN("Old photo","I show how young they once were."),HN("Candle","I set the mood with a little flame."),HN("Heart-shaped box","Sweet treats hide in my heart."),HN("Champagne glass","Clink me for a toast."),HN("Love song CD","I play your favorite song.")],
  cw:[CWI("LOVE","What it's all about"),CWI("YEARS","Counted on this special day"),CWI("VOWS","Promises they made"),CWI("RING","Still on the finger"),CWI("TOAST","Raise a glass"),CWI("MEMORY","Something to treasure"),CWI("FAMILY","Built together over time"),CWI("DANCE","One more spin around the floor"),CWI("GOLD","The 50th anniversary gift"),CWI("SILVER","The 25th anniversary gift")],
  sups:[SU("Remember how they met?"),SU("Tell the longest story?"),SU("Hog the remote?"),SU("Plan a surprise?"),SU("Fall asleep on the couch first?"),SU("Win an argument?")],tie:{q:"How many hours are in a year that isn't a leap year?",a:8760}},
 birthday:{title:"Birthday Games",tagline:"Let's celebrate!",themeDesc:"a birthday party",colors:{rose:"#ef476f",flame:"#f78c6b",gold:"#ffd166",violet:"#7b2cbf",leaf:"#06d6a0"},supOpts:["The guest of honor","Their best friend"],
  trivia:[T_("What do you traditionally do before blowing out birthday candles?",["Make a wish","Clap twice","Turn off the music","Sing backwards"],0),T_("Which month has the fewest days?",["February","April","June","November"],0),T_("What is the birthstone for January?",["Garnet","Ruby","Emerald","Opal"],0),T_("What is the birthstone for April?",["Diamond","Sapphire","Pearl","Topaz"],0),T_("What is the birthstone for July?",["Ruby","Peridot","Sapphire","Opal"],0,true),T_("In a room of 23 people, about what are the chances two share a birthday?",["About 5%","About 25%","About 50%","About 90%"],2,true)],
  hunt:[HN("Party hat","I sit on your head at a party."),HN("Candle","Blow me out and make a wish."),HN("Balloon","Fill me with air and tie a string."),HN("Wrapped gift","Unwrap me!"),HN("Confetti","Throw me and I scatter."),HN("Cupcake","A tiny cake with frosting on top.")],
  cw:[CWI("CAKE","The sweet centerpiece"),CWI("CANDLE","Blow it out"),CWI("WISH","Make one before you blow"),CWI("PARTY","What we're all here for"),CWI("GIFT","Wrapped with a bow"),CWI("BALLOON","Filled with air or helium"),CWI("FROSTING","Sweet layer on top"),CWI("CONFETTI","Tiny paper celebration"),CWI("SURPRISE","Shh, don't spoil it"),CWI("CELEBRATE","What we do today")],
  sups:[SU("Eat the most cake?"),SU("Bring the funniest card?"),SU("Sing the loudest?"),SU("Throw a surprise party?"),SU("Forget their own age?"),SU("Dance on the table?")],tie:{q:"How many minutes are in a full day?",a:1440}},
 reunion:{title:"Reunion Games",tagline:"Family is everything",themeDesc:"a family reunion",colors:{rose:"#d1495b",flame:"#edae49",gold:"#e9c46a",violet:"#00798c",leaf:"#30638e"},supOpts:["Grandma","Grandpa"],
  trivia:[T_("What do you call your parent's sibling's child?",["Cousin","Nephew","Aunt","Sibling"],0),T_("Your mother's father is your ___?",["Grandfather","Great-uncle","Uncle","Godfather"],0),T_("What is your first cousin's child to you?",["First cousin once removed","Second cousin","Nephew","Great-cousin"],0),T_("What do you call a chart of a family's history?",["Family tree","Family map","Heritage list","Bloodline chart"],0),T_("Children of first cousins are what to each other?",["Second cousins","First cousins once removed","Third cousins","Half-cousins"],0,true),T_("Your grandparent's sibling is your ___?",["Great-aunt or great-uncle","Grand-cousin","Second aunt or uncle","Cousin once removed"],0,true)],
  hunt:[HN("Family photo","Everyone's smiling in me."),HN("Recipe card","Grandma's secret lives on me."),HN("Name tag","I tell everyone who you are."),HN("Picnic blanket","Spread me out for lunch on the grass."),HN("Sunglasses","I keep the sun out of your eyes."),HN("Frisbee","Throw me and I fly.")],
  cw:[CWI("FAMILY","Everyone here"),CWI("COUSIN","Your aunt's kid"),CWI("UNCLE","Your dad's brother"),CWI("AUNT","Your mom's sister"),CWI("GRANDMA","She has the best recipes"),CWI("PICNIC","Lunch on a blanket"),CWI("PHOTO","Say cheese!"),CWI("STORIES","Told again every year"),CWI("HUGS","Hello and goodbye"),CWI("ROOTS","Where we all come from")],
  sups:[SU("Tell the most embarrassing story?"),SU("Bring the best dish?"),SU("Get lost on the way?"),SU("Start the dance party?"),SU("Remember everyone's birthday?"),SU("Fall asleep after dinner?")],tie:{q:"How many bones are in the adult human body?",a:206}},
 corporate:{title:"Team Games",tagline:"Welcome, team!",themeDesc:"a company party",colors:{rose:"#3a86ff",flame:"#ff8c42",gold:"#f4b400",violet:"#264653",leaf:"#2a9d8f"},supOpts:["Person 1","Person 2"],
  trivia:[T_("What does 'CEO' stand for?",["Chief Executive Officer","Central Executive Organizer","Chief Event Officer","Company Executive Owner"],0),T_("How many minutes are in an 8-hour workday?",["360","420","480","540"],2),T_("What does 'ROI' stand for?",["Return on investment","Rate of interest","Revenue over income","Risk of inflation"],0),T_("What is a 'brainstorm' at work?",["A group idea session","A bad headache","A weather report","A sales target"],0),T_("Which company was originally called 'BackRub'?",["Google","Amazon","Yahoo","eBay"],0,true),T_("Which company started in 1994 as an online bookstore?",["Amazon","Barnes & Noble","eBay","Netflix"],0,true)],
  hunt:[HN("Stapler","I hold your pages together."),HN("Sticky note","I stick around with your reminders."),HN("Coffee mug","I hold the fuel for every meeting."),HN("Name badge","I tell everyone who you are."),HN("Paper clip","Small, bent and very helpful."),HN("Highlighter","I make the important words glow.")],
  cw:[CWI("TEAM","Together everyone achieves more"),CWI("GOALS","What we aim for"),CWI("MEETING","Could have been an email"),CWI("COFFEE","Office fuel"),CWI("DEADLINE","Due date"),CWI("LAUNCH","Big release day"),CWI("CLIENT","Who we serve"),CWI("AWARD","A trophy for great work"),CWI("SUCCESS","What we celebrate"),CWI("IDEAS","Brainstorm results")],
  sups:[SU("Reply-all by accident?"),SU("Bring snacks to the meeting?"),SU("Win employee of the month?"),SU("Be first in the office?"),SU("Have the most browser tabs open?"),SU("Lead the karaoke?")],tie:{q:"How many minutes are in a 40-hour work week?",a:2400}}
};
function templateFor(type,name){
 if(type==="baby"||!type)return Object.assign(clone(DEFAULT_CONTENT),{eventType:"baby"});
 const base=clone(BLANK_CONTENT);const t=TYPE_CONTENT[type];
 if(t)Object.assign(base,clone(t),{games:ALL_GAMES_ON,pv:DEFAULT_PV});
 base.eventType=type;if(name&&!t)base.title=name;base.honorees="";base.custom={};return base}
const evType=()=>EVENT_TYPES[C().eventType]?C().eventType:(C().eventType===undefined&&EV==="SHOWER"?"baby":(C().eventType||"other"));
const typeDef=()=>EVENT_TYPES[evType()]||EVENT_TYPES.other;
const momentsList=()=>{const m=arr(C().moments);return m.length?m:clone(typeDef().moments)};
const revealCfg=()=>Object.assign({},typeDef().reveal,C().reveal||{});
const fillH=s=>String(s||"").replace(/\{honorees\}/g,C().honorees||"our guests of honor");
const ordinal=n=>{n=Math.round(+n);const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])};

/* ---------- moment & reveal layers (persistent, so animations never restart on redraw) ---------- */
const MO={key:null,i:0,timer:null,full:{},slides:[]};
function momentSlides(m){const out=[{t:"msg"}];
 if(m.album){const a=D.album||{};Object.keys(a).sort((x,y)=>(a[y].t||0)-(a[x].t||0)).slice(0,30).forEach(k=>out.push({t:"photo",src:"album",k,name:a[k].name||""}))}
 if(m.honor){const h=D.honor||{};Object.keys(h).sort((x,y)=>(h[x].t||0)-(h[y].t||0)).forEach(k=>out.push({t:"photo",src:"honor",k,name:h[k].cap||""}))}
 if(m.wishes){const w=D.wishes||{};Object.keys(w).slice(-20).forEach(k=>out.push({t:"wish",text:w[k].text,name:w[k].name}))}
 const photos=out.slice(1);const mixed=[out[0]];photos.forEach((p,i)=>{mixed.push(p);if((i+1)%4===0)mixed.push(out[0])});return mixed}
async function slideSrc(sl){const key=sl.src+":"+sl.k;if(MO.full[key])return MO.full[key];const v=(await ER((sl.src==="album"?"albumFull/":"honorFull/")+sl.k).once("value")).val();if(v)MO.full[key]=v;return v||((D.album||{})[sl.k]||{}).thumb||((D.honor||{})[sl.k]||{}).thumb}
function updateMoment(){if(VIEW!=="screen")return;const m=st().moment;const key=m?m.id+"|"+m.t:null;const el=$("#mo");if(!el||key===MO.key)return;MO.key=key;clearInterval(MO.timer);
 if(!m){el.classList.remove("on");setTimeout(()=>{if(!MO.key)el.innerHTML=""},800);return}
 const mo=momentsList().find(x=>x.id===m.id)||{title:m.title||"",sub:""};
 el.innerHTML=`<div class="mo-bg"></div><div class="mo-orbs"><i></i><i></i><i></i><i></i></div><div class="mo-stage"><div class="mo-slide a"></div><div class="mo-slide b"></div></div><div class="mo-foot">${esc(C().title||"")} · <span>${t("Scan to join the games")}</span></div>`;
 el.classList.add("on");MO.i=0;let flip=false;
 const show=async()=>{const slides=momentSlides(mo);const sl=slides[MO.i%slides.length];MO.i++;let html;
  if(sl.t==="msg")html=`<div class="mo-msg">${C().image?`<img class="mo-art" src="${C().image}" alt="">`:""}<div class="mo-title">${esc(fillH(mo.title))}</div>${mo.sub?`<div class="mo-sub">${esc(fillH(mo.sub))}</div>`:""}</div>`;
  else if(sl.t==="wish")html=`<div class="mo-wish"><div class="mo-q">“${esc(sl.text)}”</div><div class="mo-sub">${esc(sl.name||"")}</div></div>`;
  else{const src=await slideSrc(sl);if(!src){return show()}html=`<div class="mo-photo"><img src="${src}" alt=""><div class="mo-cap">${esc(sl.name||"")}</div></div>`}
  const layers=el.querySelectorAll(".mo-slide");if(layers.length<2)return;flip=!flip;const on=layers[flip?0:1],off=layers[flip?1:0];on.innerHTML=html;on.classList.add("show");off.classList.remove("show")};
 show();MO.timer=setInterval(show,8000)}
const RV={key:null};
function babySVG(style){const girl=style!=="boy",blanket=girl?"#ff8fc4":"#7cb8ff",trim=girl?"#ffd1e8":"#d6e9ff";
 return `<svg viewBox="0 0 200 210" class="rv-baby" aria-hidden="true"><ellipse cx="100" cy="158" rx="66" ry="46" fill="${blanket}"/><path d="M40 150 Q100 190 160 150" stroke="${trim}" stroke-width="7" fill="none"/><path d="M58 130 Q100 112 142 130" stroke="${trim}" stroke-width="5" fill="none" opacity=".8"/>
 <circle cx="56" cy="92" r="11" fill="#f7cdb0"/><circle cx="144" cy="92" r="11" fill="#f7cdb0"/><circle cx="100" cy="90" r="48" fill="#f9d7bd"/>
 ${girl?`<path d="M94 44 q10 -18 22 -4 q-12 -4 -12 8" stroke="#8a5a3c" stroke-width="5" fill="none" stroke-linecap="round"/><g transform="translate(128 52) rotate(18)"><path d="M0 0 L-16 -11 L-16 11Z" fill="#ff5fa8"/><path d="M0 0 L16 -11 L16 11Z" fill="#ff5fa8"/><circle r="5" fill="#ff8fc4"/></g>`
  :`<path d="M51 84 C52 40 76 38 100 38 C124 38 148 40 149 84 C130 70 70 70 51 84Z" fill="#7cb8ff"/><path d="M51 84 C70 70 130 70 149 84" stroke="#d6e9ff" stroke-width="6" fill="none"/><circle cx="100" cy="36" r="9" fill="#d6e9ff"/>`}
 <path d="M76 90 q9 7 18 0" stroke="#5a3a2a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M106 90 q9 7 18 0" stroke="#5a3a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
 <circle cx="72" cy="106" r="9" fill="#f4a3b4" opacity=".75"/><circle cx="128" cy="106" r="9" fill="#f4a3b4" opacity=".75"/><path d="M90 114 q10 9 20 0" stroke="#b5654f" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`}
function giftSVG(){return `<svg viewBox="0 0 240 240" class="rv-gift" aria-hidden="true"><g class="rv-body"><rect x="40" y="110" width="160" height="110" rx="10" fill="var(--violet)"/><rect x="108" y="110" width="24" height="110" fill="var(--gold)"/><rect x="40" y="150" width="160" height="16" fill="var(--gold)" opacity=".85"/></g>
 <g class="rv-lid"><rect x="30" y="84" width="180" height="34" rx="8" fill="var(--rose)"/><rect x="108" y="84" width="24" height="34" fill="var(--gold)"/><path d="M120 84 C90 40 60 60 80 80 C90 90 110 86 120 84Z" fill="var(--gold)"/><path d="M120 84 C150 40 180 60 160 80 C150 90 130 86 120 84Z" fill="var(--gold)"/><circle cx="120" cy="82" r="9" fill="var(--flame)"/></g></svg>`}
function updateReveal(){const r=st().reveal;const key=r?String(r.t):null;const el=$("#rv");if(!el||VIEW==="host"||VIEW==="print"||VIEW==="album"||VIEW==="keepsake"||VIEW==="moderator")return;if(key===RV.key)return;RV.key=key;clearTimeout(RV.to);
 if(!r){el.classList.remove("on");el.innerHTML="";return}
 const lead=Math.max(0,r.at-now());if(lead<-60000){RV.key=null;return}
 const girl=r.style!=="boy",gender=r.kind==="gender",col=gender?(girl?"#ff5fa8":"#3d8bff"):"var(--rose)";
 const answer=gender?(girl?t("It's a girl!"):t("It's a boy!")):r.kind==="number"?(evType()==="birthday"?`Happy ${ordinal(r.answer)} birthday!`:`${esc(r.answer)} ${esc(r.sub||"")}`):esc(r.answer);
 const sub=gender?"":r.kind==="award"?esc(r.sub||""):r.kind==="number"?"":esc(r.sub||"");
 el.innerHTML=`<div class="rv-bg" style="--rc:${col}"></div><div class="rv-in" style="--lead:${lead}ms;--rc:${col}"><div class="rv-q">${esc(r.label||"")}</div><div class="rv-box">${giftSVG()}<div class="rv-pop">${gender?babySVG(r.style):`<div class="rv-big">${r.kind==="number"?esc(r.answer):"★"}</div>`}</div></div><div class="rv-ans">${answer}</div>${sub?`<div class="rv-sub">${sub}</div>`:""}${VIEW==="guest"?`<div class="rv-tap">${t("Tap anywhere to close")}</div>`:""}</div>`;
 el.classList.add("on");
 if(lead>0){[3,2,1].forEach((n,i)=>setTimeout(()=>{SND.tick();buzz(60)},Math.max(0,lead-3000+i*1000)))}
 RV.to=setTimeout(()=>{SND.win();buzz([120,60,240]);const c=(gender?(girl?["#ff5fa8","#ff8fc4","#ffd1e8"]:["#3d8bff","#7cb8ff","#d6e9ff"]):null);confettiColors(c,240)},lead)}
function confettiColors(cols,n){if(!cols)return confetti(n);const root=document.documentElement,old={};["--rose","--flame","--gold","--violet","--leaf","--sky"].forEach((k,i)=>{old[k]=root.style.getPropertyValue(k);root.style.setProperty(k,cols[i%cols.length])});confetti(n);setTimeout(()=>Object.keys(old).forEach(k=>old[k]?root.style.setProperty(k,old[k]):root.style.removeProperty(k)),60)}

/* ---------- evening order & cheat sheet ---------- */
function orderSteps(){const ms=momentsList(),rv=revealCfg(),on=C().games||ALL_GAMES_ON;
 return typeDef().order.map(s=>{if(s.startsWith("m:")){const m=ms.find(x=>x.id===s.slice(2));return m?{k:"m",id:m.id,label:m.name,how:`Moments tab → ${m.name} → Show on TV`}:null}
  if(s.startsWith("g:")){const g=GAMES.find(x=>x.id===s.slice(2));return g&&on[g.id]!==false?{k:"g",id:g.id,label:g.name,how:`Live tab → ${g.name} → Go live`+({trivia:". After each question: Close voting, then Send next question",sup:". Pick the pair up front, then Reveal results and Next question",bingo:". Call next number; confirm bingo calls as they come in",longword:". Start the timer",hunt:". It stays open all night, so check photos in the Live tab",split:". Set team names in the Teams tab"}[g.id]||"")}:null}
  if(s==="reveal")return rv.enabled?{k:"r",label:"The big reveal: "+rv.label,how:"Moments tab → Start the reveal"}:null;
  if(s==="winner")return {k:"w",label:"Crown the winning team",how:"Scores tab → End the night and send recaps (run the tiebreaker first if the teams are tied)"};return null}).filter(Boolean)}
function cheatSheet(){const steps=orderSteps();return `<div class="sheetp cheat"><div class="tc"><div class="eyebrow">${esc(C().tagline||"")}</div><h2>Night-of cheat sheet</h2><p class="small">Moderator console: <span class="brk">${esc(eventURL(EV,"moderator"))}</span> · TV: <span class="brk">${esc(eventURL(EV,"screen"))}</span></p></div>
 <ol class="cheatlist">${steps.map(s=>`<li><b>${esc(s.label)}</b><span>${esc(s.how)}</span></li>`).join("")}</ol>
 <div class="grid2 g8 small"><div><b>Before guests arrive</b><ul><li>Open the TV link on the big screen.</li><li>Put the QR sign at the door.</li><li>Open this console on your phone and keep it charged.</li></ul></div><div><b>If something goes wrong</b><ul><li>A guest's phone died: they can rejoin, or join on a friend's phone (Profile → Add another player).</li><li>Wrong points: Scores tab → − / +.</li><li>A custom game is stuck: Live tab → Start this game over.</li></ul></div></div></div>`}

/* ================= MOMENTS TAB, BEGINNER HELP, LEGAL, KEEPSAKE, CLEANUP ================= */
const HINTS={
 split:"Decides how the room splits into two teams for the whole night. Seasons: winter and spring birthdays against summer and fall. Odd and even: the day of the month someone was born.",
 season:"Month counts December through May as winter and spring. Start dates uses the official season start days, so a December 10 birthday counts as fall.",
 pods:"Trivia is played in small groups of up to 8 from the same team, called pods. If lots of guests arrive after trivia starts, tap Reset pods so they're included.",
 points:"How many points each game gives. Every point goes to the guest and to their team. A pod's trivia win counts once for the team, so bigger pods don't get an edge.",
 pin:"You and your assistant type this PIN to open this console. Guests never need it. The host PIN also opens every event.",
 practice:"Creates a separate copy of this event with 16 pretend guests who vote, find items and call bingo, so you can rehearse every button. Real scores aren't touched.",
 themes:"A theme saves the title, colors, picture and all game content, so you can reuse it for another party or switch everything at once.",
 retention:"Photos are deleted automatically after this many days, which keeps storage free and matches the privacy policy. Wishes and scores stay. Use 0 to keep photos.",
 reveal:"The reveal shows a gift box on the TV and every phone. After a short countdown it opens and the answer pops out. The answer stays hidden from guests until you start it.",
 moments:"Moments put a full-screen scene on the TV, like Dinner, with slowly moving colors and a slideshow of guests' album photos, your own photos and wishes.",
 runner:"A custom game is run by the console that tapped Go live. Keep it open. If that phone dies, your assistant taps Run it from this device.",
 tie:"If the teams finish tied, each team agrees on one number guess. Closest to the answer wins the night.",
 eventType:"Picks starter moments, a reveal and an evening order that fit the occasion. Changing it later doesn't erase your games or content.",
 honor:"Photos you add here (for example from the guests of honor) appear in the TV slideshows during moments."};
function hint(k){return `<button class="hint ${L.hint===k?"on":""}" data-act="hint" data-k="${k}" aria-label="What does this mean?" aria-expanded="${L.hint===k}">?</button>${L.hint===k?`<span class="hintpop">${esc(HINTS[k]||"")}</span>`:""}`}

/* ---------- setup checklist ---------- */
function setupSteps(){const s=(D.meta&&D.meta.setup)||{},c=C();
 return [
  {k:"type",done:!!c.eventType||EV==="SHOWER",label:"Choose the event type",go:"event",tip:"Event tab → Event type. It loads moments, a reveal and an evening order."},
  {k:"details",done:!!s.details,label:"Add the event details",go:"event",tip:"Title, guests of honor and date, then Save details."},
  {k:"pin",done:!!s.pin,label:"Set your own moderator PIN",go:"event",tip:"Event tab → Moderator PIN. Share it only with your assistant."},
  {k:"content",done:!!s.content,label:"Review the games and questions",go:"content",tip:"Content tab. Edit questions or use Get ideas with AI."},
  {k:"moments",done:!!s.moments,label:"Plan the moments",go:"moments",tip:"Moments tab. Add photos and check the evening order."},
  {k:"practice",done:!!s.practice,label:"Do a practice run",go:"event",tip:"Event tab → Start a practice run, then try every button."},
  {k:"share",done:!!s.share,label:"Print the kit or share the link",go:"print",tip:"Printable kit has the door sign, cheat sheet and answer key."}]}
function markSetup(k){if(db&&EV&&D.meta&&!(D.meta.setup||{})[k])ER("meta/setup/"+k).set(true)}
function checklist(){if(D.meta&&D.meta.practice)return "";const steps=setupSteps(),left=steps.filter(x=>!x.done).length;if(store.get("ckHide_"+EV,false)&&!L.showChecklist||!left&&!L.showChecklist)return `<button class="btn sm as" data-act="showChecklist">Show the setup checklist (${left?left+" left":"all done"})</button>`;
 return `<section class="card stack checklist"><div class="row between"><div><h2>Setup checklist</h2><span class="small muted">${left?`${steps.length-left} of ${steps.length} done. Work down the list and you're ready.`:"All done. You're ready for the party!"}</span></div><div class="row">${L.confirm==="ckReset"?`<span class="small">Clear every check mark?</span><button class="btn sm gold" data-act="ckReset">Yes, start over</button><button class="btn sm" data-act="cancelConfirm">No</button>`:`<button class="btn sm" data-act="tour">Take the tour</button><button class="btn sm" data-act="askCkReset">Start over</button><button class="btn sm" data-act="hideChecklist">Hide</button>`}</div></div>
 <div class="bar"><i style="width:${Math.round(100*(steps.length-left)/steps.length)}%"></i></div>
 <ol class="cklist">${steps.map((x,i)=>`<li class="${x.done?"done":""} ${!x.done&&steps.findIndex(y=>!y.done)===i?"next":""}"><span class="ck">${x.done?"✓":i+1}</span><div class="grow"><b>${x.label}</b><span class="small muted db">${x.tip}</span></div>${x.done?"":x.go==="print"?`<a class="btn sm" href="${esc(eventURL(EV,"print"))}" target="_blank" rel="noopener" data-act="markShare">Open</a>`:`<button class="btn sm ${steps.findIndex(y=>!y.done)===i?"primary":""}" data-act="mtab" data-k="${x.go}">Go</button>`}</li>`).join("")}</ol></section>`}

/* ---------- first-time tour ---------- */
const TOUR=[
 {sel:".checklist",title:"Start here",text:"The setup checklist walks you through everything, in order. Each step gets a check mark when it's done."},
 {sel:'[data-act=mtab][data-k=live]',title:"Live",text:"Run the night from here: tap Go live on a game and every phone and the TV count down 5, 4, 3, 2, 1 and switch to it."},
 {sel:'[data-act=mtab][data-k=moments]',title:"Moments",text:"Put Welcome, Dinner, Cake and more on the TV, with a slideshow of everyone's photos. The big reveal lives here too."},
 {sel:'[data-act=mtab][data-k=teams]',title:"Teams",text:"See who's on which team, set team names and move anyone who needs it."},
 {sel:'[data-act=mtab][data-k=scores]',title:"Scores",text:"Fix points, run the tiebreaker, crown the winning team and send every guest their recap."},
 {sel:'[data-act=mtab][data-k=content]',title:"Content",text:"Trivia questions, hunt items, crossword words and more. Edit them, or let AI suggest ideas that fit your theme."},
 {sel:'[data-act=mtab][data-k=custom]',title:"Custom games",text:"Advanced: describe any game and AI writes it. The game library has nine ready-made two-player games too."},
 {sel:'[data-act=mtab][data-k=event]',title:"Event",text:"Event type, details, colors, picture, PIN, links, the printable kit and practice runs."},
 {sel:'[data-act=mtab][data-k=memories]',title:"Memories",text:"The shared photo album, the guests' wishes, and the keepsake page to share after the party."},
 {sel:".hint",title:"Little question marks",text:"Tap any ? to get a plain-words explanation of that setting."}];
function tourStep(){const el=$("#tour");if(!el)return;if(L.tourI==null||VIEW!=="moderator"){el.innerHTML="";el.className="";return}
 let i=L.tourI,step=TOUR[i];while(step&&!document.querySelector(step.sel)){i++;step=TOUR[i]}if(!step){L.tourI=null;store.set("tourDone",true);el.innerHTML="";el.className="";return}L.tourI=i;
 const t2=document.querySelector(step.sel);try{t2.scrollIntoView({block:"center",behavior:"smooth"})}catch(e){}
 setTimeout(()=>{if(!t2.getBoundingClientRect)return;const r=t2.getBoundingClientRect(),pad=6;const below=r.bottom+180<innerHeight;
  el.className="on";el.innerHTML=`<div class="tour-spot" style="left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+2*pad}px;height:${r.height+2*pad}px"></div><div class="tour-card" style="left:${Math.max(12,Math.min(innerWidth-332,r.left))}px;top:${below?r.bottom+14:Math.max(12,r.top-190)}px"><div class="eyebrow">${i+1} of ${TOUR.length}</div><h3>${step.title}</h3><p class="small m0">${step.text}</p><div class="row between"><button class="btn sm" data-act="tourEnd">Skip tour</button><div class="row">${i>0?`<button class="btn sm" data-act="tourBack">Back</button>`:""}<button class="btn sm primary" data-act="tourNext">${i===TOUR.length-1?"Done":"Next"}</button></div></div></div>`;bind(el)},320)}
window.addEventListener("resize",()=>{if(L.tourI!=null)tourStep()});

/* ---------- Moments tab ---------- */
function mMoments(){markSetup("moments");const ms=momentsList(),cur=st().moment,rv=revealCfg(),sec=D.secret||{},live=st().reveal;const h=D.honor||{};const hk=Object.keys(h).sort((a,b)=>(h[a].t||0)-(h[b].t||0));
 const card=(m,i)=>{const on=cur&&cur.id===m.id,ed=L.moEdit===i;return `<div class="gamerow evrow mo-row ${on?"on":""}"><span class="gnum">${i+1}</span><div class="mw0"><b>${esc(m.name)}</b><div class="small muted">“${esc(fillH(m.title))}”${m.sub?` · ${esc(fillH(m.sub))}`:""}</div><div class="row small">${m.album?'<span class="pill">Guest photos</span>':""}${m.honor?'<span class="pill">Your photos</span>':""}${m.wishes?'<span class="pill">Wishes</span>':""}</div></div>
  <div class="row">${on?`<button class="btn sm" data-act="moStop">Take off the TV</button>`:`<button class="btn sm primary" data-act="moShow" data-id="${esc(m.id)}">Show on TV</button>`}<button class="btn sm" data-act="moEdit" data-i="${i}">${ed?"Close":"Edit"}</button></div>
  ${ed?`<div class="stack evfull qs"><div class="grid2 g8"><label class="stack tight"><span class="small"><b>Name</b> (for you)</span><input type="text" data-draft="mo_name_${i}" value="${esc(dv("mo_name_"+i,m.name))}"></label><label class="stack tight"><span class="small"><b>Big message on the TV</b></span><input type="text" data-draft="mo_title_${i}" value="${esc(dv("mo_title_"+i,m.title))}"></label></div>
   <label class="stack tight"><span class="small"><b>Smaller line</b> ({honorees} becomes the guests of honor)</span><input type="text" data-draft="mo_sub_${i}" value="${esc(dv("mo_sub_"+i,m.sub))}"></label>
   <div class="row">${[["album","Guest photos"],["honor","Your photos"],["wishes","Wishes"]].map(([k,l])=>`<label class="row small"><input type="checkbox" data-draft="mo_${k}_${i}" ${(L.drafts["mo_"+k+"_"+i]!=null?L.drafts["mo_"+k+"_"+i]==="1":m[k])?"checked":""}> ${l}</label>`).join("")}</div>
   <div class="row"><button class="btn primary" data-act="moSave" data-i="${i}">Save</button><button class="btn" data-act="moDel" data-i="${i}">Delete this moment</button></div></div>`:""}</div>`};
 const gender=rv.kind==="gender";
 return `<section class="card stack"><div class="row between"><h2>Moments ${hint("moments")}</h2><span class="small muted">${esc(typeDef().label)}</span></div>
 ${cur?`<div class="banner"><span>On the TV now: <b>${esc((ms.find(x=>x.id===cur.id)||{name:""}).name)}</b></span><button class="btn sm" data-act="moStop">Take it off</button></div>`:""}
 ${ms.map(card).join("")}<button class="btn as" data-act="moAdd">Add a moment</button></section>
 <section class="card stack"><div class="row between"><h2>Your photos ${hint("honor")}</h2><label class="btn sm primary upl">${L.hUp?"Adding…":"Add photos"}<input type="file" accept="image/*" multiple data-act="honorUp" aria-label="Add photos"></label></div>
 ${hk.length?`<div class="album">${hk.map(k=>`<div class="hph"><img src="${h[k].thumb}" alt=""><button class="btn xs" data-act="honorDel" data-k="${k}">Remove</button></div>`).join("")}</div>`:'<p class="small muted m0">Add photos from the guests of honor, like baby pictures or engagement photos. They play in the TV slideshows.</p>'}</section>
 <section class="card stack"><div class="row between"><h2>The big reveal ${hint("reveal")}</h2><button class="toggle tg-sm" data-act="rvToggle" aria-pressed="${!!rv.enabled}"><span>${rv.enabled?"On":"Off"}</span><i></i></button></div>
 ${evType()==="baby"?`<p class="small muted m0">Only turn this on if the parents-to-be haven't already shared whether it's a boy or a girl.</p>`:""}
 ${rv.enabled?`<div class="grid2 g8"><label class="stack tight"><span class="small"><b>Question on the TV</b></span><input type="text" data-draft="rv_label" value="${esc(dv("rv_label",rv.label))}"></label>
  ${gender?`<label class="stack tight"><span class="small"><b>The answer (hidden from guests)</b></span><select data-draft="rv_answer"><option value="girl" ${(dv("rv_answer",sec.revealAnswer||"girl"))==="girl"?"selected":""}>It's a girl</option><option value="boy" ${(dv("rv_answer",sec.revealAnswer||""))==="boy"?"selected":""}>It's a boy</option></select></label>`
  :`<label class="stack tight"><span class="small"><b>${rv.kind==="number"?"The number":"The answer"}</b> (hidden from guests)</span><input type="${rv.kind==="number"?"number":"text"}" data-draft="rv_answer" value="${esc(dv("rv_answer",sec.revealAnswer!=null?sec.revealAnswer:rv.answer||""))}"></label>`}
  ${gender?"":`<label class="stack tight"><span class="small"><b>${rv.kind==="award"?"Award name":rv.kind==="number"?"Words after the number":"Smaller line"}</b></span><input type="text" data-draft="rv_sub" value="${esc(dv("rv_sub",rv.sub||""))}"></label>`}</div>
  ${live?`<div class="banner"><span>The reveal is showing on the TV and every phone now.</span></div>`:""}<div class="row"><button class="btn" data-act="rvSave">Save</button>${live?`<button class="btn" data-act="rvStop">Hide the reveal</button>`:L.confirm==="reveal"?`<span class="small">Everyone will see it now.</span><button class="btn gold" data-act="rvStart">Yes, reveal it!</button><button class="btn sm" data-act="cancelConfirm">Not yet</button>`:`<button class="btn primary" data-act="rvAsk">Start the reveal</button>`}</div>`:'<p class="small muted m0">Turn it on to set up a reveal moment for the TV and every phone.</p>'}</section>
 <section class="card stack"><div class="row between"><h2>Evening order</h2><a class="btn sm" href="${esc(eventURL(EV,"print"))}" target="_blank" rel="noopener" data-act="markShare">Print the night-of cheat sheet</a></div><p class="small muted m0">A suggested order for a ${esc(typeDef().label.toLowerCase())}. Follow it top to bottom, or jump around.</p>
 <ol class="cheatlist">${orderSteps().map(s=>`<li><b>${esc(s.label)}</b><span class="small muted">${esc(s.how)}</span></li>`).join("")}</ol></section>`}

/* ---------- legal ---------- */
function legalName(){return (D.admin&&D.admin.legalName)||"the host of this event"}
function legalContact(){return (D.admin&&D.admin.contact)||"the event host"}
function termsText(){return `<h2>Terms of Use</h2><p class="small muted">Last updated October 30, 2026</p>
<p>These games are provided by ${esc(legalName())} ("we") for guests of private events. By joining, you agree to these terms.</p>
<h4>Using the games</h4><ul><li>Play fair and be kind. Don't post photos, names or messages that are offensive, private to someone else, or that you don't have the right to share.</li><li>Hosts can remove photos, messages or players at any time.</li><li>Scores, prizes and raffles are for fun and are decided by the host.</li></ul>
<h4>Your content</h4><p>You keep ownership of photos and messages you add. You let the host and other guests at the event view them and let the host share them with the guests of honor, for example in a keepsake page.</p>
<h4>No guarantees</h4><p>The games are provided as is. They may have mistakes or stop working, and we aren't responsible for lost photos, scores or messages.</p>
<h4>Children</h4><p>Guests under 13 should play with a parent or guardian, who joins on their behalf.</p>
<h4>Contact</h4><p>Questions: ${esc(legalContact())}.</p>`}
function privacyText(){const days=+(C().retentionDays!=null?C().retentionDays:60);return `<h2>Privacy Policy</h2><p class="small muted">Last updated October 30, 2026</p>
<h4>What we collect</h4><ul><li>The name, birth month and day, picture or selfie, and fun-fact answer you enter when you join.</li><li>Photos you take for games or the shared album, wishes you write, and your game activity and scores.</li><li>Your phone keeps a few settings (like language and text size) on your own device.</li></ul>
<h4>How it's used</h4><p>Only to run the games at this event: forming teams, scoring, showing the leaderboard and slideshows, and making a keepsake for the guests of honor. We don't sell it or use it for advertising.</p>
<h4>Who can see it</h4><p>Other guests at the event, the host and moderators, and the guests of honor. Anyone with the event's link can open the shared album and keepsake page.</p>
<h4>Where it's stored</h4><p>In Google Firebase, a cloud database service.</p>
<h4>How long we keep it</h4><p>${days>0?`Photos are deleted automatically ${days} days after they're taken.`:"Photos are kept until the host deletes them."} Names, scores and wishes are kept until the host deletes the event.</p>
<h4>Your choices</h4><p>Ask the host to remove your photos, messages or profile at any time. Contact: ${esc(legalContact())}.</p>
<h4>Children</h4><p>We don't knowingly collect information from children under 13 without a parent or guardian joining on their behalf.</p>`}
function legalLinks(){return `<p class="fine">${t("By joining, you agree to the")} <a href="#" data-act="legal" data-k="terms">${t("Terms")}</a> ${t("and")} <a href="#" data-act="legal" data-k="privacy">${t("Privacy Policy")}</a>.</p>`}
function legalFoot(){return `<p class="fine tc"><a href="#" data-act="legal" data-k="terms">${t("Terms")}</a> · <a href="#" data-act="legal" data-k="privacy">${t("Privacy Policy")}</a></p>`}
function legalSheet(){return `<div class="sheet-bg"></div><div class="sheet legal" role="dialog"><div class="row between"><span></span><button class="btn sm" data-act="legalClose">${t("Close")}</button></div><div class="legal-body">${L.legal==="terms"?termsText():privacyText()}</div><p class="small muted">This text is a starting point, not legal advice. Have a lawyer review it before using the app for paying clients.</p></div>`}

/* ---------- keepsake page (after the party) ---------- */
function keepsakeView(){const c=C(),w=winnerKey(),wi=D.wishes||{},wk=Object.keys(wi).sort((a,b)=>(wi[a].t||0)-(wi[b].t||0)),order=ranked().slice(0,10);
 return `<section class="card stack tc keep-hero">${c.image?`<img class="ev-art" src="${c.image}" alt="">`:""}<div class="eyebrow">${esc(c.tagline||"")}</div><div class="winner">${esc(c.title||"Our celebration")}</div>${c.honorees?`<p class="m0">For ${esc(c.honorees)}</p>`:""}</section>
 <section class="card stack"><h2>Final scores</h2>${teamBar()}${w?`<p class="m0 tc"><b>${esc(teamName(w))} won the night!</b></p>`:""}<table><tbody>${order.map((i,k)=>`<tr><td class="num">${k+1}</td><td>${av(i,24)} ${esc(P(i).name)}</td><td class="num tr">${score(i)}</td></tr>`).join("")}</tbody></table></section>
 <section class="card stack"><h2>Wishes</h2>${wk.length?`<div class="wishgrid">${wk.map(k=>`<div class="wish"><p class="m0">${esc(wi[k].text)}</p><p class="small muted m0">${esc(wi[k].name||"")}</p></div>`).join("")}</div>`:'<p class="small muted m0">No wishes were left.</p>'}</section>
 <section class="card stack"><h2>Photos</h2>${albumGrid(false)}</section>${legalFoot()}`}

/* ---------- photo cleanup (runs whenever a host or moderator console opens) ---------- */
async function cleanupEvent(code,days){if(!db||!(days>0))return 0;const cut=now()-days*86400000;let n=0;
 const al=(await ER("album",code).once("value")).val()||{};for(const k of Object.keys(al))if((al[k].t||0)<cut){await ER("album/"+k,code).remove();await ER("albumFull/"+k,code).remove();n++}
 const ph=(await ER("photos",code).once("value")).val()||{};for(const k of Object.keys(ph))if((ph[k].t||0)<cut&&ph[k].img){await ER("photos/"+k+"/img",code).remove();n++}
 const hn=(await ER("honor",code).once("value")).val()||{};for(const k of Object.keys(hn))if((hn[k].t||0)<cut){await ER("honor/"+k,code).remove();await ER("honorFull/"+k,code).remove();n++}
 const cm=(await ER("cgmedia",code).once("value")).val()||{};for(const k of Object.keys(cm)){const v=cm[k];const tt=v&&typeof v==="object"?v.t:0;if(!tt||tt<cut){const meta=(await ER("meta/created",code).once("value")).val()||0;if(tt?tt<cut:meta<cut){await ER("cgmedia/"+k,code).remove();n++}}}
 return n}
let cleaned=false;
async function runCleanup(){if(cleaned||!db)return;cleaned=true;try{
 if(VIEW==="moderator"&&EV&&D.content){const d=C().retentionDays!=null?+C().retentionDays:60;await cleanupEvent(EV,d)}
 if(VIEW==="host"){for(const code of Object.keys(D.events||{})){const c=(await ER("content/retentionDays",code).once("value")).val();await cleanupEvent(code,c!=null?+c:60)}}}catch(e){console.warn("cleanup",e)}}

