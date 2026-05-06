const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) getFiles(name, files);
    else if (name.endsWith('.entity.ts')) files.push(name);
  }
  return files;
}

const files = getFiles('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const regexNum = /(@Column\([^)]*\))\s+([a-zA-Z0-9_]+\??\s*:\s*number\s*;)/g;
  content = content.replace(regexNum, (match, p1, p2) => {
    // If it's a primary column or already has a default, keep it
    if (p1.includes('default') || p1.includes('Primary') || p1.includes('Generated')) return match;
    // Sometimes userId or foreign keys don't want defaults but the user said "tüm tablolarda sadece sayısal alanlar".
    // Let's apply it. If it's nullable we still apply default 0. TypeORM allows nullable AND default.
    changed = true;
    
    if (p1 === '@Column()') {
      return `@Column({ default: 0 })\n  ${p2}`;
    } else if (p1.includes('{')) {
      return p1.replace(/}/, ', default: 0 }') + `\n  ${p2}`;
    } else {
      return p1.replace(/\)$/, ', { default: 0 })') + `\n  ${p2}`;
    }
  });

  const regexBool = /(@Column\([^)]*\))\s+([a-zA-Z0-9_]+\??\s*:\s*boolean\s*;)/g;
  content = content.replace(regexBool, (match, p1, p2) => {
    if (p1.includes('default') || p1.includes('Primary') || p1.includes('Generated')) return match;
    changed = true;
    
    if (p1 === '@Column()') {
      return `@Column({ default: false })\n  ${p2}`;
    } else if (p1.includes('{')) {
      return p1.replace(/}/, ', default: false }') + `\n  ${p2}`;
    } else {
      return p1.replace(/\)$/, ', { default: false })') + `\n  ${p2}`;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log("Updated:", file);
  }
});
