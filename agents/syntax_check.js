// Checks Host Mode's code for syntax errors: every file in js/ (in the order games.html loads them, joined the way
// the page joins them) plus any inline <script> blocks in games.html. Usage: node agents/syntax_check.js
const fs=require("fs"),path=require("path"),root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"games.html"),"utf8");let bad=0,n=0;
const m=html.match(/const HM_FILES=(\[[^\]]*\]);/);
const files=m?JSON.parse(m[1]):[];
const onDisk=fs.readdirSync(path.join(root,"js")).filter(f=>f.endsWith(".js")).map(f=>f.slice(0,-3));
onDisk.filter(f=>!files.includes(f)).forEach(f=>{bad++;console.log(`js/${f}.js isn't listed in HM_FILES in games.html, so it never runs`)});
files.filter(f=>!onDisk.includes(f)).forEach(f=>{bad++;console.log(`HM_FILES lists js/${f}.js, but the file is missing`)});
const parts=files.filter(f=>onDisk.includes(f)).map(f=>{const code=fs.readFileSync(path.join(root,"js",f+".js"),"utf8");n++;
 try{new Function(code)}catch(e){bad++;console.log(`js/${f}.js: ${e.message}`)}return code});
try{new Function(parts.join("\n"))}catch(e){bad++;console.log("The joined code: "+e.message)}
const re=/<script>([\s\S]*?)<\/script>/g;let s;while((s=re.exec(html))){n++;try{new Function(s[1])}catch(e){bad++;console.log("An inline script in games.html: "+e.message)}}
console.log(bad?`${bad} problem(s) found`:`All ${n} scripts are OK`);process.exit(bad?1:0);
