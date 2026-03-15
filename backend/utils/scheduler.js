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

    // Run price update every 12 hours
    cron.schedule('0 */12 * * *', () => {
        const scriptPath = path.join(__dirname, '../scripts/updatePrices.js');
        const command = `node "${scriptPath}"`;
        runScript(command, 'Price Update', 'prices');
    });

    // Run ML predictions every day at 00:01 AM
    cron.schedule('1 0 * * *', () => {
        const scriptPath = path.join(__dirname, '../../random_forests.py');
        const command = `python "${scriptPath}"`;
        runScript(command, 'ML Predictions', 'predictions');
    });

    // Initial run on startup if status is missing
    try {
        const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
        if (!status.prices) {
            console.log('[Scheduler] Initial price update trigger because status is null');
            const scriptPath = path.join(__dirname, '../scripts/updatePrices.js');
            const command = `node "${scriptPath}"`;
            runScript(command, 'Initial Price Update', 'prices');
        }
        if (!status.predictions) {
            console.log('[Scheduler] Initial predictions trigger because status is null');
            const scriptPath = path.join(__dirname, '../../random_forests.py');
            const command = `python "${scriptPath}"`;
            runScript(command, 'Initial ML Predictions', 'predictions');
        }
    } catch (e) {
        console.error('[Scheduler] Initial run check failed', e);
    }
};

module.exports = { initScheduler };
