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
    if (useMemory) return inMemoryConfessions;

    // 1. Try reading from /tmp (most recent data in this container)
    if (fs.existsSync(TMP_FILE)) {
        try {
            const data = fs.readFileSync(TMP_FILE, 'utf8');
            if (data) return JSON.parse(data);
        } catch (e) { console.error("Error reading TMP:", e); }
    }

    // 2. Fallback: Try reading local file (for local dev dev updates)
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            if (data) return JSON.parse(data);
        } catch (e) {
            console.error("Error reading DATA file, falling back to require:", e);
        }
    }

    // 3. Ultimate Fallback: The data bundled with the app
    return initialData || [];
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
    const confessions = loadConfessions();
    // Use slice() to create a copy before reversing to avoid mutating the source
    res.json(confessions.slice().reverse());
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
