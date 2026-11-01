// Temporary local capture host: only serves the approved synthetic prototype and logo.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'docs/design/phase1/revision2/index.html'), 'utf8');
const html = source.replace('</head>', '<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script></head>');
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4173');
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  if (url.pathname === '/' || url.pathname === '/prototype.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(html); return;
  }
  if (url.pathname === '/frontend/public/labboy-logo.png') {
    response.writeHead(200, { 'Content-Type': 'image/png' }); response.end(fs.readFileSync(path.join(root, 'frontend/public/labboy-logo.png'))); return;
  }
  response.writeHead(404); response.end();
}).listen(4173, '127.0.0.1', () => console.log('Synthetic design capture at http://127.0.0.1:4173'));
