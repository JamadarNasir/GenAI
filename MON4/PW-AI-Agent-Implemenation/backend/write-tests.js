const http = require('http');
const fs = require('fs');
const path = require('path');

const boundary = '----FormBoundary';
const csv = fs.readFileSync('sample-tests.csv');
const body = Buffer.concat([
  Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="sample-tests.csv"\r\nContent-Type: text/csv\r\n\r\n'),
  csv,
  Buffer.from('\r\n--' + boundary + '--\r\n')
]);

function post(p, jsonBody) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(jsonBody);
    const req = http.request({ hostname: 'localhost', port: 4000, path: p, method: 'POST',
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
  console.log('=== Generate & Write Test Files ===\n');

  const u = await upload();
  console.log(`Upload: ${u.status} — ${u.body.totalCount} TCs`);

  const b = await post('/api/generate-bdd', { testCases: u.body.testCases });
  console.log(`BDD:    ${b.status} — ${b.body.features?.length} features`);

  const c = await post('/api/generate-code', { features: b.body.features });
  console.log(`Code:   ${c.status} — ${c.body.files?.length} files\n`);

  const autoDir = path.resolve(__dirname, '..', 'automation', 'tests');
  const dirs = {
    'feature':         path.join(autoDir, 'features'),
    'step-definition': path.join(autoDir, 'step-definitions'),
    'page-object':     path.join(autoDir, 'pages'),
    'hook':            path.join(autoDir, 'support'),
    'support':         path.join(autoDir, 'support'),
  };

  // Create directories
  Object.values(dirs).forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Write files
  c.body.files.forEach(f => {
    const dir = dirs[f.type] || path.join(autoDir, 'generated');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, f.fileName);
    fs.writeFileSync(filePath, f.content, 'utf8');
    console.log(`  ✔ ${f.type.padEnd(16)} → ${path.relative(path.resolve(__dirname, '..'), filePath)}`);
  });

  console.log('\n✅ All files written to automation/tests/');
})();
