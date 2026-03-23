const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('d:/GitHub/POSAPP/frontend/src');
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Look for exact matches of the standard assignment
    const originalRegex = /const\s+API_URL\s*=\s*(?:process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*(['"`])http:\/\/localhost:3050\1);/g;
    
    // Sometimes it might already be patched, let's just make sure we capture it safely
    if (content.includes("const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';")) {
        content = content.replace(
            "const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';",
            "const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');"
        );
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
    } else if (content.includes('const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3050";')) {
         content = content.replace(
            'const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3050";',
            "const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');"
        );
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
    }
});

console.log('Successfully patched ' + changedCount + ' files.');
