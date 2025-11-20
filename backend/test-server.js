const http = require('http');

const PORT = 5000;
const HOST = '127.0.0.1';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', raw: true }));
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, HOST, () => {
  console.log(`RAW HTTP server listening on http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

setInterval(() => {
  process.stdout.write('.');
}, 3000);
