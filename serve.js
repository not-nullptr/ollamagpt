import fs from 'fs';
import http from 'http';
import https from 'https';
import { parse } from 'url';
import httpProxy from 'http-proxy';
import { handler } from './build/handler.js';

const proxy = httpProxy.createProxyServer({});

/** @type {https.ServerOptions} */
const httpsOptions = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.crt'),
};

// Create the HTTPS server
const httpsServer = https.createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    // Check if the request is for the health check
    if (parsedUrl.pathname === '/healthcheck') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
    } else if (parsedUrl.pathname.startsWith('/api')) {
        // pipe to localhost:11434
        proxy.web(req, res, { target: 'http://localhost:11434' });
    } else {
        // Let SvelteKit handle all other requests
        handler(req, res);
    }
});

const httpsPort = 443;
httpsServer.listen(443, () => {
    console.log(`HTTPS server listening on port ${httpsPort}`);
});

// Create an HTTP server that redirects all traffic to HTTPS
const httpServer = http.createServer((req, res) => {
    // filter out port from req.headers.host
    const host = req.headers.host.split(':')[0];
    const httpsRedirectUrl = `https://${host}:${httpsPort}${req.url}`;
    res.writeHead(301, { Location: httpsRedirectUrl });
    res.end();
});

const redirectPort = 60080;
httpServer.listen(redirectPort, () => {
    console.log(`HTTP server listening on port ${redirectPort} and redirecting to HTTPS`);
});