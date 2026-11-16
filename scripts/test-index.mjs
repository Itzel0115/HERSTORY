import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ROOT, outsideIndexes } from './build-index.mjs';

async function snapshot(root) {
  const result={};
  async function walk(dir) {
    for (const e of await fs.readdir(dir,{withFileTypes:true})) {
      const p=path.join(dir,e.name);
      if(e.isDirectory()) await walk(p);
      else result[path.relative(root,p)]={hash:crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex'),mtime:(await fs.stat(p)).mtimeMs};
    }
  }
  await walk(root);return result;
}
async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'herstory-index-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true})); // Only this newly-created test directory.
  const data=JSON.parse(await fs.readFile(path.join(ROOT,'data/exhibitions.json'),'utf8'));
  async function write(file,content) {const p=path.join(root,file);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,content);}
  for(const file of ['index.html','en/index.html','scripts/build-index.mjs']) await write(file,await fs.readFile(path.join(ROOT,file)));
  for(const e of data.exhibitions) {
    await fs.mkdir(path.join(root,e.researchPath),{recursive:true});
    for(const l of Object.values(e.locales)) await write(l.path,await fs.readFile(path.join(ROOT,l.path)));
  }
  const save=()=>write('data/exhibitions.json',JSON.stringify(data));
  await save();
  const run=(check=false)=>spawnSync(process.execPath,[path.join(root,'scripts/build-index.mjs'),...(check?['--check']:[])],{encoding:'utf8'});
  const read=f=>fs.readFile(path.join(root,f),'utf8');
  return {root,data,save,run,read,write};
}
function publish(e){e.status='published';e.publishedAt='2026-11-16';}
test('I01/I02: only published, both homes and all/category indexes; stable sort and escaping',async t=>{
  const f=await fixture(t);publish(f.data.exhibitions[0]);f.data.exhibitions[1].status='review';
  f.data.exhibitions[0].locales.en.title='<script> & "title"';await f.save();
  assert.equal(f.run().status,0);
  for(const home of ['index.html','en/index.html']) {
    const html=await f.read(home);
    assert.equal((html.match(/data-exhibition-id="nushu"/g)||[]).length,2);
    assert.ok(!html.includes('data-exhibition-id="a-room-of-ones-own"'));
    assert.ok(!html.includes('data-exhibition-id="the-unseen-hours"'));
    assert.ok(html.includes('id="her-art"'));
    assert.ok(html.includes('href="exhibitions/nushu/index.html"'));
  }
  assert.ok((await f.read('en/index.html')).includes('&lt;script&gt; &amp; &quot;title&quot;'));
  publish(f.data.exhibitions[1]);f.data.exhibitions[1].featured=true;await f.save();assert.equal(f.run().status,0);
  assert.ok((await f.read('index.html')).indexOf('data-exhibition-id="a-room-of-ones-own"')<(await f.read('index.html')).indexOf('data-exhibition-id="nushu"'));
});
for(const [name,mutate] of [
  ['I03 duplicate ID',f=>f.data.exhibitions.push(structuredClone(f.data.exhibitions[0]))],
  ['I04 invalid category',f=>f.data.exhibitions[0].primaryCategory='unknown'],
  ['confirmed classification',f=>f.data.exhibitions[0].primaryCategory='her-art'],
  ['I05 missing English field',f=>delete f.data.exhibitions[0].locales.en.summary],
  ['empty bilingual title',f=>f.data.exhibitions[1].locales['zh-Hant'].title=' '],
  ['I06 missing destination',async f=>fs.unlink(path.join(f.root,f.data.exhibitions[0].locales.en.path))],
  ['wrong-case destination',f=>f.data.exhibitions[0].locales.en.path='en/exhibitions/Nushu/index.html'],
  ['unsafe path',f=>f.data.exhibitions[0].locales.en.path='../index.html'],
  ['I05 wrong document language',async f=>f.write(f.data.exhibitions[0].locales.en.path,'<html lang="zh-Hant"><h1>Test</h1><section id="sources"></section></html>')],
  ['I07 nonexistent related ID',f=>f.data.exhibitions[0].relatedIds=['missing']],
  ['self relation',f=>f.data.exhibitions[0].relatedIds=['nushu']],
  ['unpublished relation',f=>f.data.exhibitions[0].relatedIds=['a-room-of-ones-own']],
  ['invalid date',f=>f.data.exhibitions[0].updatedAt='2026-02-30'],
  ['missing publishedAt',f=>f.data.exhibitions[0].status='published'],
  ['empty publication date on draft',f=>f.data.exhibitions[0].publishedAt=''],
  ['null cover',f=>f.data.exhibitions[0].cover=null],
  ['unknown registry field',f=>f.data.pages=[]],
  ['invalid status',f=>f.data.exhibitions[0].status='public'],
  ['cover requires bilingual alt',f=>f.data.exhibitions[0].cover={path:'assets/images/nushu/example.jpg',assetId:'example'}]
]) test(`${name}: generate and check fail without writes`,async t=>{
  const f=await fixture(t);await mutate(f);await f.save();
  const before=await snapshot(f.root);
  for(const check of [false,true]) {const r=f.run(check);assert.notEqual(r.status,0);assert.match(r.stderr,/Fail:/);assert.deepEqual(await snapshot(f.root),before);}
});
test('I08/I09/I11: outside bytes, no-write checks (hash + mtime), idempotent generation',async t=>{
  const f=await fixture(t);const outside={};
  for(const home of ['index.html','en/index.html'])outside[home]=outsideIndexes(await f.read(home));
  assert.equal(f.run().status,0);const synced=await snapshot(f.root);
  assert.equal(f.run(true).status,0);assert.deepEqual(await snapshot(f.root),synced);
  assert.equal(f.run().status,0);assert.deepEqual(await snapshot(f.root),synced);
  publish(f.data.exhibitions[0]);await f.save();const stale=await snapshot(f.root);
  assert.notEqual(f.run(true).status,0);assert.deepEqual(await snapshot(f.root),stale);
  assert.equal(f.run().status,0);
  for(const home of Object.keys(outside))assert.equal(outsideIndexes(await f.read(home)),outside[home]);
});
for(const type of ['missing','duplicate','unpaired','nested'])test(`I10 ${type} markers in English: neither home written`,async t=>{
  const f=await fixture(t);publish(f.data.exhibitions[0]);await f.save();
  let html=await f.read('en/index.html');
  const mark='<!-- HERSTORY:INDEX:all:START -->';
  if(type==='missing')html=html.replace(mark,'');
  if(type==='duplicate')html=html.replace(mark,mark+mark);
  if(type==='unpaired')html=html.replace('HERSTORY:INDEX:all:END','HERSTORY:INDEX:other:END');
  if(type==='nested')html=html.replace('HERSTORY:INDEX:all:END','HERSTORY:INDEX:her-words:START').replace(/HERSTORY:INDEX:her-words:START(?= -->)/g,(s,offset)=>offset>html.indexOf('id="her-words"')?'HERSTORY:INDEX:all:END':s);
  await f.write('en/index.html',html);const before=await snapshot(f.root);
  assert.notEqual(f.run().status,0);assert.notEqual(f.run(true).status,0);assert.deepEqual(await snapshot(f.root),before);
});
test('I12: bilingual general page manual entry remains outside generated areas, registry unchanged',async t=>{
  const f=await fixture(t);const registry=await f.read('data/exhibitions.json');
  assert.equal(f.run().status,0);
  for(const [home,page,lang] of [['index.html','visit/index.html','zh-Hant'],['en/index.html','en/visit/index.html','en']]) {
    await f.write(page,`<html lang="${lang}"><h1>Visit</h1><a href="../index.html">HERSTORY</a></html>`);
    const before=await f.read(home),link='<a data-test-manual href="visit/index.html">Visit</a>';
    await f.write(home,before.replace('</nav></header>',link+'</nav></header>'));
    assert.equal(f.run().status,0);const after=await f.read(home);
    assert.ok(outsideIndexes(after).includes(link));assert.equal(after.replace(link,''),before);
    const href=after.match(/data-test-manual href="([^"]+)"/)[1];
    assert.ok((await fs.readFile(path.join(f.root,path.posix.dirname(home),href),'utf8')).includes(`lang="${lang}"`));
  }
  assert.equal(await f.read('data/exhibitions.json'),registry);assert.equal(f.run(true).status,0);
});
test('valid related IDs reference published exhibitions',async t=>{
  const f=await fixture(t);publish(f.data.exhibitions[1]);f.data.exhibitions[0].relatedIds=['a-room-of-ones-own'];await f.save();assert.equal(f.run().status,0);
});
test('I01 extension: new bilingual exhibition appears in both all and HER ART indexes',async t=>{
  const f=await fixture(t),e=structuredClone(f.data.exhibitions[0]);
  e.id='test-exhibition';e.primaryCategory='her-art';e.researchPath='docs/research/test-exhibition/';publish(e);
  await fs.mkdir(path.join(f.root,e.researchPath),{recursive:true});
  for(const lang of ['zh-Hant','en']){
    e.locales[lang].path=`${lang==='en'?'en/':''}exhibitions/${e.id}/index.html`;
    await f.write(e.locales[lang].path,`<html lang="${lang}"><h1>Isolated test fixture</h1><section id="sources"></section></html>`);
  }
  f.data.exhibitions.push(e);await f.save();assert.equal(f.run().status,0);
  for(const home of ['index.html','en/index.html']){
    const html=await f.read(home);assert.equal((html.match(/data-exhibition-id="test-exhibition"/g)||[]).length,2);
    assert.ok(html.indexOf('id="her-art"')<html.lastIndexOf('data-exhibition-id="test-exhibition"'));
  }
  assert.equal(f.run(true).status,0);
});
