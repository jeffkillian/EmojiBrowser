const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const EMOJIS_DIR = './emojis';
const SELECTED_DIR = './selected';

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Check if emojis directory exists
if (!fs.existsSync(EMOJIS_DIR)) {
    console.error('Error: "emojis" directory not found!');
    console.error('Please create an "emojis" directory and add your emoji images to it.');
    console.error('Then run: ./generate_html.sh');
    process.exit(1);
}

// Create selected directory if it doesn't exist
if (!fs.existsSync(SELECTED_DIR)) {
    fs.mkdirSync(SELECTED_DIR);
    console.log('Created "selected" directory');
}

// Helper to parse JSON body
function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            callback(null, JSON.parse(body));
        } catch (err) {
            callback(err);
        }
    });
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // API endpoints for file operations
    if (req.method === 'GET' && req.url === '/api/selected') {
        // Return list of files in selected directory
        fs.readdir(SELECTED_DIR, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ files: files }));
            }
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/select') {
        parseBody(req, (err, data) => {
            if (err || !data.filename) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
                return;
            }

            const sourcePath = path.join(EMOJIS_DIR, data.filename);
            const destPath = path.join(SELECTED_DIR, data.filename);

            fs.copyFile(sourcePath, destPath, (error) => {
                if (error) {
                    console.error('Copy error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    console.log(`Copied: ${data.filename}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            });
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/deselect') {
        parseBody(req, (err, data) => {
            if (err || !data.filename) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
                return;
            }

            const filePath = path.join(SELECTED_DIR, data.filename);

            fs.unlink(filePath, (error) => {
                if (error && error.code !== 'ENOENT') {
                    console.error('Delete error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    console.log(`Deleted: ${data.filename}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            });
        });
        return;
    }

    // Regular file serving
    let filePath = '.' + decodeURIComponent(req.url);
    if (filePath === './') {
        filePath = './emoji_browser.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/emoji_browser.html`);
});
