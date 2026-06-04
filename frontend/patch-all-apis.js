const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedCount = 0;

const dynamicApiUrl = "(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:4050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4050'))";

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Search for exactly 'http://localhost:4050/... 
    // Wait, better to replace exactly 'http://localhost:4050' with the expression when it's surrounded by quotes OR it's part of template string
    // Let's replace 'http://localhost:4050' with `${...}` if inside backticks
    
    // For single/double quotes:
    content = content.replace(/'http:\/\/localhost:4050'/g, dynamicApiUrl);
    content = content.replace(/"http:\/\/localhost:4050"/g, dynamicApiUrl);
    
    // For template strings without a trailing slash e.g. `http://localhost:4050/zones` -> `${dynamicApiUrl}/zones`
    content = content.replace(/`http:\/\/localhost:4050\//g, '`${' + dynamicApiUrl + '}/');
    content = content.replace(/`http:\/\/localhost:4050`/g, '`${' + dynamicApiUrl + '}`');
    
    // Replace partial string concatenations like 'http://localhost:4050/'
    content = content.replace(/'http:\/\/localhost:4050\//g, dynamicApiUrl + " + '/");
    content = content.replace(/"http:\/\/localhost:4050\//g, dynamicApiUrl + " + '/");

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
    }
});

console.log('Successfully patched ' + changedCount + ' files.');
