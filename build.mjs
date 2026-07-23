import fs from 'fs';
import path from 'path';
import { convertConfluenceStorage } from './convert.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]):/, '$1:');

const PAGES = [
  { key: 'A', anchor: 'page-a', file: 'page-A.html', title: 'A. 系統 Overview' },
  { key: 'B', anchor: 'page-b', file: 'page-B.html', title: 'B. 前臺規格（Viewer Catalog and Partner Form）' },
  { key: 'C', anchor: 'page-c', file: 'page-C.html', title: 'C. 後台功能規格 (CMS)' },
];

const titleAnchorMap = {};
for (const p of PAGES) titleAnchorMap[p.title] = p.anchor;

const now = new Date();
const stamp = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });

const sections = PAGES.map((p) => {
  const raw = fs.readFileSync(path.join(DIR, 'raw', p.file), 'utf8');
  const converted = convertConfluenceStorage(raw, titleAnchorMap);
  return `<section class="doc" id="${p.anchor}">
    <div class="doc-kicker">規格文件 · ${p.key}</div>
    <h1 class="doc-title">${p.title}</h1>
    <div class="doc-body">${converted}</div>
  </section>`;
}).join('\n');

const nav = PAGES.map((p) => `<a class="nav-link" href="#${p.anchor}" data-anchor="${p.anchor}">${p.title}</a>`).join('\n');

const template = fs.readFileSync(path.join(DIR, 'template.html'), 'utf8');
const out = template
  .replace('{{STAMP}}', stamp)
  .replace('{{NAV}}', nav)
  .replace('{{SECTIONS}}', sections);

fs.writeFileSync(path.join(DIR, 'dist', 'index.html'), out, 'utf8');
fs.writeFileSync(path.join(DIR, 'index.html'), out, 'utf8');
console.log('built dist/index.html and index.html —', out.length, 'chars');
