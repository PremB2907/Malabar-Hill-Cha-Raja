const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make GET/POST HTTP requests
function request(method, pathname, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    let dataString = '';
    if (body) {
      dataString = (typeof body === 'string') ? body : JSON.stringify(body);
    }
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

// Main testing suite
async function runTests() {
  console.log('🚀 Starting Endpoint Verification Tests...\n');
  let passed = true;

  const testCases = [
    // Public Pages
    { method: 'GET', path: '/', expectedStatus: 200, name: 'Home Page' },
    { method: 'GET', path: '/about', expectedStatus: 200, name: 'About Page' },
    { method: 'GET', path: '/schedule', expectedStatus: 200, name: 'Schedule Page' },
    { method: 'GET', path: '/glimpses', expectedStatus: 200, name: 'Glimpses Gallery Page' },
    { method: 'GET', path: '/social-work', expectedStatus: 200, name: 'Social Work Page' },
    { method: 'GET', path: '/committee', expectedStatus: 200, name: 'Committee Page' },
    { method: 'GET', path: '/contact', expectedStatus: 200, name: 'Contact Page' },
    
    // Donation Pages
    { method: 'GET', path: '/donate', expectedStatus: 200, name: 'Donation View' },
    { method: 'GET', path: '/download-receipt/MCC-REC-2026-101', expectedStatus: 200, name: 'Download Donation PDF Receipt' },

    // Merch Page
    { method: 'GET', path: '/tshirt', expectedStatus: 200, name: 'T-Shirt Booking View' },
    { method: 'GET', path: '/download-tshirt-receipt/MCC-TSHIRT-2026-101', expectedStatus: 200, name: 'Download T-Shirt Receipt PDF' },

    // Admin Access Controls
    { method: 'GET', path: '/admin/login', expectedStatus: 200, name: 'Admin Login View' },
    { method: 'GET', path: '/admin', expectedStatus: 302, name: 'Admin Dashboard Redirect when Unauthenticated' },
  ];

  // Run GET tests
  for (const tc of testCases) {
    try {
      const res = await request(tc.method, tc.path);
      if (res.statusCode === tc.expectedStatus) {
        console.log(`✅ Passed: [${tc.method}] ${tc.path} (${tc.name}) - Status ${res.statusCode}`);
      } else {
        console.error(`❌ Failed: [${tc.method}] ${tc.path} (${tc.name}) - Expected ${tc.expectedStatus}, got ${res.statusCode}`);
        passed = false;
      }
    } catch (err) {
      console.error(`❌ Error requesting [${tc.method}] ${tc.path}: ${err.message}`);
      passed = false;
    }
  }

  // Test API Endpoints
  console.log('\n🧪 Testing API Post/Submit Actions...');

  // 1. Donation Order Creation
  try {
    const res = await request('POST', '/api/create-donation-order', { amount: 1500 });
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && json.success && json.receipt_no) {
      console.log(`✅ Passed: POST /api/create-donation-order - Created receipt: ${json.receipt_no}`);
    } else {
      console.error(`❌ Failed: POST /api/create-donation-order - Got status ${res.statusCode}, body: ${res.body}`);
      passed = false;
    }
  } catch (err) {
    console.error(`❌ Error testing donation order creation: ${err.message}`);
    passed = false;
  }

  // 2. Donation Confirmation
  try {
    const res = await request('POST', '/api/confirm-donation', {
      receipt_no: `MCC-REC-2026-TEST-${Math.floor(100+Math.random()*900)}`,
      donor_name: 'Test Donor Name',
      phone: '9988776655',
      email: 'test@example.com',
      amount: 1500,
      payment_id: 'pay_sim_test',
      order_id: 'order_sim_test',
      signature: 'sig_sim_test',
      pan_number: 'ABCDE1234F'
    });
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && json.success) {
      console.log(`✅ Passed: POST /api/confirm-donation - Verified & Saved`);
    } else {
      console.error(`❌ Failed: POST /api/confirm-donation - Got status ${res.statusCode}, body: ${res.body}`);
      passed = false;
    }
  } catch (err) {
    console.error(`❌ Error testing donation confirmation: ${err.message}`);
    passed = false;
  }

  // 3. T-Shirt Order Creation
  try {
    const res = await request('POST', '/tshirt/create-order', {
      quantity: 2,
      size: 'XL',
      color: 'Royal Maroon',
      buyer_name: 'Test Merch Buyer',
      phone: '9820012345'
    });
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && json.success) {
      console.log(`✅ Passed: POST /tshirt/create-order - Created order: ${json.receipt_no}`);
    } else {
      console.error(`❌ Failed: POST /tshirt/create-order - Got status ${res.statusCode}, body: ${res.body}`);
      passed = false;
    }
  } catch (err) {
    console.error(`❌ Error testing T-Shirt order creation: ${err.message}`);
    passed = false;
  }

  // 4. T-Shirt Order Confirmation must reject unpaid/simulated payments
  try {
    const res = await request('POST', '/tshirt/confirm', {
      buyer_name: 'Test Merch Buyer',
      phone: '9820012345',
      size: 'XL',
      color: 'Royal Maroon',
      quantity: 2,
      total_amount: 998,
      address: 'Test Address Line 1',
      receipt_no: `MCC-TSHIRT-2026-TEST-${Math.floor(100+Math.random()*900)}`,
      payment_id: 'pay_sim_test',
      order_id: 'order_sim_test',
      signature: 'sig_sim_test'
    });
    const json = JSON.parse(res.body);
    if (res.statusCode === 400 && !json.success) {
      console.log(`✅ Passed: POST /tshirt/confirm - Rejected unpaid payment`);
    } else {
      console.error(`❌ Failed: POST /tshirt/confirm - Expected unpaid payment rejection, got status ${res.statusCode}, body: ${res.body}`);
      passed = false;
    }
  } catch (err) {
    console.error(`❌ Error testing T-Shirt order confirmation: ${err.message}`);
    passed = false;
  }

  // 6. Admin Authentication Login
  try {
    const res = await request('POST', '/admin/login', new URLSearchParams({
      username: 'admin',
      password: 'admin123'
    }).toString(), {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (res.statusCode === 302 && res.headers['set-cookie']) {
      console.log(`✅ Passed: POST /admin/login - Authenticated successfully`);
    } else {
      console.error(`❌ Failed: POST /admin/login - Expected 302 redirect with set-cookie, got ${res.statusCode}`);
      passed = false;
    }
  } catch (err) {
    console.error(`❌ Error testing admin login: ${err.message}`);
    passed = false;
  }

  console.log('\n======================================');
  if (passed) {
    console.log('🎉 ALL ENDPOINT VERIFICATION TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('🚨 SOME ENDPOINT VERIFICATION TESTS FAILED.');
    process.exit(1);
  }
}

let testsStarted = false;
async function triggerTests() {
  if (testsStarted) return;
  testsStarted = true;
  if (startupTimeout) clearTimeout(startupTimeout);
  try {
    await runTests();
    serverProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error(err);
    serverProcess.kill();
    process.exit(1);
  }
}

// Start server in background process
const serverProcess = spawn('node', ['server.js'], {
  cwd: path.resolve(__dirname),
  env: { ...process.env, PORT: PORT, VERCEL: '0' }
});

serverProcess.stdout.on('data', (data) => {
  const output = data.toString().toLowerCase();
  console.log(`[Server Stdout] ${data.toString().trim()}`);
  if (output.includes('server started') || output.includes('connected to mysql') || output.includes('running with high-performance in-memory')) {
    triggerTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server Error] ${data}`);
});

// Fallback: trigger tests after 3 seconds if stdout matching did not fire due to buffering
const fallbackTimer = setTimeout(() => {
  if (!testsStarted) {
    console.log('⏰ Stdout matching did not fire (likely due to buffering). Running tests using 3-second fallback...');
    triggerTests();
  }
}, 3000);

const startupTimeout = setTimeout(() => {
  console.error('Timeout waiting for server to start');
  serverProcess.kill();
  process.exit(1);
}, 15000);
