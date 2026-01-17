// WebdriverIO Configuration for iOS Testing
exports.config = {
    runner: 'local',
    port: 4723,

    specs: [
        './appium-tests/**/*.test.js'
    ],

    maxInstances: 1,

    capabilities: [{
        platformName: 'iOS',
        'appium:deviceName': 'iPhone 17 Pro',
        'appium:platformVersion': '26.0',
        'appium:bundleId': 'com.everreach.app',
        'appium:automationName': 'XCUITest',
        'appium:noReset': true,  // Don't reset app between tests
        'appium:autoAcceptAlerts': true,
    }],

    logLevel: 'info',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'mocha',
    reporters: ['spec'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    // Hooks
    before: async function () {
        console.log('Starting test session...');
    },

    after: async function () {
        console.log('Test session complete');
    }
};
