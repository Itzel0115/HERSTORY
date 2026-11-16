import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CATEGORIES = ['her-words', 'her-art', 'her-life', 'her-world'];
export const REGIONS = ['all', ...CATEGORIES];
const LANGUAGES = ['zh-Hant', 'en'];
const fail = message => { throw new Error(message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function keys(value, required, optional, label) {
  if (!object(value)) fail(`${label}: expected object`);
  for (const key of required) if (!(key in value)) fail(`${label}: missing ${key}`);
  for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) fail(`${label}: unknown field ${key}`);
}
// Walk each path component: Windows must not conceal case errors that fail on Pages.
export async function exactFile(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.startsWith('/') || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || p === '..')) fail(`Unsafe path: ${relative}`);
  let current = root;
  for (const part of relative.split('/')) {
    if (!(await fs.readdir(current)).includes(part)) fail(`Missing or wrong-case path: ${relative}`);
    current = path.join(current, part);
    if ((await fs.lstat(current)).isSymbolicLink()) fail(`Symlink not allowed: ${relative}`);
  }
  return current;
}
function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) fail(`${label}: invalid date`);
}
export async function validate(registry, root) {
  keys(registry, ['schemaVersion', 'exhibitions'], [], 'registry');
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.exhibitions)) fail('Expected schemaVersion 1 and exhibitions array');
  const ids = new Set();
  const fixed = {nushu:'her-words', 'a-room-of-ones-own':'her-world', 'the-unseen-hours':'her-life'};
  for (const e of registry.exhibitions) {
    keys(e, ['id','status','primaryCategory','tags','locales','displayOrder','featured','relatedIds','researchPath','updatedAt'], ['cover','publishedAt'], 'exhibition');
    if (!slug(e.id) || ids.has(e.id)) fail(`Invalid or duplicate ID: ${e.id}`);
    ids.add(e.id);
    if (!['draft','review','published'].includes(e.status)) fail(`${e.id}: invalid status`);
    if (!CATEGORIES.includes(e.primaryCategory) || (fixed[e.id] && fixed[e.id] !== e.primaryCategory)) fail(`${e.id}: invalid primaryCategory`);
    if (!Array.isArray(e.tags) || e.tags.some(t => !CATEGORIES.includes(t)) || new Set(e.tags).size !== e.tags.length) fail(`${e.id}: tags must be unique category IDs`);
    if (!Number.isSafeInteger(e.displayOrder) || e.displayOrder < 0 || typeof e.featured !== 'boolean') fail(`${e.id}: invalid ordering`);
    if (!Array.isArray(e.relatedIds) || new Set(e.relatedIds).size !== e.relatedIds.length) fail(`${e.id}: invalid relatedIds`);
    date(e.updatedAt, `${e.id}.updatedAt`);
    if (e.status === 'published' && !e.publishedAt) fail(`${e.id}: publishedAt required`);
    if ('publishedAt' in e) {
      date(e.publishedAt, `${e.id}.publishedAt`);
      if (e.status !== 'published' || e.publishedAt > e.updatedAt) fail(`${e.id}: invalid publication chronology`);
    }
    if (e.researchPath !== `docs/research/${e.id}/`) fail(`${e.id}: researchPath mismatch`);
    if (!(await fs.stat(await exactFile(root, e.researchPath.slice(0,-1)))).isDirectory()) fail(`${e.id}: research directory missing`);
    keys(e.locales, LANGUAGES, [], `${e.id}.locales`);
    for (const lang of LANGUAGES) {
      const l = e.locales[lang];
      keys(l, ['title','summary','path'], ['coverAlt'], `${e.id}.${lang}`);
      if (!text(l.title) || !text(l.summary)) fail(`${e.id}.${lang}: empty bilingual field`);
      const expected = `${lang === 'en' ? 'en/' : ''}exhibitions/${e.id}/index.html`;
      if (l.path !== expected) fail(`${e.id}.${lang}: expected ${expected}`);
      const html = await fs.readFile(await exactFile(root, l.path), 'utf8');
      if (!html.includes(`<html lang="${lang}"`) || !/<h1\b/.test(html) || !html.includes('id="sources"')) fail(`${e.id}.${lang}: missing language, h1 or Sources structure`);
      if (e.cover && !text(l.coverAlt)) fail(`${e.id}.${lang}: coverAlt required`);
      if (!e.cover && l.coverAlt !== undefined) fail(`${e.id}.${lang}: coverAlt without cover`);
    }
    if ('cover' in e) {
      keys(e.cover, ['path','assetId'], [], `${e.id}.cover`);
      if (!slug(e.cover.assetId) || !new RegExp(`^assets/images/${e.id}/[a-z0-9.-]+\\.(?:jpg|jpeg|png|webp|svg)$`).test(e.cover.path)) fail(`${e.id}: invalid cover`);
      if (!(await fs.stat(await exactFile(root, e.cover.path))).isFile()) fail(`${e.id}: cover missing`);
    }
  }
  for (const e of registry.exhibitions) for (const id of e.relatedIds) {
    const target = registry.exhibitions.find(x => x.id === id);
    if (id === e.id || !target || target.status !== 'published') fail(`${e.id}: relatedIds must reference another published exhibition: ${id}`);
  }
  return registry.exhibitions;
}
export function regions(html) {
  const marks = [...html.matchAll(/<!-- HERSTORY:INDEX:([^>]*?) -->/g)];
  if (marks.length !== REGIONS.length * 2) fail('Missing, duplicate or malformed index markers');
  const result = [];
  for (let i=0; i<marks.length; i+=2) {
    const a=marks[i], b=marks[i+1], name=a[1].replace(/:START$/, '');
    if (!REGIONS.includes(name) || a[1] !== `${name}:START` || b[1] !== `${name}:END` || result.some(r => r.name === name)) fail('Invalid, nested or duplicate index marker pair');
    result.push({name, start:a.index+a[0].length, end:b.index});
  }
  return result;
}
export function outsideIndexes(html) {
  for (const r of regions(html).reverse()) html=html.slice(0,r.start)+html.slice(r.end);
  return html;
}
function render(entries, lang, region, home) {
  const selected = entries.filter(e => e.status === 'published' && (region === 'all' || e.primaryCategory === region))
    .sort((a,b) => Number(b.featured)-Number(a.featured) || a.displayOrder-b.displayOrder || (a.id<b.id?-1:a.id>b.id?1:0));
  if (!selected.length) return `\n<p class="index-empty">${lang === 'en' ? 'Exhibitions are being prepared.' : '展覽籌備中。'}</p>\n`;
  return '\n<ul class="exhibition-index">\n'+selected.map(e => {
    const l=e.locales[lang], href=path.posix.relative(path.posix.dirname(home), l.path);
    const image=e.cover ? `<img src="${escape(path.posix.relative(path.posix.dirname(home),e.cover.path))}" alt="${escape(l.coverAlt)}" loading="lazy">` : '';
    return `<li data-exhibition-id="${e.id}">${image}<h3><a href="${escape(href)}">${escape(l.title)}</a></h3><p>${escape(l.summary)}</p></li>`;
  }).join('\n')+'\n</ul>\n';
}
export async function build({root=ROOT, check=false}={}) {
  const entries=await validate(JSON.parse(await fs.readFile(path.join(root,'data/exhibitions.json'),'utf8')),root);
  const planned=[];
  // Validate both homes before any write, including all marker boundaries.
  for (const [lang,home] of [['zh-Hant','index.html'],['en','en/index.html']]) {
    const file=await exactFile(root,home), before=await fs.readFile(file,'utf8');
    let after=before;
    for (const r of regions(before).reverse()) after=after.slice(0,r.start)+render(entries,lang,r.name,home)+after.slice(r.end);
    planned.push({file,before,after});
  }
  const changed=planned.filter(p=>p.before!==p.after);
  if (check) { if(changed.length) fail('Homepage exhibition indexes are stale; run node scripts/build-index.mjs'); return 0; }
  // Restore already-written home if the second write fails. Not a crash-atomic filesystem transaction.
  const written=[];
  try { for (const p of changed) { written.push(p); await fs.writeFile(p.file,p.after); } }
  catch(error) { for (const p of written) await fs.writeFile(p.file,p.before); throw error; }
  return changed.length;
}
if (import.meta.main) {
  try {
    if (process.argv.slice(2).some(a=>a!=='--check') || process.argv.slice(2).length>1) fail('Usage: node scripts/build-index.mjs [--check]');
    const n=await build({check:process.argv.includes('--check')});
    console.log(process.argv.includes('--check') ? 'Pass: registry and indexes synchronized (read only).' : `Pass: ${n} homepage(s) updated.`);
  } catch(error) { console.error(`Fail: ${error.message}`); process.exitCode=1; }
}

