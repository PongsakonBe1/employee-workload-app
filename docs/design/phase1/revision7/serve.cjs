/* Explicit localhost-only design routes. No production data, document uploads or package downloads. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files={
 '/':['index.html','text/html'],'/index.html':['index.html','text/html'],'/gallery.html':['gallery.html','text/html'],
 '/design.css':['design.css','text/css'],'/layout.js':['layout.js','text/javascript'],'/interactions.js':['interactions.js','text/javascript'],
 '/flow-fixes.js':['flow-fixes.js','text/javascript'],'/flow-fixes.css':['flow-fixes.css','text/css'],
 '/revision6/glass.css':['../revision6/glass.css','text/css'],'/revision6/workspace.js':['../revision6/workspace.js','text/javascript'],'/revision6/motion.js':['../revision6/motion.js','text/javascript'],
 '/revision3/styles.css':['../revision3/styles.css','text/css'],'/revision3/app.js':['../revision3/app.js','text/javascript'],
 '/revision4/catalog.js':['../revision4/catalog.js','text/javascript'],'/revision4/features.js':['../revision4/features.js','text/javascript'],
 '/revision5/hig.css':['../revision5/hig.css','text/css'],'/revision5/design.js':['../revision5/design.js','text/javascript'],
 '/frontend/public/labboy-logo.png':['../../../../frontend/public/labboy-logo.png','image/png'],
};
http.createServer((req,res)=>{
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 let pathname;try{pathname=new URL(req.url,'http://127.0.0.1').pathname;}catch{res.writeHead(400);return res.end();}
 let entry=files[pathname];
 if(!entry&&/^\/output\/playwright\/ux-phase1\/revision7\/[a-z-]+\.(png|webm|mp4)$/.test(pathname)){
  const ext=pathname.split('.').at(-1);entry=['../../../../output/playwright/ux-phase1/revision7/'+pathname.split('/').at(-1),ext==='png'?'image/png':ext==='mp4'?'video/mp4':'video/webm'];
 }
 if(!entry){res.writeHead(404);return res.end();}
 fs.readFile(path.resolve(__dirname,entry[0]),(err,data)=>{
  if(err){res.writeHead(404);return res.end();}
  // The prototype has no external font dependency; baseline files remain untouched.
  if(pathname==='/revision3/styles.css')data=Buffer.from(data.toString('utf8').replace(/^@import[^\r\n]*(?:\r?\n|$)/gm,''));
  res.writeHead(200,{'Content-Type':entry[1]+(/^(text|application)/.test(entry[1])?'; charset=utf-8':''),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
 });
}).listen(4197,'127.0.0.1',()=>console.log('Review 07: http://127.0.0.1:4197/'));
