/**
 * Edge case tests for the CSV upload endpoint.
 * Run: node test-upload-edge.js
 */
const http = require('http');

function testEndpoint(description, body, contentType) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/upload',
      method: 'POST',
      headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`\n─── ${description} ───`);
          console.log(`Status: ${res.statusCode} | Success: ${json.success}`);
          if (json.errors) console.log('Errors:', json.errors);
          if (json.testCases) console.log(`Test cases: ${json.testCases.length}`);
        } catch (e) {
          console.log(`\n─── ${description} ───`);
          console.log(`Status: ${res.statusCode} | Raw:`, data.substring(0, 200));
        }
        resolve();
      });
    });
    req.on('error', (err) => { console.log(`\n─── ${description} ───\n❌ Error: ${err.message}`); resolve(); });
    req.write(body);
    req.end();
  });
}

// Build form data helper
function buildFormData(filename, csvContent) {
  const boundary = '----Boundary' + Date.now();
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n--${boundary}--\r\n`;
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

(async () => {
  console.log('🧪 Running edge case tests...');

  // Test 1: No file uploaded
  await testEndpoint('Test 1: No file field', '{}', 'application/json');

  // Test 2: Empty CSV (only headers)
  const { body: b2, contentType: ct2 } = buildFormData('empty.csv', 'testCaseId,title,steps,expectedResult,priority\n');
  await testEndpoint('Test 2: Empty CSV (headers only)', b2, ct2);

  // Test 3: Missing required headers
  const { body: b3, contentType: ct3 } = buildFormData('bad-headers.csv', 'id,name,description\nTC001,Test,Some desc\n');
  await testEndpoint('Test 3: Missing required headers', b3, ct3);

  // Test 4: Invalid priority
  const { body: b4, contentType: ct4 } = buildFormData('bad-priority.csv', 'testCaseId,title,steps,expectedResult,priority\nTC001,Test,Step 1,Expected,invalid_priority\n');
  await testEndpoint('Test 4: Invalid priority value', b4, ct4);

  // Test 5: Valid minimal CSV
  const { body: b5, contentType: ct5 } = buildFormData('minimal.csv', 'testCaseId,title,steps,expectedResult,priority\nTC001,Login Test,Navigate to login; Enter credentials; Click login,Should see dashboard,high\n');
  await testEndpoint('Test 5: Valid minimal CSV', b5, ct5);

  console.log('\n\n✅ Edge case tests complete!');
})();
