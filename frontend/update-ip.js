const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const ip = getLocalIp();
const envPath = path.join(__dirname, '.env.local');
const varName = 'NEXT_PUBLIC_API_URL';
const newValue = `bosnakback.posnetx.com`;

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const lines = envContent.split('\n');
let found = false;
const updatedLines = lines.map(line => {
  if (line.startsWith(`${varName}=`)) {
    found = true;
    return `${varName}=${newValue}`;
  }
  return line;
});

if (!found) {
  updatedLines.push(`${varName}=${newValue}`);
}

fs.writeFileSync(envPath, updatedLines.join('\n').trim() + '\n');
console.log(`Successfully updated ${envPath} with ${varName}=${newValue}`);
