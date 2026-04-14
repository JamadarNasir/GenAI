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
  console.log('=== Step Definition Dedup Check ===\n');

  const u = await upload();
  const b = await post('/api/generate-bdd', { testCases: u.body.testCases });
  const c = await post('/api/generate-code', { features: b.body.features });

  const stepFiles = c.body.files.filter(f => f.type === 'step-definition');
  const pat = /user is on the \{string\} page/g;

  console.log('Step definition files:');
  stepFiles.forEach(f => {
    const matches = f.content.match(pat) || [];
    console.log(`  ${f.fileName}: "${'{string}'} page" pattern count = ${matches.length}`);
  });

  const allContent = stepFiles.map(f => f.content).join('\n');
  const total = (allContent.match(pat) || []).length;
  console.log(`\nTotal occurrences across ALL step files: ${total}`);
  console.log(total <= 1 ? '✅ DEDUP WORKING — no ambiguity!' : '❌ DEDUP FAILED — pattern is duplicated!');

  // Also check for any other potentially duplicated patterns
  console.log('\n=== All Given patterns across step files ===');
  stepFiles.forEach(f => {
    const givenMatches = f.content.match(/Given\('([^']+)'/g) || [];
    console.log(`\n  ${f.fileName}:`);
    givenMatches.forEach(m => console.log(`    ${m}`));
  });
})();
