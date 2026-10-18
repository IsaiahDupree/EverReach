#!/usr/bin/env node

/**
 * EverReach Icon Generator
 * Generates all required app icons from a source 1024x1024 image
 * Uses native Node.js and sips (macOS) - no dependencies needed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
};

// Source image path
const SOURCE = path.join(__dirname, '../assets/branding/logo-source-1024.png');

// Icon configurations
const iconConfigs = {
  // Main Expo icons
  main: [
    { size: 1024, output: '../assets/images/icon.png' },
    { size: 1024, output: '../assets/images/adaptive-icon.png' },
    { size: 1024, output: '../assets/images/splash-icon.png' },
    { size: 48, output: '../assets/images/favicon.png' },
  ],
  
  // Branding assets
  branding: [
    { size: 1024, output: '../assets/branding/icons/appstore-icon-1024.png' },
    { size: 1024, output: '../assets/branding/icons/appstore-icon-1024-flat.png' },
    { size: 512, output: '../assets/branding/icons/play-icon-512.png' },
  ],
  
  // iOS native icons
  ios: [
    { size: 1024, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png' },
    { size: 20, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-20x20@1x.png' },
    { size: 40, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-20x20@2x.png' },
    { size: 60, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-20x20@3x.png' },
    { size: 29, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-29x29@1x.png' },
    { size: 58, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-29x29@2x.png' },
    { size: 87, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-29x29@3x.png' },
    { size: 40, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-40x40@1x.png' },
    { size: 80, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-40x40@2x.png' },
    { size: 120, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-40x40@3x.png' },
    { size: 120, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-60x60@2x.png' },
    { size: 180, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-60x60@3x.png' },
    { size: 76, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-76x76@1x.png' },
    { size: 152, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-76x76@2x.png' },
    { size: 167, output: '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset/App-Icon-83.5x83.5@2x.png' },
  ],
};

/**
 * Check if a command exists
 */
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resize image using sips (macOS built-in)
 */
function resizeWithSips(source, output, size) {
  const outputPath = path.join(__dirname, output);
  const dir = path.dirname(outputPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Copy source to output first
  fs.copyFileSync(source, outputPath);
  
  // Resize using sips
  execSync(`sips -z ${size} ${size} "${outputPath}" --out "${outputPath}"`, { stdio: 'ignore' });
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.blue}🎨 EverReach Icon Generator${colors.reset}`);
  console.log('================================\n');
  
  // Check if source file exists
  if (!fs.existsSync(SOURCE)) {
    log.error('❌ Source image not found!');
    console.log('');
    console.log('Please save your logo as:');
    console.log(`  ${SOURCE}`);
    console.log('');
    console.log('Requirements:');
    console.log('  - Size: 1024×1024px');
    console.log('  - Format: PNG');
    console.log('  - No transparency (or white background)');
    process.exit(1);
  }
  
  log.success('✅ Source image found');
  console.log(`📍 Location: ${SOURCE}\n`);
  
  // Check for sips (macOS)
  if (!commandExists('sips')) {
    log.error('❌ Image processing tool not found');
    console.log('');
    console.log('This script requires sips (macOS) or ImageMagick.');
    console.log('');
    console.log('Install ImageMagick:');
    console.log('  brew install imagemagick');
    console.log('');
    console.log('Then use: ./generate-icons.sh instead');
    process.exit(1);
  }
  
  log.success('✅ Using sips for image processing\n');
  
  // Create directories
  log.info('📁 Creating directories...');
  const dirs = [
    path.join(__dirname, '../assets/images'),
    path.join(__dirname, '../assets/branding/icons'),
    path.join(__dirname, '../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset'),
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  console.log('');
  
  // Generate main icons
  log.info('📱 Generating main app icons...');
  iconConfigs.main.forEach(({ size, output }) => {
    resizeWithSips(SOURCE, output, size);
    console.log(`  ✓ ${path.basename(output)} (${size}×${size})`);
  });
  console.log('');
  
  // Generate branding assets
  log.info('🎯 Generating branding assets...');
  iconConfigs.branding.forEach(({ size, output }) => {
    resizeWithSips(SOURCE, output, size);
    console.log(`  ✓ ${path.basename(output)} (${size}×${size})`);
  });
  console.log('');
  
  // Generate iOS icons
  log.info('🍎 Generating iOS icons...');
  iconConfigs.ios.forEach(({ size, output }) => {
    resizeWithSips(SOURCE, output, size);
    const filename = path.basename(output);
    console.log(`  ✓ ${filename.replace('App-Icon-', '')} (${size}×${size})`);
  });
  console.log('');
  
  // Backend icons (if exists)
  const backendDir = path.join(__dirname, '../../backend/assets/images');
  if (fs.existsSync(backendDir)) {
    log.info('🌐 Updating backend icons...');
    [
      { size: 1024, output: '../../backend/assets/images/icon.png' },
      { size: 48, output: '../../backend/assets/images/favicon.png' },
      { size: 1024, output: '../../backend/assets/images/splash-icon.png' },
      { size: 1024, output: '../../backend/assets/images/adaptive-icon.png' },
    ].forEach(({ size, output }) => {
      resizeWithSips(SOURCE, output, size);
      console.log(`  ✓ backend ${path.basename(output)}`);
    });
    console.log('');
  }
  
  // Summary
  log.success('✅ Icon generation complete!\n');
  console.log('📦 Generated:');
  console.log(`  • ${iconConfigs.main.length} main app icons (Expo)`);
  console.log(`  • ${iconConfigs.branding.length} branding assets`);
  console.log(`  • ${iconConfigs.ios.length} iOS native icons`);
  if (fs.existsSync(backendDir)) {
    console.log('  • 4 backend/web icons');
  }
  console.log('');
  log.warning('Next steps:');
  console.log('  1. cd ..');
  console.log('  2. npx expo prebuild --clean');
  console.log('  3. npx expo start');
  console.log('');
  console.log('🚀 Your new icon will appear in the app!');
}

// Run
try {
  main();
} catch (error) {
  log.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
}
