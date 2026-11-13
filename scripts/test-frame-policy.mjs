import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';
const src=fs.readFileSync('app/frame-policy.ts','utf8'),js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {framePolicy,publicHttpsUrl}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64')),portal='https://portal.example',client='https://client.example';
for(const raw of ['http://client.example','https://127.0.0.1','https://2130706433','https://[::1]','https://metadata.google.internal','https://u:secret@client.example','https://client.example:8443'])assert.throws(()=>publicHttpsUrl(raw));
assert.equal(publicHttpsUrl(client+'/index').origin,client);
for(const csp of ["frame-ancestors 'none'","frame-ancestors 'self'",'frame-ancestors https://evil.example',"frame-ancestors https://portal.example, frame-ancestors 'none'"])assert.equal(framePolicy(new Headers({'content-security-policy':csp}),client,portal).embedding,'blocked');
for(const xfo of ['SAMEORIGIN','DENY'])assert.equal(framePolicy(new Headers({'x-frame-options':xfo}),client,portal).embedding,'blocked');
assert.equal(framePolicy(new Headers({'content-security-policy':'frame-ancestors https://portal.example','x-frame-options':'SAMEORIGIN'}),client,portal).embedding,'not-explicitly-blocked');
assert.equal(framePolicy(new Headers({'content-security-policy':'frame-ancestors https://*.example'}),client,portal).embedding,'not-explicitly-blocked');
assert.equal(framePolicy(new Headers(),client,portal).embedding,'not-explicitly-blocked');
const metadata=JSON.parse(fs.readFileSync('public/data/india/source.json','utf8')),files=fs.readdirSync('public/data/india').filter(n=>/^\d+\.json$/.test(n));assert.equal(files.length,36);assert.equal(metadata.cityRecords,5050);for(const f of files){const cities=JSON.parse(fs.readFileSync('public/data/india/'+f,'utf8'));assert(cities.every(c=>typeof c==='string'&&c.length>0));assert.equal(new Set(cities).size,cities.length);}
assert(JSON.parse(fs.readFileSync('public/data/india/36.json','utf8')).includes('Mancherial'));
console.log('PASS frame policies, private/credentialed URL rejection, 36 state datasets, 5,050 source records and city deduplication.');
