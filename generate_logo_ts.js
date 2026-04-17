import fs from 'fs';

const base64 = fs.readFileSync('base64_custom_logo.txt', 'utf8');
const fileContent = `export const ministryLogo = "${base64}";\n`;
fs.writeFileSync('src/logo.ts', fileContent);
console.log('src/logo.ts created successfully!');
