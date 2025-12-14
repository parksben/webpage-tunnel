const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

// Create server for User A
const userAServer = http.createServer((req, res) => {
  // Handle dist folder access
  const filePath = path.join(__dirname, 'user-a', req.url === '/' ? 'index.html' : req.url);

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create server for User B
const userBServer = http.createServer((req, res) => {
  // Handle dist folder access
  const filePath = path.join(__dirname, 'user-b', req.url === '/' ? 'index.html' : req.url);

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const USER_A_PORT = 3001;
const USER_B_PORT = 3002;

userAServer.listen(USER_A_PORT, () => {
  console.log('\n💬 Chat Demo Started!\n');
  console.log(`👤·User·A:·http://localhost:${USER_A_PORT}`);
  console.log(`👤·User·B:·http://localhost:${USER_B_PORT}`);
  console.log('\n💡 Open User A in your browser to start chatting!\n');
});

userBServer.listen(USER_B_PORT);
