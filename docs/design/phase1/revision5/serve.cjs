/* Whitelisted, synthetic design preview only. No access to user documents or APIs. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const routes={
 '/':['index.html','text/html'],'/index.html':['index.html','text/html'],
 '/hig.css':['hig.css','text/css'],'/design.js':['design.js','text/javascript'],
 '/gallery.html':['gallery.html','text/html'],
 '/revision3/styles.css':['../revision3/styles.css','text/css'],
 '/revision3/app.js':['../revision3/app.js','text/javascript'],
 '/revision4/catalog.js':['../revision4/catalog.js','text/javascript'],
 '/revision4/features.js':['../revision4/features.js','text/javascript'],
 '/frontend/public/labboy-logo.png':['../../../../frontend/public/labboy-logo.png','image/png'],
};
http.createServer((req,res)=>{
 let pathname;try{pathname=new URL(req.url,'http://127.0.0.1').pathname;}catch{res.writeHead(400);res.end();return;}
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 let entry=routes[pathname];
 if(!entry&&/^\/output\/playwright\/ux-phase1\/revision5\/[a-z-]+\.png$/.test(pathname))entry=['../../../../output/playwright/ux-phase1/revision5/'+pathname.split('/').at(-1),'image/png'];
 if(!entry){res.writeHead(404);res.end();return;}
 fs.readFile(path.resolve(__dirname,entry[0]),(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':entry[1]+(entry[1].startsWith('image')?'':'; charset=utf-8'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
}).listen(4195,'127.0.0.1',()=>console.log('Review 05 ready: http://127.0.0.1:4195/'));
