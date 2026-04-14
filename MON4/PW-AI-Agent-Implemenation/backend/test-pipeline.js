const http = require('http');
const fs = require('fs');

const boundary = '----FormBoundary';
const csv = fs.readFileSync('sample-tests.csv');
const body = Buffer.concat([
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="sample-tests.csv"\r\nContent-Type: text/csv\r\n\r\n'),
  csv,
  Buffer.from('\r\n--' + boundary + '--\r\n')
]);

function post(path, jsonBody) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(jsonBody);
    const req = http.request({ hostname: 'localhost', port: 4000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) })); });
    req.on('error', reject); req.write(data); req.end();
  });
}

function upload() {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 4000, path: '/api/upload', method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) })); });
    req.on('error', reject); req.write(body); req.end();
  });
}

(async () => {
  console.log('=== Full Pipeline Test ===\n');

  // Step 1: Upload
  const up = await upload();
  console.log(`1. Upload: ${up.status} — ${up.body.totalCount} test cases`);

  // Step 2: BDD Generation
  const bdd = await post('/api/generate-bdd', { testCases: up.body.testCases });
  console.log(`2. BDD:    ${bdd.status} — ${bdd.body.features?.length} features`);

  // Step 3: Code Generation
  const code = await post('/api/generate-code', { features: bdd.body.features });
  console.log(`3. Code:   ${code.status} — ${code.body.files?.length} files generated\n`);

  // Show file tree
  console.log('Generated files:');
  code.body.files?.forEach(f => console.log(`  ${f.type.padEnd(16)} ${f.fileName}`));

  // Show a sample step definition
  const stepFile = code.body.files?.find(f => f.type === 'step-definition' && f.fileName.includes('login'));
  if (stepFile) {
    console.log('\n--- Sample: login.steps.ts ---');
    console.log(stepFile.content.substring(0, 1500));
  }

  // Show a sample feature
  const featureFile = code.body.files?.find(f => f.type === 'feature' && f.fileName.includes('login'));
  if (featureFile) {
    console.log('\n--- Sample: login.feature ---');
    console.log(featureFile.content);
  }
})();
