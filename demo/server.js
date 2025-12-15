const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Create static file server
const server = http.createServer((req, res) => {
  // Get file path (serve from pages directory)
  const filePath = path.join(__dirname, 'pages', req.url === '/' ? 'index.html' : req.url);

  // Get file extension
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 5000;

// Open browser automatically
function openBrowser(url) {
  const platform = process.platform;
  let command;

  switch (platform) {
    case 'darwin': // macOS
      command = `open ${url}`;
      break;
    case 'win32': // Windows
      command = `start ${url}`;
      break;
    default: // Linux and others
      command = `xdg-open ${url}`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`\n⚠️  Could not open browser automatically. Please open manually: ${url}\n`);
    }
  });
}

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🚀 Demo server running at ${url}`);
  console.log('\n📖 Opening browser automatically...\n');

  // Open browser after a short delay to ensure server is ready
  setTimeout(() => {
    openBrowser(url);
  }, 500);
});
