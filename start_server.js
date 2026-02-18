const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load configuration
const config = require('./config.json');

// Check if config has changed since last generation
if (fs.existsSync('./.last-generation-config.json')) {
    const lastConfig = JSON.parse(fs.readFileSync('./.last-generation-config.json', 'utf8'));
    if (lastConfig.emojiDirectory !== config.emojiDirectory) {
        console.error('\n⚠️  Configuration has changed since last generation!');
        console.error(`   Previous emoji directory: ${lastConfig.emojiDirectory}`);
        console.error(`   Current emoji directory:  ${config.emojiDirectory}`);
        console.error('\n   Please run: ./generate_html.sh\n');
        process.exit(1);
    }
} else if (!fs.existsSync('./emoji_browser.html') || !fs.existsSync('./emoji_browser.js')) {
    console.error('\n⚠️  Generated files not found!');
    console.error('   Please run: ./generate_html.sh\n');
    process.exit(1);
}

// Expand ~ to home directory if present
let emojiDir = config.emojiDirectory;
if (emojiDir.startsWith('~/')) {
    emojiDir = path.join(os.homedir(), emojiDir.slice(2));
}
const EMOJI_DIR = emojiDir;
const SELECTED_DIR = './selected';
const PORT = config.port;

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
if (!fs.existsSync(EMOJI_DIR)) {
    console.error(`Error: Emoji directory "${EMOJI_DIR}" not found!`);
    console.error(`Please check your config.json or create the directory and add your emoji images to it.`);
    console.error('Then run: ./generate_html.sh');
    process.exit(1);
}

// Create selected directory if it doesn't exist
if (!fs.existsSync(SELECTED_DIR)) {
    fs.mkdirSync(SELECTED_DIR, { recursive: true });
    console.log(`Created "${SELECTED_DIR}" directory`);
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
        // Return list of files in selected directory (flat structure)
        fs.readdir(SELECTED_DIR, (err, files) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ files: [] }));
            } else {
                // Filter out directories, only return files
                const fileList = files.filter(f => {
                    try {
                        return fs.statSync(path.join(SELECTED_DIR, f)).isFile();
                    } catch {
                        return false;
                    }
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ files: fileList }));
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

            const sourcePath = path.join(EMOJI_DIR, data.filename);
            // Flatten structure - just use basename for destination
            const destPath = path.join(SELECTED_DIR, path.basename(data.filename));

            fs.copyFile(sourcePath, destPath, (error) => {
                if (error) {
                    console.error('Copy error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    console.log(`Copied: ${data.filename} -> ${path.basename(data.filename)}`);
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

            // Use basename since we flatten the structure
            const filePath = path.join(SELECTED_DIR, path.basename(data.filename));

            fs.unlink(filePath, (error) => {
                if (error && error.code !== 'ENOENT') {
                    console.error('Delete error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    console.log(`Deleted: ${path.basename(data.filename)}`);
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

    // Special handling for emoji files - serve from configured emoji directory
    if (req.url.startsWith('/emojis/')) {
        const emojiFile = req.url.substring('/emojis/'.length);
        filePath = path.join(EMOJI_DIR, emojiFile);
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
