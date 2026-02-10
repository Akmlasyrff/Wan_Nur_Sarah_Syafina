const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Vercel only allows writing to /tmp
const DATA_FILE = path.join(process.cwd(), 'confessions.json');
const TMP_FILE = path.join('/tmp', 'confessions.json');

// Fallback to in-memory if file system is read-only (like Vercel)
let inMemoryConfessions = [];
let useMemory = false;

app.use(cors());
app.use(bodyParser.json());

// Resolve public folder safely for Vercel
const PUBLIC_DIR = path.join(process.cwd(), 'public');
app.use(express.static(PUBLIC_DIR));

// Explicitly serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Helper to get data safely
// Load initial data at startup to ensure it's bundled by Vercel
let initialData = [];
try {
    initialData = require('./confessions.json');
} catch (e) {
    console.warn("Could not require confessions.json:", e);
}

const loadConfessions = () => {
    let data = [];
    try {
        if (useMemory) return inMemoryConfessions;

        // 1. Try reading from /tmp (recent data in serverless)
        try {
            if (fs.existsSync(TMP_FILE)) {
                const tmpData = fs.readFileSync(TMP_FILE, 'utf8');
                if (tmpData) {
                    const parsed = JSON.parse(tmpData);
                    if (Array.isArray(parsed)) return parsed;
                }
            }
        } catch (e) {
            console.error("Accessing TMP failed:", e);
        }

        // 2. Fallback: Try reading local file (for local dev)
        // Prefer __dirname in Vercel environment for relative assets
        const localPath = path.join(__dirname, 'confessions.json');
        try {
            if (fs.existsSync(localPath)) {
                const localData = fs.readFileSync(localPath, 'utf8');
                if (localData) {
                    const parsed = JSON.parse(localData);
                    if (Array.isArray(parsed)) return parsed;
                }
            }
        } catch (e) {
            console.warn("Read local file failed:", e);
        }

        // 3. Ultimate Fallback: The bundled data
        return Array.isArray(initialData) ? JSON.parse(JSON.stringify(initialData)) : [];
    } catch (criticalError) {
        console.error("Critical error in loadConfessions:", criticalError);
        return [];
    }
};

const saveConfessions = (confessions) => {
    if (useMemory) {
        inMemoryConfessions = confessions;
        return;
    }

    // Always write to /tmp on Vercel
    try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(confessions, null, 2));
    } catch (e) {
        console.error("Could not write to /tmp:", e);
        // Fallback to memory
        useMemory = true;
        inMemoryConfessions = confessions;
    }
};

// GET all confessions
app.get('/api/confessions', (req, res) => {
    try {
        const confessions = loadConfessions();
        // Use slice() to create a copy before reversing to avoid mutating the source
        res.json(confessions.slice().reverse());
    } catch (e) {
        console.error("GET /api/confessions ERROR:", e);
        res.status(500).json({ error: "Server Error", details: e.toString() });
    }
});

// POST a new confession
app.post('/api/confessions', (req, res) => {
    const { text, author } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const confessions = loadConfessions();
    const newConfession = {
        id: Date.now().toString(),
        text,
        author: author || 'Anonymous',
        timestamp: new Date().toISOString()
    };

    confessions.push(newConfession);
    saveConfessions(confessions);

    res.status(201).json(newConfession);
});

// SECRET URL: View all messages (for you)
app.get('/secret-admin-view', (req, res) => {
    const confessions = loadConfessions();

    let html = `
    <html>
    <head>
        <title>Secret Inbox</title>
        <style>
            body { font-family: sans-serif; padding: 2rem; background: #fff0f3; }
            .card { background: white; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .meta { color: #888; font-size: 0.8rem; margin-top: 0.5rem; }
            h1 { color: #d90429; }
            .warning { background: #ffcccb; color: #d00; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; }
        </style>
    </head>
    <body>
        <h1>💌 Reply Inbox</h1>
        ${useMemory ? '<div class="warning">⚠️ RUNNING IN MEMORY MODE via Vercel. Data will be lost on restart!</div>' : ''}
    `;

    // Show newest first
    confessions.slice().reverse().forEach(c => {
        html += `
        <div class="card">
            <p><strong>${c.author}</strong> wrote:</p>
            <p style="font-size: 1.2rem; white-space: pre-wrap;">${c.text}</p>
            <div class="meta">Received: ${new Date(c.timestamp).toLocaleString()}</div>
        </div>`;
    });

    html += `</body></html>`;
    res.send(html);
});

// Export for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`View replies at http://localhost:${PORT}/secret-admin-view`);
    });
}
