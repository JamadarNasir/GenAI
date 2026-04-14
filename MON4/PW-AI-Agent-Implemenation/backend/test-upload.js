/**
 * Quick test script for the CSV upload endpoint.
 * Run: node test-upload.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'sample-tests.csv');
const boundary = '----FormBoundary' + Date.now();
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

// Build multipart/form-data body
const body = [
  `--${boundary}`,
  `Content-Disposition: form-data; name="file"; filename="sample-tests.csv"`,
  `Content-Type: text/csv`,
  ``,
  csvContent,
  `--${boundary}--`,
  ``,
].join('\r\n');

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

console.log('📤 Uploading sample-tests.csv to POST /api/upload...\n');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));

      if (json.success) {
        console.log(`\n✅ Successfully parsed ${json.totalCount} test cases!`);
        json.testCases.forEach((tc) => {
          console.log(`   ${tc.testCaseId}: ${tc.title} [${tc.priority}] — ${tc.steps.length} steps`);
        });
      } else {
        console.log(`\n❌ Upload failed:`, json.errors || json.message);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

req.write(body);
req.end();
