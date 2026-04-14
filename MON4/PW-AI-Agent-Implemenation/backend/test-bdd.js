/**
 * Test script for Phase 4: BDD Generation endpoint.
 *
 * Tests both:
 *   1. Full flow: upload CSV → get testCases → generate BDD
 *   2. Direct POST /api/generate-bdd with test case JSON
 *   3. Edge cases (empty body, missing fields)
 *
 * Run: node backend/test-bdd.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4000';

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      },
    };

    const req = http.request(options, (res) => {
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
    const boundary = '----Boundary' + Date.now();
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.csv"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n--${boundary}--\r\n`;

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
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
  console.log('🧪 Testing Phase 4: BDD Generation\n');

  // ─── Test 1: Edge case — empty body ──────────────
  console.log('─── Test 1: Empty body ───');
  const r1 = await request('POST', '/api/generate-bdd', {});
  console.log(`  Status: ${r1.status} (expected 400)`);
  console.log(`  Error: ${r1.body.error || r1.body.message || 'none'}`);
  console.log();

  // ─── Test 2: Edge case — empty array ─────────────
  console.log('─── Test 2: Empty testCases array ───');
  const r2 = await request('POST', '/api/generate-bdd', { testCases: [] });
  console.log(`  Status: ${r2.status} (expected 400)`);
  console.log();

  // ─── Test 3: Upload CSV then generate BDD ────────
  console.log('─── Test 3: Full flow — CSV upload → BDD generation ───');
  const csvPath = path.join(__dirname, 'sample-tests.csv');
  
  // Step 1: Upload
  console.log('  Step 1: Uploading CSV...');
  const uploadResult = await uploadCsv(csvPath);
  console.log(`  Upload status: ${uploadResult.status}, testCases: ${uploadResult.body.testCases?.length || 0}`);

  if (uploadResult.status !== 200) {
    console.log('  ❌ Upload failed, cannot proceed');
    return;
  }

  // Step 2: Generate BDD
  console.log('  Step 2: Generating BDD features...');
  const bddResult = await request('POST', '/api/generate-bdd', {
    testCases: uploadResult.body.testCases,
  });

  console.log(`  BDD status: ${bddResult.status}`);
  console.log(`  Success: ${bddResult.body.success}`);
  console.log(`  Features: ${bddResult.body.features?.length || 0}`);

  if (bddResult.body.errors) {
    console.log(`  Errors: ${JSON.stringify(bddResult.body.errors)}`);
  }

  if (bddResult.body.features) {
    for (const feature of bddResult.body.features) {
      console.log(`\n  📄 ${feature.fileName}`);
      console.log(`     Feature: ${feature.featureName}`);
      console.log(`     Tags: ${feature.tags.join(' ')}`);
      console.log(`     Scenarios: ${feature.scenarios.length}`);
      for (const s of feature.scenarios) {
        console.log(`       - ${s.name} [${s.tags.join(' ')}] (${s.steps.length} steps)`);
      }
      console.log(`\n     ── Gherkin Content ──`);
      // Show first 15 lines
      const lines = feature.content.split('\n');
      lines.slice(0, 15).forEach((l) => console.log(`     ${l}`));
      if (lines.length > 15) console.log(`     ... (${lines.length - 15} more lines)`);
    }
  }

  console.log('\n\n✅ BDD Generation tests complete!');
}

main().catch((e) => {
  console.error('❌ Test error:', e.message);
});
