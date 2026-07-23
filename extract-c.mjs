import fs from 'fs';

const srcPath = process.argv[2];
const outPath = process.argv[3];

const raw = fs.readFileSync(srcPath, 'utf8');
const json = JSON.parse(raw);
const value = json.body.storage.value;
fs.writeFileSync(outPath, value, 'utf8');
console.log('wrote', outPath, value.length, 'chars');
