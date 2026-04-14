/**
 * Quick verification: POST two test cases → see generated Gherkin.
 */
const http = require('http');

const testCases = [
  {
    testCaseId: 'TC001',
    title: 'Login with valid credentials',
    module: 'Login',
    steps: ['Navigate to login page', 'Enter username standard_user', 'Enter password secret_sauce', 'Click Login button'],
    expectedResult: 'Dashboard page should be visible',
    priority: 'high',
    tags: ['@smoke', '@login'],
  },
  {
    testCaseId: 'TC002',
    title: 'Login with invalid password',
    module: 'Login',
    steps: ['Navigate to login page', 'Enter username standard_user', 'Enter password wrong_pass', 'Click Login button'],
    expectedResult: 'Error message should be displayed',
    priority: 'high',
    tags: ['@smoke', '@negative'],
  },
];

const data = JSON.stringify({ testCases });

const req = http.request(
  {
    hostname: 'localhost',
    port: 4000,
    path: '/api/generate-bdd',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  },
  (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      const json = JSON.parse(body);
      console.log(`Status: ${res.statusCode} | Features: ${json.features?.length}\n`);

      if (json.features) {
        json.features.forEach((f) => {
          console.log('═══════════════════════════════════════');
          console.log(`File: ${f.fileName}`);
          console.log(`Scenarios: ${f.scenarios.length}`);
          console.log('───────────────────────────────────────');
          console.log(f.content);
          console.log('═══════════════════════════════════════\n');
        });
      }

      if (json.errors) console.log('Errors:', json.errors);
      console.log('✅ Done');
    });
  }
);

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
