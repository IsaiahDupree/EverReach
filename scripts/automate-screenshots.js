const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const DEVICES = [
  'iPhone 17 Pro Max',
  'iPhone 17 Pro',
  'iPad Pro 13-inch (M4)',
  'iPad Pro 11-inch (M4)',
];

const OUTPUT_DIR = path.join(__dirname, '..', 'marketing', 'screenshots', `node-${new Date().toISOString().split('T')[0]}`);
const SCHEME = 'everreach';
const BUNDLE_ID = 'com.everreach.app';

const SCREENSHOTS = [
  { name: '01_Home', description: 'Home screen' },
  { name: '02_Contacts', description: 'Contacts list (People tab)' },
  { name: '03_Contact_Detail', description: 'Contact detail page (tap on a contact)' },
  { name: '04_Chat', description: 'Chat/Assistant tab' },
  { name: '05_Voice_Note', description: 'Voice note screen' },
  { name: '06_Analysis', description: 'Screenshot analysis screen' },
  { name: '07_Settings', description: 'Settings tab' },
  { name: '08_Paywall', description: 'Subscription plans/Paywall' },
  { name: '09_Personal_Notes', description: 'Personal notes screen' },
];

// --- HELPERS ---

function runCommand(command, options = {}) {
  try {
    return execSync(command, { stdio: 'pipe', encoding: 'utf8', ...options }).trim();
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`❌ Command failed: ${command}`);
      console.error(error.stderr || error.message);
      throw error;
    }
    return '';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForEnter(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function setupData() {
  console.log('🧹 Setting up data...');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials in .env');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Run Apple Snapshot Script to grant Pro access
  console.log('   Running insert-apple-snapshot.js to enable Pro subscription...');
  runCommand('node scripts/insert-apple-snapshot.js', { cwd: path.join(__dirname, '..') });

  console.log('✅ Data setup complete\n');
}

async function prepareDevice(udid) {
  // Set status bar
  console.log('   Setting status bar (9:41, full battery, good signal)...');
  runCommand(`xcrun simctl status_bar ${udid} override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularMode active --cellularBars 4`);

  // Grant all permissions to avoid popups
  console.log('   Granting permissions (photos, camera, contacts, microphone, location)...');
  const permissions = [
    'photos',
    'camera',
    'contacts',
    'microphone',
    'location',
  ];

  for (const permission of permissions) {
    try {
      runCommand(`xcrun simctl privacy ${udid} grant ${permission} ${BUNDLE_ID}`, { ignoreError: true });
    } catch (e) {
      // Some permissions might not apply, that's ok
    }
  }
}

async function captureScreenshotsForDevice(deviceName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📱 Processing ${deviceName}`);
  console.log('='.repeat(60));

  // 1. Find Device UDID
  const devicesJson = JSON.parse(runCommand('xcrun simctl list devices available --json'));
  let udid = null;

  for (const runtime in devicesJson.devices) {
    const device = devicesJson.devices[runtime].find(d => d.name === deviceName);
    if (device) {
      udid = device.udid;
      break;
    }
  }

  if (!udid) {
    console.error(`❌ Device "${deviceName}" not found. Skipping.`);
    return;
  }

  console.log(`   UDID: ${udid}\n`);

  // 2. Boot Simulator
  console.log('   ⏳ Booting simulator...');
  try {
    runCommand(`xcrun simctl boot ${udid}`);
  } catch (e) {
    // Ignore if already booted
  }

  // Wait for boot
  runCommand(`xcrun simctl bootstatus ${udid}`);
  console.log('   ✅ Simulator booted\n');

  // 3. Prepare device (permissions & status bar)
  await prepareDevice(udid);
  console.log('   ✅ Device prepared\n');

  // 4. Launch the app
  console.log('   🚀 Launching app...');
  try {
    runCommand(`xcrun simctl launch ${udid} ${BUNDLE_ID}`);
  } catch (e) {
    console.log('   ⚠️  App might not be installed. Make sure to run: npx expo run:ios');
  }

  await sleep(3000);
  console.log('   ✅ App launched\n');

  // 5. Wait for manual sign-in
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  📋 MANUAL STEP: Sign in to the app                    │');
  console.log('│                                                         │');
  console.log('│  Email:    isaiahdupree33@gmail.com                    │');
  console.log('│  Password: Frogger12                                   │');
  console.log('└─────────────────────────────────────────────────────────┘');
  await waitForEnter('\n   Press ENTER once you are signed in and on the HOME screen... ');
  console.log('   ✅ Continuing with screenshot capture\n');

  // 6. Create output directory
  const deviceDir = path.join(OUTPUT_DIR, deviceName.replace(/\s+/g, '_'));
  fs.mkdirSync(deviceDir, { recursive: true });

  // 7. Iterate through screens
  console.log(`   📸 Ready to capture ${SCREENSHOTS.length} screenshots\n`);

  for (let i = 0; i < SCREENSHOTS.length; i++) {
    const screen = SCREENSHOTS[i];
    console.log(`   ─────────────────────────────────────────────────────`);
    console.log(`   Screenshot ${i + 1}/${SCREENSHOTS.length}: ${screen.name}`);
    console.log(`   Navigate to: ${screen.description}`);
    console.log(`   ─────────────────────────────────────────────────────`);

    await waitForEnter('   Press ENTER to capture this screenshot... ');

    // Take screenshot
    const filename = path.join(deviceDir, `${screen.name}.png`);
    runCommand(`xcrun simctl io ${udid} screenshot "${filename}"`);
    console.log(`   ✅ Saved: ${screen.name}.png\n`);

    await sleep(500);
  }

  // 8. Cleanup Status Bar
  runCommand(`xcrun simctl status_bar ${udid} clear`);

  console.log(`\n   ✨ All ${SCREENSHOTS.length} screenshots captured for ${deviceName}!`);
}

async function main() {
  try {
    console.log('\n🎬 EverReach Screenshot Automation (Manual Mode)');
    console.log('==================================================\n');

    // Ensure output dir
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Setup Data
    await setupData();

    // Process Devices
    for (let i = 0; i < DEVICES.length; i++) {
      await captureScreenshotsForDevice(DEVICES[i]);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ All screenshots captured successfully!');
    console.log(`📂 Output: ${OUTPUT_DIR}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
