const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const statusFilePath = path.join(__dirname, '../data/last-update.json');

const updateStatus = (key) => {
    try {
        const data = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
        data[key] = new Date().toISOString();
        fs.writeFileSync(statusFilePath, JSON.stringify(data, null, 4));
        console.log(`[Scheduler] Updated status for ${key}`);
    } catch (error) {
        console.error(`[Scheduler] Failed to update status: ${error.message}`);
    }
};

const runScript = (command, name, statusKey) => {
    console.log(`[Scheduler] Starting ${name}: ${command}`);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Scheduler] Error running ${name}: ${error.message}`);
            return;
        }
        if (stderr) {
            console.warn(`[Scheduler] Warn running ${name}: ${stderr}`);
        }
        console.log(`[Scheduler] Successfully completed ${name}`);
        if (statusKey) updateStatus(statusKey);
    });
};

const initScheduler = () => {
    console.log('[Scheduler] Initializing background tasks...');

    // Run price update every 24 hours at midnight
    cron.schedule('0 0 * * *', () => {
        const scriptPath = path.join(__dirname, '../scripts/updatePrices.js');
        const command = `node "${scriptPath}"`;
        runScript(command, 'Price Update', 'prices');
    });

    // Run ML predictions every day at midnight (shifted by 5 mins to avoid overlap)
    cron.schedule('5 0 * * *', () => {
        const scriptPath = path.join(__dirname, '../../random_forests.py');
        const command = `python "${scriptPath}"`;
        runScript(command, 'ML Predictions', 'predictions');
    });

    // Initial run on startup if status is missing or stale (older than 24 hours)
    try {
        if (!fs.existsSync(statusFilePath)) {
            fs.writeFileSync(statusFilePath, JSON.stringify({ prices: null, predictions: null }, null, 4));
        }

        const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        // Check prices staleness
        const lastPriceUpdate = status.prices ? new Date(status.prices) : null;
        if (!lastPriceUpdate || lastPriceUpdate < oneDayAgo) {
            console.log('[Scheduler] Price update is stale or missing. Triggering catch-up run.');
            const scriptPath = path.join(__dirname, '../scripts/updatePrices.js');
            const command = `node "${scriptPath}"`;
            runScript(command, 'Catch-up Price Update', 'prices');
        }

        // Check predictions staleness
        const lastPredUpdate = status.predictions ? new Date(status.predictions) : null;
        if (!lastPredUpdate || lastPredUpdate < oneDayAgo) {
            console.log('[Scheduler] ML predictions are stale or missing. Triggering catch-up run.');
            const scriptPath = path.join(__dirname, '../../random_forests.py');
            const command = `python "${scriptPath}"`;
            runScript(command, 'Catch-up ML Predictions', 'predictions');
        }
    } catch (e) {
        console.error('[Scheduler] Initial run check failed', e);
    }
};

module.exports = { initScheduler };
