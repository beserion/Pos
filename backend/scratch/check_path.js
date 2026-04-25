const path = require('path');
const fs = require('fs');

const cases = [
    { name: 'Source path', dir: 'c:\\Github\\Pos\\backend\\src\\inpos' },
    { name: 'Dist path', dir: 'c:\\Github\\Pos\\backend\\dist\\src\\inpos' }
];

cases.forEach(c => {
    const dllPath = path.resolve(c.dir, '..', '..', 'lib', 'inpos', 'inposext.dll');
    console.log(`${c.name} resolves to: ${dllPath}`);
    console.log(`Exists: ${fs.existsSync(dllPath)}`);
});

const betterPath = path.resolve(process.cwd(), 'lib', 'inpos', 'inposext.dll');
console.log(`process.cwd() resolves to: ${betterPath}`);
console.log(`Exists: ${fs.existsSync(betterPath)}`);
