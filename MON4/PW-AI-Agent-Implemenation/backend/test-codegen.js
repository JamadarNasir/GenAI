/**
 * Phase 5 E2E Test — Upload CSV → Generate BDD → Generate Code
 *
 * Tests the full pipeline: CSV upload → BDD features → Playwright code generation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4000';

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadCsv(filePath) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now();
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--\r\n`;

    const opts = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Phase 5: Code Generation E2E Test ===\n');

  // Step 1: Upload CSV
  console.log('Step 1: Uploading CSV...');
  const csvPath = path.join(__dirname, 'sample-tests.csv');
  const uploadRes = await uploadCsv(csvPath);
  console.log(`  Status: ${uploadRes.status}`);
  console.log(`  Test cases: ${uploadRes.body.testCases?.length || 0}`);

  if (uploadRes.status !== 200) {
    console.error('Upload failed:', uploadRes.body);
    process.exit(1);
  }

  const testCases = uploadRes.body.testCases;

  // Step 2: Generate BDD
  console.log('\nStep 2: Generating BDD features...');
  const bddRes = await request('POST', '/api/generate-bdd', { testCases });
  console.log(`  Status: ${bddRes.status}`);
  console.log(`  Features: ${bddRes.body.features?.length || 0}`);
  
  if (!bddRes.body.features || bddRes.body.features.length === 0) {
    console.error('BDD generation produced no features:', bddRes.body);
    process.exit(1);
  }

  const features = bddRes.body.features;
  console.log(`  Feature names: ${features.map(f => f.featureName).join(', ')}`);

  // Step 3: Generate Code
  console.log('\nStep 3: Generating Playwright code...');
  const codeRes = await request('POST', '/api/generate-code', { features });
  console.log(`  Status: ${codeRes.status}`);
  console.log(`  Success: ${codeRes.body.success}`);
  
  if (codeRes.body.summary) {
    const s = codeRes.body.summary;
    console.log(`  Summary:`);
    console.log(`    Features:         ${s.features}`);
    console.log(`    Step Definitions: ${s.stepDefinitions}`);
    console.log(`    Page Objects:     ${s.pageObjects}`);
    console.log(`    Support Files:    ${s.supportFiles}`);
    console.log(`    Total Files:      ${s.totalFiles}`);
  }

  if (codeRes.body.files) {
    console.log(`\n  Generated files:`);
    for (const f of codeRes.body.files) {
      console.log(`    [${f.type}] ${f.filePath}`);
    }
  }

  if (codeRes.body.errors && codeRes.body.errors.length > 0) {
    console.log(`\n  Errors: ${codeRes.body.errors.join('; ')}`);
  }

  // Step 4: Verify files exist on disk
  console.log('\nStep 4: Verifying files on disk...');
  const automationDir = path.resolve(__dirname, '..', 'automation');
  const dirsToCheck = [
    'tests/features',
    'tests/step-definitions',
    'tests/pages',
    'tests/support',
  ];

  for (const dir of dirsToCheck) {
    const fullDir = path.join(automationDir, dir);
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir);
      console.log(`  ✅ ${dir}/ → ${files.join(', ')}`);
    } else {
      console.log(`  ❌ ${dir}/ — MISSING`);
    }
  }

  // Step 5: Sample a generated file
  console.log('\nStep 5: Sample generated step definition:');
  const stepDefDir = path.join(automationDir, 'tests', 'step-definitions');
  if (fs.existsSync(stepDefDir)) {
    const stepFiles = fs.readdirSync(stepDefDir);
    if (stepFiles.length > 0) {
      const firstStepFile = path.join(stepDefDir, stepFiles[0]);
      const content = fs.readFileSync(firstStepFile, 'utf-8');
      // Show first 30 lines
      const lines = content.split('\n').slice(0, 30);
      console.log('  --- ' + stepFiles[0] + ' (first 30 lines) ---');
      lines.forEach(l => console.log('  ' + l));
      console.log('  ...');
    }
  }

  console.log('\n=== Phase 5 Test Complete ===');
}

main().catch(console.error);
