const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const TEST_RESULTS_FILE = path.join(DATA_DIR, 'test-results.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });

        // Create initial test results file if it doesn't exist
        try {
            await fs.access(TEST_RESULTS_FILE);
        } catch {
            await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify({ results: [] }, null, 2));
            console.log('✓ Created initial test-results.json');
        }
    } catch (error) {
        console.error('Error ensuring data directory:', error);
    }
}

// API Routes

// Get all test results
app.get('/api/test-results', async (req, res) => {
    try {
        const data = await fs.readFile(TEST_RESULTS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading test results:', error);
        res.json({ results: [] });
    }
});

// Get specific test result
app.get('/api/test-results/:id', async (req, res) => {
    try {
        const data = await fs.readFile(TEST_RESULTS_FILE, 'utf8');
        const { results } = JSON.parse(data);
        const result = results.find(r => r.id === req.params.id);

        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Test result not found' });
        }
    } catch (error) {
        console.error('Error reading test result:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new test result
app.post('/api/test-results', async (req, res) => {
    try {
        const data = await fs.readFile(TEST_RESULTS_FILE, 'utf8');
        const { results } = JSON.parse(data);

        const newResult = {
            id: `test-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...req.body
        };

        results.push(newResult);

        await fs.writeFile(TEST_RESULTS_FILE, JSON.stringify({ results }, null, 2));

        console.log(`✓ Added test result: ${newResult.id}`);
        res.json(newResult);
    } catch (error) {
        console.error('Error adding test result:', error);
        res.status(500).json({ error: 'Failed to add test result' });
    }
});

// Get summary statistics
app.get('/api/summary', async (req, res) => {
    try {
        const data = await fs.readFile(TEST_RESULTS_FILE, 'utf8');
        const { results } = JSON.parse(data);

        const total = results.length;
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
        const avgDuration = total > 0 ? totalDuration / total : 0;

        res.json({
            total,
            passed,
            failed,
            skipped,
            passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
            avgDuration: avgDuration.toFixed(1)
        });
    } catch (error) {
        console.error('Error calculating summary:', error);
        res.status(500).json({ error: 'Failed to calculate summary' });
    }
});

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// File watcher for real-time updates
function setupFileWatcher() {
    const watcher = chokidar.watch(TEST_RESULTS_FILE, {
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('change', async () => {
        console.log('📊 Test results updated');
        // In a production app, you'd use WebSockets here to push updates to clients
    });

    console.log('👀 Watching for test result changes...');
}

// Start server
async function start() {
    await ensureDataDir();
    setupFileWatcher();

    app.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║                                                          ║');
        console.log('║     📊  Purchase Flow Monitoring Dashboard              ║');
        console.log('║                                                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`✓ Server running at: http://localhost:${PORT}`);
        console.log(`✓ Dashboard: http://localhost:${PORT}`);
        console.log(`✓ API: http://localhost:${PORT}/api/test-results`);
        console.log('');
        console.log('Press Ctrl+C to stop');
        console.log('');
    });
}

start().catch(console.error);
