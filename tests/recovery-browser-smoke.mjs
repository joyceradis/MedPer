import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port=8731, origin=`http://127.0.0.1:${port}`;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try {
  for(let i=0;i<30;i++){try{const r=await fetch(origin+'/recuperar.html');if(r.ok)break;}catch{}await delay(300);}
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/recuperar.html');
  await page.evaluate(async()=>{
    localStorage.clear();
    const fixture={version:4,cases:[{id:'synthetic-001',title:'Caso sintético (sem dados reais)',scope:'Objeto fictício',context:{tribunal:'Vara fictícia'},methodology:{general:{object:'Objeto fictício'}},unknown:{mustSurvive:'intact'}}]};
    localStorage.setItem('medper.state.v4',JSON.stringify(fixture));
  });
  await page.getByRole('button',{name:'Procurar casos'}).click();
  const row=page.locator('tr').filter({hasText:'MedPer anterior (v4)'});
  await row.getByText('encontrado').waitFor();
  assert.equal(await row.locator('td').nth(2).innerText(),'1');
  const downloadPromise=page.waitForEvent('download');
  await row.getByRole('button',{name:'Baixar backup'}).click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^medper-resgate-/);
  await row.getByRole('checkbox').check();
  page.once('dialog',dialog=>dialog.accept());
  await row.getByRole('button',{name:'Migrar sem sobrescrever'}).click();
  await page.getByText('1 caso(s) recuperado(s)',{exact:false}).waitFor();
  const state=await page.evaluate(async()=>{
    const source=localStorage.getItem('medper.state.v4');
    const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('medper-v2');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
    const record=await new Promise((resolve,reject)=>{const tx=db.transaction('cases');const q=tx.objectStore('cases').get('synthetic-001');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
    db.close();return {source,record};
  });
  assert.equal(JSON.parse(state.source).cases[0].unknown.mustSurvive,'intact');
  assert.equal(state.record.legacyArchive.original.unknown.mustSurvive,'intact');
  assert.equal(state.record.identity.title,'Caso sintético (sem dados reais)');
  assert.deepEqual(errors,[]);
  console.log('PASS: browser scan, backup download, consent, recovery and original preservation');
  // Re-running cannot replace the target with the same ID.
  await page.getByRole('button',{name:'Procurar casos'}).click();
  const repeated=page.locator('tr').filter({hasText:'MedPer anterior (v4)'});
  const anotherDownload=page.waitForEvent('download');
  await repeated.getByRole('button',{name:'Baixar backup'}).click();
  await anotherDownload;
  await repeated.getByRole('checkbox').check();
  page.once('dialog',dialog=>dialog.accept());
  await repeated.getByRole('button',{name:'Migrar sem sobrescrever'}).click();
  await page.getByText('Nenhuma migração executada',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: duplicate ID refuses overwrite in browser');
} finally {
  await browser?.close();
  server.kill();
}
