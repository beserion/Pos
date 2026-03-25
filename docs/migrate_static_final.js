const fs = require('fs');
const path = require('path');

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

const pages = [
    { dir: 'src/app/[locale]/customers/[id]', param: 'id', value: '1' },
    { dir: 'src/app/[locale]/finance/accounts/[id]', param: 'id', value: '1' },
    { dir: 'src/app/[locale]/qr-menu/[tableId]', param: 'tableId', value: '1' }
];

for (const p of pages) {
    const fullDir = path.join(process.cwd(), p.dir);
    const filePath = path.join(fullDir, 'page.tsx');
    const clientPath = path.join(fullDir, 'PageClient.tsx');

    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');

    // Rename to PageClient
    let newClientContent = content.replace(/export default function \w+/, 'export function PageClient');
    if (!newClientContent.includes('export function PageClient')) {
        newClientContent = content.replace(/export default/, 'export function PageClient');
    }
    fs.writeFileSync(clientPath, newClientContent);

    // Write new page wrapper
    const wrapper = `
import { PageClient } from './PageClient';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.flatMap((locale) => [
        { locale, ${p.param}: '${p.value}' }
    ]);
}

export default function Page() {
    return <PageClient />;
}
`.trim();
    fs.writeFileSync(filePath, wrapper);
}
console.log('Final pages processed.');
