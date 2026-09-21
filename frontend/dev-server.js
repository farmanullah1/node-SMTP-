import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = parseInt(process.env.PORT || '5173', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const BACKEND_PARSED = new URL(BACKEND_URL);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Transparently proxies API calls to the backend Express server.
 */
function proxyApiRequest(clientReq, clientRes) {
  const options = {
    hostname: BACKEND_PARSED.hostname,
    port: BACKEND_PARSED.port || (BACKEND_PARSED.protocol === 'https:' ? 443 : 80),
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: BACKEND_PARSED.host,
      'x-forwarded-for': clientReq.socket.remoteAddress || '127.0.0.1',
      'x-forwarded-proto': 'http',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Dev Server Proxy Error] ${err.message} (${clientReq.url})`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        success: false,
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: `Backend server at ${BACKEND_URL} is unreachable. Ensure the backend is running via 'npm run dev' in backend/ or root directory.`,
          details: err.message,
        },
      }));
    }
  });

  clientReq.pipe(proxyReq, { end: true });
}

/**
 * Serves static files with proper MIME types.
 */
function serveStaticFile(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Security: prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${readErr.message}`);
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.end(content);
    });
  });
}

/**
 * Request router.
 */
const server = http.createServer((req, res) => {
  if (req.url && (req.url.startsWith('/api/') || req.url.startsWith('/api?'))) {
    proxyApiRequest(req, res);
  } else {
    serveStaticFile(req, res);
  }
});

/**
 * Start listening with graceful port conflict handling.
 */
function start(port = DEFAULT_PORT) {
  server.listen(port, () => {
    console.log('====================================================');
    console.log('   TRANSACTIONAL EMAIL STUDIO - FRONTEND DEV SERVER  ');
    console.log('====================================================');
    console.log(`[Frontend] Local Studio:   http://localhost:${port}/`);
    console.log(`[Frontend] Proxying API:   ${BACKEND_URL}/api`);
    console.log(`[Frontend] Workspace:      ${__dirname}`);
    console.log('====================================================\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Frontend Port Notice] Port ${port} is in use. Trying port ${port + 1}...`);
      start(port + 1);
    } else {
      console.error('[Frontend Fatal] Server error:', err);
      process.exit(1);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

start();
