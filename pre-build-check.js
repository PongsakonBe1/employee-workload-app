#!/usr/bin/env node
/**
 * Pre-Build Verification Script
 * ตรวจสอบทุกอย่างก่อน build
 */

const fs = require('fs');
const path = require('path');

const CHECKS = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function log(title, status, message = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  console.log(`${color}${icon} ${title}${reset} ${message}`);
  
  if (status === 'PASS') CHECKS.passed++;
  else if (status === 'FAIL') CHECKS.failed++;
  else CHECKS.warnings++;
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    log(`${description}: ${filePath}`, 'PASS', `(${stats.size} bytes)`);
    return true;
  } else {
    log(`${description}: ${filePath}`, 'FAIL', 'File not found!');
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    log(`${description}: ${filePath}`, 'FAIL', 'File not found!');
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchString)) {
    log(`${description}`, 'PASS');
    return true;
  } else {
    log(`${description}`, 'FAIL', `Missing: "${searchString}"`);
    return false;
  }
}

console.log('\n========================================');
console.log('   PRE-BUILD VERIFICATION');
console.log('========================================\n');

// 1. Check favicon
console.log('📁 1. Favicon Check');
checkFileExists('frontend/public/favicon.ico', 'favicon.ico exists');
checkFileExists('frontend/public/labboy-logo.png', 'labboy-logo.png exists');

// 2. Check layout.js has icons metadata
console.log('\n📁 2. Layout Metadata Check');
checkFileContent('frontend/app/layout.js', 'icons:', 'layout.js has icons metadata');
checkFileContent('frontend/app/layout.js', 'favicon.ico', 'layout.js references favicon.ico');
checkFileContent('frontend/app/layout.js', 'labboy-logo.png', 'layout.js references labboy-logo.png');

// 3. Check AppShell.js uses Image component
console.log('\n📁 3. AppShell.js Check');
checkFileContent('frontend/components/AppShell.js', 'import Image from "next/image"', 'AppShell imports Image');
checkFileContent('frontend/components/AppShell.js', 'labboy-logo.png', 'AppShell uses labboy-logo.png');
checkFileContent('frontend/components/AppShell.js', 'LayoutGrid', 'AppShell uses LayoutGrid (not BarChart3)');

// 4. Check login page uses Image component
console.log('\n📁 4. Login Page Check');
checkFileContent('frontend/app/login/page.js', 'import Image from "next/image"', 'Login page imports Image');
checkFileContent('frontend/app/login/page.js', 'labboy-logo.png', 'Login page uses labboy-logo.png');

// 5. Check manifest.json
console.log('\n📁 5. Manifest Check');
checkFileContent('frontend/public/manifest.json', 'labboy-logo.png', 'manifest.json uses labboy-logo.png');

// 6. Check Playwright tests exist
console.log('\n📁 6. Gray Box Tests Check');
checkFileExists('frontend/tests/logo-display.spec.js', 'Logo display test exists');
checkFileExists('frontend/tests/pwa-login.spec.js', 'PWA login test exists');
checkFileExists('frontend/playwright.config.js', 'Playwright config exists');

// 7. Check manifest.json valid JSON
console.log('\n📁 7. Manifest Validity Check');
try {
  const manifestPath = path.join(__dirname, 'frontend/public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.icons && manifest.icons.length > 0) {
    log('manifest.json is valid JSON with icons', 'PASS');
  } else {
    log('manifest.json missing icons array', 'FAIL');
  }
} catch (e) {
  log('manifest.json is valid JSON', 'FAIL', e.message);
}

// Summary
console.log('\n========================================');
console.log('   SUMMARY');
console.log('========================================');
console.log(`\x1b[32m✓ Passed: ${CHECKS.passed}\x1b[0m`);
console.log(`\x1b[31m✗ Failed: ${CHECKS.failed}\x1b[0m`);
console.log(`\x1b[33m⚠ Warnings: ${CHECKS.warnings}\x1b[0m`);

if (CHECKS.failed > 0) {
  console.log('\n\x1b[31m❌ BUILD BLOCKED: Fix failed checks before building\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[32m✅ READY TO BUILD\x1b[0m\n');
  console.log('Next steps:');
  console.log('  1. Run Gray Box Tests: npm run test:gray-box (in frontend)');
  console.log('  2. Build: npm run build -w frontend');
  console.log('  3. Deploy: firebase deploy --only hosting (in firebase folder)\n');
  process.exit(0);
}
