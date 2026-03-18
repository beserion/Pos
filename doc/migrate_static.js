const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src/app/[locale]');
const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file === 'page.tsx') {
            processPage(fullPath, dir);
        }
    }
}

function processPage(filePath, dir) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already processed or has dynamic segments in path like [id]
    if (filePath.includes('[id]') || filePath.includes('[tableId]')) {
        console.log(`Skipping dynamic segment page: ${filePath}`);
        return;
    }

    if (content.includes('export function generateStaticParams')) {
        console.log(`Already has generateStaticParams: ${filePath}`);
        return;
    }

    if (content.includes("'use client'") || content.includes('"use client"')) {
        console.log(`Processing CLIENT page: ${filePath}`);
        const clientFileName = 'PageClient.tsx';
        const clientPath = path.join(dir, clientFileName);
        
        // 1. Write the new page.tsx wrapper
        const wrapper = `
import { PageClient } from './PageClient';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default function Page() {
    return <PageClient />;
}
`.trim();
        
        // 2. Modify original content to export the component as named export PageClient
        let newClientContent = content.replace(/export default function \w+/, 'export function PageClient');
        // Handle cases where it might be an arrow function or differently named
        if (!newClientContent.includes('export function PageClient')) {
             newClientContent = content.replace(/export default/, 'export function PageClient');
        }

        fs.writeFileSync(clientPath, newClientContent);
        fs.writeFileSync(filePath, wrapper);
    } else {
        console.log(`Processing SERVER page: ${filePath}`);
        const gsp = `
const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}
`.trim();
        fs.writeFileSync(filePath, gsp + '\n\n' + content);
    }
}

walk(srcDir);
console.log('DONE.');
