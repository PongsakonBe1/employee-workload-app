/* Local design-review server; serves only prototype files and the public brand asset. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const assets={
  '/':['index.html','text/html; charset=utf-8'],
  '/index.html':['index.html','text/html; charset=utf-8'],
  '/styles.css':['styles.css','text/css; charset=utf-8'],
  '/app.js':['app.js','text/javascript; charset=utf-8'],
  '/gallery.html':['gallery.html','text/html; charset=utf-8'],
  '/frontend/public/labboy-logo.png':['../../../../frontend/public/labboy-logo.png','image/png'],
};
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  let asset=assets[pathname];
  if(!asset&&/^\/(previews|output\/playwright\/ux-phase1\/revision3)\/[a-z-]+\.png$/.test(pathname))asset=['../../../../output/playwright/ux-phase1/revision3/'+pathname.split('/').at(-1),'image/png'];
  if(!asset){res.writeHead(404);res.end('Not found');return;}
  const filename=path.resolve(root,asset[0]);
  fs.readFile(filename,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store'});res.end(data);});
}).listen(4193,'127.0.0.1',()=>console.log('Design review: http://127.0.0.1:4193/'));
