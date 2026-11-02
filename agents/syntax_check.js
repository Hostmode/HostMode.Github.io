// Checks every <script> block in an HTML file for syntax errors. Usage: node agents/syntax_check.js games.html
const fs=require("fs"),f=process.argv[2]||"games.html",s=fs.readFileSync(f,"utf8"),re=/<script>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(s))){n++;try{new Function(m[1])}catch(e){bad++;console.log("Script block "+n+": "+e.message)}}
console.log(bad?bad+" of "+n+" script blocks have errors":"All "+n+" script blocks are OK");process.exit(bad?1:0);
