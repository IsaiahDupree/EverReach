// Dashboard State
let testResults = [];
let charts = {};
let autoRefreshInterval = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await loadTestResults();
    initializeCharts();
    setupEventListeners();
    startAutoRefresh();
});

// Load Test Results from JSON
async function loadTestResults() {
    try {
        const response = await fetch('/api/test-results');
        const data = await response.json();

        if (data.results) {
            testResults = data.results;
            updateDashboard();
            updateStatus('online');
        }
    } catch (error) {
        console.error('Error loading test results:', error);
        updateStatus('offline');

        // Load from local file as fallback
        try {
            const response = await fetch('data/test-results.json');
            const data = await response.json();
            testResults = data.results || [];
            updateDashboard();
        } catch (fallbackError) {
            console.log('No test results found yet');
        }
    }

    document.getElementById('lastUpdate').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

// Update Dashboard with Latest Data
function updateDashboard() {
    updateOverviewCards();
    updateCharts();
    updateTestBreakdown();
    updateResultsTable();
}

// Update Overview Cards
function updateOverviewCards() {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

    const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = totalTests > 0 ? (totalDuration / totalTests).toFixed(1) : 0;

    const currentStreak = calculateStreak();

    document.getElementById('totalTests').textContent = totalTests;
    document.getElementById('passRate').textContent = `${passRate}%`;
    document.getElementById('avgDuration').textContent = `${avgDuration}s`;
    document.getElementById('currentStreak').textContent = currentStreak;
}

// Calculate Pass Streak
function calculateStreak() {
    let streak = 0;
    for (let i = testResults.length - 1; i >= 0; i--) {
        if (testResults[i].status === 'passed') {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// Initialize Charts
function initializeCharts() {
    // Success Rate Chart
    const successCtx = document.getElementById('successRateChart').getContext('2d');
    charts.successRate = new Chart(successCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pass Rate (%)',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });

    // Latency Chart
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    charts.latency = new Chart(latencyCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Backend Sync (ms)',
                data: [],
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// Update Charts
function updateCharts() {
    // Success Rate Over Time
    const last20Results = testResults.slice(-20);
    const successLabels = last20Results.map((r, i) => `Test ${testResults.length - 19 + i}`);
    const successData = last20Results.map(r => {
        const total = r.passed + r.failed + r.skipped;
        return total > 0 ? ((r.passed / total) * 100).toFixed(1) : 0;
    });

    charts.successRate.data.labels = successLabels;
    charts.successRate.data.datasets[0].data = successData;
    charts.successRate.update();

    // Latency Data
    const latencyResults = testResults.filter(r => r.metrics && r.metrics.syncLatency).slice(-10);
    const latencyLabels = latencyResults.map((r, i) => `Test ${testResults.length - latencyResults.length + i + 1}`);
    const latencyData = latencyResults.map(r => r.metrics.syncLatency);

    charts.latency.data.labels = latencyLabels;
    charts.latency.data.datasets[0].data = latencyData;
    charts.latency.update();
}

// Update Test Breakdown
function updateTestBreakdown() {
    const testNames = {
        'signIn': 'Sign In',
        'purchase': 'Purchase Subscription',
        'autoSync': 'Auto-Sync After Purchase',
        'featureUnlock': 'Premium Features Unlocked',
        'restore': 'Restore Purchases'
    };

    const breakdown = {};

    // Initialize
    Object.keys(testNames).forEach(key => {
        breakdown[key] = { passed: 0, total: 0 };
    });

    // Calculate from individual test results
    testResults.forEach(result => {
        if (result.tests) {
            result.tests.forEach(test => {
                const name = test.name.toLowerCase().replace(/\s+/g, '');
                for (const key in testNames) {
                    if (name.includes(key.toLowerCase())) {
                        breakdown[key].total++;
                        if (test.status === 'passed') {
                            breakdown[key].passed++;
                        }
                    }
                }
            });
        }
    });

    // Update UI
    Object.keys(breakdown).forEach(key => {
        const rate = breakdown[key].total > 0
            ? ((breakdown[key].passed / breakdown[key].total) * 100).toFixed(0)
            : 0;

        document.getElementById(`${key}Bar`).style.width = `${rate}%`;
        document.getElementById(`${key}Rate`).textContent = `${rate}%`;
    });
}

// Update Results Table
function updateResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    const filterStatus = document.getElementById('filterStatus').value;
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();

    // Filter results
    let filteredResults = testResults;

    if (filterStatus !== 'all') {
        filteredResults = filteredResults.filter(r => r.status === filterStatus);
    }

    if (searchTerm) {
        filteredResults = filteredResults.filter(r =>
            JSON.stringify(r).toLowerCase().includes(searchTerm)
        );
    }

    // Clear table
    tbody.innerHTML = '';

    if (filteredResults.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="7">No matching results found.</td></tr>';
        return;
    }

    // Populate table (most recent first)
    filteredResults.slice().reverse().forEach(result => {
        const row = document.createElement('tr');

        const statusClass = result.status || 'partial';
        const statusText = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

        row.innerHTML = `
            <td>${new Date(result.timestamp).toLocaleString()}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${result.passed || 0}</td>
            <td>${result.failed || 0}</td>
            <td>${result.skipped || 0}</td>
            <td>${result.duration ? result.duration.toFixed(1) + 's' : 'N/A'}</td>
            <td><button class="action-btn" onclick="showDetails('${result.id}')">View</button></td>
        `;

        tbody.appendChild(row);
    });
}

// Show Test Details Modal
function showDetails(testId) {
    const result = testResults.find(r => r.id === testId);
    if (!result) return;

    const modal = document.getElementById('detailsModal');
    const modalBody = document.getElementById('modalBody');

    let detailsHTML = `
        <div class="detail-group">
            <h3>Summary</h3>
            <div class="detail-item">
                <span class="detail-label">Test ID:</span>
                <span class="detail-value">${result.id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Timestamp:</span>
                <span class="detail-value">${new Date(result.timestamp).toLocaleString()}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${result.duration ? result.duration.toFixed(2) + 's' : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value"><span class="status-badge ${result.status}">${result.status}</span></span>
            </div>
        </div>
    `;

    if (result.tests && result.tests.length > 0) {
        detailsHTML += '<div class="detail-group"><h3>Individual Tests</h3>';
        result.tests.forEach(test => {
            detailsHTML += `
                <div class="detail-item">
                    <span class="detail-label">${test.name}:</span>
                    <span class="detail-value"><span class="status-badge ${test.status}">${test.status}</span></span>
                </div>
            `;
        });
        detailsHTML += '</div>';
    }

    if (result.metrics) {
        detailsHTML += '<div class="detail-group"><h3>Metrics</h3>';
        Object.keys(result.metrics).forEach(key => {
            detailsHTML += `
                <div class="detail-item">
                    <span class="detail-label">${key}:</span>
                    <span class="detail-value">${result.metrics[key]}</span>
                </div>
            `;
        });
        detailsHTML += '</div>';
    }

    modalBody.innerHTML = detailsHTML;
    modal.classList.add('active');
}

// Update Status Indicator
function updateStatus(status) {
    const indicator = document.getElementById('statusIndicator');
    indicator.className = `status-indicator ${status}`;
}

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadTestResults();
    });

    document.getElementById('exportBtn').addEventListener('click', exportReport);

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('detailsModal').classList.remove('active');
    });

    document.getElementById('filterStatus').addEventListener('change', updateResultsTable);
    document.getElementById('searchBox').addEventListener('input', updateResultsTable);

    // Close modal on outside click
    document.getElementById('detailsModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailsModal') {
            document.getElementById('detailsModal').classList.remove('active');
        }
    });
}

// Start Auto Refresh
function startAutoRefresh() {
    autoRefreshInterval = setInterval(async () => {
        await loadTestResults();
    }, 10000); // Refresh every 10 seconds
}

// Export Report
function exportReport() {
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalTests: testResults.length,
            passed: testResults.filter(r => r.status === 'passed').length,
            failed: testResults.filter(r => r.status === 'failed').length,
            passRate: document.getElementById('passRate').textContent
        },
        results: testResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Expose for inline onClick handlers
window.showDetails = showDetails;
