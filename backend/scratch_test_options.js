const https = require('https');

const options = {
  hostname: 'apitest.posnetx.com',
  port: 443,
  path: '/auth/login-pin-only',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5173',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type'
  },
};

const req = https.request(options, res => {
  console.log(`OPTIONS STATUS: ${res.statusCode}`);
  console.log('HEADERS:', res.headers);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
