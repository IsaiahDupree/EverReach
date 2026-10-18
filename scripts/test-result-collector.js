#!/usr/bin/env node

/**
 * Test Result Collector
 * 
 * Parses bash test script output and converts it to structured JSON
 * for the monitoring dashboard.
 */

const fs = require('fs');
const path = require('path');

// Parse bash test results file
function parseTestResults(resultsFile) {
    const content = fs.readFileSync(resultsFile, 'utf8');

    const result = {
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        status: 'passed',
        tests: [],
        metrics: {}
    };

    // Extract total counts
    const passedMatch = content.match(/Passed:\s*(\d+)/);
    const failedMatch = content.match(/Failed:\s*(\d+)/);
    const skippedMatch = content.match(/Skipped:\s*(\d+)/);

    if (passedMatch) result.passed = parseInt(passedMatch[1]);
    if (failedMatch) result.failed = parseInt(failedMatch[1]);
    if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

    // Determine overall status
    if (result.failed > 0) {
        result.status = 'failed';
    } else if (result.passed === 0) {
        result.status = 'skipped';
    }

    // Extract individual test results
    const testPattern = /✓ PASSED|✗ FAILED|⊘ SKIPPED:\s*(.+)/g;
    let match;

    while ((match = testPattern.exec(content)) !== null) {
        const status = match[0].includes('PASSED') ? 'passed' :
            match[0].includes('FAILED') ? 'failed' : 'skipped';
        const name = match[1];

        result.tests.push({
            name,
            status
        });
    }

    return result;
}

// Append result to data file
function appendToDataFile(result) {
    const dataFile = path.join(__dirname, '../test-dashboard/data/test-results.json');

    let data = { results: [] };

    // Read existing data
    if (fs.existsSync(dataFile)) {
        try {
            const content = fs.readFileSync(dataFile, 'utf8');
            data = JSON.parse(content);
        } catch (error) {
            console.error('Error reading existing data:', error);
        }
    }

    // Append new result
    data.results.push(result);

    // Keep only last 100 results to prevent file from growing too large
    if (data.results.length > 100) {
        data.results = data.results.slice(-100);
    }

    // Write back
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    console.log(`✓ Added test result to dashboard: ${result.id}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`);
}

// Send to dashboard API (if server is running)
async function sendToAPI(result) {
    try {
        const response = await fetch('http://localhost:3001/api/test-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        });

        if (response.ok) {
            console.log('✓ Sent to dashboard API');
        }
    } catch (error) {
        // API not running, that's okay
        console.log('⚠ Dashboard API not running (data saved locally)');
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node test-result-collector.js <results-file>');
        process.exit(1);
    }

    const resultsFile = args[0];

    if (!fs.existsSync(resultsFile)) {
        console.error(`Error: File not found: ${resultsFile}`);
        process.exit(1);
    }

    console.log(`\n📊 Processing test results from: ${resultsFile}\n`);

    const result = parseTestResults(resultsFile);
    appendToDataFile(result);
    await sendToAPI(result);

    console.log('\n✅ Test result collected successfully\n');
    console.log('View in dashboard: http://localhost:3001\n');
}

main().catch(console.error);
