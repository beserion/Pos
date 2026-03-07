const fs = require('fs');
const path = require('path');

const dir = 'd:/GitHub/POSAPP/frontend/src/app';
const files = [
    'dashboard/page.tsx',
    'pos/page.tsx',
    'inventory/page.tsx',
    'delivery/page.tsx',
    'customers/page.tsx'
];

files.forEach(file => {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf8');

    // Shift background colors up (lighter)
    content = content.replace(/dark:bg-slate-800/g, 'dark:bg-slate-700');
    content = content.replace(/dark:bg-slate-900/g, 'dark:bg-slate-800');
    content = content.replace(/dark:bg-slate-950/g, 'dark:bg-slate-900');

    // Shift border colors up (lighter)
    content = content.replace(/dark:border-slate-800/g, 'dark:border-slate-700');
    content = content.replace(/dark:border-slate-900/g, 'dark:border-slate-800');

    // Specific adjustments for text or hover
    content = content.replace(/dark:hover:bg-slate-800/g, 'dark:hover:bg-slate-700');
    content = content.replace(/dark:hover:bg-slate-900/g, 'dark:hover:bg-slate-800');

    fs.writeFileSync(p, content);
    console.log('updated ' + file);
});
