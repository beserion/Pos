const path = require('path');
let koffi;
try {
    koffi = require('koffi');
} catch (e) {
    console.error('koffi not found');
    process.exit(1);
}

const dllPath = path.resolve(process.cwd(), 'lib', 'inpos', 'inposext.dll');
console.log(`Loading DLL from: ${dllPath}`);

try {
    const lib = koffi.load(dllPath);
    console.log('DLL successfully loaded!');
    const versionFn = lib.stdcall('inposext_version', 'str', []);
    console.log(`Version: ${versionFn()}`);
} catch (e) {
    console.error('Failed to load DLL:', e.message);
    process.exit(1);
}
