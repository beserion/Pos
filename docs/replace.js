const fs = require('fs');
let c = fs.readFileSync('src/app/[locale]/admin/products/page.tsx', 'utf8');
const f = fs.readFileSync('form.txt', 'utf8');
const s = c.indexOf('<div className="flex-1 overflow-hidden w-full text-start flex flex-col">');
const estr1 = '</form>\r\n                        </div>';
const estr2 = '</form>\n                        </div>';
let e = c.indexOf(estr1, s);
let e_len = estr1.length;
if (e === -1) {
    e = c.indexOf(estr2, s);
    e_len = estr2.length;
}

if (s === -1 || e === -1) {
    console.log('Could not find boundaries! s=' + s + ' e=' + e);
} else {
    fs.writeFileSync('src/app/[locale]/admin/products/page.tsx', c.substring(0, s) + f + c.substring(e + e_len), 'utf8');
    console.log('Replaced successfully!');
}
