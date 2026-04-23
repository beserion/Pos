const http = require('http');

const data = JSON.stringify({ pinCode: '9876' });

const options = {
  hostname: 'localhost',
  port: 3050,
  path: '/auth/login-pin-only',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
